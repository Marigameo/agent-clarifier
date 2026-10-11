# Round 19 · Space between filled rows (plan, frozen before the change)

**Date:** 11 Oct 2026
**Brief (Mari):** when several rows are filled at once they look like they overlap; should there be space between them? "In multiple places."

**Exploration:** `design/explorations/02-row-spacing/` compared today, *Gap* and *Merge* (CSS injected into the live component).
**Mari's call: Gap** (Claude's recommendation).

## Why Gap (Claude's reasoning)

- One rule covers every case where fills meet: pick + pick, pick + hover, hover + focus, and the flagged review rows.
- Each answer stays its own object.
- Row heights don't change, so nothing shifts.
- Merge only joins rows in the *same* state, so a hovered row next to a pick still pinched, and two skipped questions on review read as one item.

## How

- Option rows and review rows get a 2px transparent top and bottom border, with the fill clipped to the padding box. Their block padding drops by 2px, so heights are unchanged: two filled neighbours show a 4px gap.
- The radius becomes `--clarify-radius-sm / (radius-sm + 2px)`, so the clipped fill keeps round 8px corners.
- Dividers move up 2px, onto the row boundary (the middle of the gap).
- The focus ring is an inset shadow, so it's drawn inside the padding box too and matches the fill.
- **Forced colors:** transparent borders are painted in the system text colour there (round 11's focus trick relies on it), so the 2px borders are reset to 0 with the old padding. Fills aren't drawn in contrast themes anyway.
