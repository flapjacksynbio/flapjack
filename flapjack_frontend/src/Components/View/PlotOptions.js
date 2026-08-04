import React from 'react'
import PropTypes from 'prop-types'
import { Row, Col, Typography, Select } from 'antd'

const PlotOptions = ({ fields }) => (
  <>
    {fields.map((field) => (
      <Row key={field.name} style={{ marginBottom: 10 }}>
        <Col span={10}>
          <Typography.Text>{field.name}</Typography.Text>
        </Col>
        <Col span={14}>
          <Select
            value={field.selected}
            onChange={field.setSelected}
            style={{ width: '100%' }}
            options={field.options.map((value) => ({ value, label: value }))}
          />
        </Col>
      </Row>
    ))}
  </>
)

PlotOptions.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
      selected: PropTypes.string.isRequired,
      setSelected: PropTypes.func.isRequired,
    }),
  ),
}

export default PlotOptions
