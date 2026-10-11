# Round 13 · Break: `<agent-clarifier>` under worst-case content

**Skill:** Jakub Krehel's `break` (github.com/jakubkrehel/skills). It takes one component, renders it on a scratch page under every scenario that can actually reach it, looks once, and reports **only what visibly broke**, each break named with the skill that owns the fix. It issues no verdict and fixes nothing unless asked. Mari asked for fixes "whatever adds real value".

**Component:** `<agent-clarifier>`. It accepts a questionnaire written by an agent or app (prompts, labels, descriptions, source, option and question counts), plus what the user types and the app's error messages. It renders a card, toast, pill or record inside a chat.

**Harness:** `demo/break.html` + `demo/break.ts` (run `pnpm dev`, then open `/demo/break.html`).
- It imports the real component from `src/`.
- The page adds only labels, container widths and fixture data.
- States are reached through the component's public API, or through its own buttons.
- Each break is noted under its label, so the page reads as the report.

## Scenarios (34), and the axes kept

| Axis | Kept because | Scenarios |
|---|---|---|
| Content length | Agents write every prompt, label and description | empty prompt · one word · typical · several sentences · unbreakable URL, compound word and long source · long question label in the toast · long typed answer · long app error |
| Content shape | Agents and users write in any language | emoji alone and mixed · Arabic RTL · Latin names in an Arabic card · Hebrew and Arabic names in an English card · Vietnamese, Thai, Devanagari and stacked marks · wide numbers |
| Quantity | It repeats questions and options | 1 question · 1 option · 9 options with descriptions · 20 options (capped at 9) · 40 questions sequential · 40 all at once |
| Container | Always | 320px · 320px all at once · squeezed by a flex sibling · 1600px |
| State | All reachable through the API | loading · disabled · undo window · review · answered, expired and replied records · pill · compact · dock |
| Environment | Not rendered on the page (viewing modes) | **For Mari to toggle:** dark mode, browser zoom, reduced motion |

Dropped: none. Every axis's cue matched.

## What broke (one load, one look)

| # | Scenario | Observed | Owner | Fixed? |
|---|---|---|---|---|
| 29 | Answered record, long unbreakable question label, 320px | The label took the first column; the answer ran **one character per line, out of the card** (the section was 3,303px tall) | `better-layout` | ✅ The label column is capped at 40% and wraps (`fit-content(40%) minmax(0, 1fr)`) |
| 23 | Squeezed by a flex sibling | **The card collapsed to a sliver.** It's a size container (`container-type: inline-size`), so it has no minimum width of its own | `better-layout` | ✅ `:host { min-inline-size: min(100%, 280px) }` |
| 10, 11 | Built-in English labels on a right-to-left page | The step count read **"of 1 1"**, and the source read "Trip planner Asked by" | `better-typography` | ✅ Label text takes its own direction (`unicode-bidi: plaintext`) |
| 26 | `disabled` | It looked exactly like an enabled card, but nothing responded | `better-accessibility` | ✅ It dims to .55 with a not-allowed cursor |
| 5 | A long source that wraps | The accent dot squashed to a sliver | `better-ui` | ✅ The dot keeps its size and sits on the first line |
| 30 | Expired record, long message | The clock icon floated mid-paragraph | `better-ui` | ✅ The icon sits on the first line |
| 1 | Empty prompt | Nothing renders: the question is dropped, with a console warning (`question-dropped`) | `better-writing` | ➖ Left alone. It's the documented validation, and a blank question has nothing to ask |
| 13 | Stacked combining marks | The marks spill over the divider | `better-typography` | ➖ Left alone. That's deliberately abusive input, and clipping it would hide real diacritics |

**Survived (26):** one word, typical, several sentences, long toast label, long typed answer, long error, emoji, Hebrew and Arabic in an English card, Vietnamese, Thai and Devanagari, wide numbers, 1 question, 1 option, 9 options, 20 options, 40 sequential (the dashes wrap to a second line), 40 all at once, 320px, 320px all at once, 1600px, loading, the undo window, review, the replied record, the pill, compact, and dock.

## Verified

- 5 component tests (`tests/component/break.test.ts`). Deliberately breaking each fix made a test fail, 5/5.
- The first versions of two tests were weak:
  - the RTL test used a fixture with no source line, so the element it checked didn't exist;
  - the disabled test read opacity during the opening fade, so it passed with the fix removed.

  Both were fixed before counting.
- The real Arabic scenario (Arabic labels) was re-rendered: "١ من ٢", "يسأل مخطط الرحلات". Unchanged and correct.
- 544 tests green. Size 21.28 KB (+160 B), under the 22 KB guard.

Renders: `renders/before/` (the broken slices) and `renders/after/` (the same slices fixed, plus regression shots).
