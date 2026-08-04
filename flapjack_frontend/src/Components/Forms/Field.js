import React from 'react'
import PropTypes from 'prop-types'
import { Form, Input } from 'antd'

/**
 * Base field component. To be used with Form and SteppedForm
 * @param {Object} props
 * @param {function(object): JSX|undefined} props.RenderField Optional. If specified, it will be used to render the field
 * Other values in props will be passed as arguments to render the field.
 */
const Field = (props) => {
  const { RenderField = null } = props

  if (RenderField) {
    return <RenderField {...props} />
  }

  const {
    label,
    name,
    showLabel = false,
    PrefixComponent = null,
    type = null,
    placeholder = null,
    rules = [],
    addonAfter = null,
    disabled = false,
    dependencies = [],
  } = props

  return (
    <Form.Item
      hasFeedback
      name={name}
      rules={rules}
      label={showLabel ? label : null}
      dependencies={dependencies}
    >
      <Input
        prefix={PrefixComponent && <PrefixComponent />}
        type={type}
        placeholder={placeholder || label}
        addonAfter={addonAfter}
        disabled={disabled}
      />
    </Form.Item>
  )
}

Field.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  type: PropTypes.string,
  PrefixComponent: PropTypes.elementType,
  placeholder: PropTypes.string,
  rules: PropTypes.array,
  RenderField: PropTypes.func,
  addonAfter: PropTypes.string,
  disabled: PropTypes.bool,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default Field
