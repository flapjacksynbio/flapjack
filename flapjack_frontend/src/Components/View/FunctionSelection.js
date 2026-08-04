import React from 'react'
import PropTypes from 'prop-types'
import { Select, Form, Input } from 'antd'
import { baseAnalysisOptions } from './analysisOptions'
import { renderItem } from './AnalysisSelection'

/** Field for selecting analysis functions
 * @param {object} props
 * @param {object} props.formInstance Analysis form instance
 * @param {{label: string, value: any}[]} props.options Array of function options. Label must match any entry in baseAnalisysOptions
 * @param {string} props.label Field label
 * @param {string} props.name Field name
 * @param {object[]} props.rules Antd field rules array
 */
const FunctionSelection = ({ formInstance, options, label, name, rules }) => {
  const [selectedFunction, setSelectedFunction] = React.useState(undefined)

  const updateSelected = async (newValue) => {
    setSelectedFunction(newValue)
    formInstance.setFieldsValue({ [name]: newValue })
  }

  return (
    <>
      <Form.Item label={label}>
        <Form.Item name={name} rules={rules} noStyle>
          <Input type="hidden" style={{ display: 'none' }} />
        </Form.Item>
        <div>
          <Select
            labelInValue
            options={options}
            placeholder="Select Function..."
            value={selectedFunction}
            onChange={updateSelected}
            style={{ marginBottom: 10, width: '100%' }}
          />
        </div>
      </Form.Item>
      {selectedFunction &&
        baseAnalysisOptions[selectedFunction.label] &&
        baseAnalysisOptions[selectedFunction.label].map((fieldProps, i) =>
          renderItem(fieldProps, i, formInstance),
        )}
    </>
  )
}

FunctionSelection.propTypes = {
  formInstance: PropTypes.object.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }).isRequired,
  ).isRequired,
  name: PropTypes.string.isRequired,
  rules: PropTypes.array,
  label: PropTypes.string,
}

export default FunctionSelection
