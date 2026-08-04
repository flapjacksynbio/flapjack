# Smoothing in the rate analyses: what the code actually does

Prepared 2026-08-03 for team discussion. No code has been changed. The three
tracked entries in this area (the lowess crash, the zero pre-smoothing crash, and
the Rho shape mismatch) are held until this is settled, because the correct fix
for the first two depends on a decision that is scientific rather than technical.

Affects `flapjack_api/analysis/analysis.py`, methods `velocity` (line 202) and
`expression_rate_indirect` (line 273).

## Summary

Both methods contain a block that smooths the measurement series and then never
uses the result. The derivative is taken from the raw interpolation instead. The
`pre_smoothing` parameter is nonetheless not inert, because the same value is
reused as the window width of a Savitzky-Golay derivative filter, which is live.

So the situation is not "smoothing is broken". It is that one smoothing mechanism
is dead, a second is doing the work under the first one's parameter name, and the
choice between Savitzky-Golay and lowess only affects the dead one.

## What the code does

In `velocity`, with line numbers:

```python
238  if self.smoothing_param1 > 0:
241      sval = savgol_filter(val, int(self.smoothing_param1), 2, mode='interp')
245      z = lowess(val, time, frac=self.smoothing_param1); sval = z[:,1]
250  sval = interp1d(time, sval)      # last reference to sval anywhere
253  velocity = savgol_filter(ival(time), int(self.smoothing_param1), 2,
                              deriv=1, mode='interp')
```

`ival` is the interpolation of the raw values, built at line 236. `sval` is never
read after line 250. `expression_rate_indirect` has the identical shape at lines
318 to 346, and line 348 there is an explicitly commented-out
`#dvaldt = sval.derivative()(time)`, which indicates the smoothed path was
disconnected deliberately at some point rather than by accident.

## What this means numerically

**`pre_smoothing` does affect results.** It sets the window of the
Savitzky-Golay derivative at line 253. A Savitzky-Golay filter with `deriv=1`
fits a local polynomial and differentiates it analytically, so it produces a
smoothed derivative in one step. This is a standard and defensible technique for
differentiating noisy time series, and it is what the code is really doing.

**The separate pre-smoothing step is redundant with it.** Smoothing the series
and then taking a Savitzky-Golay derivative applies smoothing twice, with an
effective window wider than either. That is likely why the step was disconnected.

**Choosing lowess changes nothing about the result.** The derivative at line 253
is always Savitzky-Golay regardless of `smoothing_type`, so lowess only ever fed
the discarded `sval`. A user selecting lowess would, once the crash is fixed,
receive Savitzky-Golay output. The option is not implemented for these two
analyses in any meaningful sense.

**`post_smoothing` works as documented.** It is applied to the computed rate at
lines 256 to 260 and 357 to 361, and that path is live for both filter types.

## Consequences for published or in-progress results

Nothing already computed is wrong because of the dead code. The output is a
Savitzky-Golay smoothed derivative with window `pre_smoothing`, then optionally
smoothed again with window `post_smoothing`. That is a legitimate pipeline.

Two caveats worth raising with anyone who has used these analyses:

1. If someone selected lowess believing it changed the filtering, it did not.
   Their results are Savitzky-Golay. Whether the run crashed instead depends on
   the code path; the `NameError` fires only when `smoothing_type == 'lowess'`.
2. The parameter named `pre_smoothing` is really the derivative window. Anyone
   who reasoned about it as "smooth the signal first, then differentiate" was
   describing something the code does not do, though the effect on noise is
   qualitatively similar.

## The options, and what each costs

**Reconnect the smoothed series.** Differentiate `sval` instead of `ival`. This
matches the parameter name and the commented-out line. It double-smooths, so the
effective bandwidth narrows and existing results change wherever
`pre_smoothing > 0`. It also makes lowess meaningful, since the smoothed input
would then reach the derivative. Cost: every prior result computed with a
non-zero pre-smoothing becomes non-reproducible against the new code.

**Delete the dead block, keep the current pipeline.** No numerical change, ever.
The code then honestly says what it does. `smoothing_type` becomes meaningless
for these two analyses and should be hidden or removed from their parameter set
rather than offered and ignored. Cost: lowess is dropped here, and the
`pre_smoothing` name stays misleading unless it is renamed.

**Reconnect only for lowess.** Keep Savitzky-Golay differentiation as-is, and use
the lowess-smoothed series followed by a plain numerical derivative when lowess
is selected. This makes the filter choice real and leaves existing
Savitzky-Golay results untouched. Cost: two different code paths with different
numerical characteristics behind one parameter, which is harder to describe in a
methods section.

## Open questions for the team

1. Has anyone published or circulated results from `velocity` or
   `expression_rate_indirect` with a non-zero `pre_smoothing`? If so, changing
   the pipeline breaks reproducibility against that work and the change needs to
   be dated and described rather than made silently.
2. Was the smoothed path disconnected on purpose, and is the reason recorded
   anywhere? The commented-out line suggests a deliberate decision whose
   rationale is now lost.
3. Should `smoothing_type` be offered at all for these analyses if only one value
   has any effect?
4. Is `pre_smoothing` the right name for a derivative window? Renaming it would
   be clearer but is an API change affecting `pyFlapjack` and saved analyses.

## Separate defects in the same code, not blocked by the above

These are ordinary bugs and can be fixed independently of the decision.

- `sm` is never imported, so `sm.nonparametric.lowess` at lines 215 and 289
  raises `NameError` whenever lowess is selected. `statsmodels 0.10.2` is
  installed and already in `requirements.txt`.
- Lines 243, 259, 324 and 360 test a bare global `smoothing_type` instead of
  `self.smoothing_type`, which raises `NameError` before the branch can be taken.
- With `pre_smoothing = 0`, line 253 calls `savgol_filter(..., 0, 2, deriv=1)`.
  A window of zero is rejected by scipy, so the previously tracked fix of simply
  initialising `sval` would move the crash two lines down rather than remove it.
- Savitzky-Golay requires an odd window greater than the polynomial order. There
  is no validation, so an even `pre_smoothing` fails inside scipy with a message
  that does not name the parameter the user set.
