import React from 'react'
import { Form, Button } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'
import Field from './Field'
import './Form.scss'

const SteppedFormFactory = ({
  name,
  steps,
  onSubmit,
  style,
  submitText = 'Submit',
  loading = false,
}) => {
  const [current, setCurrent] = React.useState(0)
  const [form] = Form.useForm()

  const validateStep = async (i) => {
    const fieldNames = steps[i].fields.map(({ name }) => name)
    return form
      .validateFields(fieldNames)
      .then(() => true)
      .catch(() => false)
  }

  const goToNext = async (i) => {
    const valid = await validateStep(i)
    if (valid) setCurrent((j) => j + 1)
  }

  const goTo = async (i) => {
    for (let j = 0; j < i; j++) {
      const valid = await validateStep(j)
      if (!valid) return
    }
    setCurrent(i)
  }

  const renderStep = (i) => {
    const { fields, title } = steps[i]
    return (
      <div style={{ display: current === i ? 'block' : 'none' }} key={title}>
        <div className="step-card">
          {fields.map((field) => (
            <Field {...field} key={`form-${name}-${field.name}`} formInstance={form} />
          ))}
          <Form.Item>
            <div className="step-buttons">
              {i !== steps.length - 1 && (
                <Button type="primary" onClick={() => goToNext(i)}>
                  Next
                </Button>
              )}
              {i === steps.length - 1 && (
                <Button type="primary" htmlType="submit" disabled={loading}>
                  {loading ? <LoadingOutlined spin /> : submitText}
                </Button>
              )}
              {i > 0 && (
                <Button onClick={() => setCurrent((i) => i - 1)}>Previous</Button>
              )}
            </div>
          </Form.Item>
        </div>
      </div>
    )
  }

  return (
    <Form
      name={name}
      onFinish={onSubmit}
      style={style}
      className="flapjack-form"
      layout="vertical"
      form={form}
    >
      {/* E2S-style step indicator */}
      <div className="e2s-stepper" onClick={(e) => e.preventDefault()}>
        {steps.map(({ title }, i) => (
          <React.Fragment key={title}>
            <button
              type="button"
              className={`e2s-step-node${
                i === current ? ' active' : i < current ? ' completed' : ''
              }`}
              onClick={() => goTo(i)}
            >
              <div className="e2s-step-circle">{i + 1}</div>
              <div className="e2s-step-label">{title}</div>
            </button>
            {i < steps.length - 1 && (
              <div className={`e2s-step-line${i < current ? ' completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="form-step-content">{steps.map((_, i) => renderStep(i))}</div>
    </Form>
  )
}

SteppedFormFactory.propTypes = {
  name: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      fields: PropTypes.array.isRequired,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  style: PropTypes.object,
  submitText: PropTypes.string,
  loading: PropTypes.bool,
}

export default SteppedFormFactory
