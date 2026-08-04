import React from 'react'
import PropTypes from 'prop-types'
import { Form, Select } from 'antd'

const TagInput = ({
  label,
  name,
  showLabel = false,
  placeholder = null,
  rules = [],
  dependencies = [],
}) => {
  return (
    <Form.Item
      hasFeedback
      name={name}
      rules={rules}
      label={showLabel ? label : null}
      dependencies={dependencies}
    >
      <Select placeholder={placeholder || label} mode="tags" style={{ width: '100%' }} />
    </Form.Item>
  )
}

TagInput.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  placeholder: PropTypes.string,
  rules: PropTypes.array,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default TagInput
