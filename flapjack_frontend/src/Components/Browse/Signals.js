import React from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import { Button, Space } from 'antd'
import BrowseTable from './BrowseTable'
import {
  nameColumn,
  idColumn,
  descriptionColumn,
  sbolUriColumn,
  actionsColumn,
} from './columns'

const Signals = ({ search }) => {
  const history = useHistory()

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: {
          signal: { id: record.id, name: record.name },
        },
      })
    }

    return (
      <Space wrap>
        <Button onClick={handleViewClick}>Data viewer</Button>
      </Space>
    )
  }

  const columns = [
    nameColumn(),
    idColumn(),
    descriptionColumn(),
    sbolUriColumn(),
    actionsColumn(renderActions),
  ]

  return (
    <BrowseTable
      dataUrl="signal/"
      columns={columns}
      search={search}
      emptyText="Measurement channels such as OD600 or a fluorescence filter."
    />
  )
}

Signals.propTypes = {
  search: PropTypes.string,
}

export default Signals
