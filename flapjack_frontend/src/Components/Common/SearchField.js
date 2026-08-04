import React from 'react'
import PropTypes from 'prop-types'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import './SearchField.scss'

/**
 * Search input that reports its value after the user stops typing.
 *
 * Holds the typed value itself; the parent only receives the settled term.
 * To reset it, give it a `key` that changes.
 */
const SearchField = ({
  onSearch,
  placeholder = 'Search',
  delay = 300,
  className = '',
}) => {
  const [value, setValue] = React.useState('')
  const timer = React.useRef(null)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const onChange = ({ target }) => {
    setValue(target.value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(target.value), delay)
  }

  return (
    <Input
      className={`search-field ${className}`.trim()}
      placeholder={placeholder}
      prefix={<SearchOutlined />}
      value={value}
      onChange={onChange}
      onPressEnter={() => {
        clearTimeout(timer.current)
        onSearch(value)
      }}
      allowClear
    />
  )
}

SearchField.propTypes = {
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  delay: PropTypes.number,
  className: PropTypes.string,
}

export default SearchField
