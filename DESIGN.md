# agent-clarifier: design rationale

> The reason behind every default value. **If a value has no reason, it's a guess, and guesses get fixed.**
> Started in round 5. Values are taken from `design/board.html`. Contrast ratios are measured (WCAG 2 formula).
> Status marks: ✅ the reason holds · ⚠️ fails one of our own goals · ❓ no real reason yet.
> Where a reason is Claude's reading of the board rather than a recorded decision, it says *(Claude's reading, to confirm)*.

---

## 1. Principles: what each visual signal means

Each signal has **one meaning**, so it never has to be learnt twice.

**The user's decision is the loudest thing on the card** (Mari, round 14). What the agent says (its Recommended badge, who's asking) stays quiet and grey. Colour goes to what the user did, and to where they are.

| Signal | Means | Never used for |
|---|---|---|
| **Shadow** | "This floats over the conversation" (the docked card, the pill), or "there's more content under this edge" (scroll edges) | Decoration, or anything that sits in the flow (the record, a card in the composer's place) |
| **Accent colour** | "Yours, or here": your selection marks, keyboard focus, text links | The primary button, large fills, or anything the agent says (the Recommended badge and the source dot went grey in round 14) |
| **Ink** (`--clarify-fg` as a fill) | "This acts": the primary button, and toasts that carry Undo | Selection, or a message with nothing to press (the pick-limit notice is ink *text*, round 17) |
| **Fill** | State: hover is a light fill (rows, buttons, chips; mouse or trackpad only), selected is a stronger fill | The only sign of selection (the check or radio mark always shows it too) |
| **Ring** | Keyboard focus | Selection. A ring and a fill can show at the same time (round 1). Drawn as a box-shadow so it follows the radius, over a transparent outline that Windows contrast themes paint instead (round 11) |
| **Dashed edge** | "Not a real option" ("Other" chip) or "no longer live" (the expired record) | |
| **Motion** | Answers "what just happened?": a pick confirmed, a step moved forward or back, the card folded into a record, a press landed | Delight for its own sake, or anything paced by the keyboard. With reduced motion nothing moves or resizes, but fades stay (round 9) |

**Layout rules**
- **One inline edge.** The title, the number keys, Back's glyph in the footer and the all-flow chips all start 20px from the card's edge (list inset 8 + row padding 12 = 20). The eye finds one straight line down the card. Since round 21 the title starts there on every step (Back left the header).
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
| `--clarify-fg` | #1c1c1c | #ededed | Text, the primary button, toasts with Undo, the limit notice's text | 17.0 / 14.4 · 14.1 / 11.3 | ✅ Near-black: softer than black on white, far above AA |
| `--clarify-muted` | #666666 | #a3a3a3 | **All secondary and small text**: descriptions, step count, source, review keys, placeholders | 5.7 / 4.9 · 6.5 / 5.2 | ✅ Passes AA everywhere it's used. Hierarchy below it comes from size (12px), not a paler grey |
| `--clarify-faint` | #888888 | #7a7a7a | **Non-text only**: checkbox rings, the text field outline, skipped-step dashes, the source dot (round 14) | edge 3.5 / 3.0 · 3.8 / 3.1 | ✅ Meets 3:1 for the edges that identify a control (WCAG 1.4.11). Never used for text (F1) |
| `--clarify-border` | #e6e6e6 | #343434 | Card edge, row dividers | decorative | ✅ Dividers only; nothing depends on seeing them |
| `--clarify-hover` / `-selected` | #f5f5f5 / #ececec | #292929 / #303030 | Row fills | – | ✅ Selected is a step darker than hover. The fill is never the only sign of a pick |
| Primary button hover | `color-mix(fg 88%, bg)` → #373737 | #d4d4d4 | The primary button under a mouse | text 11.9 · 11.1 (rest 17.0 · 14.1) | ✅ (round 10) A step toward the background reads as "lit" on both themes, stays far above AA, and is derived from the tokens, so a brand `--clarify-fg` gets a matching hover for free. Secondary and ghost buttons and chips use `--clarify-hover` (text 15.6 · 12.4) |
| `--clarify-key-bg` | #f0f0f0 | #2c2c2c | Number-key badges | – | ✅ Between hover and selected: reads as a key, not a button. **On a hovered row** (round 21): `color-mix(key-bg 92%, fg)` → #dfdfdf · #3b3b3b, number in `fg` (12.8 · 9.6). At rest it was 2% from the hover fill and vanished into it. **On a picked row**, the pencil ("Something else") and Decide-for-me keys take `--clarify-selected` (round 21 add-on): `key-bg` sat 1% lighter than the fill (#f0f0f0 on #ececec, #2c2c2c on #303030), a faint square that only looked like a mistake. Their icon also turns `fg` with the label (it stayed `muted` while the quiet row's label turned ink, so a picked or open "Something else" looked half-picked). Numbered keys keep the accent |
| `--clarify-accent` | #3b5bdb | #8ea6ff | Focus ring, picks (filled key, checkbox), links | 5.7 / 4.8 · 7.1 / 5.7 | ✅ Passes as text, so links use it directly. **Kept blue in round 14** after a monochrome trial (`design/explorations/01-focus-and-colour/`): it carries "your pick / where you are" better than grey or black |
| `--clarify-accent-soft` | accent 10% into bg | accent 14% into bg | The halo around the answered record's tick | – | ✅ Opaque (round 11), so it follows an app's own accent. It was the badge fill until round 14 |
| Recommended badge | muted text on bg, 1px `border` edge | same | The agent's suggestion | 5.7 · 6.5 (it carries its own bg, so every row state reads the same) | ✅ (round 14) Grey: a suggestion must not look like a pick. Its own background keeps it visible on a filled row |
| `--clarify-danger` | #c2410c | #f0895a | Errors (on their own pale fill: `danger-soft`, mixed 8% / 12% into the background since round 12, so it follows an app's danger colour) | 4.6 on danger-soft · 5.4 | ✅ *(Claude's reading)* Burnt orange, not red: errors here are always recoverable |
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
| **2px** fill inset (top and bottom) | option rows, review rows | ✅ (round 19) Fills are drawn inside the row, so filled neighbours (picks, a hover, review flags) show a 4px gap instead of pinching into one shape. The padding gives the 2px back, so heights don't change; dividers sit on the row boundary, the middle of the gap. Not in contrast themes, where transparent borders are painted and fills aren't drawn |
| **12px** divider inset | between rows | ✅ Dividers start where the content starts (the row padding), so they never cut into a fill's rounded corners. They're hidden next to a filled row, where the fill already separates |
| **52px** row (comfortable) | option rows | ❓ 44px (the touch minimum) + 8px. It feels calm, but the reason is weak. Keep it, or derive it (F12) |
| **44px** row (compact) | option rows | ✅ The minimum comfortable touch target (Apple HIG, WCAG 2.5.5) |
| **26px** key badge | number keys | ❓ It fits a 12px numeral with even space around it. No stronger reason |
| **16px** checkbox, centred in the 26px key slot | multi rows | ✅ (round 14; was the full 26px) The common checkbox size. The whole row is the target, so a bigger box bought nothing and seven of them read as a heavy form. The slot keeps every label on one edge |
| **12px** gap, key to label | rows | ✅ About half the badge width, enough to separate the "key" from the "answer" without breaking the row |
| **32px** buttons, chips · **28px** icon buttons | footer, all flow, header | ✅ visually, since they're secondary to the rows. ⚠️ for touch: below 44px. Fixed by the hit-area rule (BUILD §5.3) |
| **60%** max height | card | ✅ At least part of the conversation stays visible above the card, so the user keeps their context |

---

## 5. Corners

| Value | Where | Why |
|---|---|---|
| **16px** `--clarify-radius` | card | ✅ The same as the composer on the board, so a card in the composer's place feels like the same object |
| **9px** `--clarify-radius-sm` | rows, buttons | ⚠️ (F7) The concentric radius is 16 − 8 (inset) = **8px**. 9 is close but not derived |
| 7px key badge · 4px checkbox (6px before round 14's smaller box) · 50% radio | inside rows | ✅ The square box vs the round radio tell multi from single at a glance (round 1 fix) |
| 999px | chips, pill, badge | ✅ Fully round means "small, self-contained object" |
| **14px** record · 10px toast and banner | record, toast, error | ⚠️ (F8) Hard-coded, not from a token, so a theme with square corners still gets round ones here |

---

## 6. Type

| Size | Where | Why |
|---|---|---|
| **16px** / 600 | card title, in both densities (round 12 removed compact's 15px) | ✅ One step above the body: it reads as a heading without shouting inside a chat |
| **14px** | body, option labels | ✅ The same size as chat messages on the board, so the card reads as part of the conversation, not a dialog over it |
| **13px** | descriptions, footer, buttons, record | ✅ The secondary level |
| **12px** | hints, review keys, step numbers | ✅ The tertiary level, still legible |
| **11px** | recommended badge, "was" tag, message source | ⚠️ (F10) A fifth size, and small on phones. Folding it into 12px leaves four clear levels |
| `max(Npx, Nrem)` for every size | everything | ✅ (round 12) Text grows with the reader's browser font size (20px root → 14px body becomes 17.5px), and never shrinks below the design size in apps that use the `html { font-size: 62.5% }` trick, where plain rem would make the card 8.75px |
| line-height **1.4** (UI) · 1.5 (messages) | | ✅ 1.4 since round 12: prompts and descriptions do wrap (13 lines for a long prompt on a phone), and 1.4 is the floor for text that wraps. Messages stay looser for reading |
| No italics | skipped values | ✅ (round 12) Scripts like Arabic have no italic, so the browser faked a slant. "Skipped" is already worded, muted and flagged |
| `tabular-nums` | step counts, keys, the footer, question state, the pill | ✅ "9 of 10" → "10 of 10" doesn't shift the layout, and the "Sending in 3s" countdown no longer nudges Undo while you reach for it (extended in round 12) |

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
| **Checkbox: press .95 + tick reveal** (round 15) | multi checkboxes, pointer only | ✅ Built with Emil Kowalski's `animate` skill. *Feedback*: the 16px box gives under a held press (.95, the low end of the skill's 0.95–0.98, since the box is small: ≈0.8px), at `--_duration` like the buttons. *State*: the tick is revealed left to right with `clip-path` (the sanctioned fourth property, not `stroke-dashoffset`), from the stroke's own edge, in 0.75× (120ms). **Keyboard toggles are instant** (the skill's disqualifier); **unticking is instant** (a system response snaps). Reduced motion: no press, the tick fades. Claude's own card turned out not to animate at all (the "feel" in the recording was the recorder's click circle) |
| **4px rise + fade** | toasts with Undo: in at 160ms, out at **120ms** (0.75×). The pick-limit notice only fades (round 17): nothing to press, so nothing to chase | ✅ The toast carries Undo, which the whole recovery design rests on (undo instead of confirm dialogs). Swapped in where the dashes were, it's easy to miss. It leaves the way it came, a quarter faster: on its way out it shouldn't hold attention (round 10). The dashes come back without a fade: they're rebuilt on every update, so an entrance would replay constantly |
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
| Animating the single-choice number key (round 15) | Gets in the way | Single moves on 120ms after a pick; an animation inside that window is cut off |
| A bounce on the checkbox (round 15) | Level | Bounce is for drag-to-dismiss and playful UI; it pulls the eye to the mark, not the answer |
| Tick reveal on the all-flow chips (round 15) | Job | The whole chip inverts colour and has the .97 press already; a wipe on a 12px glyph adds nothing |
| Animating the uncheck (round 15) | Job | Nothing to confirm, and a reversing white tick would flash on a dark card |

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

