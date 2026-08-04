import React from 'react'
import FormFactory from '../Forms/Form'
import { Card, Row, Col, Typography, Button, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import './Authentication.scss'
import PropTypes from 'prop-types'
import api from '~/src/api'

const Login = ({ goToSignUp }) => {
  const [errors, setErrors] = React.useState([])

  const fields = [
    {
      name: 'username',
      label: 'Username or email',
      PrefixComponent: UserOutlined,
      rules: [{ required: true }],
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      PrefixComponent: LockOutlined,
      rules: [{ required: true }],
    },
  ]

  const showAlerts = (messages) => (
    <div style={{ marginBottom: 12 }}>
      {messages.map((msg, i) => (
        <Alert key={`login-err-${i}`} message={msg} type="error" closable />
      ))}
    </div>
  )

  const onSubmit = async ({ username, password }) => {
    try {
      await api.logIn({ username, password })
    } catch (e) {
      setErrors(['Credentials are invalid! Please try again.'])
    }
  }

  return (
    <Row align="middle" className="auth-form-container">
      <Col xs={22} md={16} lg={12}>
        <Card title="Sign in to Flapjack">
          {errors.length > 0 && showAlerts(errors)}
          <FormFactory
            name="Login"
            onSubmit={onSubmit}
            fields={fields}
            submitText="Sign in"
          />
          <Typography.Text>
            {"Don't have an account? "}
            <Button type="link" onClick={goToSignUp}>
              Sign up here!
            </Button>
          </Typography.Text>
        </Card>
      </Col>
    </Row>
  )
}

Login.propTypes = {
  goToSignUp: PropTypes.func.isRequired,
}

export default Login
