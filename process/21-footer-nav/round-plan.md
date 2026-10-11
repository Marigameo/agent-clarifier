# Round 21 · Navigation in the footer, dashes that say more (plan, frozen before the change)

**Date:** 11 Oct 2026
**Brief (Mari):** a suggestion from another session: larger targets for the progress dashes; move "2 of 4" to the footer?; Back at the top or the bottom? Insights first, then a second session's counter-arguments, then its "Claude-style ‹ 2 of 4 › in the header, drop the dashes" proposal. **Mari's call: go ahead with Claude's plan.**

## Why (Claude, with measurements)

- **The card is bottom-anchored** (it sits in the composer's slot or docks above it). When steps differ in height, the top edge moves and the footer stays. Measured on the hotel questions: Back (top) at 586 → 581 → **743** px. The footer stayed at 903 (except one 28px shift on a step with no buttons).
  - So a control people click repeatedly belongs on the bottom edge. This also rules out a header pager.
- **The title jumped ~38px** between step 1 (no Back) and step 2 (Back before the title): a break of the one-inline-edge rule.
- **The footer's left side is the status slot** (toasts, the limit notice, pick counts). So the step count stays in the header, and Back must sit *outside* that slot, or it would vanish during a toast.
- **Dashes:**
  - Their click area on a mouse was 18×24px with centres 18px apart, under WCAG's 24px target size.
  - No hover state, so there was nothing to discover.
  - They're coloured by position, not status: the current step looked answered, and after going Back, answered later steps looked unvisited (while still clickable).
  - Skipped steps were already clickable.

## Decided

| What | Detail |
|---|---|
| **Back moves to the footer, bottom-left**, before the dashes | Left means back, right means forward (Skip, Continue). Grouped with the dashes (also "go back"). The ← key works as before. Its glyph sits on the card's 20px edge. Outside the toast slot. Review gets it too. |
| **Step 1: Back is shown dimmed** (`aria-disabled`, still focusable), not hidden | Nothing shifts between steps. Still focusable because pressing Back from step 2 lands focus on it as it becomes unavailable (round 11: disabling a focused button drops focus to the page). |
| **Back by button keeps focus on Back** in the new step | Otherwise focus jumps to an option row and a second Enter would *pick* something. Repeated Enter keeps going back (round 11's "focus stays on Send" rule). The ← key still lands on the options. |
| The header loses Back | The title starts on the 20px edge on every step. The step count and Minimise stay. |
| **Dashes coloured by status** | Current: ink. Answered or decided-for-me: muted (5.7:1). Skipped: dashed (as before). Unvisited: light. Same width for all (a wider "current" would shift its neighbours and clash with the hover cue). |
| **24px click areas everywhere** | 10px gap between dashes, a hit area of 24×24 each, never overlapping (it was touch-only since round 12). |
| **Hover cue** (mouse only, instant) | A clickable dash thickens (`scaleY(1.5)`, no layout change) and turns ink. |

## Turned down

- The header pager ‹ 2 of 4 › with no dashes: the header is the moving edge here. The component isn't capped at 4 questions. The "review only if skipped" part would change a settled decision (round 4).
- Pill-shaped dash buttons: four bordered boxes on every card for a secondary control.
- A tooltip on dash hover: a new component, no touch support, and screen readers already hear "Go to question 1: Area".
- A minimum height on the options area: Back moving to the stable edge solves the instability it was meant to fix.
- The keyboard hint line ("1–3 select · ←→ move · S skip"): outside the locked scope, with shortcuts that don't exist.
