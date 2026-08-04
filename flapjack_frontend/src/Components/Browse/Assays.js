import React from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import { Button, Space } from 'antd'
import BrowseTable from './BrowseTable'
import { compareText, compareNumber } from './helpers'
import {
  nameColumn,
  idColumn,
  descriptionColumn,
  sbolUriColumn,
  actionsColumn,
} from './columns'

const Assays = ({ search }) => {
  const history = useHistory()

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: {
          assay: { id: record.id, name: record.name },
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
    {
      title: 'Study',
      key: 'study',
      dataIndex: 'study',
      sorter: (a, b) => compareNumber(a.study, b.study),
    },
    {
      title: 'Temp.',
      key: 'temp',
      dataIndex: 'temperature',
      sorter: (a, b) => compareNumber(a.temperature, b.temperature),
      render: (temp) => `${temp} °C`,
    },
    {
      title: 'Machine',
      key: 'machine',
      dataIndex: 'machine',
      sorter: (a, b) => compareText(a.machine, b.machine),
    },
    sbolUriColumn(),
    actionsColumn(renderActions),
  ]

  return (
    <BrowseTable
      dataUrl="assay/"
      columns={columns}
      search={search}
      emptyText="One run on one instrument, holding the samples it measured."
    />
  )
}

Assays.propTypes = {
  search: PropTypes.string,
}

export default Assays
