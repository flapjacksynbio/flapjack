export const CREATE_TAB = 'CREATE_TAB'
export const EDIT_TAB = 'EDIT_TAB'
export const DELETE_TAB = 'DELETE_TAB'
export const ADD_PLOT_TO_TAB = 'ADD_PLOT_TO_TAB'

/**
 * Redux action for creating a new plot tab
 * @param {Object} tab
 * @param {string} tab.title
 * @param {string} tab.id
 * @param {string} tab.key Same value as id // TODO: Remove
 * @param {boolean} tab.closable Whether the tab should be closable (should always be true)
 */
export const createTab = (tab) => ({
  type: CREATE_TAB,
  payload: tab,
})

/**
 * Redux action for editing a new plot tab
 * @param {Object} tab
 * @param {string} tab.title
 * @param {string} tab.id
 * @param {string} tab.key Same value as id // TODO: Remove
 * @param {boolean} tab.closable Whether the tab should be closable (should always be true)
 */
export const editTab = (tab) => ({
  type: EDIT_TAB,
  payload: tab,
})

/**
 * Redux action for deleting a new plot tab
 * @param {string} tabId Id of tab to be deleted
 */
export const deleteTab = (tabId) => ({
  type: DELETE_TAB,
  payload: tabId,
})

/**
 * Redux action for adding plot data to tab
 * @param {string} tabId Id of tab that contains the plot
 * @param {object} plotData
 * @param {object[]} plotData.data Contains traces formatted for plotly
 * @param {object} plotData.layout Plot Layout
 */
export const addPlotToTab = (tabId, plotData) => ({
  type: ADD_PLOT_TO_TAB,
  payload: { tabId, plotData },
})
