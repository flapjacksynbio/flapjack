import React from 'react'
import PropTypes from 'prop-types'
import { Form, Button } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import Field from './Field'
import './Form.scss'

/**
 * Factory for creating antd forms
 * @param {object} props
 * @param {string} props.name Form name.
 * @param {function(object): undefined} props.onSubmit Callback when form is submitted.
 * @param {Object} props.style Style for Form component.
 * @param {String} props.submitText Text in form submit button.
 * @param {Object} props.initialValues Object containing initial values for fields.
 * @param {boolean} props.loading Whether to show a loading indicator or not.
 * @param {('horizontal' | 'vertical' | 'inline')} props.layout Whether to show a loading indicator or not.
 * @param {{RenderField, ...props}[]} props.fields Fields to be rendered in the form.
 * @param {function(props): JSX} props.fields[].RenderField Optional. If provided, will be used to render the field,
 * otherwise, a basic input will be rendered.
 * @param {Object} props.fields[].props Props used for rendering the field.
 */
const FormFactory = ({
  name,
  onSubmit = () => null,
  fields,
  style = {},
  submitText = 'Submit',
  initialValues = {},
  loading = false,
  layout = 'vertical',
}) => {
  const [formInstance] = Form.useForm()
  return (
    <Form
      form={formInstance}
      name={name}
      onFinish={onSubmit}
      style={style}
      className="flapjack-form"
      initialValues={initialValues}
      layout={layout}
    >
      {fields.map((field) => (
        <Field
          {...field}
          key={`form-${name}-${field.name}`}
          formInstance={formInstance}
        />
      ))}
      <Form.Item>
        <Button type="primary" htmlType="submit" disabled={loading} block>
          {loading ? <LoadingOutlined spin /> : submitText}
        </Button>
      </Form.Item>
    </Form>
  )
}

FormFactory.propTypes = {
  name: PropTypes.string.isRequired,
  onSubmit: PropTypes.func,
  fields: PropTypes.arrayOf(PropTypes.shape(Field.propTypes)),
  style: PropTypes.object,
  submitText: PropTypes.string,
  initialValues: PropTypes.object,
  loading: PropTypes.bool,
  layout: PropTypes.oneOf(['horizontal', 'vertical', 'inline']),
}

export default FormFactory
