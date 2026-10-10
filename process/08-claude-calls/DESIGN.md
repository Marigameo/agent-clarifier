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

Neutral greys since round 8 (F9). Contrast measured on the background and on the selected fill (the hardest case).

| Token | Light | Dark | Role | Contrast (bg / selected) | Why |
|---|---|---|---|---|---|
| `--clarify-fg` | #1c1c1c | #ededed | Text, the primary button, the toast | 17.0 / 14.4 · 14.1 / 11.3 | ✅ Near-black: softer than black on white, far above AA |
| `--clarify-muted` | #666666 | #a3a3a3 | **All secondary and small text**: descriptions, step count, source, review keys, placeholders | 5.7 / 4.9 · 6.5 / 5.2 | ✅ Passes AA everywhere it's used. Hierarchy below it comes from size (12px), not a paler grey |
| `--clarify-faint` | #888888 | #7a7a7a | **Non-text only**: checkbox rings, the text field outline, skipped-step dashes | edge 3.5 / 3.0 · 3.8 / 3.1 | ✅ Meets 3:1 for the edges that identify a control (WCAG 1.4.11). Never used for text (F1) |
| `--clarify-border` | #e6e6e6 | #343434 | Card edge, row dividers | decorative | ✅ Dividers only; nothing depends on seeing them |
| `--clarify-hover` / `-selected` | #f5f5f5 / #ececec | #292929 / #303030 | Row fills | – | ✅ Selected is a step darker than hover. The fill is never the only sign of a pick |
| `--clarify-key-bg` | #f0f0f0 | #2c2c2c | Number-key badges | – | ✅ Between hover and selected: reads as a key, not a button |
| `--clarify-accent` | #3b5bdb | #8ea6ff | Focus ring, checks, recommended badge, links | 5.7 / 4.8 · 7.1 / 5.7 | ✅ Passes as text, so links and the badge use it directly |
| `--clarify-accent-soft` | 10% | 14% | Badge fill | badge text 4.9 · 5.5 | ✅ Tints without blocking |
| `--clarify-danger` | #c2410c | #f0895a | Errors (on their own pale fill) | 4.6 on danger-soft · 5.4 | ✅ *(Claude's reading)* Burnt orange, not red: errors here are always recoverable |
| `--clarify-success` | #2f7d4f | #7cc79a | The answered tick | 5.0 · 8.2 | ✅ Only ever means "done" |

**Temperature (F9, Claude's call in round 8): neutral.** "Neutral by default" was a promise, any brand accent sits on grey without clashing, and the warm off-whites read as Claude's look. The warm set lives on as the playground's "warm" theme, made with tokens only.

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

## 8. Findings (round 5), resolved in round 8 (Claude's calls)

Mari delegated these calls in round 8 and will audit the result. Each line is my decision and why.

| # | Finding | Resolution |
|---|---|---|
| F1 | Faint text failed AA | **All text uses fg or muted.** Faint is non-text only. Hierarchy comes from size |
| F2 | Checkbox ring under 3:1 | Faint is now #888 / #7a7a7a: 3.0+ on the selected fill |
| F3 | Text field outline invisible | Outlined with faint (3.5:1) |
| F4 | Replace card had a shadow | **No shadow by default** (`--clarify-shadow` defaults to none): it sits in the composer's slot, and the composer has none |
| F5 | Dock shadow hard-coded | Token `--clarify-shadow-dock` |
| F6 | Compact had two edges | `density="compact"`: one 16px edge (6 inset + 10 padding), 44px rows |
| F7 | Row radius not concentric | 8px default (16 − 8 inset). Buttons, toast and banner use it too |
| F8 | Hard-coded radii | Record uses `--clarify-radius`; toast/banner use `--clarify-radius-sm` |
| F9 | Warm greys | **Neutral** (see §2) |
| F10 | Five type sizes | Four: 16 / 14 / 13 / 12 (badge and key hints moved from 11 to 12) |
| F11 | left/right in CSS | Logical properties only, enforced by a test |
| F12 | 52px rows, weak reason | **Kept.** Comfortable is pointer-first: 44 (touch minimum) + 8 lets a two-line row (label + description) breathe. Compact is 44 |
| F13 | Toast timer didn't pause | Waits while the toast is hovered or focused |
| F14 | Dark elevation weak | Floating things (pill, docked card) add a 1px top highlight in dark |
| F15 | Missing frames | Replaced by playground scenarios: Decide for me, long content, Arabic RTL, streaming, phone width |

**Also decided in round 8:**
- **Focus rings show for keyboard users only.** Focus still moves after a click (so the keyboard can take over), but the ring only appears once the user presses a key.
- **Copy kept as working copy** ("Left to the agent", "A few questions", "Required"). They're plain, and the audit can revisit them.
- **The Decide-for-me icon is a hand-off arrow (→|):** "pass it on", rather than an AI sparkle, which is overused and says nothing about handing over.
- **Record designs:**
  - answered: a ✓ line plus the answers, one line each, with full text on hover
  - skipped and replied: a single line with the way back
  - replied: the user's message is their own chat bubble
  - expired: dashed, listing picks only if there were any
