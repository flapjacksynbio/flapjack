import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import UserMenu from './UserMenu'
import NavButton from './NavButton'
import api from '../../api'

const pathToKey = {
  '/': 'menu-Home',
  '/browse': 'menu-Browse',
  '/view': 'menu-View',
}

const NavMenu = ({ menuButtons, mode = 'horizontal', session, onLogout }) => {
  const location = useLocation()

  const isHorizontal = mode === 'horizontal'

  // Each branch returns an array so they spread into items below.
  let sessionItems
  if (session.isLoggingIn) {
    sessionItems = [{ key: 'menu-logging-in', label: <LoadingOutlined spin /> }]
  } else if (session.access) {
    const user = session.user
    sessionItems = UserMenu(isHorizontal, user ? user.username : '', onLogout)
  } else {
    sessionItems = [
      { key: 'menu-login', label: <NavButton route="/authentication" label="Sign in" /> },
    ]
  }

  const items = [
    ...menuButtons.map((route) => ({
      key: `menu-${route.label}`,
      label: route.navbarRenderer(route),
    })),
    ...sessionItems,
  ]

  return (
    <Menu
      theme="dark"
      className={isHorizontal ? 'navbar' : ''}
      style={isHorizontal ? {} : { width: '100%' }}
      mode={mode}
      selectedKeys={[pathToKey[location.pathname]]}
      items={items}
    />
  )
}

NavMenu.propTypes = {
  menuButtons: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      route: PropTypes.string.isRequired,
      navbarRenderer: PropTypes.func,
    }),
  ).isRequired,
  mode: PropTypes.oneOf(['horizontal', 'vertical']).isRequired,
  session: PropTypes.object,
  onLogout: PropTypes.func,
}

const mapStateToProps = (state) => ({
  session: state.session,
})

// Via api.logOut() so the refresh token is blacklisted server-side.
const mapDispatchToProps = () => ({
  onLogout: () => api.logOut(),
})

export default connect(mapStateToProps, mapDispatchToProps)(NavMenu)
