import React from 'react'
import { Upload, Form, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'

/**
 * Ant Design based file input. Only allows one file to be added to the form (per FileInput)
 */
const FileInput = ({ label, name, rules = {}, dependencies = [] }) => {
  const [fileList, setFileList] = React.useState([])

  // Dummy request for Ant Design Upload component
  const dummyRequest = ({ onSuccess }) => {
    setTimeout(() => {
      onSuccess('ok')
    }, 0)
  }

  // File validation rules
  const baseRules = [
    {
      validator(rule, value) {
        if (!value) return Promise.reject('No files selected.')
        const { fileList } = value
        if (fileList.length === 0) {
          return Promise.reject('No files selected.')
        } else if (fileList.length > 1) {
          return Promise.reject('Too many files.')
        }
        return Promise.resolve()
      },
    },
  ]

  // Manage files to be uploaded to be either 0 or 1.
  const onChange = ({ fileList }) => {
    if (!fileList) {
      setFileList([])
      return
    }
    // Get latest uploaded file
    setFileList(fileList.slice(-1))
  }

  return (
    <Form.Item
      name={name}
      rules={[...baseRules, ...rules]}
      label={label}
      valuePropName="file"
      dependencies={dependencies}
    >
      <Upload
        name={name}
        multiple={false}
        listType="picture"
        customRequest={dummyRequest}
        onChange={onChange}
        fileList={fileList} // Control files within component
        style={{ maxWidth: 100 }}
      >
        <Button>
          <UploadOutlined /> Upload
        </Button>
      </Upload>
    </Form.Item>
  )
}

FileInput.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  rules: PropTypes.array,
  dependencies: PropTypes.arrayOf(PropTypes.string),
}

export default FileInput
