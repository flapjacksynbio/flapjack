import React from 'react'
import { Segmented, Typography } from 'antd'
import SearchField from '../Common/SearchField'
import './Browse.scss'
import Studies from './Studies'
import Assays from './Assays'
import Vectors from './Vectors'
import Medias from './Medias'
import Strains from './Strains'
import Signals from './Signals'

const TABS = [
  { value: 'studies', label: 'Studies' },
  { value: 'assays', label: 'Assays' },
  { value: 'vectors', label: 'Plasmids' },
  { value: 'medias', label: 'Media' },
  { value: 'strains', label: 'Chassis' },
  { value: 'signals', label: 'Signals' },
]

const PANELS = {
  studies: Studies,
  assays: Assays,
  vectors: Vectors,
  medias: Medias,
  strains: Strains,
  signals: Signals,
}

const Browse = () => {
  const [activeKey, setActiveKey] = React.useState('studies')
  const [search, setSearch] = React.useState('')
  const Panel = PANELS[activeKey]

  const onTabChange = (key) => {
    setActiveKey(key)
    setSearch('')
  }

  return (
    <div className="page">
      <header className="page-header">
        <Typography.Title level={2} className="page-title">
          Browse
        </Typography.Title>
        <Typography.Paragraph className="page-subtitle">
          Studies, assays and the parts behind them.
        </Typography.Paragraph>
      </header>
      <div className="browse-toolbar">
        <Segmented options={TABS} value={activeKey} onChange={onTabChange} size="large" />
        <SearchField key={activeKey} className="browse-search" onSearch={setSearch} />
      </div>
      <Panel search={search} />
    </div>
  )
}

export default Browse
