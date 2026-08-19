from unittest import TestCase

from analysis.contracts import AnalysisError, normalize_analysis_params


class AnalysisContractTests(TestCase):
    def test_sentence_case_aliases_are_canonicalized(self):
        aliases = {
            'Mean expression': 'Mean Expression',
            'Max expression': 'Max Expression',
            'Expression rate (direct)': 'Expression Rate (direct)',
            'Expression rate (indirect)': 'Expression Rate (indirect)',
            'Expression rate (inverse)': 'Expression Rate (inverse)',
        }
        for alias, canonical in aliases.items():
            with self.subTest(alias=alias):
                params = {'type': alias}
                if 'Expression Rate' in canonical or canonical in {
                    'Mean Expression', 'Max Expression'
                }:
                    params['biomass_signal'] = 9
                self.assertEqual(
                    normalize_analysis_params(params, [1])['type'], canonical
                )

    def test_nested_function_is_canonicalized(self):
        params = normalize_analysis_params({
            'type': 'Induction Curve',
            'function': 'Mean expression',
            'analyte': 4,
            'biomass_signal': 9,
        }, [1])
        self.assertEqual(params['function'], 'Mean Expression')

    def test_incompatible_nested_function_has_stable_error(self):
        with self.assertRaises(AnalysisError) as raised:
            normalize_analysis_params({
                'type': 'Kymograph',
                'function': 'Mean Expression',
                'analyte': 4,
            }, [1])
        self.assertEqual(raised.exception.data['code'], 'INVALID_ANALYSIS_FUNCTION')
        self.assertEqual(raised.exception.data['field'], 'function')

    def test_unknown_identifier_has_stable_error(self):
        with self.assertRaises(AnalysisError) as raised:
            normalize_analysis_params({'type': 'Not an analysis'}, [1])
        self.assertEqual(raised.exception.data['code'], 'INVALID_ANALYSIS_TYPE')

    def test_required_signal_and_rho_parameters(self):
        with self.assertRaises(AnalysisError) as raised:
            normalize_analysis_params({'type': 'Velocity'}, [])
        self.assertEqual(raised.exception.data['code'], 'MISSING_SIGNALS')

        with self.assertRaises(AnalysisError) as raised:
            normalize_analysis_params({'type': 'Rho', 'biomass_signal': 1}, [2])
        self.assertEqual(raised.exception.data['code'], 'MISSING_REFERENCE_SIGNAL')

    def test_lowess_fraction_is_validated(self):
        with self.assertRaises(AnalysisError) as raised:
            normalize_analysis_params({
                'type': 'Velocity',
                'smoothing_type': 'lowess',
                'pre_smoothing': 21,
            }, [1])
        self.assertEqual(raised.exception.data['code'], 'INVALID_SMOOTHING_PARAMETER')
