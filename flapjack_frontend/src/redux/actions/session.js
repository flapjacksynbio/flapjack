import api from '../../api'

export const RECEIVE_ACCESS_TOKENS = 'RECEIVE_ACCESS_TOKENS'
export const RECEIVE_CURRENT_USER = 'RECEIVE_CURRENT_USER'
export const LOGOUT_CURRENT_USER = 'LOGOUT_CURRENT_USER'
export const FINISHED_LOGIN = 'FINISHED_LOGIN'

/**
 * Redux action for refreshing tokens
 * @param {Object} tokens
 * @param {string} tokens.access Access token
 * @param {string} tokens.refresh Refresh token
 */
export const receiveAccessTokens = (tokens) => {
  // Refresh access token
  setTimeout(() => api.refresh().catch(() => null), 60 * 60 * 1000) // Every 60 minutes

  return {
    type: RECEIVE_ACCESS_TOKENS,
    payload: tokens,
  }
}

/**
 * Redux action for setting user information
 * @param {Object} userInfo
 * @param {string} userInfo.username
 * @param {string} userInfo.email
 */
export const setUserInfo = ({ username, email }) => {
  return {
    type: RECEIVE_CURRENT_USER,
    payload: { username, email },
  }
}

/**
 * Redux action for removing user info and tokens
 */
export const logoutCurrentUser = () => {
  return {
    type: LOGOUT_CURRENT_USER,
  }
}

export const loggingIn = (isLoggingIn) => ({
  type: FINISHED_LOGIN,
  payload: { isLoggingIn },
})
