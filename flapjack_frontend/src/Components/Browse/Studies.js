import React from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import { Space, Button, App, Tag } from 'antd'
import api from '../../api'
import BrowseTable from './BrowseTable'
import ShareStudyModal from './ShareStudyModal'
import DropdownButton from '../HelperComponents/DropdownButton'
import {
  nameColumn,
  idColumn,
  descriptionColumn,
  doiColumn,
  actionsColumn,
} from './columns'

const Studies = ({ search }) => {
  const { message } = App.useApp()
  const history = useHistory()
  const [modalStudy, setModalStudy] = React.useState({})
  const [refreshKey, setRefreshKey] = React.useState(0)

  const renderActions = (text, record) => {
    const handleViewClick = () => {
      // Redirect to View screen with selected parameters
      history.push({
        pathname: '/view',
        state: { study: { id: record.id, name: record.name } },
      })
    }

    const notPublic = record.public ? 'private' : 'public'
    const manageOptions = {
      share: {
        label: 'Share',
        onClick: () => setModalStudy(record),
      },
      'toggle-public': {
        label: `Make ${notPublic}`,
        onClick: () =>
          api
            .patch(`study/${record.id}`, { public: !record.public })
            .then(() => history.go(0))
            .catch(() => message.error('There was an error updating the study.')),
      },
      delete: {
        label: 'Delete',
        onClick: () =>
          api
            .delete(`study/${record.id}`)
            .then(() => history.go(0))
            .catch(() => message.error('There was an error deleting the study.')),
      },
    }

    const handleLeave = () =>
      api
        .post(`study/${record.id}/leave`)
        .then(({ detail }) => {
          message.success(detail)
          setRefreshKey((key) => key + 1)
        })
        .catch(() => message.error('There was an error leaving the study.'))

    return (
      <Space wrap>
        <Button onClick={handleViewClick}>Data viewer</Button>
        {record.is_owner && <DropdownButton label={'Manage'} options={manageOptions} />}
        {!record.is_owner && record.is_shared_with_me && (
          <Button onClick={handleLeave}>Leave</Button>
        )}
      </Space>
    )
  }

  const columns = [
    {
      ...nameColumn(),
      render: (name, record) => (
        <Space size={8}>
          {name}
          {record.public && <Tag color="blue">Public</Tag>}
        </Space>
      ),
    },
    idColumn(),
    descriptionColumn(),
    doiColumn(),
    actionsColumn(renderActions),
  ]

  return (
    <>
      <BrowseTable
        columns={columns}
        dataUrl="study/"
        refreshKey={refreshKey}
        search={search}
        emptyText="A study groups the assays from one experiment."
      />
      <ShareStudyModal
        study={modalStudy}
        setModalStudy={setModalStudy}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </>
  )
}

Studies.propTypes = {
  search: PropTypes.string,
}

export default Studies
