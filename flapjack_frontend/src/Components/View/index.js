import React from 'react'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { Empty, Button, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { v1 as uuid } from 'uuid'
import { connect } from 'react-redux'
import { createTab, editTab, deleteTab } from '../../redux/actions/viewTabs'
import DataView from './DataView'
import './View.scss'

const View = ({ tabs, createTab, editTab, deleteTab }) => {
  const location = useLocation()
  const [activeKey, setActiveKey] = React.useState(null)

  const onRenameTab = (title, tabId) => {
    const tab = tabs.find(({ id }) => id === tabId)
    if (!tab) return
    editTab({ ...tab, title })
  }

  React.useEffect(() => {
    const validTab = tabs.find(({ key }) => key === activeKey)
    if (!tabs.length) {
      setActiveKey(null)
    } else if (activeKey === null || !validTab) {
      setActiveKey(tabs[tabs.length - 1].key)
    }
  }, [tabs, activeKey])

  React.useEffect(() => {
    if (location.state || window.location.search) {
      onAddTab()
    }
    // eslint-disable-next-line
  }, [])

  const onAddTab = () => {
    const title = `Analysis ${tabs.length + 1}`
    const tabId = uuid()
    createTab({ title, id: tabId, key: tabId, closable: true, plotData: null })
    setActiveKey(tabId)
  }

  const onEditTab = (targetKey, action) => {
    if (action === 'add') onAddTab()
    else deleteTab(targetKey)
  }

  if (!tabs.length) {
    return (
      <Empty description="No plots have been created.">
        <Button type="primary" onClick={onAddTab} icon={<PlusOutlined />}>
          New analysis
        </Button>
      </Empty>
    )
  }

  return (
    <Tabs
      type="editable-card"
      activeKey={activeKey}
      onChange={setActiveKey}
      onEdit={onEditTab}
      items={tabs.map((tab) => ({
        key: tab.key,
        label: tab.title,
        closable: tab.closable,
        children: (
          <DataView
            title={tab.title}
            plotId={tab.id}
            plotData={tab.plotData}
            onRename={(name) => onRenameTab(name, tab.key)}
          />
        ),
      }))}
    />
  )
}

View.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      key: PropTypes.string.isRequired,
      closable: PropTypes.bool,
    }),
  ).isRequired,
  createTab: PropTypes.func.isRequired,
  editTab: PropTypes.func.isRequired,
  deleteTab: PropTypes.func.isRequired,
}

const mapDispatchToProps = (dispatch) => ({
  createTab: (tab) => dispatch(createTab(tab)),
  editTab: (tab) => dispatch(editTab(tab)),
  deleteTab: (tab) => dispatch(deleteTab(tab)),
})

const mapStateToProps = (state) => ({
  tabs: [...Object.values(state.viewTabs)],
})

export default connect(mapStateToProps, mapDispatchToProps)(View)
