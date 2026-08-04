import { createStore, combineReducers } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2'
import sessionReducer, { session, sessionTransform } from './reducers/session'
import tabsReducer from './reducers/viewTabs'

// Specific configuration for persisting session in local storage
const persistSessionConfig = {
  key: 'session',
  storage,
  blacklist: ['access', '_persist'],
  stateReconciler: autoMergeLevel2,
  transforms: [sessionTransform],
}

// General configuration for persisting store in local storage
const persistConfig = {
  key: 'root',
  storage,
  blacklist: ['_persist', 'session'],
  stateReconciler: autoMergeLevel2,
}

// Redux store model
const model = {
  session,
  viewTabs: {},
}

// Redux store reducer
const rootReducer = combineReducers({
  session: persistReducer(persistSessionConfig, sessionReducer),
  viewTabs: tabsReducer,
})

const pReducer = persistReducer(persistConfig, rootReducer)

let store
// eslint-disable-next-line no-undef
if (process.env.NODE_ENV === 'production') {
  store = createStore(pReducer, model)
} else {
  store = createStore(pReducer, model, devToolsEnhancer())
}

export const persistor = persistStore(store)

export default store
