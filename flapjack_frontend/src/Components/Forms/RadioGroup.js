import React from 'react'
import PropTypes from 'prop-types'
import { Form, Radio } from 'antd'

const RadioGroup = ({
  name,
  label = '',
  showLabel = false,
  rules = [],
  options = [],
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
      <Radio.Group>
        {options.map((o, i) => (
          <Radio value={o.key} key={`${o.key}-opt-${i}`}>
            {o.label}
          </Radio>
        ))}
      </Radio.Group>
    </Form.Item>
  )
}

RadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  rules: PropTypes.array,
  placeholder: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ),
  filterOption: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  optionLabel: PropTypes.string,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default RadioGroup
