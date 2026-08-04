import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { List, Modal, Input, Button, Tag, Space, Typography, App } from 'antd'
import { DeleteOutlined, UserOutlined } from '@ant-design/icons'
import api from '../../api'

const { Text } = Typography

/**
 * Share dialog, on the Google Docs model: one field you type a person into, and
 * a list of who already has access. There is no picker to browse, because the
 * lookup endpoint resolves a single exact identifier and never lists accounts.
 */
const ShareStudyModal = ({ study, setModalStudy, onChanged }) => {
  const { message } = App.useApp()
  const [identifier, setIdentifier] = React.useState('')
  const [resolving, setResolving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [pending, setPending] = React.useState([])
  const [sharedWith, setSharedWith] = React.useState([])
  const [saving, setSaving] = React.useState(false)

  const isOpen = !_.isEmpty(study)
  const collaborators = React.useMemo(
    () => _.keyBy(study.collaborators || [], 'email'),
    [study.collaborators],
  )

  React.useEffect(() => {
    setIdentifier('')
    setPending([])
    setError(null)
    setSharedWith(study.shared_with || [])
  }, [study.id])

  const addPerson = async () => {
    const term = identifier.trim()
    if (!term) return
    setError(null)

    if (sharedWith.some((e) => e.toLowerCase() === term.toLowerCase())) {
      setError('That person already has access.')
      return
    }
    if (pending.some((p) => p.email.toLowerCase() === term.toLowerCase())) {
      setError('Already added below.')
      return
    }

    setResolving(true)
    try {
      const { results } = await api.get('user/', null, { identifier: term })
      const user = (results || [])[0]
      if (!user) {
        setError('No user found with that username or email.')
        return
      }
      if (sharedWith.some((e) => e.toLowerCase() === user.email.toLowerCase())) {
        setError('That person already has access.')
        return
      }
      setPending((list) => [...list, user])
      setIdentifier('')
    } catch {
      setError('Could not look that person up. Please try again.')
    } finally {
      setResolving(false)
    }
  }

  // The table owns this row, so the parent must refetch; local state alone is
  // discarded when the dialog closes.
  const patchSharedWith = (next, successMessage, onDone) => {
    setSaving(true)
    return api
      .patch(`study/${study.id}/`, { shared_with: next })
      .then(() => {
        setSharedWith(next)
        message.success(successMessage)
        if (onChanged) onChanged()
        if (onDone) onDone()
      })
      .catch(() => message.error('There was an error updating the study.'))
      .finally(() => setSaving(false))
  }

  const handleShare = () => {
    if (!pending.length) {
      setError('Add someone first.')
      return
    }
    const next = _.uniq([...sharedWith, ...pending.map((p) => p.email)]).sort()
    const names = pending.map((p) => p.username).join(', ')
    patchSharedWith(next, `Study shared with ${names}.`, () => setModalStudy({}))
  }

  const handleDelete = (email) => {
    const who = collaborators[email] ? collaborators[email].username : email
    patchSharedWith(_.without(sharedWith, email), `${who} no longer has access.`)
  }

  const renderPerson = (email) => (
    <List.Item
      actions={[
        <Button
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(email)}
          key={`share-remove-${email}`}
          aria-label={`Remove ${email}`}
        />,
      ]}
    >
      <List.Item.Meta
        avatar={<UserOutlined />}
        title={collaborators[email] ? collaborators[email].username : email}
        description={collaborators[email] ? email : null}
      />
    </List.Item>
  )

  return (
    <Modal
      open={isOpen}
      onCancel={() => setModalStudy({})}
      destroyOnHidden={true}
      title="Share study"
      okText="Share"
      cancelText="Done"
      onOk={handleShare}
      confirmLoading={saving}
      okButtonProps={{ disabled: !pending.length }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={identifier}
            placeholder="Username or email address"
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (error) setError(null)
            }}
            onPressEnter={addPerson}
            status={error ? 'error' : undefined}
            autoComplete="off"
          />
          <Button onClick={addPerson} loading={resolving} disabled={!identifier.trim()}>
            Add
          </Button>
        </Space.Compact>

        {error && <Text type="danger">{error}</Text>}

        {pending.length > 0 && (
          <Space wrap size={[4, 8]}>
            {pending.map((p) => (
              <Tag
                key={p.email}
                closable
                color="blue"
                onClose={() =>
                  setPending((list) => list.filter((x) => x.email !== p.email))
                }
              >
                {p.username}
              </Tag>
            ))}
          </Space>
        )}

        <div>
          <Text strong>People with access</Text>
          <List
            dataSource={sharedWith}
            renderItem={renderPerson}
            locale={{ emptyText: 'Only you' }}
          />
        </div>
      </Space>
    </Modal>
  )
}

ShareStudyModal.propTypes = {
  study: PropTypes.object.isRequired,
  setModalStudy: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
}

export default ShareStudyModal
