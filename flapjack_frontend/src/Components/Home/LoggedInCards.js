import React from 'react'
import { CloudUploadOutlined, LineChartOutlined, ReadOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/upload',
    Icon: CloudUploadOutlined,
    title: 'Upload',
    description: 'Store your kinetic data from microplate reader and other sources',
  },
  {
    to: '/browse',
    Icon: ReadOutlined,
    title: 'Browse',
    description: 'Browse published studies, assays and available DNA',
  },
  {
    to: '/view',
    Icon: LineChartOutlined,
    title: 'Search and Analyze',
    description: 'Query public and private data to visualize, analyze and model',
  },
]

const LoggedInCards = () => (
  <div className="home-action-grid">
    {cards.map(({ to, Icon, title, description }) => (
      <Link to={to} key={to} className="home-action-card">
        <Icon className="home-action-icon" />
        <div className="home-action-title">{title}</div>
        <div className="home-action-desc">{description}</div>
      </Link>
    ))}
  </div>
)

export default LoggedInCards
