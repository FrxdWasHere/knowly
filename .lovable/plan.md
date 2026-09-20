# Responsive widget layout cleanup

## What will change
- Reflow the main dashboard into a denser responsive grid so visible widgets fill each row without stranded columns.
- Make Spaced Repetition span the full available dashboard width and reorganize its ring, forecast, maturity mix, and deck queue to use horizontal space on larger screens while stacking cleanly on phones.
- Tighten other widget-heavy views where fixed columns or wrapping currently create gaps, especially Statistics, Goals & Streaks, Focus Timer, and summary-card grids.
- Preserve every existing widget, action, offline behavior, visual theme, and hide/reset setting.

## Responsive behavior
- Phones and portrait layouts: single-column content, with compact summary grids only where labels remain readable.
- Tablets and landscape layouts: two-column structures that avoid narrow side panels and oversized empty areas.
- Wide desktop: balanced multi-column rows with full-width charts and appropriately wider primary widgets.

## Verification
- Check the affected pages at phone portrait, phone landscape, tablet portrait, tablet landscape, and wide desktop sizes.
- Confirm there is no horizontal overflow, clipped text, overlapping controls, or unexpected blank grid cells.
- Confirm the app still builds and loads without browser errors.

## Technical details
- Use intrinsic CSS grids (`minmax`, responsive spans, and dense placement where safe) rather than fixed pixel widths.
- Keep `min-w-0` on shrinkable content and `shrink-0` on rings/icons/actions.
- Change presentation only; study data and scheduling logic remain untouched.
