# Final fix wave report

## Files changed

- Resource editor resets on mount; farm structure now supports zone rename.
- Local-state migration preserves valid greenhouses with zero zones; active selection starts from the loaded active greenhouse and archives explicitly move to another active greenhouse.
- CSV cells beginning with a spreadsheet formula prefix, including after whitespace, are neutralized.
- Device filters derive a valid zone after a greenhouse switch; analytics labels describe saved configuration rather than live operation.
- Newly created plants hold unknown moisture, health, and AI confidence until data is recorded.
- Regression coverage was added for empty greenhouses, CSV formula injection, editor lifecycle, zone rename, truthful device language, selection initialization, and unknown crop readings.

## Verification

- `npm run test:unit` passed (40/40).
- `npm run lint` passed with no errors; 7 pre-existing warnings remain outside this wave.
- `npm run build` passed.
- `git diff --check` passed.

## Risks and scope

- Closing the resource editor discards unsaved draft state, matching its required reset-on-open behavior.
- A greenhouse with no active peers still has no active operational workspace after it is archived; this wave does not invent a cross-greenhouse fallback.
