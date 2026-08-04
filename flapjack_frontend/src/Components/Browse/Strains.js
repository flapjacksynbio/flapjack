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

const Strains = ({ search }) => {
  const history = useHistory()

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: {
          strain: { id: record.id, name: record.name },
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
      dataUrl="strain/"
      columns={columns}
      search={search}
      emptyText="Host organisms. A sample may carry several as a consortium."
    />
  )
}

Strains.propTypes = {
  search: PropTypes.string,
}

export default Strains
