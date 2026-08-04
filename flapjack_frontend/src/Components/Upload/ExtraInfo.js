import React from 'react'
import SteppedFormFactory from '../Forms/SteppedForm'
import SelectOrCreate from '../Forms/SelectOrCreate'
import getFieldParams from './extraFieldParams'
import PropTypes from 'prop-types'
import { Progress } from 'antd'

/** Form for assay metadata sumbission */
const ExtraInfo = ({
  onSubmit,
  extraInfoFields,
  loading = false,
  assayId,
  progress = null,
}) => {
  const steps = Object.entries(extraInfoFields)
    .filter(([, fields]) => fields.length)
    .map(([type, fields]) => ({
      title: type,
      fields: fields.map((field, i) => ({
        name: `${type}-${i}`,
        label: field,
        showLabel: true,
        rules: [{ required: true }],
        RenderField: SelectOrCreate,
        extraCreationValues: { assays: [assayId] },
        ...getFieldParams(type),
      })),
    }))

  if (progress !== null) {
    return <Progress status="active" percent={Math.floor(100 * progress)} />
  }

  return (
    <SteppedFormFactory
      name="Metadata"
      onSubmit={onSubmit}
      submitText="Submit Metadata"
      steps={steps}
      loading={loading}
    />
  )
}

ExtraInfo.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  extraInfoFields: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  assayId: PropTypes.number.isRequired,
  progress: PropTypes.number,
}

export default ExtraInfo