---

## 10. Polish (round 12): the 21 findings beyond round 11's cap

Plan frozen before any fix: `process/12-polish/round-plan.md`, with before and after renders from the same script.

**Copy, Mari's picks from options:**

| Before | After | Why |
|---|---|---|
| Limit toast "Up to 3" | "Up to 3 picks. Unpick one first" (at 1: "Only 1 pick. Unpick it first") | It says the tap was refused and how to swap, in the card's own word, "pick" |
| "Sending…" with a spinner during the undo window | The button keeps its label, dimmed; "Sending…" only once it really sends | Status copy matches reality: it never looks too late to undo |
| Countdown "Sending in 1s · Undo" lingering after the window closed (found while planning) | The countdown and Undo go when the window closes | That Undo did nothing; offering it was a false promise |
| Failed send with no reason: just "Couldn't send your answers" | Adds "Your answers are kept."; spoken: "…They're kept. Try again when you're ready." | Says what's safe and what to do next, without repeating the Try again button |
| "write it ↗" skipped by screen readers | Spoken: "Finish this in the message box" | What happens, and what you do next |

**Design and code, Claude's calls:**

| Change | Why |
|---|---|
| Answer lists via `Intl.ListFormat`; form numbers via `Intl.NumberFormat` | Arabic got a Latin comma. Option keys stay Latin: they name physical keys |
| `--_danger-soft` derived like `--_accent-soft`; README shows a dark-mode accent | The documented example failed contrast in dark mode |
| Sizes `max(px, rem)`; compact keeps 16px; line-height 1.4; no synthetic italics; more `tabular-nums` | See §6 |
| Icon strokes don't scale with the icon (`vector-effect: non-scaling-stroke`); 1.75 beside button labels | Small icons got thinner strokes than big ones, and the Undo glyph sat at 1.3px next to bold text |
| No browser tap flash | Every control draws its own press; the blue flash clashed with the neutral palette |
| Undo icon flips in RTL; icon side of buttons 2px tighter | Consistency with every other directional icon; an icon's ink sits inside its box |
| Dashes: 24px non-overlapping targets on touch | Mis-taps jumped to the wrong question |
| Unavailable Continue and Send stay focusable (`aria-disabled`) | Native `disabled` dropped them from the Tab order with no reason given |
| Replied record is one plural label | Two joined labels can't be reordered by a translation |
| Text field and banner on the 8px list inset; compact overrides; review dividers inset | One leading edge (§1), and dividers never cut into a fill's corners |
| Warm demo theme re-measured | It failed several pairs, and its accent shared danger's hue (playground only) |

