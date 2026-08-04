import React from 'react'
import PropTypes from 'prop-types'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/lib/integration/react'
import { BrowserRouter as Router } from 'react-router-dom'
import store, { persistor } from './redux/store'
import './index.css'
import App from './App'
import api from './api'
import * as serviceWorker from './serviceWorker'
import Loading from './Components/Loading/Index'
import { ConfigProvider, App as AntApp } from 'antd'
import { buildTheme, DARK_QUERY } from './theme'

const validateMessages = {
  // eslint-disable-next-line
  required: '${name} is required',
  default: 'Invalid value in field',
  // eslint-disable-next-line
  whitespace: '${name} cannot be empty',
}

/** Reads the same media query as App.scss, so antd and the hand-styled parts
 *  switch together. */
const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = React.useState(
    () => window.matchMedia && window.matchMedia(DARK_QUERY).matches,
  )

  React.useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = (e) => setIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <ConfigProvider theme={buildTheme(isDark)} form={{ validateMessages }}>
      {/* antd's static message/notification helpers render outside the theme;
          App supplies context-aware ones through App.useApp(). The offset lives
          here because ConfigProvider only configures the static helpers. */}
      <AntApp message={{ top: 80 }}>{children}</AntApp>
    </ConfigProvider>
  )
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
}

const markApiReadyWithoutRefreshToken = () => {
  if (!store.getState().session.refresh) {
    api.markInitialized()
  }
}

const root = createRoot(document.getElementById('root'))
root.render(
  // <React.StrictMode>
  <Provider store={store}>
    <PersistGate
      loading={<Loading />}
      persistor={persistor}
      onBeforeLift={markApiReadyWithoutRefreshToken}
    >
      <Router>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Router>
    </PersistGate>
  </Provider>,
  // </React.StrictMode>,
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
