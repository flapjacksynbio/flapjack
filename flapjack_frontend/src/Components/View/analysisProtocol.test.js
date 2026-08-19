import { canonicalAnalysisValue, validateAnalysisSelection } from './analysisProtocol'
import { errorDescription, errorTitle, groupWarnings } from './analysisFeedback'

test.each([
  ['Mean expression', 'Mean Expression'],
  ['Max expression', 'Max Expression'],
  ['Expression rate (direct)', 'Expression Rate (direct)'],
  ['Expression rate (indirect)', 'Expression Rate (indirect)'],
  ['Expression Rate (inverse)', 'Expression Rate (inverse)'],
])('uses canonical protocol value for %s', (label, canonical) => {
  expect(canonicalAnalysisValue(label)).toBe(canonical)
})

test('rejects an incompatible nested function with alternatives', () => {
  const error = validateAnalysisSelection({
    type: 'Kymograph',
    function: 'Mean Expression',
  })
  expect(error.field).toBe('function')
  expect(error.message).toContain('Expression Rate (direct)')
})

test('formats structured server errors with stage and correlation id', () => {
  const error = {
    code: 'PLOTTING_FAILED',
    stage: 'plotting',
    analysis: 'Heatmap',
    message: 'No finite values',
    error_id: 'abc-123',
  }
  expect(errorTitle(error)).toBe('Plotting failed')
  expect(errorDescription(error)).toContain('Error ID: abc-123')
})

test('groups repeated warnings and retains sample details', () => {
  const grouped = groupWarnings([
    { code: 'INSUFFICIENT_DATA', stage: 'fit', message: 'Too short', sample: 1 },
    { code: 'INSUFFICIENT_DATA', stage: 'fit', message: 'Too short', sample: 2 },
  ])
  expect(grouped).toHaveLength(1)
  expect(grouped[0].samples).toEqual([1, 2])
})
