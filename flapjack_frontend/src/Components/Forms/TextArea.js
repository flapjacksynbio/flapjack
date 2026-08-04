import React from 'react'
import PropTypes from 'prop-types'
import { Form, Input } from 'antd'

const Field = ({
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
      <Input.TextArea placeholder={placeholder || label} />
    </Form.Item>
  )
}

Field.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  placeholder: PropTypes.string,
  rules: PropTypes.array,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default Field
