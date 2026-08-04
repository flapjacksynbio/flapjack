import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Card, Form, Input, Button, Typography, Space, App } from 'antd'
import api from '../../api'
import { receiveAccessTokens, setUserInfo } from '../../redux/actions/session'
import './Account.scss'

const { Title, Paragraph, Text } = Typography

/** Maps a DRF 400 body onto the fields that produced it. */
const applyServerErrors = (form, err) => {
  const body = err && err.data
  if (!body || typeof body !== 'object') return false
  const fields = Object.entries(body)
    .filter(([name]) => form.getFieldInstance(name) !== undefined)
    .map(([name, errors]) => ({
      name,
      errors: Array.isArray(errors) ? errors : [String(errors)],
    }))
  if (!fields.length) return false
  form.setFields(fields)
  return true
}

const AccountSection = ({
  title,
  description,
  current,
  fields,
  submitText,
  onSubmit,
}) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = React.useState(false)

  const handleFinish = async (values) => {
    setSaving(true)
    try {
      const successText = await onSubmit(values)
      message.success(successText)
      form.resetFields()
    } catch (err) {
      if (!applyServerErrors(form, err)) {
        message.error('There was an error saving that change.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={title} className="account-card">
      {description && <Paragraph type="secondary">{description}</Paragraph>}
      {current && (
        <div className="account-current">
          <Text type="secondary">{current.label}</Text>
          <Text strong>{current.value}</Text>
        </div>
      )}
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        {fields.map(({ name, label, type, autoComplete }) => (
          <Form.Item
            key={name}
            name={name}
            label={label}
            rules={[{ required: true, message: `${label} is required` }]}
          >
            {type === 'password' ? (
              <Input.Password autoComplete={autoComplete} />
            ) : (
              <Input autoComplete={autoComplete} />
            )}
          </Form.Item>
        ))}
        <Button type="primary" htmlType="submit" loading={saving} block>
          {submitText}
        </Button>
      </Form>
    </Card>
  )
}

AccountSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  current: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }),
  fields: PropTypes.array.isRequired,
  submitText: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

const Account = ({ session, onTokens, onUserInfo }) => (
  <div className="account-page">
    <Title level={2} className="page-title">
      Account
    </Title>
    <Paragraph type="secondary">
      Signed in as {session.user ? session.user.username : 'your account'}.
    </Paragraph>

    <Space direction="vertical" size="large" className="account-sections">
      <AccountSection
        title="Change password"
        description="Other devices will be signed out."
        submitText="Change password"
        fields={[
          {
            name: 'current_password',
            label: 'Current password',
            type: 'password',
            autoComplete: 'current-password',
          },
          {
            name: 'new_password',
            label: 'New password',
            type: 'password',
            autoComplete: 'new-password',
          },
          {
            name: 'new_password2',
            label: 'Confirm new password',
            type: 'password',
            autoComplete: 'new-password',
          },
        ]}
        onSubmit={async (values) => {
          // The change revokes every refresh token, including this one, so the
          // replacements come back with the response.
          const res = await api.post('auth/change_password/', values)
          onTokens({ access: res.access, refresh: res.refresh })
          return res.detail
        }}
      />

      <AccountSection
        title="Change email"
        description="Used to sign in and to share studies with you."
        current={{
          label: 'Current',
          value: (session.user && session.user.email) || 'Unknown',
        }}
        submitText="Change email"
        fields={[
          {
            name: 'current_password',
            label: 'Current password',
            type: 'password',
            autoComplete: 'current-password',
          },
          { name: 'email', label: 'New email', autoComplete: 'email' },
        ]}
        onSubmit={async (values) => {
          const res = await api.post('auth/change_email/', values)
          onUserInfo({ ...session.user, email: res.email })
          return res.detail
        }}
      />

      <AccountSection
        title="Change username"
        description="Collaborators find you by username or email when sharing."
        current={{
          label: 'Current',
          value: (session.user && session.user.username) || 'Unknown',
        }}
        submitText="Change username"
        fields={[
          {
            name: 'current_password',
            label: 'Current password',
            type: 'password',
            autoComplete: 'current-password',
          },
          { name: 'username', label: 'New username', autoComplete: 'username' },
        ]}
        onSubmit={async (values) => {
          const res = await api.post('auth/change_username/', values)
          onUserInfo({ ...session.user, username: res.username })
          return res.detail
        }}
      />
    </Space>
  </div>
)

Account.propTypes = {
  session: PropTypes.object.isRequired,
  onTokens: PropTypes.func.isRequired,
  onUserInfo: PropTypes.func.isRequired,
}

const mapStateToProps = ({ session }) => ({ session })
const mapDispatchToProps = (dispatch) => ({
  onTokens: (tokens) => dispatch(receiveAccessTokens(tokens)),
  onUserInfo: (user) => dispatch(setUserInfo(user)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Account)
