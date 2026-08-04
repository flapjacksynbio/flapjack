import { Layout } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { Link, Route, Switch, useLocation } from 'react-router-dom'
import './App.scss'
import AuthRequired from './Components/Common/AuthRequired'
import FlapHeader from './Components/Header'
import routes, { allRoutes } from './routes'

const { Content, Footer } = Layout

function App({ loggedIn }) {
  const location = useLocation()
  // Nav hides protected routes when logged out, but all routes still render
  // so a protected deep link can explain itself instead of silently failing.
  const navRoutes = routes(loggedIn)

  const contentClass =
    location.pathname === '/view'
      ? 'full-width'
      : location.pathname === '/'
      ? 'home-page'
      : ''
  const showFooter = location.pathname === '/'

  return (
    <Layout className={`layout ${showFooter ? 'has-footer' : 'no-footer'}`}>
      <FlapHeader routes={navRoutes} />
      <Content id="flapjack-content" className={contentClass}>
        <div className="site-layout-content">
          <Switch>
            {[...allRoutes]
              .reverse()
              .map(({ route, viewRenderer: Renderer, requiresAuth }) => (
                <Route
                  path={route}
                  key={`route-${route}`}
                  render={(props) =>
                    requiresAuth && !loggedIn ? <AuthRequired /> : <Renderer {...props} />
                  }
                />
              ))}
          </Switch>
        </div>
      </Content>
      {showFooter && (
        <Footer className="footer">
          Developed by Rudge Lab, Newcastle University · Maintained by{' '}
          <a
            href="https://geneticlogiclab.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Genetic Logic Lab
          </a>
          , University of Colorado Boulder · <Link to="/about">About</Link>
        </Footer>
      )}
    </Layout>
  )
}

App.propTypes = {
  loggedIn: PropTypes.bool.isRequired,
}

const mapStateToProps = (state) => ({
  loggedIn: !!state.session.access,
})

export default connect(mapStateToProps)(App)
