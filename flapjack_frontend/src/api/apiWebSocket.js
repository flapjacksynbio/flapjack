import _ from 'lodash'
import api from '.'

const normalizeBaseUrl = (baseUrl, envName) => {
  if (!baseUrl) {
    throw new Error(`${envName} environment variable is required`)
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

const normalizePath = (path) => path.replace(/^\/+/, '')

/**
 * @callback listener
 * @param event event that fired the listener
 * @param socket the socket that the listener is bound to
 */

/**
 * @callback messageListener
 * @param message the message that was received by the socket
 * @param event event that fired the listener
 * @param socket the socket that the listener is bound to
 */

class ApiWebsocket {
  /* Mediates the interaction with API through WebSockets */
  constructor(baseUrl) {
    this.baseUrl = normalizeBaseUrl(baseUrl, 'REACT_APP_WS_API')
  }

  /**
   * Get's the full WebSocket URL from the API path
   * @param {string} path API path. (For ws://localhost:8000/ws/registry/upload, path='registry/upload')
   * @returns {string} url
   */
  async url(path) {
    const token = await api.getAccessToken()
    const url = new URL(normalizePath(path), this.baseUrl)
    url.searchParams.set('token', token)
    return url
  }

  /**
   * Executes the connection to the API through WebSockets and sets its listeners
   * @param {string} path API path (E.g.: 'registry/plot').
   * @param {object} listeners Object containing the event listeners for the connection.
   * @param {listener} listeners.onConnect Socket onopen listener.
   * @param {messageListener|object} listeners.onReceiveHandlers socket onmessage listener. If it's an object, it will
   * call onReceiveHandlers[message.type] when the event fires.
   * @param {listener} listeners.onError Socket onerror listener.
   */
  async connect(path, { onConnect, onReceiveHandlers, onError, onClose }) {
    const url = await this.url(path)
    const socket = new WebSocket(url)

    socket.onopen = (event) => onConnect(event, socket)

    if (typeof onReceiveHandlers === 'function') {
      socket.onmessage = (event) => onReceiveHandlers(event, socket)
    } else if (_.isPlainObject(onReceiveHandlers)) {
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (typeof onReceiveHandlers[message.type] === 'function') {
          onReceiveHandlers[message.type](message, event, socket)
        }
      }
    } else {
      socket.close()
      throw new Error(
        `Unhandled type "${typeof onReceiveHandlers}" for onReceiveHandlers`,
      )
    }

    socket.onerror = (event) => onError(event, socket)

    // onerror does not fire when the server closes the socket, only onclose.
    socket.onclose = (event) => {
      if (onClose) onClose(event, socket)
      else if (!event.wasClean) onError(event, socket)
    }

    return socket
  }
}

// eslint-disable-next-line no-undef
const HTTP_WS_URL = process.env.REACT_APP_WS_API
export default new ApiWebsocket(HTTP_WS_URL)
