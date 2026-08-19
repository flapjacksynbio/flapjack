"""Public identifiers and validation for analysis requests.

The browser historically used sentence-case labels while pyFlapjack and the
backend used title-case protocol values.  Keep accepting both, but expose one
canonical vocabulary to the computation and plotting layers.
"""

from copy import deepcopy
from math import isfinite


CANONICAL_ANALYSES = {
    'Velocity',
    'Mean Velocity',
    'Max Velocity',
    'Expression Rate (indirect)',
    'Expression Rate (direct)',
    'Expression Rate (inverse)',
    'Mean Expression',
    'Max Expression',
    'Induction Curve',
    'Heatmap',
    'Kymograph',
    'Alpha',
    'Rho',
    'Background Correct',
}

ALIASES = {name.casefold(): name for name in CANONICAL_ANALYSES}
ALIASES.update({
    'mean expression': 'Mean Expression',
    'max expression': 'Max Expression',
    'expression rate (direct)': 'Expression Rate (direct)',
    'expression rate (indirect)': 'Expression Rate (indirect)',
    'expression rate (inverse)': 'Expression Rate (inverse)',
})

NESTED_FUNCTIONS = {
    'Induction Curve': {'Mean Expression', 'Max Expression', 'Alpha', 'Rho'},
    'Heatmap': {'Mean Expression', 'Max Expression', 'Alpha', 'Rho'},
    'Kymograph': {
        'Expression Rate (direct)',
        'Expression Rate (indirect)',
        'Expression Rate (inverse)',
    },
}

BIOMASS_ANALYSES = {
    'Expression Rate (indirect)', 'Expression Rate (direct)',
    'Expression Rate (inverse)', 'Mean Expression', 'Max Expression',
    'Alpha', 'Rho',
}


class AnalysisError(ValueError):
    """A safe, structured failure that may be returned to API clients."""

    def __init__(self, code, message, stage='request_validation', **context):
        super().__init__(message)
        self.data = {
            'code': code,
            'message': message,
            'stage': stage,
            **{key: value for key, value in context.items() if value is not None},
        }


def canonical_identifier(value, field='type'):
    if not isinstance(value, str) or not value.strip():
        code = 'MISSING_ANALYSIS_TYPE' if field == 'type' else 'MISSING_ANALYSIS_FUNCTION'
        raise AnalysisError(code, f'An analysis {field} is required.', field=field)
    canonical = ALIASES.get(value.strip().casefold())
    if canonical is None:
        code = 'INVALID_ANALYSIS_TYPE' if field == 'type' else 'INVALID_ANALYSIS_FUNCTION'
        raise AnalysisError(
            code,
            f'Unknown analysis {field} {value!r}.',
            field=field,
            **({'analysis': value} if field == 'type' else {'function': value}),
        )
    return canonical


