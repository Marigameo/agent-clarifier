# Round 11 · Interface audit (frozen, before any fix)

**Lens:** Jakub Krehel's `better-interface` (github.com/jakubkrehel/skills), an orchestrator that owns no rules itself.
- It runs six domain skills in order: `better-accessibility` → `better-layout` → `better-writing` → `better-typography` → `better-colors` → `better-ui`.
- Their findings merge into one table ranked by severity, then by reach.
- **Evidence is required:** `path:line` plus a render when the claim is visual.
- Findings that share a root cause are merged, and the report is capped at 15.
- Thirteen escalation triggers count as HIGH on sight.
- **Cheaper fix first:** delete → use the platform → reuse a project value → correct the value → add.

**How it ran (11 Oct 2026):** six read-only reviewers, one per domain, each loading its own skill (3,520 lines of rules) and rendering the playground in real Chrome through Playwright, with ~30 measurement scripts:
- widths: 320px, 200% and 400% zoom
- Windows High Contrast (forced-colors) emulation
- the accessibility tree
- German-length labels, and Arabic / RTL
- touch emulation, and pixel-sampled contrast

Claude then merged the overlaps, re-rated two findings, and re-checked the surprising ones in code and screenshots. Before-evidence is in `renders/before/`.

## Coverage

| Domain | Evidence inspected | Findings |
|---|---|---|
| Accessibility | All of `src/`; the accessibility tree; forced colors; reflow at 320, 200% and 400%; keyboard paths; axe-core (24/24 pass) | 8 |
| Layout | 19 states at 320, 200% zoom and compact; focus overlap; German labels; leading-edge measurements | 6 |
| Writing | All 60 labels; the live-region log across 18 states; Arabic | 6 |
| Typography | Computed type for every text node; toast at 320; bidi; touch input sizes; root-size test | 8 |
| Colors | 126 token pairs × 3 themes; pixel-sampled renders; forced colors | 5 |
| UI | Surfaces; icon strokes at 3–4× zoom; RTL flips; motion (already settled in rounds 9–10) | 5 |

## Findings in the table (top 15)

| # | Sev | Domain | Location | Problem | Fix |
|---|---|---|---|---|---|
| 1 | HIGH | A11y (+colors, UI) | styles.css focus and pick styles | In forced colors, focus rings, field edges, checkbox rings, single and chip picks, and the dashes all vanish: they're box-shadow or background, with `outline: none` | A transparent outline in place of `outline: none`, a transparent border on shadow-drawn controls, and a forced-colors block |
| 2 | HIGH | A11y + layout | styles.css `.scroll` / `.top` | ↑ or Shift+Tab focuses rows fully hidden under the sticky header (76 of 76px) | `scroll-padding-block-start` set to the header height |
| 3 | HIGH | A11y | chrome.ts `setButton` | Keyboard Send drops focus to `<body>` (native `disabled` while busy), so Undo-send and Try again are lost | `aria-disabled` while busy, plus a guard that never loses focus |
| 4 | HIGH | UI + writing | step.ts | A sequential card with no review step shows no error when the send fails | The send-failed banner and Try again in the step view |
| 5 | HIGH | UI (recovery) | reducer `TEXT_FOCUS` | Skipping into a text question loses its Undo toast at once | Return the same state when focus changes nothing |
| 6 | HIGH | Layout + type | `.foot`, `.toast` | At 320px the toast reads "↶ Und"; dashes overlap Skip at 6+ questions; German labels collide | The footer wraps, the toast wraps, and the ellipsis is deleted |
| 7 | HIGH | Layout | element.ts `#focusView` | A long question opens scrolled past its own start on phones (155px hidden) with no cue | Delete the `scrollIntoView`; add a top cue while the header is tall |
| 8 | HIGH | Colors | `--_accent-soft` | The Recommended badge is 4.19 / 4.39 on a selected row (a see-through tint stacked on the fill) | An opaque `color-mix` with the background |
| 9 | HIGH | Writing | labels `pickOne` | "Pick one to continue" under a text box, and under a multi that already has a pick | "Answer this to send" / "Pick at least {min}" |
| 10 | HIGH | Layout | `.record dd` | The expired record clips answers to one line; the full value is only in a hover `title` | Wrap like the review list |
| 11 | MED | A11y | form.ts | All flow: a failed Send is silent to screen readers; every group is always described by its hidden error | `aria-invalid` and `describedby` only when invalid; focus the first invalid question |
| 12 | MED | A11y | reducer `OTHER_FOCUS` | The multi "Something else" checkbox can't be unchecked | Pressing it again unticks it (the text stays in the draft) |
| 13 | MED | Typography | labels, views | App values aren't bidi-isolated: in Arabic "C++" shows as "++C" | `<bdi>` / FSI…PDI |
| 14 | MED | Typography | text fields | 14px (13px) inputs on touch make iOS zoom the page | 16px under `(pointer: coarse)` |
| 15 | MED | Colors | `.q.invalid textarea` | The outline gets fainter when invalid (2.35:1) | `var(--_danger)` |

## Beyond the cap (all confirmed, for round 12)

**MEDIUM**
- `liveFailed` names no next step.
- The "Up to 3" limit toast doesn't say the pick was refused.
- "Sending…" shows during the Undo window.
- Lists use `join(', ')`, not `Intl.ListFormat`, so Arabic gets a Latin comma.
- The README theming example fails contrast in dark mode, and the soft fills are hard-coded.
- Type is in px, so the reader's font size is ignored.
- Compact brings back a 15px fifth size.
- Icon strokes don't follow the text weight (Undo is 1.3px next to 600 text).
- `-webkit-tap-highlight-color` isn't set.
- The warm demo theme fails several pairs (playground only).

**LOW**
- Counters and the countdown lack `tabular-nums`.
- Line-height 1.35 on wrapping text.
- Synthetic italics in Arabic.
- The Undo icon doesn't flip in RTL.
- Icon-button padding isn't optically balanced.
- The dashes are small tap targets.
- Continue is natively disabled with no reason given.
- The compose cue is hidden from screen readers.
- The replied record is joined from two labels.
- Stray leading edges in compact.
- Review dividers run full width.

## Re-rated by Claude

- **"Send failed gives no next step": HIGH → MEDIUM.** The visible "Try again" button sits right there; only the screen-reader wording lacks a next step.
- **Warm theme failures:** HIGH by the trigger, but demo-only, so ranked last.

## Not verified

- Real screen readers (VoiceOver, NVDA, JAWS).
- A real Windows contrast theme.
- Real iOS focus-zoom.
- Firefox and Safari.
- Real phones.
- **Open risk:** the live region is detached and re-attached on each view swap; a real screen reader should confirm announcements survive.

## Verdict

**Block** (10 HIGH).

**Mari's decision:** fix all 10 HIGHs and the 5 MEDIUMs in round 11, and the rest in round 12. For #9, Mari took Claude's copy.
