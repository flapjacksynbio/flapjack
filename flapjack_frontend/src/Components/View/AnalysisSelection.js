import React from 'react'
import analysisOptions from './analysisOptions'
import PropTypes from 'prop-types'
import { Select, Form, Input } from 'antd' // Input kept for the hidden type field
import { canonicalAnalysisValue } from './analysisProtocol'

/** Renders Analysis Selection form items */
export const renderItem = (props, i, formInstance) => {
  const {
    isFormItem = false,
    renderer: Renderer,
    requiresForm = false,
    ...otherProps
  } = props

  if (requiresForm) otherProps.formInstance = formInstance

  if (!isFormItem) {
    const { name, label, valuePropName, rules, ...other } = otherProps
    return (
      <Form.Item
        key={i}
        name={name}
        label={label}
        valuePropName={valuePropName}
        rules={rules}
      >
        <Renderer {...other} />
      </Form.Item>
    )
  }

  return <Renderer key={i} {...otherProps} />
}

renderItem.propTypes = {
  isFormItem: PropTypes.bool,
  requiresForm: PropTypes.bool,
  renderer: PropTypes.any.isRequired,
}

/**
 * Selection of analysis parameters
 * @param {object} props
 * @param {*} formInstance Ant Design form instance for analysis parameter selection
 */
const AnalysisSelection = ({ formInstance }) => {
  const [selectedType, setSelectedType] = React.useState('None')

  // Set initial values when either the form instance changes or the analysis type changes
  React.useEffect(() => {
    formInstance.setFieldsValue({ type: canonicalAnalysisValue(selectedType) })
    formInstance.setFieldsValue(
      analysisOptions[selectedType].reduce((acc, opt) => {
        return { ...acc, [opt.name]: opt.initial_value }
      }, {}),
    )
  }, [selectedType, formInstance])

  const onSubmit = (values) => {
    values.type = canonicalAnalysisValue(selectedType)
    return values
  }

  return (
    <>
      <Select
        value={selectedType}
        onChange={setSelectedType}
        style={{ width: '100%', marginBottom: 10 }}
        options={Object.keys(analysisOptions).map((opt) => ({ value: opt, label: opt }))}
      />
      <Form
        form={formInstance}
        name={selectedType}
        labelCol={{ span: 14 }}
        size="small"
        onFinish={onSubmit}
      >
        <Form.Item name="type" style={{ display: 'none' }}>
          <Input value={canonicalAnalysisValue(selectedType)} />
        </Form.Item>
        {analysisOptions[selectedType].map((fieldProps, i) =>
          renderItem(fieldProps, i, formInstance),
        )}
      </Form>
    </>
  )
}

AnalysisSelection.propTypes = {
  formInstance: PropTypes.object.isRequired,
}

export default AnalysisSelection
