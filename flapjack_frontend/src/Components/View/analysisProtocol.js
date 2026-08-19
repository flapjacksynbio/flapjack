export const canonicalAnalysisValues = {
  None: 'None',
  'Max expression': 'Max Expression',
  'Mean expression': 'Mean Expression',
  'Mean Velocity': 'Mean Velocity',
  'Max Velocity': 'Max Velocity',
  Velocity: 'Velocity',
  'Expression rate (indirect)': 'Expression Rate (indirect)',
  'Expression rate (direct)': 'Expression Rate (direct)',
  'Expression Rate (inverse)': 'Expression Rate (inverse)',
  Rho: 'Rho',
  Alpha: 'Alpha',
  'Induction Curve': 'Induction Curve',
  Heatmap: 'Heatmap',
  Kymograph: 'Kymograph',
}

export const validNestedFunctions = {
  'Induction Curve': ['Mean Expression', 'Max Expression', 'Rho', 'Alpha'],
  Heatmap: ['Mean Expression', 'Max Expression', 'Rho', 'Alpha'],
  Kymograph: [
    'Expression Rate (direct)',
    'Expression Rate (indirect)',
    'Expression Rate (inverse)',
  ],
}

export const canonicalAnalysisValue = (label) => canonicalAnalysisValues[label] || label

export const validateAnalysisSelection = (analysis) => {
  if (!analysis || analysis.type === 'None') return null
  const alternatives = validNestedFunctions[analysis.type]
  if (alternatives && !alternatives.includes(analysis.function)) {
    return {
      field: 'function',
      message: `${analysis.function || 'The selected function'} cannot be used with ${
        analysis.type
      }. Valid alternatives: ${alternatives.join(', ')}.`,
    }
  }
  return null
}
