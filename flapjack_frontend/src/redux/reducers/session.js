/* eslint-disable indent */
import {
  LOGOUT_CURRENT_USER,
  RECEIVE_ACCESS_TOKENS,
  FINISHED_LOGIN,
  RECEIVE_CURRENT_USER,
} from '../actions/session'
import { createTransform, REHYDRATE } from 'redux-persist'
import api from '../../api'

export const session = {
  user: null,
  access: null,
  refresh: null,
  isLoggingIn: false,
}

const sessionReducer = (state = {}, { type, payload }) => {
  Object.freeze(state)
  switch (type) {
    case REHYDRATE:
      return { ...payload }
    case RECEIVE_ACCESS_TOKENS:
      return {
        ...state,
        access: payload.access,
        refresh: payload.refresh,
      }
    case LOGOUT_CURRENT_USER:
      return {
        user: null,
        access: null,
        refresh: null,
      }
    case RECEIVE_CURRENT_USER:
      return {
        ...state,
        user: payload,
      }
    case FINISHED_LOGIN:
      return {
        ...state,
        ...payload,
      }
    default:
      return state
  }
}

/** Transform for rehydrating session from local storage */
export const sessionTransform = createTransform(
  (inbound) => inbound,
  (outbound, key) => {
    if (key === 'refresh') {
      // Keep the token in the rehydrated state. Nulling it made
      // markApiReadyWithoutRefreshToken read "no session" and resolve
      // isInitialized while this refresh was still in flight, so the first
      // request went out with a stale access token.
      api.refresh(outbound).catch(() => null)
      return outbound
    }
    return outbound
  },
)

export default sessionReducer
