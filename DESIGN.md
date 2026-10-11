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
| **Fill** | State: hover is a light fill (rows, buttons, chips; mouse or trackpad only), selected is a stronger fill | The only sign of selection (the check or radio mark always shows it too) |
| **Ring** | Keyboard focus | Selection. A ring and a fill can show at the same time (round 1). Drawn as a box-shadow so it follows the radius, over a transparent outline that Windows contrast themes paint instead (round 11) |
| **Dashed edge** | "Not a real option" ("Other" chip) or "no longer live" (the expired record) | |
| **Motion** | Answers "what just happened?": a pick confirmed, a step moved forward or back, the card folded into a record, a press landed | Delight for its own sake, or anything paced by the keyboard. With reduced motion nothing moves or resizes, but fades stay (round 9) |

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
| Primary button hover | `color-mix(fg 88%, bg)` → #373737 | #d4d4d4 | The primary button under a mouse | text 11.9 · 11.1 (rest 17.0 · 14.1) | ✅ (round 10) A step toward the background reads as "lit" on both themes, stays far above AA, and is derived from the tokens, so a brand `--clarify-fg` gets a matching hover for free. Secondary and ghost buttons and chips use `--clarify-hover` (text 15.6 · 12.4) |
| `--clarify-key-bg` | #f0f0f0 | #2c2c2c | Number-key badges | – | ✅ Between hover and selected: reads as a key, not a button |
| `--clarify-accent` | #3b5bdb | #8ea6ff | Focus ring, checks, recommended badge, links | 5.7 / 4.8 · 7.1 / 5.7 | ✅ Passes as text, so links and the badge use it directly |
| `--clarify-accent-soft` | accent 10% into bg | accent 14% into bg | Badge fill | badge text 4.9 · 5.5, **on every row state** | ✅ Tints without blocking. **Opaque since round 11:** it used to be a see-through tint, which stacked on a selected row's fill and dropped the badge to 4.19 · 4.39, under AA, on the most likely pick. Mixing with the background also makes it follow an app's own accent |
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

Checked against Emil Kowalski's `find-animation-opportunities` skill in round 9, and his `emil-design-eng` checklist in round 10: every moment must name its job, stay inside its time budget, and not move anything the user is reading or acting on. Filmstrips (clock slowed 10×) in `process/09-motion-audit/renders/`, made with `scripts/motion-strips.mjs`.

| Value | Where | Why |
|---|---|---|
| **120ms** confirm before auto-advance | single pick, Decide for me | ✅ Just above the ~100ms it takes to see a change, so the pick registers, and short enough not to feel like waiting |
| **160ms** `--clarify-duration` | step change, height, toast, press | ✅ Inside the 100–200ms range for small UI moves: it feels quick but can be followed |
| `cubic-bezier(.2,.7,.2,1)` `--clarify-ease` | everything | ✅ A strong ease-out: **73%** of the way at a quarter of the time (plain CSS `ease-out`: 38%), so it answers the input at once, then settles. Measured against Emil's `(.23,1,.32,1)` in round 10: 78%, a gap nobody can see at 160ms, so kept |
| **12px** slide | step change | ✅ Small enough to read as "next", not "a new screen" |
| **200ms** (1.25 × `--clarify-duration`) | folding into the record or the pill, and reopening from the pill | ✅ The biggest change in size, so it takes a bit longer. Derived from the one public token, so an app that retunes speed keeps the ratio. (Until round 9 this row was written but not built: the fold ran at 160ms.) |
| Pill: **fade only** | folding into the pill | ✅ A capsule (radius 999px) that changes height is drawn as an oval for the first ~100ms (caught in the round 9 filmstrip). The pill appears at its own size and fades in |
| **scale .97** on press | buttons, chips, icon buttons | ✅ Feedback: the control gives under the finger. That's ~1px on a 32px button, felt more than seen. **Pointer only**: a keyboard press already shows the ring, and keyboard actions repeat too fast to animate. Text links don't shrink |
| **4px rise + fade** | the toast: in at 160ms, out at **120ms** (0.75×) | ✅ The toast carries Undo, which the whole recovery design rests on (undo instead of confirm dialogs). Swapped in where the dashes were, it's easy to miss. It leaves the way it came, a quarter faster: on its way out it shouldn't hold attention (round 10). The dashes come back without a fade: they're rebuilt on every update, so an entrance would replay constantly |
| **600ms** | compose highlight | ✅ Long enough to see where the text landed, gone before reading starts. A glow, not a move, so it plays under reduced motion too |
| **5s** toast | Skip and Start over toasts | ✅ (F13) Waits while hovered or focused, so nobody loses Undo while reaching for it. **And while the tab is hidden** (round 10): switch away, come back, Undo is still there |
| 1.4s shimmer · **0.6s** spinner | loading, sending | ✅ The shimmer is calm. It's a highlight band moving on `transform`, so it runs off the main thread and stays smooth while a streamed reply is being parsed (round 10; it used to repaint `background-position` every frame), and it sweeps in the reading direction. The spinner went from 0.8s to 0.6s in round 10: a faster spinner makes the wait feel shorter, and it only shows while sending. Both stop with reduced motion |
| **Reduced motion** | everything | ✅ Nothing moves or resizes; views, the toast and the compose glow still **fade**. A fade isn't movement, and an instant swap is the very jarring change motion is here to prevent ("gentler, not zero"). Until round 9 everything was instant |

