# clarify-card: plan (v0, for review)

> A plug-and-play web component that lets a chat agent ask clarifying questions before it acts.
> Framework-agnostic, zero dependencies, neutral by default, restyled with CSS variables.
> Status: **plan + visuals under review. Nothing built yet.**
> Working name: `clarify-card` (package) / `<clarify-card>` (element). Naming is open, see §11.

---

## 1. Goals and non-goals

**Goals**
- One element that works in plain HTML, Astro, React, Vue, Svelte and Angular.
- Covers every state a clarifying flow can be in, and **makes mistakes cheap**: go back, edit, reset, undo, reopen.
- Two flows: **sequential** (one at a time, order matters) and **all at once** (order doesn't matter).
- Three input types: **single select**, **multi-select**, and a free-text **"Something else"**. Plain `text` questions too.
- Two placements: **replace** (takes over the composer) and **dock** (pinned above the composer, so it never scrolls away with messages).
- Leaves a **record** in the conversation once answered.
- **Your own words, always one step away**: minimise and type, or pick a **compose** option that starts a sentence in the composer for answers the user should write themselves.
- Keyboard-complete, screen-reader friendly, touch friendly, reduced-motion safe.
- Neutral look. Every colour, radius, space and font is a CSS variable.

**Non-goals (v1)**
- Branching logic (show Q3 only if Q1 = X). The schema leaves room for it, but it's not built yet.
- Validation beyond required, min and max.
- Sending anything over the network. The component hands back answers and the app sends them.
- Generating questions. That's the model's job (see the prompt guidance in §9).

---

## 2. Your question: why the input format matters

Who writes the questions changes what the format should be.

| Who writes them | Example | What they'd want |
|---|---|---|
| **You, by hand** | An onboarding flow with fixed questions | Our own clean format, with ids, required fields and defaults |
| **Claude, at runtime** | Claude calls `AskUserQuestion` mid-task | To pass the tool input straight in, without rewriting it |
| **An MCP server** | A server sends `elicitation/create` | To render it in any MCP client |

**Recommendation: one native format, plus two small adapters.**

- The **native format** is a superset. It has everything Claude's and MCP's formats have, plus what they lack:
  - **stable ids**: Claude keys answers by the question text, which breaks if the wording changes
  - `flow`, `required`, `min`/`max`
  - a `recommended` flag
  - defaults
- **Adapters** are pure functions, about 30 lines each, shipped as separate imports so you only pay for what you use:
  - `fromClaude(toolInput)` → native, and `toClaude(result, toolInput)` → the `{ questions, answers, response? }` shape that `canUseTool` returns.
  - `fromElicitation(params)` → native (enum → single, boolean → yes/no single, string → text), and `toElicitation(result)` → `{ action: accept|decline|cancel, content }`.
- If your users only ever write their own questionnaires, they never touch the adapters. Nothing is lost by offering them.

---

## 3. The native format (draft)

```ts
interface Questionnaire {
  id: string;                       // ties answers back to the agent's request
  title?: string;                   // "A few questions before I search"
  flow?: 'sequential' | 'all';      // default 'sequential'
  source?: string;                  // "Claude", "Hotel search (MCP)": who is asking
  questions: Question[];
}

interface Question {
  id: string;
  prompt: string;                   // "What's your budget per night?"
  label?: string;                   // short chip for the record/review: "Budget"
  type: 'single' | 'multi' | 'text';
  options?: Option[];               // single and multi: 2 to 9 (number keys)
  other?: boolean | { label?: string; placeholder?: string }; // default true for single/multi
  required?: boolean;               // default false, so it can be skipped
  min?: number; max?: number;       // multi only
  default?: string | string[];      // option id(s) or text
  description?: string;             // a helper line under the prompt
}

interface Option {
  id: string;
  label: string;                    // "$250-400/night"
  description?: string;             // "Boutique, good locations"
  recommended?: boolean;            // gets a badge and is focused first
  disabled?: boolean;
  preview?: string;                 // sanitised HTML or plain text, shown beside the option
  compose?: string;                 // picking it starts this sentence in the composer instead (see §4b)
}
```

**Result (what comes back)**

```ts
interface ClarifyResult {
  questionnaireId: string;
  status: 'submitted' | 'skipped' | 'dismissed';   // skipped = "just go", dismissed = closed without a choice
  delivery: 'card' | 'composer';                  // answered in the card, or by a message sent from the composer
  answers: Record<string, Answer>;                // keyed by question id: the picks made so far
  message?: string;                               // the user's own words, when delivery is 'composer'
}

interface Answer {
  status: 'answered' | 'skipped';
  values: string[];                // option ids, [] if skipped
  labels: string[];                // human-readable, ready to put in a prompt
  other?: string;                  // free text, if used
}
```

> `skipped` vs `dismissed` mirrors MCP's `decline` vs `cancel`. The app tells the agent "use your judgement" for the first and "the user closed it" for the second.

---

## 4. Variants

| Axis | Values | Notes |
|---|---|---|
| `flow` | `sequential` · `all` | Sequential shows one question per step with a step counter. All shows every question in one scrollable card with a progress count. |
| `placement` | `replace` · `dock` | Replace hides the composer (via a slot or a `composer` selector) and gives it back when the card is minimised or done. Dock sits above the composer, which stays usable. |
| `density` | `comfortable` · `compact` | Compact is for docked cards on small screens. |
| Question `type` | `single` · `multi` · `text` | Plus the "Something else" row on single and multi |
| Option extras | description · recommended · disabled · preview | A preview turns the card into a two-column layout on wide screens |

**Auto-advance rules (sequential)**
- **Single**: a click or Enter selects it, the row confirms for about 120ms, then the card moves on. A number key does the same.
- **Multi**: **never auto-advances**. A Continue button is enabled once `min` is met. (This is Cursor's bug, avoided.)
- **Text / Something else**: Enter moves on and Shift+Enter adds a new line.
- **The last step** goes to **Review** (optional, `review="auto|always|never"`). By default the review step only appears when something was skipped or there are 3 or more questions.

---

## 4b. Answering in your own words

There's **one way to answer** (the card, with review for edits) and **one way out to your own words** (the composer). The composer can be reached by two routes.

**1 · Minimise, then type**
- Minimising (Esc or ⌄) folds the card into the pill and gives the composer back. In replace mode, its placeholder becomes **"Or reply in your own words…"**, so the input itself explains what typing will do.
- **A message sent while the card is minimised is the answer.** It goes back as `message` (`delivery: 'composer'`), together with the picks so far, and the pill turns into a record: "Replied in your own words".
- Dock mode behaves the same way, since there the composer is always visible.

**2 · A `compose` option** (for answers the user should write themselves: sensitive, personal, or longer than a pick)
- `{ "label": "I'll explain", "compose": "For accessibility, I need " }`
- Picking it **minimises the card and starts that sentence in the composer**, with the cursor at the end. From there it's route 1.
- The row shows it leaves the card: a pencil icon and a hint on the right reading **"write it ↗"**.
- What the user already typed is never overwritten: the sentence goes in front of it. The inserted text is briefly highlighted (600ms, none with reduced motion).

**Short details stay in the card:** a `text` question with a `default` prefills a sentence or detail that you edit in place, and it shows in review like any other answer.

**Wiring the composer**
- **Auto:** if `composer` points to a `<textarea>`, an `<input>` or a `contenteditable`, the card swaps its placeholder, inserts compose sentences, and listens for the form's submit.
- **Manual:** the card fires `clarify:compose` with `{ text }` so the app can insert it, and the app calls `card.reply(text)` when the user sends while the card is minimised.

**What the agent gets:** `toClaude()` puts `message` into Claude's `response` field ("The user responded: …"), so the user's words win over the picks. The sent message is the record, with a small "+ 2 picks" tag that shows the picks.

---

## 5. States

### Card-level (an explicit state machine)

```
hidden ──open()──▶ loading ──questions ready──▶ answering ⇄ reviewing
                                   │                 │            │
                                   │            dismiss/skip       submit
                                   │                 │            │
                                   ▼                 ▼            ▼
                                error ◀── fail ── submitting ──ok──▶ answered (record)
                                                                      │
          minimised (pill: "3 questions waiting · Reopen") ◀── dismiss / compose option
             └── message sent from composer ──▶ answered (replied in own words)  │ edit
          expired (read-only: "The agent moved on")                   ▼
                                                               revising → submitting
```

| State | What the user sees | Way out |
|---|---|---|
| `loading` | Skeleton rows, with questions streaming in as they arrive | Close |
| `answering` | The step (sequential) or the form (all) | Back, Skip, Close |
| `reviewing` | The answers as a list, each with Edit, and skipped ones flagged | Edit any, Reset, Submit |
| `submitting` | The button shows progress, and inputs are read-only | **Undo** during the grace window (default 0, can be set e.g. to 4s) |
| `answered` | The card collapses into a **record**: chips of the answers | **Edit answers** (emits `revise`) |
| `error` | An inline message, with **answers kept** | Retry, Edit |
| `minimised` | A small pill above the composer: "2 of 4 answered · Reopen". The composer says "Or reply in your own words…" | Reopen (with the draft kept), or send a message as the answer |
| `expired` | A read-only record: "The agent moved on without these" | None (information only) |
| `disabled` | Dimmed, not focusable | Controlled by the app |

### Question-level
`unanswered` · `answered` · `skipped` · `invalid` (required and empty, or below `min`) · `typing-other`

### Option-level
`default` · `hover` · `focus-visible` · `selected` · `recommended` · `disabled`

---

## 6. Recovery: making mistakes cheap

This is the part you called out. Each kind of mistake gets its own fix:

| Mistake | Recovery |
|---|---|
| Picked the wrong option in sequential (it auto-advanced) | **Back** (← key or the Back button) returns with the old choice still selected. The step counter is clickable. |
| Skipped one by accident | The skip toast says "Skipped Budget · **Undo**". Review flags skipped questions. |
| Answered several, want to start over | **Reset** in review and in the menu. One level of **undo** after a reset ("Answers cleared · Undo"). |
| Hit Esc or × by accident | Nothing is lost. The card **minimises** to a pill and the draft is kept. Reopen restores the exact step. |
| Submitted, then noticed a mistake | An optional **undo window** before the result is sent. After that, **Edit answers** on the record emits `clarify:revise` with the new result. |
| Submit failed (the app rejected it, or the network) | The error is inline and **answers are never cleared**. Retry. |
| Picked a compose option by mistake | **Reopen** the pill: the card comes back on that step, and the started sentence is removed if you haven't touched it |
| Replied in your own words, then wanted to answer properly | **Answer the questions** on the record reopens the card and emits `clarify:revise` |
| Typed in "Something else", changed your mind | Picking an option clears the field, and **Undo** brings the text back. |

**How it works:** every change goes through a reducer that keeps a **history stack** (capped at 50). Back, Undo and Reset are all just moves through that history, so the UI can't get out of sync with the data.

---

## 7. Public API (draft)

```html
<script type="module" src="clarify-card.js"></script>
<clarify-card placement="dock" flow="sequential"></clarify-card>
```

**Attributes / properties**
- `placement`, `flow`, `density`, `review`
- `undo-window` (ms)
- `composer` (a CSS selector, for `replace` mode)
- `questionnaire` (property, or JSON in the attribute)
- `disabled`
- `labels` (i18n)

**Methods**
- `open(questionnaire)`
- `close()` (minimise)
- `reset()`
- `back()`
- `setError(message)`
- `markAnswered()`
- `expire(message?)`
- `reply(text)`: manual wiring: the user sent a message while the card was minimised

**Events** (all `bubbles` + `composed`, with `detail` typed)
- `clarify:change`: on every answer change (good for drafts or analytics)
- `clarify:submit`: `ClarifyResult` with status `submitted`. Call `event.preventDefault()` and then `setError()` if your send fails.
- `clarify:compose`: `{ text }`, when a compose option is picked (manual wiring inserts the sentence)
- `clarify:skip`: the user chose "Skip all"
- `clarify:dismiss`: closed (minimised)
- `clarify:revise`: edited after it was answered

**Promise helper**: the friendliest way in for agent code:

```ts
import { ask } from 'clarify-card';
import { fromClaude, toClaude } from 'clarify-card/adapters/claude';

canUseTool: async (name, input) => {
  if (name !== 'AskUserQuestion') return { behavior: 'allow', updatedInput: input };
  const result = await ask(fromClaude(input), { placement: 'replace' });
  return { behavior: 'allow', updatedInput: toClaude(result, input) };
};
```

---

## 8. Theming, structure and quality bars

**Theming**
- The component uses Shadow DOM for clean isolation.
- Styling comes in three layers:
  1. **CSS variables**, the main way to restyle (about 25 tokens: `--clarify-bg`, `--clarify-fg`, `--clarify-muted`, `--clarify-border`, `--clarify-accent`, `--clarify-radius`, `--clarify-font`, `--clarify-space`, …)
  2. **`::part()`** for structural tweaks (`card`, `option`, `badge`, `footer`, …)
  3. **slots** for icons and the empty "Something else" icon
- Defaults are neutral greys with one accent, and they follow `prefers-color-scheme`, `[data-theme=dark]` or `color-scheme`.

**Accessibility**
- Single select is a `radiogroup`, multi-select is a `group` of checkboxes, and the question text is the group's label.
- A live region announces "Question 2 of 4", "Skipped", "Answers sent" and "Answers cleared".
- Focus moves into the card when it opens and back to the composer when it closes.
- Number keys are ignored while a text field has focus.
- All targets are 44px+ on touch, and the key-hint bar is hidden on `(hover: none)`.
- Reduced motion turns slides into plain swaps.
- WCAG AA contrast with the default tokens, checked by axe in tests.

**Motion**
- Step change: a 160ms slide plus fade.
- The card height animates between steps, so it doesn't jump (a lesson from the mode-picker audit).
- Collapsing into the record: 200ms.

**Size and dependencies**
- Zero runtime dependencies, written in vanilla TypeScript.
- Target **≤ 12 KB gzipped** for the core. Each adapter is about 1 KB.

**Testing**
- Unit tests for the reducer (Vitest).
- Interaction and a11y tests with Playwright + axe.
- Visual snapshots of every state in light and dark, at desktop and phone width.

---

## 9. Model-side guidance (shipped as docs)

A short "when to ask" snippet you can paste into a system prompt:
- Ask only when the answer **changes the result** and a wrong guess is **costly to redo**.
- Use at most 4 questions and 2 to 6 options each. Put a recommended option first.
- Never ask for anything you could read from the context.
- After a skip, **state what you assumed**.

---

## 10. Project structure and milestones

```
clarify-card/
  src/
    clarify-card.ts      # the custom element (render + events)
    state.ts             # reducer, history, state machine (pure, unit-tested)
    styles.ts            # tokens + component CSS
    ask.ts               # promise helper
    adapters/claude.ts
    adapters/mcp.ts
  demo/                  # playground: every variant and state, theme switcher
  design/board.html      # the visual board under review now
  tests/
  README.md
```

**Tooling:** Vite library mode, emitting ESM + types. It's published to npm and also served as a single `<script>` from a CDN (jsDelivr/unpkg) for no-build projects like the portfolio.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Plan + visual board reviewed** ← *we are here* | You sign off on the board and the plan |
| M1 | Schema + reducer + history | Unit tests pass for every transition |
| M2 | Sequential + all flows; single, multi and text inputs | Demo works with the mouse |
| M3 | Placements (replace, dock) + record + minimised pill | Demo works in a fake chat shell |
| M4 | Recovery: back, review, reset, undo, the undo window, revise, error | Every row in §6 can be demoed |
| M4b | Own words: minimise + send, compose options, composer auto-wire + manual | Both routes round-trip, with existing text kept |
| M5 | Keyboard + a11y + motion audit | axe is clean, with a keyboard-only and VoiceOver pass |
| M6 | Theming tokens + parts + Claude/MCP adapters | Two themes in the demo, plus an adapter round-trip test |
| M7 | README, playground deploy, npm publish, git push | Used in the portfolio story |

---

## 11. Open decisions (yours)

1. **Name:** `clarify-card`? Alternatives: `ask-card`, `question-card`, `<agent-ask>`. The npm scope too (`@marigameo/…`?).
2. **Review step default:** `auto` (only when something was skipped or there are 3+ questions), or always?
3. **Undo window after submit:** off by default (fast) or 4s by default (safe)?
4. **Previews:** in v1 or later? They add layout work.
5. **Licence:** MIT?
6. **Own-words copy:** the placeholder "Or reply in your own words…" and the compose hint "write it ↗". OK, or alternatives?
