import store from '../redux/store'
import {
  receiveAccessTokens,
  logoutCurrentUser,
  loggingIn,
  setUserInfo,
} from '../redux/actions/session'

const normalizeBaseUrl = (baseUrl, envName) => {
  if (!baseUrl) {
    throw new Error(`${envName} environment variable is required`)
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

const normalizePath = (path) => path.replace(/^\/+/, '')

const decodeJwtPayload = (token) => {
  const encodedPayload = token.split('.')[1]
  if (!encodedPayload) return null

  try {
    const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    )
    return JSON.parse(window.atob(paddedPayload))
  } catch (e) {
    return null
  }
}

class ApiError extends Error {
  constructor(response, data) {
    super(`API request failed with status ${response.status}`)
    this.name = 'ApiError'
    this.response = response
    this.status = response.status
    this.data = data
  }
}

class Api {
  /* Mediates the interaction with the API through HTTP requests */
  constructor(baseUrl) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'REACT_APP_HTTP_API')
    this.baseHeaders = {
      'content-type': 'application/json',
    }

    // Promise that is resolved after access token is initialized
    this.initialized = false
    this.isInitialized = new Promise((resolve) => {
      this.resolveInitialized = resolve
    })
  }

  markInitialized() {
    if (this.initialized) return
    this.initialized = true
    this.resolveInitialized()
  }

  /** Obtains the access token from the store. If it's expired, tries to refresh. */
  async getAccessToken() {
    // Await for access token initialization
    await this.isInitialized
    const accessToken = store.getState().session.access
    if (!accessToken) return null

    // Verify expiration
    const decoded = decodeJwtPayload(accessToken)
    if (!decoded || !decoded.exp) return null

    const expDate = new Date(decoded.exp * 1000)
    if (expDate < Date.now()) {
      // Need to refresh token
      try {
        const refreshResponse = await this.refresh()
        return refreshResponse.access
      } catch (e) {
        return null
      }
    }
    return accessToken
  }

  /**
   * Returns required headers based on user authentications
   * @returns {object} Headers for HTTP request with access token if user is authenticated
   */
  async authedHeaders() {
    const accessToken = await this.getAccessToken()
    if (!accessToken) return this.baseHeaders
    return {
      ...this.baseHeaders,
      Authorization: `Bearer ${accessToken}`,
    }
  }

  /**
   * Get's the full HTTP URL from the API path
   * @param {string} path API path. (For http://localhost:8000/api/study, path='study')
   * @param {object=} query Optional. Query object to be included as a query string in the url.
   * @returns {string} url
   */
  url(path, query = {}) {
    const url = new URL(normalizePath(path), this.baseUrl)
    Object.entries(query || {}).forEach(([k, v]) => url.searchParams.append(k, v))
    return url
  }

  async parseResponse(resp) {
    const contentType = resp.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await resp.json() : null
    if (!resp.ok) {
      throw new ApiError(resp, data)
    }
    return data
  }

  /**
   * Executes an authenticated get/post/patch/delete request
   * @param {string} path API path. (For http://localhost:8000/api/study, path='study')
   * @param {Object} body Body object for HTTP request. Only on post/patch.
   * @param {Object} headers Extra headers to add to request.
   * @param {Object} query Query parameters for HTTP request.
   * @param {'GET'|'POST'|'PATCH'|'DELETE'} method HTTP request method.
   */
  async authFetch(path, body, headers, query, method) {
    if (path[path.length - 1] !== '/') {
      path = `${path}/`
    }
    const authedHeaders = await this.authedHeaders()
    return fetch(this.url(path, query), {
      method,
      headers: { ...authedHeaders, ...headers },
      ...(body && { body: JSON.stringify(body) }),
    }).then((resp) => this.parseResponse(resp))
  }

  /**
   * Execute a get request
   * @param {string} path API path.
   * @param {Object.<string>} headers Object containing extra headers
   * @param {Object} query Object containing query parameters
   */
  async get(path, headers, query) {
    return this.authFetch(path, null, headers, query, 'GET')
  }

  /**
   * Execute a post request
   * @param {string} path API path. Must end with '/' (E.g.: 'registry/plot/')
   * @param {Object} body Request body
   * @param {Object.<string>} headers Object containing extra headers
   * @param {Object} query Object containing query parameters
   */
  post(path, body, headers, query) {
    return this.authFetch(path, body, headers, query, 'POST')
  }

  /**
   * Execute a patch request
   * @param {string} path API path. Must end with '/' (E.g.: 'registry/plot/')
   * @param {Object} body Request body
   * @param {Object.<string>} headers Object containing extra headers
   * @param {Object} query Object containing query parameters
   */
  patch(path, body, headers, query) {
    return this.authFetch(path, body, headers, query, 'PATCH')
  }

  /**
   * Execute a delete request
   * @param {string} path API path.
   * @param {Object.<string>} headers Object containing extra headers
   * @param {Object} query Object containing query parameters
   */
  delete(path, headers, query) {
    return this.authFetch(path, null, headers, query, 'DELETE')
  }

  /**
   * Method for registering a new user
   * @param {{username: string, email: string, password: string, password2: string}} body Object containing the registration parameters
   */
  async register(body) {
    const response = await fetch(this.url('auth/register/'), {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(body),
    })
      .then((resp) => this.parseResponse(resp))
      .catch((error) => ({ errors: error.data || { detail: error.message } }))

    if (response && response.errors) {
      return response
    }

    if (!response || !response.access || !response.refresh) {
      return { errors: response }
    }

    return this.logIn({ username: body.username, password: body.password })
  }

  /**
   * Method for loggingIn a new user
   * @param {{username, password}} body Object containing username and password
   * @returns {{access: string, refresh: string, username: string, email: string}}
   */
  async logIn(body) {
    const response = await fetch(this.url('auth/log_in/'), {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(body),
    }).then((resp) => this.parseResponse(resp))

    if (!response || !response.access || !response.refresh) {
      throw new Error('API error')
    }

    store.dispatch(receiveAccessTokens(response))
    store.dispatch(setUserInfo(response))
    this.markInitialized()
    return response
  }

  /**
   * Method for obtaining a new refresh and access token
   * @param {string} refresh Refresh token
   */
  async refresh(refresh) {
    refresh = refresh || store.getState().session.refresh
    if (!refresh) {
      this.markInitialized()
      throw new Error('No refresh token stored')
    }

    store.dispatch(loggingIn(true))

    // Get new access token
    const response = await fetch(this.url('auth/refresh/'), {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify({ refresh }),
    })
      .then((resp) => this.parseResponse(resp))
      .catch(() => {
        store.dispatch(logoutCurrentUser())
        this.markInitialized()
        return null
      })
      .finally((resp) => {
        store.dispatch(loggingIn(false))
        return resp
      })

    if (!response || !response.access) {
      store.dispatch(logoutCurrentUser())
      this.markInitialized()
      throw new Error('API error')
    }

    store.dispatch(receiveAccessTokens({ refresh, access: response.access }))
    this.markInitialized()
    return response
  }

  /**
   * Logs out the current user.
   *
   * Invalidates the refresh token server-side before clearing local state, so
   * a copy from persisted storage cannot keep minting access tokens. Local
   * state is cleared even if the request fails, so an unreachable server
   * cannot leave the user apparently still signed in.
   */
  async logOut() {
    const { refresh } = store.getState().session
    if (refresh) {
      try {
        await this.authFetch('auth/log_out/', { refresh }, null, null, 'POST')
      } catch (e) {
        // Intentionally ignored; local logout proceeds regardless.
      }
    }
    const response = store.dispatch(logoutCurrentUser())
    this.markInitialized()
    return response
  }
}

// eslint-disable-next-line no-undef
const HTTP_API_URL = process.env.REACT_APP_HTTP_API
export default new Api(HTTP_API_URL)