**Size:** 21.12 KB. The guard went from 21 to 22 KB, following Mari's call to polish first and do size in its own round.

---

## 11. Worst-case content (round 13, the `break` stress page)

`demo/break.html` renders the real component under 34 worst-case scenarios; report in `process/13-break/report.md`.

| What broke | Fix | Why this fix |
|---|---|---|
| A long unbreakable question label squeezed the record's answer to one character per line | Label column `fit-content(40%)`, answer `minmax(0, 1fr)`, labels wrap | The answer is what the record is for; the label is the reminder. Capping the label keeps the answer readable whatever the agent names its question |
| The card collapsed to a sliver next to a flex sibling | `:host { min-inline-size: min(100%, 280px) }` | A size container has no minimum width of its own. 280px is a phone's card, and `min(100%, …)` never forces it wider than a narrower container |
| Built-in English labels on a right-to-left page read "of 1 1" | `unicode-bidi: plaintext` on label text | Text takes its direction from its own words: an untranslated English label reads left to right, and an Arabic one right to left, on any page |
| A disabled card looked enabled | Dimmed to .55, not-allowed cursor | The same signal as disabled options and buttons (§1) |
| The source dot squashed, and the record icon floated mid-paragraph, on long text | Fixed size, on the first line | A marker belongs to the start of what it marks |

