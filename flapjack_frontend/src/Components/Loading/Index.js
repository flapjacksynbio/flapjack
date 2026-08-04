import React from 'react'
import logo from '~/src/assets/images/logo.png'
import './Loading.scss'

const Loading = () => {
  return (
    <div className="loading-container">
      <img alt="Flapjack Logo" src={logo} className="loading-logo" />
    </div>
  )
}

Loading.propTypes = {}

export default Loading
