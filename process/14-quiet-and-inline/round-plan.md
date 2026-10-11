# Round 14 · Quiet chrome, inline "Something else" (plan, frozen before the changes)

**Date:** 11 Oct 2026
**Started from:** Mari's questions, one at a time, comparing our card with a shadcn questionnaire and a recording of Claude's own question card.

## How we got here

1. **"Why mix blue and black?"** The split is deliberate (DESIGN §1: ink = "this acts", accent = "look here"). But Claude pointed out that blue had four jobs on one card: the source dot, the user's pick, the agent's Recommended badge, and focus.
2. **shadcn's monochrome card + soft halo ring.** Claude prototyped a monochrome card (the accent defaults to ink) and a halo focus ring, in ink and in grey: `design/explorations/01-focus-and-colour/`.
   **Mari's call: keep the blue.** It carries "your pick / where you are" better than grey or black.
3. **Claude's recording** (`reference/`). Mari asked for two things from it: "Something else" turning into the input inside the same row, with the other options faded, and a smaller checkbox.

## Decided

| # | Change | Whose call |
|---|---|---|
| 1 | The **Recommended badge** and the **"Asked by" dot** go grey. Blue is left for the user's pick and for focus. **Principle: the user's decision is the loudest thing on the card.** | Mari (principle and call); Claude suggested it |
| 2 | **"Something else" becomes the input inside its own row.** No second box below it. | Mari asked; details Claude's picks, agreed |
| 3 | **Checkbox 26px → 16px**, centred in the same 26px slot | Mari asked; size Claude's pick, agreed |
| 4 | Fix: the dividers poked out at the corners of a **focused** row (only selected rows hid them) | Claude found it while prototyping |

## Details of 2 (Claude's picks, agreed)

- **Fade the other options only on single, and only once there's text.** On single, typed text replaces the pick, so the fade is true. On multi, the text is *added* to the ticks, so a fade would lie.
- **Fade = labels go from ink to muted** (#666 / #a3a3a3, 4.5:1 or better). Nothing turns see-through: opacity already means *disabled*, and Claude's own fade is under 2:1 on options you can still click.
- **No send arrow inside the row.** Our footer Continue stays and is the one primary action. The ↵ hint stays.
- **The DOM keeps the field outside the radio** (axe `nested-interactive`, round 8). A wrapper holds the row and the field, and the field is drawn over the row's label area. Keyboard (BUILD §5.1) and ARIA (§5.5) don't change.
- **Multi: "Something else" gets a checkbox** like the rows above it (as in Claude's card). Clicking the box unticks it, and clicking the text area types.
- **The placeholder defaults to the label** ("Something else"), so activating the row looks like the caret dropping into the same words.
- While typing, the row shows the focus ring (a text field needs a visible focus indicator; WCAG 2.4.7).

## Not in this round

- The all-at-once flow's "Something else" chip still opens a field under the chips. It's a different layout; raise separately.
- Other Claude details seen in the recording (no footer on single, Skip inside the Other row, "0 selected", a fade between steps). Listed for Mari; not asked for.
