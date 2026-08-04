import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dropdown } from 'antd'
import {
  DownloadOutlined,
  DesktopOutlined,
  FileOutlined,
  FileImageOutlined,
} from '@ant-design/icons'

const Download = ({ onDownloadJSON, onDownloadPNG }) => {
  const items = [
    {
      key: 'screen',
      icon: <DesktopOutlined />,
      label: 'Screen format',
      onClick: onDownloadJSON,
    },
    {
      key: 'paper',
      icon: <FileOutlined />,
      label: 'Paper format',
      onClick: () => onDownloadJSON(false),
    },
    {
      key: 'png',
      icon: <FileImageOutlined />,
      label: 'PNG',
      onClick: onDownloadPNG,
    },
  ]

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button icon={<DownloadOutlined />}>Download</Button>
    </Dropdown>
  )
}

Download.propTypes = {
  onDownloadJSON: PropTypes.func.isRequired,
  onDownloadPNG: PropTypes.func.isRequired,
}

export default Download
