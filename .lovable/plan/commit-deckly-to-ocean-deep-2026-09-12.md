# Commit Knowly to Ocean Deep

## Scope
- Replace every warm accent, label, gradient, chart, deck swatch, status color, and accessibility reference with a coordinated blue or cyan-blue equivalent.
- Remove legacy “Ember” naming from shared styles and visible settings while safely mapping older saved accent choices to Ocean.
- Restyle the standalone error page to match Ocean Deep, while preserving Google’s official multicolor logo.
- Verify all relevant screens at desktop and mobile sizes, then run a final repository scan for remaining warm-color traces.

## Technical details
- Consolidate semantic color tokens in `src/styles.css` around deep navy surfaces and a controlled blue spectrum.
- Keep semantic roles distinguishable through lightness and saturation rather than warm hues.
- Update accent presets and deck swatches without changing saved-data shapes or app behavior.
- Replace remaining legacy utility names and copy, then validate rendering and diagnostics.
