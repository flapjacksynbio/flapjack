import React from 'react'
import PropTypes from 'prop-types'
// The dist bundle, not the source entry: webpack 5 drops the automatic Node
// polyfills, and plotly.js source pulls in `buffer` via traces/image.
import Plotly from 'plotly.js/dist/plotly'
import createPlotlyComponent from 'react-plotly.js/factory'
import InputNumber from '../Forms/InputNumber'
import { Row, Modal } from 'antd'
import {
  downloadJSON,
  screenLayout,
  paperLayout,
  downloadPNG,
  getPlotlyImageUrl,
  styleTraces,
} from './helper'
import Download from './Download'
import FormFactory from '../Forms/Form'
const PlotlyPlot = createPlotlyComponent(Plotly)

// Fields for customizing PNG plot attributes
const downloadPNGFields = [
  {
    name: 'fontSize',
    label: 'Font size',
    showLabel: true,
    type: 'number',
    RenderField: InputNumber,
    min: 1,
    step: 0.05,
    rules: [{ required: true }],
  },
  {
    name: 'width',
    label: 'Width',
    showLabel: true,
    type: 'number',
    RenderField: InputNumber,
    min: 1,
    addonAfter: 'inches',
    step: 0.05,
    rules: [{ required: true }],
  },
  {
    name: 'height',
    label: 'Height',
    showLabel: true,
    type: 'number',
    RenderField: InputNumber,
    min: 1,
    addonAfter: 'inches',
    step: 0.05,
    rules: [{ required: true }],
  },
  {
    name: 'lineWidth',
    label: 'Line width',
    showLabel: true,
    type: 'number',
    RenderField: InputNumber,
    min: 1,
    step: 0.05,
    rules: [{ required: true }],
  },
]

const Plot = ({ data = {}, title = '' }) => {
  const [modalVisible, setModalVisible] = React.useState(false)

  const traces = React.useMemo(() => styleTraces(data.data), [data])

  const layout = React.useMemo(
    () => ({ ...data.layout, ...screenLayout(data.layout) }),
    [data],
  )

  const paperWhiteLayout = React.useMemo(
    () => ({
      ...data.layout,
      ...paperLayout(4.5, 3, 6, data.layout),
    }),
    [data],
  )

  // Function called after submitting png attributes form
  const onGeneratePNG = async (values) => {
    const { fontSize, width, height, lineWidth } = values
    const imgUrl = await getPlotlyImageUrl(
      { ...data.layout, ...paperLayout(width, height, fontSize, data.layout) },
      styleTraces(data.data, false, lineWidth),
    )
    await downloadPNG(imgUrl, title)
    setModalVisible(false)
  }

  return (
    <>
      <PlotlyPlot
        style={{ width: '100%' }}
        useResizeHandler
        data={traces}
        layout={{ ...layout }}
      />
      <Row justify="end" style={{ width: '100%' }}>
        <Download
          onDownloadJSON={(screen = true) =>
            downloadJSON(
              {
                data: screen ? traces : styleTraces(data.data, false),
                layout: screen ? layout : paperWhiteLayout,
              },
              title,
            )
          }
          onDownloadPNG={() => setModalVisible(true)}
        />
      </Row>
      <Modal
        title="Download Plot as PNG"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={400}
      >
        <FormFactory
          name="PNG Form"
          submitText="Download"
          onSubmit={onGeneratePNG}
          initialValues={{
            fontSize: 6,
            width: 4.5,
            height: 3,
            lineWidth: 4,
          }}
          fields={downloadPNGFields}
        />
      </Modal>
    </>
  )
}

Plot.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.shape({
    data: PropTypes.array.isRequired,
    layout: PropTypes.object.isRequired,
  }).isRequired,
}

export default Plot
