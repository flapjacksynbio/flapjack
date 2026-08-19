export const errorTitle = ({ stage, code } = {}) => {
  if (stage === 'request_validation') return 'Check the analysis selection'
  if (stage === 'plotting') return 'Plotting failed'
  if (stage === 'normalization') return 'Normalization failed'
  if (stage === 'server' || code === 'UNEXPECTED_SERVER_ERROR') {
    return 'Unexpected server error'
  }
  return 'Analysis failed'
}

export const errorDescription = (error = {}) => {
  const context = [
    error.analysis && `Analysis: ${error.analysis}`,
    error.function && `Function: ${error.function}`,
    error.stage && `Stage: ${error.stage}`,
    error.message,
    error.error_id && `Error ID: ${error.error_id}`,
  ].filter(Boolean)
  return context.join('\n')
}

export const groupWarnings = (warnings = []) =>
  Object.values(
    warnings.reduce((groups, item) => {
      const key = `${item.code}|${item.stage}|${item.message}`
      if (!groups[key]) groups[key] = { ...item, samples: [] }
      if (item.sample !== undefined && !groups[key].samples.includes(item.sample)) {
        groups[key].samples.push(item.sample)
      }
      return groups
    }, {}),
  )
