# Round 10 · Craft audit (frozen)

**Lens:** Emil Kowalski's `emil-design-eng` skill (github.com/emilkowalski/skills). It's a general design-engineering checklist: easing and speed, press and hover feedback, performance (animate only `transform`/`opacity`), reduced motion, and the Sonner principles ("handle edge cases invisibly"). Its required output is a Before/After/Why table.

## Proposed (Mari took all six)

| # | Before | After | Why |
|---|---|---|---|
| 1 | Buttons, chips and the pill's Reopen didn't react to hover; only rows and icon buttons did | Secondary and ghost buttons and unselected chips get `--clarify-hover`. The primary button gets `color-mix(fg 88%, bg)`, links get an underline. All instant | A control that ignores the pointer reads as static. Instant because hover happens tens of times a day |
| 2 | `@media (hover: hover)` | `(hover: hover) and (pointer: fine)` | Some touch screens claim hover, so a tapped control kept its fill |
| 3 | The toast timer ran while the tab was hidden | It waits while `document.hidden`, using the same check as hover and focus | Sonner principle: come back and Undo is still there |
| 4 | The shimmer animated `background-position` | A band on `.sk::after` moving with `transform`, reversed in RTL | Paint every frame on the main thread stutters exactly while a streamed reply is being parsed. `transform` runs on the GPU |
| 5 | The toast left at the same speed it arrived | It leaves at 0.75× (120ms) | Exits faster than entrances: on its way out it shouldn't hold attention |
| 6 | Spinner 0.8s | 0.6s | A faster spinner makes the wait feel shorter (Claude had leaned against this one; Mari took it) |

Plus: the size guard was raised from 20 KB to 21 KB until the size round (Mari's call: polish first, size separately).

## Checked and kept, with reasons

- **Easing:** at a quarter of the time ours is at 73%, Emil's `(.23,1,.32,1)` at 78%, and CSS `ease-out` at 38%. Same family, and the gap is invisible at 160ms.
- **Ease-in-out for the height change:** covers 5% in the first quarter, so the height would lag the content. The two share one curve.
- **The step slide when using the keyboard:** the rule says never. Kept: cards are occasional, the slide says which direction you moved, and Mari's hands-on check found it didn't feel slow.
- **The height change animates a layout property:** one element, 160ms, and a transform version squashes text.
- **No shrink on option rows, no stagger on open:** the list would look like it's pulsing, and a stagger delays reading the options.
- **Not applicable:** blur during crossfades (old and new never overlap), origin-aware popovers (none), `transition: all`, `scale(0)`, `ease-in` (none in the code).

## Verified

- 4 new component tests: hover fill, toast waits while the tab is hidden, toast exit at 0.75×, shimmer on `transform` and reversed in RTL. Deliberately breaking each change made a test fail, 4/4. 514 green.
- Contrast of the primary button on hover: 11.9 (light) · 11.1 (dark), against 17.0 · 14.1 at rest.
- Size 20.07 KB (+120 B), against the new 21 KB guard.

Renders: `hover-pairs.png` (rest vs hover, light and dark), `hover-*` (phone width), `touch-tap-twice-phone.png` (a touch phone: a row tapped on then off keeps no fill), `6-shimmer-light.png`.
