# agent-clarifier: design rationale

> The reason behind every default value. **If a value has no reason, it's a guess, and guesses get fixed.**
> Started in round 5. Values are taken from `design/board.html`. Contrast ratios are measured (WCAG 2 formula).
> Status marks: ✅ the reason holds · ⚠️ fails one of our own goals · ❓ no real reason yet.
> Where a reason is Claude's reading of the board rather than a recorded decision, it says *(Claude's reading, to confirm)*.

---

## 1. Principles: what each visual signal means

Each signal has **one meaning**, so it never has to be learnt twice.

| Signal | Means | Never used for |
|---|---|---|
| **Shadow** | "This floats over the conversation" (the docked card, the pill), or "there's more content under this edge" (scroll edges) | Decoration, or anything that sits in the flow (the record, a card in the composer's place) |
| **Accent colour** | "Look here": keyboard focus, your selection marks, the agent's recommendation, text links | The primary button, or large fills |
| **Ink** (`--clarify-fg` as a fill) | "This acts": the primary button and the toast | Selection |
| **Fill** | State: hover is a light fill, selected is a stronger fill | The only sign of selection (the check or radio mark always shows it too) |
| **Ring** | Keyboard focus | Selection. A ring and a fill can show at the same time (round 1) |
| **Dashed edge** | "Not a real option" ("Other" chip) or "no longer live" (the expired record) | |
| **Motion** | Answers "what just happened?": a pick confirmed, a step moved forward or back, the card folded into a record | Delight for its own sake. With reduced motion every animation becomes an instant change |

**Layout rules**
- **One inline edge.** The title, the number keys, the footer text and the all-flow chips all start 20px from the card's edge (list inset 8 + row padding 12 = 20). The eye finds one straight line down the card.
- **Concentric corners.** A rounded thing nested inside another should have a radius equal to the outer radius minus the gap between them, so the curves run parallel.
- **Never cut off what the user decides on** (PLAN §8). Only summaries are shortened.
- **Direction-free.** Logical properties only, so RTL is free (BUILD §8.1).
- **Thumb-sized on touch.** 44px hit areas, whatever the drawn size (BUILD §5.3).
- **Contrast.** Text ≥ 4.5:1. Edges that are the only way to see a control (a checkbox ring, a text field's outline) ≥ 3:1. Decorative dividers are exempt.

---

## 2. Colour

| Token | Light | Dark | Role | Contrast (on bg / on selected) | Why |
|---|---|---|---|---|---|
| `--clarify-fg` | #1d1d1b | #ecebe7 | Text, the primary button, the toast | 16.9 / 14.4 · 13.2 / 11.1 | ✅ Near-black rather than black: softer on white and less glare in long reading, still far above AA |
| `--clarify-muted` | #6b6a66 | #a9a7a1 | Descriptions, helper text, ghost buttons | 5.4 / 4.6 · 6.5 / 5.5 | ✅ The lightest grey that still passes AA on the selected fill. Secondary, but readable |
| `--clarify-faint` | #9a9893 | #7c7a75 | Step count, source line, "Something else" label, review keys, ↵ hint, checkbox ring, placeholders | **2.9 / 2.5** · 3.7 / 3.1 | ⚠️ **Fails AA for text in both themes**, and the light checkbox ring misses 3:1. See finding F1 |
| `--clarify-border` | #e7e5e0 | #363531 | Card edge, row dividers | 1.3 / 1.1 | ✅ for dividers (decorative). ⚠️ for the text field outline, which needs 3:1 (F3) |
| `--clarify-hover` / `-selected` | #f5f4f0 / #eeede8 | #2b2a28 / #31302d | Row fills | – | ✅ Selected is a step darker than hover, so the state hierarchy reads. Fill is never the only cue |
| `--clarify-key-bg` | #f1f0ec | #2e2d2a | Number-key badges | – | ✅ Between hover and selected, so badges read as "keys", not buttons |
| `--clarify-accent` | #3b5bdb | #8ea6ff | Focus ring, checks, recommended badge, links | 5.7 / 4.8 · 6.8 / 5.7 | ✅ Passes AA as text, so links and the badge can use it directly. A calm blue is the most familiar "interactive" signal across products |
| `--clarify-accent-soft` | accent at 10% | accent at 14% | Recommended badge fill, compose highlight | badge text 4.9 | ✅ Tints, never blocks: the accent text on it still passes AA |
| `--clarify-danger` | #c2410c | #f0895a | Errors, invalid, flagged review rows | 5.2 · 6.3 | ✅ *(Claude's reading, to confirm)* A burnt orange rather than red: errors here are always recoverable (answers are kept), so it warns instead of alarming |
| `--clarify-success` | #2f7d4f | #7cc79a | The record's tick, answered marks | 5.0 · 7.9 | ✅ Used only for "done", so green always means finished |

**The palette's temperature** ⚠️ (F9): every grey is slightly warm (yellow-tinted). PLAN promises "neutral greys". Warm off-whites are also a recognisable part of Claude's own look, which works against "not a Claude copy".

---

## 3. Elevation

| Where | Now | Why / problem |
|---|---|---|
| `--clarify-shadow` | `0 1px 2px /.04, 0 8px 24px /.06` | ✅ Two layers on purpose: a tight **contact** shadow anchors the edge, and a wide **ambient** one lifts the card. One layer looks either muddy or flat |
| Card in **replace** mode | full shadow | ⚠️ (F4) The card takes the composer's place, and the composer has no shadow. Nothing sits beneath it, so by our rule it shouldn't float |
| Card in **dock** mode | `0 -6px 20px /.05`, cast upward | ✅ in meaning: it floats over the transcript, so the shadow falls on the messages above. ⚠️ (F5) It's hard-coded, so themes can't change it |
| Pill | full shadow | ✅ It floats above the composer |
| Record | none | ✅ It's part of the transcript, in the flow |
| Scroll edges (round 5) | hairline + soft shadow, only while content is hidden | ✅ The shadow means "there's more here", and it disappears when there isn't |
| Dark mode | the same shadow at .30/.35 | ❓ (F14) Shadows barely show on dark backgrounds. A lighter surface or a 1px top highlight usually carries elevation better |

---

## 4. Space and size

| Value | Where | Why |
|---|---|---|
| **20px** inline start | header, rows (8 + 12), source line, footer, all-flow heads and chips | ✅ The one inline edge (§1) |
| **16px** inline end in the header | header | ✅ Optical: the 28px icon button has 6px of empty space around its 16px glyph, so the box sits closer to the edge and the *glyph* lines up |
| **Compact**: 16px header, 8 + 10 = **18px** rows | compact density | ⚠️ (F6) Two different edges, 2px apart, which breaks the one-edge rule |
| **8px** list inset | around the option rows | ✅ It lets a row's hover fill have rounded corners that don't touch the card's edge |
| **12px** divider inset | between rows | ✅ Dividers start where the content starts (the row padding), so they never cut into a fill's rounded corners. They're hidden next to a filled row, where the fill already separates |
| **52px** row (comfortable) | option rows | ❓ 44px (the touch minimum) + 8px. It feels calm, but the reason is weak. Keep it, or derive it (F12) |
| **44px** row (compact) | option rows | ✅ The minimum comfortable touch target (Apple HIG, WCAG 2.5.5) |
| **26px** key badge | number keys | ❓ It fits a 12px numeral with even space around it. No stronger reason |
| **12px** gap, key to label | rows | ✅ About half the badge width, enough to separate the "key" from the "answer" without breaking the row |
| **32px** buttons, chips · **28px** icon buttons | footer, all flow, header | ✅ visually, since they're secondary to the rows. ⚠️ for touch: below 44px. Fixed by the hit-area rule (BUILD §5.3) |
| **60%** max height | card | ✅ At least part of the conversation stays visible above the card, so the user keeps their context |

---

## 5. Corners

| Value | Where | Why |
|---|---|---|
| **16px** `--clarify-radius` | card | ✅ The same as the composer on the board, so a card in the composer's place feels like the same object |
| **9px** `--clarify-radius-sm` | rows, buttons | ⚠️ (F7) The concentric radius is 16 − 8 (inset) = **8px**. 9 is close but not derived |
| 7px key badge · 6px checkbox · 50% radio | inside rows | ✅ The square box vs the round radio tell multi from single at a glance (round 1 fix) |
| 999px | chips, pill, badge | ✅ Fully round means "small, self-contained object" |
| **14px** record · 10px toast and banner | record, toast, error | ⚠️ (F8) Hard-coded, not from a token, so a theme with square corners still gets round ones here |

---

## 6. Type

| Size | Where | Why |
|---|---|---|
| **16px** / 600 | card title | ✅ One step above the body: it reads as a heading without shouting inside a chat |
| **14px** | body, option labels | ✅ The same size as chat messages on the board, so the card reads as part of the conversation, not a dialog over it |
| **13px** | descriptions, footer, buttons, record | ✅ The secondary level |
| **12px** | hints, review keys, step numbers | ✅ The tertiary level, still legible |
| **11px** | recommended badge, "was" tag, message source | ⚠️ (F10) A fifth size, and small on phones. Folding it into 12px leaves four clear levels |
| line-height 1.35 (UI) · 1.5 (messages) | | ✅ Tighter for short labels that sit in rows, looser for reading |
| `tabular-nums` | step counts, keys | ✅ "9 of 10" → "10 of 10" doesn't shift the layout |

---

## 7. Motion

| Value | Where | Why |
|---|---|---|
| **120ms** confirm before auto-advance | single pick, Decide for me | ✅ Just above the ~100ms it takes to see a change, so the pick registers, and short enough not to feel like waiting |
| **160ms** `--clarify-duration` | step change, height | ✅ Inside the 100–200ms range for small UI moves: it feels quick but can be followed |
| `cubic-bezier(.2,.7,.2,1)` `--clarify-ease` | everything | ✅ A strong ease-out: it starts fast, so it answers the input at once, and settles gently |
| **12px** slide | step change | ✅ Small enough to read as "next", not "a new screen" |
| **200ms** | folding into the record | ✅ A bigger area moves, so it takes a bit longer |
| **600ms** | compose highlight | ✅ Long enough to see where the text landed, gone before reading starts |
| **5s** toast | Skip and Start over toasts | ❓ (F13) Fine for a glance, but the timer should pause while the toast is hovered or focused, so nobody loses Undo while reaching for it |
| 1.4s shimmer · 0.8s spinner | loading | ✅ Slow enough to feel calm. Both stop with reduced motion |

---

## 8. Findings to settle in the next visual round

These aren't decided. Each needs Mari's call, and most need the board updated.

| # | Finding | Suggested fix |
|---|---|---|
| **F1** | `--clarify-faint` fails AA for text (2.9:1 light, 3.7:1 dark) | All text uses `muted`. `faint` becomes **non-text only** (rings, outlines, inactive dots) at ≥ 3:1. Light needs about #888 (measured 3.0 on the selected fill); dark already passes (3.1) |
| **F2** | Light checkbox ring is 2.5:1 on the selected fill | Fixed by F1 |
| **F3** | The text field's outline uses `border` (1.3:1) | Outline it with the new `faint` (≥ 3:1) |
| **F4** | The replace-mode card has a shadow | No shadow in replace: border only, like the composer it replaces |
| **F5** | The dock shadow is hard-coded | A token, `--clarify-shadow-dock` |
| **F6** | Compact density has two inline edges (16 / 18) | One compact edge: 16 (8 inset + 8 row padding) |
| **F7** | Row radius 9 isn't concentric | 8, or derived: `calc(var(--clarify-radius) - 8px)` as the default for `--clarify-radius-sm` |
| **F8** | Record, toast and banner radii are hard-coded | Use the radius tokens |
| **F9** | Warm greys: not neutral, and close to Claude's look | **True neutral** greys by default, with the warm set kept as a theme example. Needs a visual comparison |
| **F10** | Five type sizes; 11px is small on phones | Four: 16 / 14 / 13 / 12 |
| **F11** | The board uses `left`/`right` throughout | Logical properties; add an RTL frame |
| **F12** | 52px row height has a weak reason | Keep 52 and record it as "44 + 8 for a pointer-first density", or try 48 |
| **F13** | The toast timer doesn't pause | Pause on hover and on focus |
| **F14** | Dark-mode elevation | Try a 1px top highlight or a slightly lighter dock surface |
| **F15** | Missing frames: Decide for me (sequential, all, review, record), long content, RTL, phone with keyboard | Add them, then stress-test visually |
