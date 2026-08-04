import React from 'react'
import PropTypes from 'prop-types'
import { Redirect, useLocation } from 'react-router-dom'
import { connect } from 'react-redux'
import { Segmented } from 'antd'
import Login from './Login'
import Signup from './Signup'

const TABS = [
  { value: 'login', label: 'Sign in' },
  { value: 'signup', label: 'Sign up' },
]

const Authentication = ({ isLoggedIn }) => {
  const location = useLocation()
  const params = new URLSearchParams(window.location.search)
  const queryTab = params.get('initialTab')
  const initialTab = ['login', 'signup'].includes(queryTab) ? queryTab : 'login'
  const [activeKey, setActiveKey] = React.useState(initialTab)

  if (isLoggedIn) {
    // Return to the page originally requested, if we got here from a guard.
    const from = location.state && location.state.from
    return <Redirect to={from || '/'} />
  }

  return (
    <>
      <Segmented
        options={TABS}
        value={activeKey}
        onChange={setActiveKey}
        size="large"
        style={{ marginBottom: 24 }}
      />
      {activeKey === 'login' ? (
        <Login goToSignUp={() => setActiveKey('signup')} />
      ) : (
        <Signup goToLogin={() => setActiveKey('login')} />
      )}
    </>
  )
}

Authentication.propTypes = {
  isLoggedIn: PropTypes.bool,
}

const mapStateToProps = (state) => ({
  isLoggedIn: !!state.session.access,
})

export default connect(mapStateToProps)(Authentication)
