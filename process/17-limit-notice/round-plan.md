# Round 17 · The limit message becomes a quiet notice (plan, frozen before the change)

**Date:** 11 Oct 2026
**Brief (Mari):** "Should these error messages be in a different colour than black? These are warnings, right?" (the "Up to 2 picks. Unpick one first" toast). Insights first, no change; then "sure, proceed" with Claude's recommendation (option A).

## Reading (Claude)

- **It isn't an error or a warning.** Nothing failed and nothing is at risk: it's a refused tap with a how-to.
- **Orange (danger) would be wrong:**
  - It scolds a reasonable attempt.
  - It dilutes the colour that means "something failed / fix this to send".
  - There's no amber token, and the message isn't a warning anyway.
- **Black was wrong too:**
  - Ink fill means "this acts" (DESIGN §1). The Skip and Start over toasts earn it with Undo; this one has nothing to press.
  - In the footer it was a second black slab beside Continue, louder than the user's own picks. That breaks round 14's principle ("the user's decision is the loudest thing on the card").

## Decided (Claude's option A, Mari: proceed)

| What | Detail |
|---|---|
| A **quiet notice**, no fill | The message in ink text (`--clarify-fg`, 500) where the footer's left side is, starting on the card's one inline edge (20px), like the count it replaces. Ink, not muted, so it reads as news. |
| **Black-fill toasts stay** | Only for toasts that carry Undo (Skip, Start over, the undo window after Send). |
| **Motion: fade only**, in and out | The 4px rise was earned by Undo (round 9: "easy to miss"); a notice with nothing to press doesn't need to be chased. It leaves the way it came. |
| **Behaviour unchanged** | Same 5s timer, the same pause on hover, focus and a hidden tab, the same live-region announcement, the same wording. It stays a toast in the model and code (`class="toast notice"`, `part="toast notice"`), so apps styling `::part(toast)` still reach it, and `::part(notice)` can tell it apart. |

## Not changed

- No shake on the refused row. (Not decided before: round 9 rejected a shake for a *missing required answer*, a different case. The same reasons would apply here: it moves what the user acts on next, and number-key toggles make it keyboard-triggered.)
- Not "prevent instead of refuse" (greying unpicked rows at the limit): options get harder to read, and the reason isn't visible.