---

## 12. Quiet chrome, inline "Something else" (round 14)

From Mari's questions comparing our card with a shadcn questionnaire and Claude's own question card. Plan: `process/14-quiet-and-inline/round-plan.md`.

| Change | Why |
|---|---|
| The Recommended badge and the source dot go grey (Mari's call) | **The user's decision is the loudest thing on the card.** Blue had four jobs on one card; a blue badge next to a blue pick blurred "what I chose" with "what the agent suggests", and nudged |
| "Something else" becomes the field in place: the field is drawn over the row's label area | One object, not a second box below it: no jump in layout, about 50px shorter. In the DOM the field stays a sibling of the radio (axe `nested-interactive`, round 8), in a wrapper that holds both |
| Single: once there's text, the other labels go from ink to muted | Typed text replaces the pick, so they really won't count. Muted, not see-through: they stay 4.5:1 and clickable, and opacity already means *disabled* (§1) |
| Multi: no fade, and "Something else" gets a checkbox | The text is added to the ticks, so a fade would lie. The checkbox matches its neighbours and is where a click unticks it (the text area types) |
| The placeholder defaults to the label | Opening the field looks like the caret dropping into the same words |
| The row shows the focus ring while you type | A text field needs a visible focus indicator (WCAG 2.4.7); the old separate field had one too |
| A keyboard-focused row hides the dividers on both edges | They poked out at the ring's corners; only filled rows hid them before |
| The divider's show rule has zero weight (`:where()`), and the row shows the typing ring only while its input has focus (follow-up fix) | Wrapping "Something else" made its divider selector heavier than every hide rule, so stubs leaked on hover and focus; and `:focus-within` also matched the row itself after a mouse untick, which showed a keyboard-only ring to a mouse user |
| **Round 16:** the field is a `<textarea>` that grows (as BUILD §8.2 specified), stacked with the row in one grid cell; the row's label leaves the layout while it's open | The re-check found a long custom label cut mid-word as a one-line placeholder. A textarea's placeholder wraps, the caret sits on line one, and a long answer wraps instead of scrolling out of sight ("never cut off what the user decides on"). Short labels look exactly as before |
| **Round 16:** in forced colors an open "Something else" keeps a 1px `CanvasText` edge, `Highlight` while focused | Round 14 had dropped the edge round 11 gave the field: in a contrast theme the typed answer had no boundary, and on single nothing marked it as the pick |
| No send arrow inside the row (Claude's card has one) | Claude's single questions have no footer; ours do, and two send buttons would compete. The ↵ hint stays |

---

## 13. The pick-limit notice (round 17)

Mari asked whether "Up to 2 picks. Unpick one first" should be a warning colour. Plan: `process/17-limit-notice/round-plan.md`.

| Decision | Why |
|---|---|
| Not danger orange | It isn't an error or a warning: a reasonable tap was refused, with how to swap. Orange would scold, and dilute the colour that means "something failed, or fix this to send" |
| Not a black toast any more | The ink fill means "this acts" (§1); Skip and Start over earn it with Undo, this has nothing to press. Beside Continue it was a second black slab, louder than the user's own picks (round 14's principle) |
| **Ink text, weight 500, no fill, where the dashes start** (on the card's 20px edge until round 21; now right after Back) | Reads as news (not muted status), sits where the count it replaces sits, and leaves Continue the only filled thing in the footer. Contrast 17.0 / 14.1 |
| Fade only, in and out | The 4px rise was earned by Undo (round 9, "easy to miss"); a notice doesn't need chasing |
| Same timer, pauses, live region, wording; `part="toast notice"` | Only the drawing changed. Apps styling `::part(toast)` still reach it; `::part(notice)` tells it apart |
| No shake on the refused row (not decided before round 17) | Round 9 rejected a shake for a missing required answer; the same reasons hold: it moves what the user acts on next, and number keys make it keyboard-triggered |

---

## 14. The stuck header keeps its padding (round 18)

| What broke | Fix | Why this fix |
|---|---|---|
| Scrolling a card with a source line ("Asked by…") stuck the header with "Asked by" 1px from the card edge: congested, as if the header had no top padding (Mari spotted it on the long-content scenario) | `display: flow-root` on `.top` | The source line's 14px top margin collapsed through the header, so it sat *outside* the sticky box; when the box stuck, the margin stayed behind. `flow-root` keeps child margins inside the header, so the stuck header looks exactly like the unscrolled one. All four views share `.top` (step, all at once, review, record), so one line fixes each. It also makes round 11's focus scroll-padding (the header's height) include the margin |

---

## 15. Space between filled rows (round 19)

Mari: filled neighbours "look like they overlap, in multiple places". Exploration: `design/explorations/02-row-spacing/` (today, Gap, Merge). **Mari's call: Gap.**

| Decision | Why |
|---|---|
| **Gap**, not Merge | One rule covers every meeting of fills: pick + pick, pick + hover, hover + focus, review flags. Each answer stays its own object. Merge only joins same-state rows (a hover beside a pick still pinched) and made two skipped questions read as one item |
| A 2px transparent block border, the fill clipped to the padding box, padding 2px less | No layout change at all: rows keep 52px (and described rows their height). The focus ring is an inset shadow, so it sits inside the same box as the fill |
| Radius `radius-sm / (radius-sm + 2px)` | The clipped fill keeps round 8px corners |
| `background-color`, never the `background` shorthand, on row states | The shorthand resets `background-clip`: selected rows painted into the gap again. Caught by a test, not by the renders (a focus ring hid it) |
| Contrast themes: no border, padding back | Transparent borders are painted in the system text colour there (round 11's focus trick relies on it), which would have lined every row |

---

## 16. Hover and the arrow stay in sync (round 20)

Mari asked to check the hover states against Emil Kowalski's "7 practical animation tips", #6 *Keep your animations fast*: hover seen tens of times a day should be instant or not animate.

| Checked | Result |
|---|---|
| Row fill and arrow on hover | ✅ No transition on either (round 9: "hover fills are instant"). Measured frame by frame while stepping the mouse across rows: the fill and the arrow switch in the same frame, with zero running animations |
| **The focused row's arrow, with a mouse** | ❌ → fixed. The card focuses a row when it opens; with a mouse the focus ring is hidden (rings are for keyboard users), but that row's arrow wasn't, so a lone arrow stayed on a row the mouse had left. Now the arrow shows only with its partner: the fill under the mouse, the ring for the keyboard (`.card:not([data-pointer]) .opt:focus-visible .trail`) |
| **A pressed row under the mouse** (round 21 add-on) | ❌ → fixed. The hover fill and hover key skipped only `aria-checked` rows, so a pressed Decide for me (a toggle button on text questions) dropped to the lighter hover fill (#f5f5f5 under #ececec) with a dark key square, and looked unpicked. Both rules now skip `aria-pressed` too: a pick keeps its fill under the mouse, whatever its role |
| Two arrows after keyboard use | Kept, on purpose: the keyboard row shows ring + arrow ("Enter picks this"), the hovered row fill + arrow ("a click picks this"). Hiding the keyboard row's arrow while the mouse is over the list would take it from keyboard users whose mouse rests on the card |

---

## 17. Navigation in the footer, dashes that say more (round 21)

From a suggestion Mari brought, argued over with a second session; **Mari's call: Claude's plan**. Plan: `process/21-footer-nav/round-plan.md`.

| Decision | Why |
|---|---|
| **Back at the footer's start**, before the dashes | The card is bottom-anchored (composer slot, dock): measured, Back at the top moved 586 → 581 → 743px between steps while the footer stayed at 903. A control pressed repeatedly belongs on the edge that stays put. Left = back, right = forward (Skip, Continue). Outside the toast slot, so a toast never hides it |
| Step 1: Back dimmed (`aria-disabled`, focusable), not hidden | Nothing shifts between steps. Focusable because Back from step 2 leaves focus on it as it becomes unavailable (round 11) |
| Back by button keeps focus on Back | Landing on an option would make a second Enter pick it. The ← key still lands on the options |
| The header loses Back | The title starts on the 20px edge on every step (it jumped ~38px) |
| **Dashes by status**: current ink, answered muted, skipped dashed, not reached light | They were coloured by position: the current step looked answered, and after going back, answered later steps looked unvisited. One width for all: a wider "current" would shift neighbours and clash with the hover cue |
| **24×24 targets on every pointer**, 10px gap | WCAG 2.5.8; on a mouse they were 18px wide, 18px apart (touch had 24px since round 12) |
| **Hover cue**: a clickable dash thickens (`scaleY(1.5)`) and turns ink, instantly | It answers "can I click this?" when you point at it; nothing at rest |
| Footer `justify-content: flex-start` | At 320px, when the buttons wrap, `space-between` pushed the dashes away from Back |
| **The key answers the hover** (Mari, from a Claude screenshot): one step toward ink, number in ink, mouse only, instant. Not on picked rows (accent), checkboxes, disabled rows, or keyboard focus (the ring has no fill, and the key travels with the fill like the arrow, §16) | `key-bg` #f0f0f0 sat 2% from the hover fill #f5f5f5, so a hovered row's key disappeared. Mixed from the tokens like the primary button's hover, so a theme's own key gets a matching step |
| Turned down | A header pager ‹ 2 of 4 › without dashes (the header is the moving edge here; not capped at 4 questions); pill dashes; a dash tooltip; a min-height on the options; the keyboard hint line |

