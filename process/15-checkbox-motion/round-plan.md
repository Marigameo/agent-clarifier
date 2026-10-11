# Round 15 · Checkbox motion (plan, frozen before the change)

**Date:** 11 Oct 2026
**Brief (Mari):** "On clicking a checkbox Claude animates a bit and it gives a feel. Ours looks plain; should we animate a bit?" Then: yes, but adhere to Emil Kowalski's animation skills (emilkowal.ski/skill): the right animation, at the right level, only where it makes sense.

## What the recording actually showed (Claude)

Frame by frame at 60fps (16ms), Claude's checkbox goes from empty to fully checked **in one frame**: no scale, no fade, no tick drawing (measured by counting blue pixels per frame). The "feel" in the recording was the **screen recorder's click circle** (macOS "show mouse clicks"), not Claude's UI.

## The skills' build sequence (`animate`), run on the checkbox

| Step | Answer |
|---|---|
| 1. Should it animate? | A toggle used a few times per card, cards occasionally: the "tens of times a day / frequent toggles" tier → **near-imperceptible only, fast and subtle**. **Keyboard-initiated toggles are a disqualifier** (Space, 1–9): those stay instant. |
| 2. Purpose | **Feedback** (a press that shows the box heard you, between mouse-down and release) and **state indication** (the tick appearing as it happens). |
| 3. Tool | CSS **transitions**, not keyframes: toggles can be fired twice a second, and a transition retargets. |
| 4. Properties | `transform` for the press; `clip-path` (the sanctioned fourth) for the tick reveal, left to right like a pen. Not `stroke-dashoffset` (repaints; not on the list). The clip starts at the stroke's own edge (~16% of the icon box), so no time is spent revealing empty space. |
| 5. Curve, duration | Our existing `--_ease` (round 10 measured it against the skill's `(.23,1,.32,1)`: 73% vs 78% at a quarter of the time; "extend the codebase's tokens, don't fork them"). Press: `--_duration` (160ms), the skill's button recipe. Tick: 0.75 × (120ms), inside the 100–160ms press-feedback band, matching our existing 0.75× for exits. |
| 5b. Press depth | `scale(.95)`: the skill's subtle range is 0.95–0.98; the box is only 16px, so the low end (≈0.8px) is what's still felt. |
| 6. Interruption, exit | Unticking is **instant** (no transition on the unchecked state): the system response is snappy, and a reversing white tick would flash on a dark card. |
| 7. Reduced motion, pointer gating | Gated on `[data-pointer]` (our existing modality flag, set on pointerdown/keydown before the click). Reduced motion: no press, and the tick **fades** (120ms) instead of wiping, per "fewer and gentler, not zero" (our round 9 rule: fades stay, nothing moves). |

## Turned down (with the question that failed)

| Candidate | Failed on | Why |
|---|---|---|
| Animating the single-choice number key | Gets in the way | Single moves on 120ms after a pick; an animation inside that window is cut off |
| Fading the row's selected fill | How often (round 9) | Arrow keys and 1–9 move through rows; a fading fill trails the key |
| A bounce or overshoot on the box | Level | Bounce is for drag-to-dismiss and playful UI; it pulls the eye to the mark, not the answer |
| Tick reveal on the all-flow chips | Purpose | The whole chip inverts colour, already a strong state change, and it has the 0.97 press; a wipe on a 12px glyph adds nothing |
| Animating the uncheck | Purpose | Nothing to confirm; snappy beats symmetric for a system response |
