import React from 'react'
import PropTypes from 'prop-types'
import SearchField from '../Common/SearchField'
import { Empty, Tag, Checkbox, Row, Col, Spin, Button, Typography, App } from 'antd'
import api from '../../api'
import './View.scss'

const PAGE_SIZE = 10

/**
 * Renders a custom multiselect with options provided by API
 * @param {object} props
 * @param {string} props.url API Url to obtain options via GET. Should support pagination
 * @param {sting} props.label Label for the field
 * @param {object[]} props.selected Array containing selected items
 * @param {number} props.selected.id Value id provided by API
 * @param {string} props.selected.name Name to be desplayed for value
 * @param {function(value, checked)} props.setSelected Function for selecting/deselecting (depending on checked) a value
 */
const ProviderSelect = ({ url, label, selected, setSelected }) => {
  const { message } = App.useApp()
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState([])
  const [totalResults, setTotalResults] = React.useState(0)
  const [search, setSearch] = React.useState('')

  const lastFetchId = React.useRef(0)

  // Obtain options from provider
  const fetchOptions = React.useCallback(
    (searchValue, { append = false, offset = 0 } = {}) => {
      const fetchId = lastFetchId.current + 1
      lastFetchId.current = fetchId
      setLoading(true)
      if (!append) setData([])

      api
        .get(url, null, { search: searchValue, limit: PAGE_SIZE, offset })
        .then(({ results, count }) => {
          if (fetchId !== lastFetchId.current) return
          const mappedResults = (results || []).map(
            ({ id, name, names, ...metadata }) => ({
              id,
              name: name || (names || []).join(', '),
              metadata,
            }),
          )
          setData((currentData) =>
            append
              ? [
                  ...currentData.filter(
                    ({ id }) => !mappedResults.some(({ id: otherId }) => id === otherId),
                  ),
                  ...mappedResults,
                ]
              : mappedResults,
          )
          setTotalResults(count || 0)
        })
        .catch(() => {
          if (fetchId !== lastFetchId.current) return
          if (!append) setData([])
          message.error('There was an error communicating with the server.')
        })
        .finally(() => {
          if (fetchId === lastFetchId.current) setLoading(false)
        })
    },
    [url],
  )

  const onClickMore = () => fetchOptions(search, { append: true, offset: data.length })

  // SearchField already debounces, so this fires on the settled term.
  React.useEffect(() => {
    fetchOptions(search)
    return () => {
      lastFetchId.current += 1
    }
  }, [fetchOptions, search])

  const renderOptions = () => (
    <Row className="provider-select-options">
      {data.length > 0 &&
        data.map((value) => (
          <Col span={24} key={value.id}>
            <Checkbox
              checked={checked.has(value.id)}
              onChange={(e) => setSelected(value, e.target.checked)}
            >
              {value.name}
            </Checkbox>
          </Col>
        ))}
      {renderMore()}
    </Row>
  )

  const renderMore = () => {
    if (!loading && !data.length) {
      return <Empty description={`No ${label || 'results'} were found`} />
    } else if (loading) {
      return <Spin size="small" />
    }
    return data.length < totalResults ? (
      <Button type="link" onClick={onClickMore}>
        More...
      </Button>
    ) : null
  }

  const checked = new Set(selected.map(({ id }) => id))

  return (
    <div>
      {selected.map((value) => (
        <Tag
          onClose={() => setSelected(value, false)}
          closable
          key={value.id}
          style={{ maxWidth: '100%' }}
        >
          <Typography.Text ellipsis style={{ maxWidth: '80%' }}>
            {value.name}
          </Typography.Text>
        </Tag>
      ))}
      <SearchField className="provider-search" onSearch={setSearch} />
      {renderOptions()}
    </div>
  )
}

ProviderSelect.propTypes = {
  url: PropTypes.string.isRequired,
  label: PropTypes.string,
  selected: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
    }),
  ).isRequired,
  setSelected: PropTypes.func.isRequired,
}

export default ProviderSelect
