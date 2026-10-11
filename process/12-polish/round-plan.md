# Round 12 · The 21 findings beyond round 11's cap (frozen plan, before any fix)

Source: `process/11-interface-audit/audit.md`, "Beyond the cap". Claude first said 15; the real count is 21 (10 MEDIUM, 11 LOW).

> This file was written before any fix. While snapshotting, a copy of `PLAN.md` overwrote it, because macOS file names ignore case, so `plan.md` and `PLAN.md` are the same file. It was restored word for word under this name. Nothing had been committed in between.

## Copy: Mari's picks (11 Oct 2026, from options)

| # | Finding | Before | Picked |
|---|---|---|---|
| 1 | Limit toast doesn't say the pick was refused | "Up to 3" (spoken "Up to 3 choices.") | "Up to 3 picks. Unpick one first" / "Only 1 pick. Unpick it first", spoken the same |
| 2 | "Sending…" during the undo window | Button: spinner + "Sending…", toast: "Sending in 4s · Undo" | Button keeps its label, dimmed, no spinner; "Sending…" only once it really sends |
| 3 | Send failed names no next step | "Couldn't send your answers" + the app's reason, if any | If no reason: "Your answers are kept." Spoken: "Couldn't send your answers. They're kept. Try again when you're ready." |
| 4 | Compose cue hidden from screen readers | `write it ↗` is `aria-hidden`, no description | Spoken description: "Finish this in the message box" |

**Found while planning #2 (Claude):** if the app sends asynchronously, the countdown kept showing "Sending in 1s · Undo" after the window had closed, and Undo then did nothing. Fixed together with #2: the window is open only while `now < undoUntil`, and the view redraws when it closes.

## Design and code: Claude's calls (per round 8), each with a reason

| # | Finding | Fix |
|---|---|---|
| 5 | Lists joined with `", "`, so Arabic gets a Latin comma; form numbers aren't localised | `Intl.ListFormat(lang, { type: 'unit' })` for answer lists, and `Intl.NumberFormat` for form question numbers. Option keys stay Latin: they name physical keys |
| 6 | README theming example fails in dark; soft fills hard-coded | `--_danger-soft` derived like `--_accent-soft`; README example gets a dark-mode accent and a line saying accent, danger and success need one value per appearance |
| 7 | Type in px ignores the reader's font size | `max(Npx, Nrem)` per size: it grows with a larger browser font, and never shrinks below the design size in hosts that set `html { font-size: 62.5% }`. Plain rem would make the card 8.75px in those hosts |
| 8 | Compact brings back a 15px fifth size | Delete it; compact keeps 16px and gets its density from spacing |
| 9 | Icon strokes don't follow text weight | `vector-effect: non-scaling-stroke`; heavier strokes on button icons; the tick keeps its look |
| 10 | Blue tap flash on phones | `-webkit-tap-highlight-color: transparent` on the host; every control draws its own press |
| 11 | Warm demo theme fails pairs; accent hue = danger hue | The colors reviewer's measured values (playground only) |
| 12 | Counters shift as digits change | `tabular-nums` on the footer, the question state and the pill |
| 13 | Line-height 1.35 on text that wraps | 1.4 |
| 14 | Synthetic italics in Arabic | Delete the italic; "Skipped" is already muted, worded and flagged |
| 15 | Undo icon doesn't flip in RTL | `flip`, like every other directional icon |
| 16 | Icon buttons' padding not optically balanced | 2px less padding on the icon side |
| 17 | Progress dashes are small tap targets | Wider gap and hit area on touch |
| 18 | Continue and Send natively disabled (they leave the Tab order and give no reason) | Focusable `aria-disabled`, the same as round 11's busy buttons |
| 19 | Replied record joined from two labels | One plural label |
| 20 | Stray leading edges in compact; text field and banner sit off the 20px edge | Compact overrides; the field and banner on the 8px list inset |
| 21 | Review dividers run full width into rounded fills | Inset 12px like option rows, hidden next to a fill |

Before renders: `renders/before/`. After renders: `renders/after/`. The same script made both.
