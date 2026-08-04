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

const Medias = ({ search }) => {
  const history = useHistory()

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: {
          media: { id: record.id, name: record.name },
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
      dataUrl="media/"
      columns={columns}
      search={search}
      emptyText="Growth media used across your assays."
    />
  )
}

Medias.propTypes = {
  search: PropTypes.string,
}

export default Medias
