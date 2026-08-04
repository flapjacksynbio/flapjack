import _ from 'lodash'
import Plotly from 'plotly.js/dist/plotly'

/**
 * Helper for downloading an object as a JSON file
 * @param {Object} jsonObject Object to download as JSON
 * @param {string} filename File name
 */
export const downloadJSON = (jsonObject, filename) => {
  const json = JSON.stringify(jsonObject)
  const blob = new Blob([json], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('download', `${filename}.json`)
  link.setAttribute('href', url)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Generates a plotly image url
 * @param {Object} layout Plotly layout argument
 * @param {Object[]} data Plotly data within the plot
 */
export const getPlotlyImageUrl = async (layout, data) => {
  const tempElement = document.createElement('div')
  tempElement.setAttribute('id', 'temp_plotly_div')
  document.body.appendChild(tempElement)

  const plot = await Plotly.newPlot('temp_plotly_div', data, layout)

  const imgUrl = await Plotly.toImage(plot, { format: 'png' })

  tempElement.remove()
  return imgUrl
}

/**
 * Helper for downloading a plotly plot as a PNG file
 * @param {string} imageUrl Image url (url or base64 string)
 * @param {string} filename File name
 */
export const downloadPNG = async (imageUrl, filename) => {
  const link = document.createElement('a')
  link.setAttribute('download', `${filename}.png`)
  link.setAttribute('href', imageUrl)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Get the styles of the traces for a plotly plot
 * @param {boolean} screen Wether to get screen or print style
 */
const traceStyles = (screen = true, lineWidth = null) => ({
  scatter: {
    marker: { size: 6 },
    line: { width: lineWidth || (screen ? 1 : 3) },
  },
  line: { marker: { size: 6 }, line: { width: lineWidth || (screen ? 1 : 3) } },
})

/**
 * Get plotly screen layout argument
 * @param {string} title
 * @param {number} rows
 * @param {number} columns
 */
export const screenLayout = (baseLayout = {}) => {
  const font_size = 10

  const axes = Object.entries(baseLayout).reduce((acc, [key, value]) => {
    if (!key.match(/^(x|y)axis\d*$/)) return acc
    const title = value.title || {}
    const font = title.font || {}
    const tickfont = value.tickfont || {}
    return {
      ...acc,
      [key]: {
        ...value,
        title: { ...title, font: { ...font, size: font_size } },
        tickfont: { ...tickfont, size: font_size },
        automargin: true,
      },
    }
  }, {})

  return {
    autosize: true,
    paper_bgcolor: 'rgb(255,255,255)',
    template: 'plotly',
    ...axes,
  }
}

/**
 * Get plotly print layout argument
 * @param {string} title
 * @param {number} width measured in inches
 * @param {number} height measured in inches
 * @param {number} fontSize
 * @param {object=} baseLayout Object containing a base layout for the plot. If provided, must specify axes for all subplots.
 */
export const paperLayout = (width = 3.3, height = 5, fontSize = 6, baseLayout = {}) => {
  const _width = width * 300
  const _height = height * 300
  const _font_size = (fontSize * 300) / 72

  const axes = Object.entries(baseLayout).reduce((acc, [key, value]) => {
    if (!key.match(/^(x|y)axis\d*$/)) return acc
    const title = value.title || {}
    const font = title.font || {}
    const tickfont = value.tickfont || {}
    return {
      ...acc,
      [key]: {
        ...value,
        title: { ...title, font: { ...font, size: _font_size } },
        tickfont: { ...tickfont, size: _font_size },
        linewidth: 3,
        automargin: true,
        showgrid: false,
        zeroline: false,
      },
    }
  }, {})

  const annotations = baseLayout.annotations || []

  return {
    autosize: false,
    width: _width,
    height: _height,
    margin: { ...baseLayout.margin, l: 50, r: 50, b: 50, t: 50, pad: 0 },
    paper_bgcolor: 'rgb(255,255,255)',
    template: 'simple_white',
    font: { ...baseLayout.font, size: _font_size },
    annotations: annotations.map((annotation) => ({
      ...annotation,
      font: { ...annotation.font, size: _font_size },
    })),
    ...axes,
  }
}

/**
 * Modify plotly trace styles
 * @param {Object[]} data
 * @param {boolean} screen Wether to get screen or print style
 */
export const styleTraces = (data, screen = true, lineWidth = null) => {
  const styles = traceStyles(screen, lineWidth)
  return data.map((trace) => {
    let result = trace
    if (styles[trace.type]) {
      result = _.merge({}, trace, styles[trace.type])
    }

    if (result.fill === 'toself') {
      result.line = { ...result.line, width: 0 }
    }

    return result
  })
}
