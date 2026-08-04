import { LOGOUT_CURRENT_USER } from '../actions/session'
import { CREATE_TAB, EDIT_TAB, DELETE_TAB, ADD_PLOT_TO_TAB } from '../actions/viewTabs'

const deleteTab = (state, tabId) => {
  return Object.entries(state).reduce((acc, [key, value]) => {
    if (key === tabId) return acc
    return { ...acc, [key]: value }
  }, {})
}

const addPlotToTab = (state, tabId, plotData) => {
  if (!plotData) return state
  return Object.entries(state).reduce((acc, [key, value]) => {
    if (key !== tabId) return { ...acc, [key]: value }
    return { ...acc, [key]: { ...value, plotData } }
  }, {})
}

const tabsReducer = (state = {}, { type, payload }) => {
  Object.freeze(state)
  switch (type) {
    case CREATE_TAB:
      return { ...state, [payload.id]: payload }
    case EDIT_TAB:
      return { ...state, [payload.id]: payload }
    case DELETE_TAB:
      return deleteTab(state, payload)
    case ADD_PLOT_TO_TAB:
      return addPlotToTab(state, payload.tabId, payload.plotData)
    case LOGOUT_CURRENT_USER:
      return {}
    default:
      return state
  }
}

export default tabsReducer
