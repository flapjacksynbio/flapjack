import React from 'react'
import { UserAddOutlined, LoginOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/authentication?initialTab=signup',
    Icon: UserAddOutlined,
    title: 'Ready to get started?',
    description: 'Create an account to upload and manage your experimental data',
  },
  {
    to: '/authentication',
    Icon: LoginOutlined,
    title: 'Already have an account?',
    description: 'Sign in to access your studies, assays and analysis tools',
  },
]

const NotLoggedInCards = () => (
  <div className="home-action-grid home-action-grid--centered">
    {cards.map(({ to, Icon, title, description }) => (
      <Link to={to} key={to} className="home-action-card">
        <Icon className="home-action-icon" />
        <div className="home-action-title">{title}</div>
        <div className="home-action-desc">{description}</div>
      </Link>
    ))}
  </div>
)

export default NotLoggedInCards
