import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Layout, Drawer, Button, Dropdown } from 'antd'
import {
  DownOutlined,
  LoadingOutlined,
  MenuOutlined,
  UserOutlined,
} from '@ant-design/icons'
import logo from '~/src/assets/images/logo.png'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import NavMenu from './NavMenu'
import api from '../../api'
import './Header.scss'

/** Responsive header */
const FlapHeader = ({ routes = [], session, onLogout }) => {
  const location = useLocation()
  const [smallScreen, setSmallScreen] = React.useState(false)
  const [drawerVisible, setDrawerVisible] = React.useState(false)

  // Determine if screen size is small enough for menu change
  const updateSmallScreen = React.useCallback(() => {
    const windowWidth = window.innerWidth
    setSmallScreen(windowWidth < 960)
  }, [])

  // Observe screen size
  React.useEffect(() => {
    updateSmallScreen()
    window.addEventListener('resize', updateSmallScreen)
    return () => {
      window.removeEventListener('resize', updateSmallScreen)
    }
  }, [updateSmallScreen])

  // Open small screen's drawer
  const onToggleDrawer = () => {
    setDrawerVisible((visible) => !visible)
  }

  const menuButtons = routes.filter(({ navbarRenderer }) => navbarRenderer)

  const accountMenuItems = [
    {
      key: 'account',
      label: <Link to="/account">Account settings</Link>,
    },
    { type: 'divider' },
    {
      key: 'sign-out',
      label: (
        <Link to="/" onClick={onLogout}>
          Sign out
        </Link>
      ),
    },
  ]

  const renderAccountControl = () => {
    if (session.isLoggingIn) {
      return (
        <div className="header-account loading">
          <LoadingOutlined spin />
        </div>
      )
    }

    if (!session.access) {
      return (
        <Link to="/authentication" className="header-account">
          Sign in
        </Link>
      )
    }

    return (
      <Dropdown
        menu={{ items: accountMenuItems }}
        trigger={['click']}
        placement="bottomRight"
      >
        <button type="button" className="header-account">
          <UserOutlined />
          <span>{session.user ? session.user.username : 'Account'}</span>
          <DownOutlined className="header-account-caret" />
        </button>
      </Dropdown>
    )
  }

  return (
    <Layout.Header id="flapjack-header">
      <div className="logo">
        <Link to="/">
          <img src={logo} alt="Flapjack Logo" />
          <span className="logo-title">Flapjack</span>
        </Link>
      </div>
      {smallScreen && (
        <>
          <Button className="drawer-button" onClick={onToggleDrawer}>
            <MenuOutlined className="drawer-button-icon" />
          </Button>
          <Drawer
            placement="right"
            onClose={onToggleDrawer}
            open={drawerVisible}
            theme="dark"
            styles={{ body: { padding: 0, backgroundColor: 'var(--brand-deep)' } }}
          >
            <NavMenu menuButtons={menuButtons} mode="vertical" />
          </Drawer>
        </>
      )}
      {!smallScreen && (
        <>
          <nav className="main-nav" aria-label="Primary">
            {menuButtons.map(({ route, label }) => (
              <Link
                to={route}
                key={`desktop-route-${route}`}
                className={`main-nav-link ${location.pathname === route ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="desktop-account-actions">{renderAccountControl()}</div>
        </>
      )}
    </Layout.Header>
  )
}

FlapHeader.propTypes = {
  routes: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      route: PropTypes.string.isRequired,
      navbarRenderer: PropTypes.func,
    }),
  ).isRequired,
  session: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => ({
  session: state.session,
})

// Via api.logOut() so the refresh token is blacklisted server-side.
const mapDispatchToProps = () => ({
  onLogout: () => api.logOut(),
})

export default connect(mapStateToProps, mapDispatchToProps)(FlapHeader)
