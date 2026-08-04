import { Card, Typography } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import logo from '~/src/assets/images/logo.png'
import './Home.scss'
import LoggedInCards from './LoggedInCards'
import RecentWork from './RecentWork'
import NotLoggedInCards from './NotLoggedInCards'

const { Title, Paragraph } = Typography

const Home = ({ loggedIn }) => {
  return (
    <div className="container">
      <Card className="home-header">
        <div className="home-hero">
          <div className="home-hero-lockup">
            <img alt="Flapjack Logo" src={logo} />
            <Title className="home-title">Flapjack</Title>
          </div>
        </div>
      </Card>
      <div className="home-cards-section">
        {!loggedIn && (
          <Paragraph className="home-tagline">
            Store, share and analyze the measurements behind your genetic circuits.
            Flapjack keeps kinetic data together with the parts and conditions that
            produced it, so results stay interpretable long after the run.
          </Paragraph>
        )}
        {loggedIn ? <LoggedInCards /> : <NotLoggedInCards />}
      </div>
      {loggedIn && <RecentWork />}
    </div>
  )
}

Home.propTypes = {
  loggedIn: PropTypes.bool.isRequired,
}

const mapStateToProps = (state) => ({
  loggedIn: !!state.session.access,
})

export default connect(mapStateToProps)(Home)
