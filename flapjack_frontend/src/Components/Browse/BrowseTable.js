import React from 'react'
import PropTypes from 'prop-types'
import { Table, Card, Empty, App } from 'antd'
import api from '../../api'
import './Browse.scss'

/**
 * Table with pagination provided by api
 * @param {object} props
 * @param {string} props.dataUrl API url that provides paginated data.
 * @param {object[]} props.columns Array with column metadata for use with Ant Design tables
 * @param {string} props.columns.title Column Title
 * @param {string} props.columns.key Column Key, must be unique within table.
 * @param {string} props.columns.dataIndex Index for accessing column data for each record returned by the provider.
 * @param {function} props.columns.sorter Optional. Function for sorting column.
 * @param {function} props.columns.render Optional. Function for rendering the data in the record.
 * @param {string} props.emptyText Shown when there are no rows.
 * @param {string} props.search Search term, owned by the Browse toolbar.
 */
const BrowseTable = ({ dataUrl, columns, emptyText, search = '', refreshKey = 0 }) => {
  const { message } = App.useApp()
  const [dataSource, setDataSource] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [pagination, setPagination] = React.useState({
    current: 1,
    pageSize: 20,
    total: 0,
    hideOnSinglePage: true,
  })

  // Requests overlap when the search changes mid-flight, and the last response
  // to arrive wins regardless of the order asked.
  const lastFetchId = React.useRef(0)

  const loadData = async (query) => {
    const fetchId = lastFetchId.current + 1
    lastFetchId.current = fetchId
    setLoading(true)
    let { count: total, results: data } = await api.get(dataUrl, {}, query).catch((e) => {
      if (fetchId !== lastFetchId.current) return {}
      message.error(
        e && e.response && e.response.status === 401
          ? 'Your session expired. Please sign in again.'
          : 'Could not reach the server.',
      )
      setLoading(false)
      return {}
    })
    if (fetchId !== lastFetchId.current) return
    if (!data) return
    data = data.map((d) => ({ ...d, key: d.id }))

    setDataSource(data)
    setPagination((pag) => ({
      ...pag,
      total,
    }))

    setLoading(false)
  }

  const getQuery = ({ current, pageSize }, term = search) => {
    const query = { limit: pageSize, offset: pageSize * (current - 1) }
    if (term) query.search = term
    return query
  }

  React.useEffect(() => {
    setPagination((pag) => ({ ...pag, current: 1 }))
    loadData({ limit: pagination.pageSize, offset: 0, ...(search ? { search } : {}) })
    // eslint-disable-next-line
  }, [search, dataUrl, refreshKey])

  const handleTableChange = ({ current, pageSize }) => {
    setPagination((pag) => ({ ...pag, pageSize, current }))
    loadData(getQuery({ current, pageSize }))
  }

  return (
    <Card className="browse-card" styles={{ body: { padding: 0 } }}>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        sticky
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText || 'Nothing here yet'}
            />
          ),
        }}
      />
    </Card>
  )
}

BrowseTable.propTypes = {
  dataUrl: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      dataIndex: PropTypes.string,
      key: PropTypes.string,
      sorter: PropTypes.func,
    }),
  ),
  emptyText: PropTypes.string,
  search: PropTypes.string,
  refreshKey: PropTypes.number,
}

export default BrowseTable
