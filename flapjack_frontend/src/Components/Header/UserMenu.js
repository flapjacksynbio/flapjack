import React from 'react'
import { UserOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

/** Horizontal nests entries under the username; the drawer lists them flat. */
const UserMenu = (isHorizontal, username, onLogOut) => {
  // Upload is absent deliberately: the drawer renders the primary nav routes
  // alongside these, so listing it here duplicates it.
  const entries = [
    { key: 'account', label: <Link to="/account">Account settings</Link> },
    {
      key: 'sign-out',
      label: (
        <Link to="/" onClick={onLogOut}>
          Sign out
        </Link>
      ),
    },
  ]

  if (isHorizontal) {
    return [
      {
        key: 'navbar-sub-menu',
        label: (
          <span>
            <UserOutlined />
            {username}
          </span>
        ),
        children: entries,
      },
    ]
  }

  return entries
}

UserMenu.propTypes = {
  isHorizontal: PropTypes.bool.isRequired,
}

export default UserMenu
