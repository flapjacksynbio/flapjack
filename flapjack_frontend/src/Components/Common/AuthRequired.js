import React from 'react'
import { App } from 'antd'
import { Redirect, useLocation } from 'react-router-dom'

/**
 * Rendered in place of a `requiresAuth` route when the user is logged out.
 *
 * Protected routes used to be filtered out of the route table, so a shared
 * link like `/view?study=1&assay=2` silently fell through to the home page.
 * This explains what happened and redirects to login, carrying the requested
 * location in router state so the user lands there afterwards.
 */
const AuthRequired = () => {
  const { message } = App.useApp()
  const location = useLocation()

  React.useEffect(() => {
    message.warning('You need to sign in to open that page.')
  }, [])

  return <Redirect to={{ pathname: '/authentication', state: { from: location } }} />
}

export default AuthRequired
