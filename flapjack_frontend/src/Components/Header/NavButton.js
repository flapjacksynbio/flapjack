import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

const NavButton = ({ route, label }) => {
  return <Link to={route}>{label}</Link>
}

NavButton.propTypes = {
  route: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
}

export default NavButton
