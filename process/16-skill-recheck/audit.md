# Round 16 · Re-check of the skill audits after rounds 14–15 (frozen before any fix)

**Date:** 11 Oct 2026
**Brief (Mari):** verify that the skill audits (emil-design-eng, animate, etc.) still hold after the latest commits.
**Scope:** `159efe3..HEAD` in `src/` (rounds 14, 14 follow-up, 15): `styles.css` (+70/−26) and `view/step.ts` (+31/−12). Everything else is untouched since its audit.
**Sources:** Emil Kowalski's skills from `github.com/emilkowalski/skill` at `e8a175d` (emil-design-eng, animate, review-animations, find-animation-opportunities). Jakub Krehel's better-interface and break aren't on this machine, so rounds 11 and 13 were re-checked against their frozen reports and the 34-case break page.

## Findings

| # | Severity | Skill it fails | What | Seen in |
|---|---|---|---|---|
| F1 | MED · regression | better-interface (round 11 #1, forced colors) | In Windows contrast themes, an active "Something else" field has **no edge** unless it's focused, and on single **nothing marks it as the pick** (its pencil key is not a pick mark). Round 11 gave the old separate field a `CanvasText` border; round 14 removed it with the box. | `renders/before/stress-forced-colors.png`, cases 1, 2, 3, 6 |
| F2 | LOW-MED · side effect | break (content length) | A **long custom `other.label`** is cut mid-word when it becomes the placeholder ("…a neighbourhood, a lan"), and the row stays three lines tall around one centred line. Before round 14 the label stayed readable above the field. Default and short labels are fine. | `renders/before/stress.png`, case 5 |

## Held

| Skill (round) | Re-checked | Result |
|---|---|---|
| animate + review-animations (15) | A probe: going **Back** to a ticked step, **reopening** from the pill and **Edit** from review don't replay the tick (0 running animations); keyboard toggles instant; unticking instant; reduced motion fades; 5 tests green | ✅ |
| emil-design-eng (10) | Its review checklist on the diff: no `transition: all`, no `scale(0)`, no `ease-in`, no ungated hover, transitions not keyframes, all under 300ms, named properties only. The round-14 changes (field swap, fade of the other labels) are instant, and they're driven by typing, so the "never animate keyboard actions" rule says they should be. The press is symmetric, as in the skill's own button recipe; the tick is asymmetric | ✅ |
| find-animation-opportunities (9) | Its "not animated, on purpose" list still holds (row fills instant; the single key instant) | ✅ |
| Round 10 craft fixes | Code untouched; tests green | ✅ |
| better-interface (11), other fixes | New colour pairs: badge 5.7 / 6.5, faded labels and placeholder use muted (≥4.5). RTL mirrors the field (case 2). 320px (cases 1, 7). Multi untick target 50×52px (key area, never under the field). Focus ring while typing. No text field nested in the radio (test) | ✅ except F1 |
| break (13) | The 34-case page: its test is green. 9 new cases for the new states: 7 fine (long typed URL at 320, RTL, compact, wrapping labels with 16px boxes, dark, fade + badge + Decide for me) | ✅ except F2 |

## Suggested fixes (for Mari to pick)

- **F1:** in forced colors, give an active "Something else" row a `CanvasText` outline (1px), turning into the existing 2px `Highlight` while focused. Restores round 11's edge; no change outside contrast themes.
- **F2**, options:
  - **(a) recommended:** while the field is empty, the row's own (wrapping) label stays visible as the placeholder and the caret sits on its first line; the label hides on the first keystroke. Nothing is ever cut, and short labels look exactly as now.
  - (b) An ellipsis on the placeholder: tidier, but the end of the label is still lost.
  - (c) Leave it: long custom labels are rare, and the default is fine.