**Not animated, on purpose** (each failed one of the four questions):

| Candidate | Failed on | Why |
|---|---|---|
| Hover, selected and focus fills on option rows | How often | Arrow keys and 1–9 move through them many times per card; a fading fill would trail the key |
| Shrinking an option row on press | Job | A full-width row shrinking reads as the whole list pulsing. The fill and the 120ms confirm already answer the press |
| A pulsing dot on the minimised pill | Job | The pill can wait for minutes while the user writes their own reply; a pulse that never stops pulls attention from the composer |
| Shaking a question with a missing answer | Gets in the way | The red text and the scroll to the question explain it; a shake moves the very thing the user must act on |
| Animated "Sending in 3s" digits | Gets in the way | It's text the user reads to decide on Undo |
| Ease-in-out for the height change (round 10) | Speed | Emil's ease-in-out covers 5% in the first quarter, so the height would lag behind content that has already faded in. Height and opacity have to move together, so they share one curve |
| Stagger on open (round 10) | Gets in the way | The options are what you read and act on; a stagger delays the first read |
| A fade on hover fills | How often | Tens of times a day, so hover fills are instant |

**Kept, though a rule says otherwise** (round 10, `emil-design-eng`):
- **The step slide also plays when using the keyboard.** The skill says never animate keyboard actions. A card shows up occasionally, not 100 times a day; the slide says forward or back; and Mari's hands-on speed run (round 9) didn't feel slow.
- **The height change animates a layout property** (`block-size`), against "only `transform` and `opacity`". It's one element for 160ms, and a transform-based version would squash the text. It's listed as a risk in BUILD.

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
  - answered: a ✓ line plus the answers, each wrapping in full (round 11: they were one line with a hover-only tooltip, which nobody on touch or keyboard could open)
  - skipped and replied: a single line with the way back
  - replied: the user's message is their own chat bubble
  - expired: dashed, listing picks only if there were any

---

## 9. Interface audit (round 11): what broke for real users, and the fix

Run with Jakub Krehel's `better-interface` (six domain reviews, evidence required). Full report: `process/11-interface-audit/audit.md`; before and after renders beside it. Every fix below has a component test that fails when the fix is undone.

| # | What broke | For whom | The fix, and why it's the cheapest that works |
|---|---|---|---|
| 1 | Focus rings, picks, field edges, checkboxes and the progress dashes vanished | Windows contrast themes (forced colors) | A transparent outline under every ring, plus one `forced-colors` block using system colours (`Highlight`, `CanvasText`). Normal mode looks exactly the same |
| 2 | ↑ or Shift+Tab could focus a row hidden under the sticky header | Keyboard users on long lists | `scroll-padding-block-start` = the header's height, set where the header is already measured |
| 3 | Pressing Send by keyboard dropped focus to the page | Keyboard and screen-reader users, right when Undo or Try again matters | A busy button stays focusable (`aria-disabled`) instead of being disabled under the cursor |
| 4 | A card with no review step showed nothing when the send failed | Everyone using one-question cards (yes/no) | The step view shows the same failure banner and Try again as review, from one shared helper |
| 5 | Skipping into a text question lost its Undo toast at once | Everyone | The undo step for typing moved from *focusing* the field to its **first keystroke**, so focusing changes nothing and can't dismiss a toast (or swallow an Undo) |
| 6 | At 320px the toast read "↶ Und"; dashes overlapped Skip with 6+ questions | Phones, long labels, translations | The footer wraps, the toast wraps, and the ellipsis is deleted. Undo itself never breaks |
| 7 | A long question opened scrolled past its own start | Phones, 200% zoom | Don't scroll to the focused row while the header is tall, and keep a top-edge cue for that case |
| 8 | The Recommended badge fell under AA on a selected row | Everyone (it's the likeliest pick) | An opaque `--_accent-soft` (see §2) |
| 9 | "Pick one to continue" under a text box, and under a multi that already had a pick | Everyone | "Answer this to send", "Pick at least {min}"; the step footer says what unlocks Continue |
| 10 | Expired-record answers clipped, with the full text only in a hover tooltip | Touch and keyboard users | Answers wrap |
| 11 | A blocked Send was silent; optional questions were described by an error | Screen-reader users | `aria-invalid`/`describedby` only while invalid; focus moves to the first question that needs an answer |
| 12 | The multi "Something else" checkbox couldn't be unticked | Everyone; its role promised a toggle | Pressing it again unticks it; its text stays in the draft |
| 13 | "C++" showed as "++C" in an Arabic card | RTL languages with Latin names | App text in `<bdi>`; label placeholders isolated with FSI…PDI |
| 14 | iOS zoomed the page when a field was focused | iPhone users | Fields are 16px under `(pointer: coarse)` |
| 15 | An invalid field's edge got fainter (2.35:1) | Everyone | The edge uses `--_danger` itself (5.18), thicker while focused |

**Not done here, on purpose:** the 15 smaller findings beyond the cap (copy, Intl lists, icon strokes, rem sizes and so on) are round 12. Copy changes are offered as options first.

