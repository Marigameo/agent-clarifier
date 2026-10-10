# Round 9 · Motion audit (frozen)

**Lens:** Emil Kowalski's `find-animation-opportunities` skill (github.com/emilkowalski/skills). It's read-only and built around restraint: every idea must pass four questions, in order.
1. **How often** the user sees it (keyboard-paced, or 100+ times a day: never)
2. **What job** it does (feedback, spatial consistency, state, preventing a sudden change; delight only for rare moments)
3. **Speed** (inside the UI budget)
4. **Whether moving it gets in the way** (don't move what the user reads or acts on)

**Starting point:** the height morph between views, the 12px step slide (mirrored in RTL), the fade-up on open, the 600ms compose glow, the shimmer and spinner. All of it was tokenised and switched off under reduced motion.

## Proposed (all four taken by Mari)

| # | Where | Before | Job | How often | Proposal |
|---|---|---|---|---|---|
| 1 | Footer toast (`view/chrome.ts`) | Skip / Start over / limit toasts swapped in and out with no transition | Prevent a sudden change; get Undo noticed | Occasional | `@starting-style` fade with a 4px rise at 160ms `--clarify-ease`; leave the same way |
| 2 | Fold into the record or pill (`view/motion.ts`) | DESIGN §7 said 200ms; the code used the general 160ms swap | Spatial: show where the card went | Once per question set | A `fold` move at 200ms, or fix the doc |
| 3 | Buttons, chips, icon buttons | No `:active` state | Feedback | A few per card | `scale(.97)`, `transform 160ms`; no text links |
| 4 | Reduced-motion policy | Every animation off | Prevent a sudden change | Every reduced-motion user | "Gentler, not zero": keep opacity crossfades, drop movement |

## Turned down

| Candidate | Failed on |
|---|---|
| Fills on option rows (hover, selected, arrow-key focus) | How often: keyboard-paced |
| Shrinking an option row on press | Job: a full-width row shrinking reads as the list pulsing |
| A pulse on the minimised pill | Job: it never stops and competes with the composer |
| A shake for a missing required answer | Gets in the way: it moves the field the user has to fix |
| Animated "Sending in 3s" countdown | Gets in the way: it's text the user reads to decide |

## Found while building

- **The pill turned into an oval.** The filmstrip showed the pill's height animating from the card's height. With `border-radius: 999px` it was drawn as a large oval for ~100ms. This already happened at 160ms, but the 200ms fold made it easier to see. Fix: the pill fades only.
- **The toast exit raced Undo.** A timeout arriving after Undo would have cleared the next toast. Fix: only time out the toast that was fading. A test pins this, and deliberately breaking it makes that test fail.
- **Press feedback is pointer-only**, using the existing live `data-pointer` modality hook. A Space press doesn't shrink anything, which fits the skill's rule against animating keyboard actions.
- **Size:** +280 B gzipped (19.67 → 19.95 KB, guard 20 KB).

## Open, for a later skill (`review-animations`)

The skill's strictest rule is that anything started from the keyboard never animates. The step slide also plays for a fast 1-1-Enter run. 120ms confirm + 160ms slide is probably fine, but it needs a hands-on feel check.

Renders: `renders/1–5` are filmstrips with Chrome's animation clock slowed 10× (`scripts/motion-strips.mjs`). `renders/toast-*` show the toast state in light, dark and phone.
