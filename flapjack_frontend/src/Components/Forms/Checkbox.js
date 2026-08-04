import React from 'react'
import PropTypes from 'prop-types'
import { Form, Checkbox } from 'antd'

const FormCheckbox = ({ label, name, rules = [], dependencies = [] }) => {
  return (
    <Form.Item
      name={name}
      rules={rules}
      valuePropName="checked"
      dependencies={dependencies}
    >
      <Checkbox>{label}</Checkbox>
    </Form.Item>
  )
}

FormCheckbox.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  rules: PropTypes.array,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default FormCheckbox
