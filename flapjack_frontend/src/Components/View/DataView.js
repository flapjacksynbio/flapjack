import React from 'react'
import { Row, Col, Empty, Typography, Progress, App } from 'antd'
import Selection from './Selection'
import PropTypes from 'prop-types'
import Plot from './Plot'
import { addPlotToTab } from '../../redux/actions/viewTabs'
import { connect } from 'react-redux'
import apiWebSocket from '../../api/apiWebSocket'
import './View.scss'
import { errorDescription, errorTitle, groupWarnings } from './analysisFeedback'

/**
 * Renderer for new View tab
 * @param {object} props
 * @param {string} props.title Tab title
 * @param {function(string)} props.onRename Function to change tab title
 * @param {object} props.plotData Contains data for showing a plotly plot
 * @param {function(plotId, plotData)} props.addPlot Function for creating a new plot and storing it in Redux store
 */
const DataView = ({ title, onRename, plotData, plotId, addPlot }) => {
  const { notification } = App.useApp()
  const [loadingData, setLoadingData] = React.useState(null)

  const onPlot = (values) => {
    createWebsocket(values)
  }

  // Request plot data to backend via websocjets
  const createWebsocket = (values) => {
    let structuredErrorHandled = false
    let connectionErrorHandled = false
    const showWarnings = (warnings = [], hasValidResults = true) => {
      if (!warnings.length) return
      const grouped = groupWarnings(warnings)
      notification.warning({
        message: `${warnings.length} analysis warning${warnings.length === 1 ? '' : 's'}`,
        duration: 0,
        description: (
          <div>
            <p>
              {hasValidResults
                ? 'Valid samples were plotted. Some samples were skipped.'
                : 'These sample-level problems prevented a valid result.'}
            </p>
            <details>
              <summary>Show sample details</summary>
              <ul>
                {grouped.map((warning) => (
                  <li
                    key={`${warning.code}-${warning.stage}-${warning.samples.join('-')}`}
                  >
                    {warning.message}
                    {warning.samples.length > 0 &&
                      ` (sample${
                        warning.samples.length === 1 ? '' : 's'
                      }: ${warning.samples.join(', ')})`}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ),
      })
    }

    apiWebSocket.connect('plot/plot', {
      onConnect(event, socket) {
        // Initialize progress bar
        setLoadingData(0)
        // Send plot parameters to backend
        socket.send(JSON.stringify({ type: 'plot', parameters: values }))
      },
      onReceiveHandlers: {
        // Update progress bar
        progress_update: (message) => setLoadingData(message.data.progress),
        // Create a plot with received data
        plot_data: ({ data }, event, socket) => {
          if (!data.figure) {
            addPlot(plotId, {})
            setLoadingData(null)
          } else {
            const figure = JSON.parse(data.figure)
            setLoadingData(null)
            if (figure && figure.data) {
              addPlot(plotId, figure)
            } else {
              addPlot(plotId, {})
            }
          }
          showWarnings(data.warnings)
          socket.close()
        },
        analysis_error: ({ data }, event, socket) => {
          structuredErrorHandled = true
          setLoadingData(null)
          if (process.env.NODE_ENV === 'development') {
            // Full structured context is intentionally available for GUI tests.
            console.error('Flapjack analysis error', data)
          }
          notification.error({
            message: errorTitle(data),
            description: (
              <span style={{ whiteSpace: 'pre-line' }}>{errorDescription(data)}</span>
            ),
            duration: 0,
          })
          showWarnings(data.warnings, false)
          socket.close(1000)
        },
      },
      onError(event, socket) {
        if (structuredErrorHandled || connectionErrorHandled) return
        connectionErrorHandled = true
        notification.error({
          message: 'Connection failed',
          description:
            'The analysis connection was interrupted. Check your connection and try again.',
          duration: 0,
        })
        setLoadingData(null)
        socket.close()
      },
    })
  }

  const renderPlot = () => {
    if (loadingData !== null) {
      // Progress bar
      return <Progress type="circle" percent={loadingData} />
    }

    if (plotData) {
      if (!plotData.data) {
        return <Empty description="No data available for your query." />
      }
      return <Plot data={plotData} title={title} />
    }

    return <Empty description="Select data to plot" />
  }

  return (
    <>
      <Typography.Title
        level={3}
        className="data-view-title"
        editable={{ onChange: onRename }}
      >
        {title}
      </Typography.Title>
      <Row gutter={[20, 20]} className="data-view-layout">
        <Col xs={24} lg={6} className="data-view-sidebar">
          <Selection onSubmit={onPlot} />
        </Col>
        <Col xs={24} lg={18} className="data-view-plot">
          <Row justify="center" className="data-view-plot-content">
            {renderPlot()}
          </Row>
        </Col>
      </Row>
    </>
  )
}

DataView.propTypes = {
  title: PropTypes.string.isRequired,
  onRename: PropTypes.func.isRequired,
  plotData: PropTypes.object,
  addPlot: PropTypes.func.isRequired,
  plotId: PropTypes.string.isRequired,
}

const mapDispatchToProps = (dispatch) => ({
  addPlot: (tabId, plotData) => dispatch(addPlotToTab(tabId, plotData)),
})

export default connect(null, mapDispatchToProps)(DataView)