def normalize_analysis_params(params, signals=None):
    """Return a validated copy with canonical protocol identifiers."""
    if not isinstance(params, dict):
        raise AnalysisError(
            'MISSING_ANALYSIS_PARAMETERS',
            'Analysis parameters are required.',
            field='analysis',
        )
    normalized = deepcopy(params)
    analysis_type = canonical_identifier(normalized.get('type'), 'type')
    normalized['type'] = analysis_type

    function = normalized.get('function')
    if analysis_type in NESTED_FUNCTIONS:
        function = canonical_identifier(function, 'function')
        normalized['function'] = function
        if function not in NESTED_FUNCTIONS[analysis_type]:
            alternatives = ', '.join(sorted(NESTED_FUNCTIONS[analysis_type]))
            raise AnalysisError(
                'INVALID_ANALYSIS_FUNCTION',
                f'{function} cannot be used with {analysis_type}. Valid alternatives: {alternatives}.',
                analysis=analysis_type,
                function=function,
                field='function',
            )
    elif function:
        normalized['function'] = canonical_identifier(function, 'function')

    if not signals:
        raise AnalysisError(
            'MISSING_SIGNALS',
            'Select at least one signal to analyze.',
            analysis=analysis_type,
            field='signal',
        )

    effective = function or analysis_type
    if effective in BIOMASS_ANALYSES and not normalized.get('biomass_signal'):
        raise AnalysisError(
            'MISSING_BIOMASS_SIGNAL',
            f'{effective} requires a biomass signal.',
            analysis=analysis_type,
            function=function,
            field='biomass_signal',
        )
    if effective == 'Rho' and not normalized.get('ref_signal'):
        raise AnalysisError(
            'MISSING_REFERENCE_SIGNAL',
            'Rho requires a reference signal.',
            analysis=analysis_type,
            function=function,
            field='ref_signal',
        )
    if effective == 'Rho' and str(normalized.get('ref_signal')) not in {
        str(signal) for signal in signals
    }:
        raise AnalysisError(
            'MISSING_REFERENCE_SIGNAL',
            'The Rho reference signal must also be included in the selected signals.',
            analysis=analysis_type,
            function=function,
            field='ref_signal',
        )
    if analysis_type in {'Induction Curve', 'Kymograph'} and not normalized.get('analyte'):
        raise AnalysisError(
            'MISSING_ANALYTE',
            f'{analysis_type} requires an analyte.',
            analysis=analysis_type,
            field='analyte',
        )
    if analysis_type == 'Heatmap':
        missing = next((field for field in ('analyte1', 'analyte2') if not normalized.get(field)), None)
        if missing:
            raise AnalysisError(
                'MISSING_ANALYTE',
                'Heatmap requires two analytes.',
                analysis=analysis_type,
                field=missing,
            )

    smoothing_type = str(normalized.get('smoothing_type', 'savgol')).casefold()
    if smoothing_type not in {'savgol', 'lowess'}:
        raise AnalysisError(
            'INVALID_SMOOTHING_PARAMETER',
            f'Unknown smoothing type {smoothing_type!r}.',
            analysis=analysis_type,
            field='smoothing_type',
        )
    normalized['smoothing_type'] = smoothing_type
    for field in ('pre_smoothing', 'post_smoothing'):
        if field not in normalized:
            continue
        try:
            value = float(normalized[field])
        except (TypeError, ValueError):
            raise AnalysisError(
                'INVALID_SMOOTHING_PARAMETER',
                f'{field} must be numeric.', analysis=analysis_type, field=field,
            )
        if not isfinite(value) or value < 0 or (smoothing_type == 'lowess' and value > 1):
            expectation = 'between 0 and 1' if smoothing_type == 'lowess' else 'non-negative'
            raise AnalysisError(
                'INVALID_SMOOTHING_PARAMETER',
                f'{field} must be {expectation}; received {value}.',
                analysis=analysis_type,
                field=field,
            )
        normalized[field] = value if smoothing_type == 'lowess' else int(value)

    numeric_fields = {
        'bg_correction': float,
        'min_biomass': float,
        'ndt': float,
        'degr': float,
        'eps_L': float,
        'eps': float,
        'n_gaussians': int,
    }
    for field, cast in numeric_fields.items():
        if field not in normalized:
            continue
        try:
            value = cast(float(normalized[field])) if cast is int else cast(normalized[field])
        except (TypeError, ValueError):
            raise AnalysisError(
                'INVALID_PARAMETER', f'{field} must be numeric.',
                analysis=analysis_type, field=field,
            )
        if not isfinite(value) or (
            field in {'eps', 'eps_L', 'n_gaussians'} and value <= 0
        ):
            raise AnalysisError(
                'INVALID_PARAMETER', f'{field} must be finite and greater than zero.',
                analysis=analysis_type, field=field,
            )
        normalized[field] = value
    return normalized


def validate_dataframe(df, analysis_type=None):
    if df is None or len(df) == 0:
        raise AnalysisError(
            'EMPTY_QUERY_RESULT',
            'No measurements matched the selected data and signals.',
            analysis=analysis_type,
            stage='data_selection',
        )
    required = {'Sample', 'Signal_id', 'Time', 'Measurement'}
    if analysis_type in {'Induction Curve', 'Heatmap', 'Kymograph'}:
        required.add('Chemical_id')
    missing = sorted(required.difference(df.columns))
    if missing:
        raise AnalysisError(
            'MISSING_DATA_COLUMN',
            f'The measurement data is missing required column(s): {", ".join(missing)}.',
            analysis=analysis_type,
            stage='data_validation',
            field=missing[0],
        )


def warning(sample, analysis, stage, code, message, **context):
    def json_scalar(value):
        if hasattr(value, 'item'):
            try:
                return value.item()
            except (ValueError, TypeError):
                pass
        return value

    return {
        'sample': json_scalar(sample),
        'analysis': analysis,
        'stage': stage,
        'code': code,
        'message': message,
        **{
            key: json_scalar(value)
            for key, value in context.items()
            if value is not None
        },
    }
