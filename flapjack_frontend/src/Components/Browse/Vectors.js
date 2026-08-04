import React from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import { Button, Space, List, Row, Col } from 'antd'
import BrowseTable from './BrowseTable'
import { renderSbolUri } from './helpers'
import { idColumn, actionsColumn } from './columns'

const DNAs = ({ search }) => {
  const history = useHistory()

  const renderUris = (dnas) => {
    // eslint-disable-next-line react/prop-types
    const renderUri = ({ name, sboluri }) => (
      <Row gutter={10} style={{ width: '100%' }}>
        <Col span={10}>{name}:</Col>
        <Col span={14}>{renderSbolUri(sboluri)}</Col>
      </Row>
    )

    return (
      <List size="small">
        {dnas.map((dna, i) => (
          <List.Item key={i}>{renderUri(dna)}</List.Item>
        ))}
      </List>
    )
  }

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: { vector: { id: record.id, name: record.name } },
      })
    }

    return (
      <Space wrap>
        <Button onClick={handleViewClick}>Data viewer</Button>
      </Space>
    )
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
    idColumn(),
    {
      title: 'SBOL URIs',
      dataIndex: 'dnas',
      render: renderUris,
    },
    actionsColumn(renderActions),
  ]

  return (
    <BrowseTable
      dataUrl="vectorall/"
      columns={columns}
      search={search}
      emptyText="The DNA constructs carried by your samples."
    />
  )
}

DNAs.propTypes = {
  search: PropTypes.string,
}

export default DNAs
