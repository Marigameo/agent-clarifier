# agent-clarifier: spec (v1)

> A plug-and-play web component that lets a chat agent ask clarifying questions before it acts.
> Framework-agnostic, zero dependencies, neutral by default, restyled with CSS variables.
> Status: **scope locked (round 4), coverage gaps closed (round 5). The build steps are in [BUILD.md](BUILD.md), and the reason behind every token is in [DESIGN.md](DESIGN.md).**
> Name: `agent-clarifier` (package and repo) / `<agent-clarifier>` (element). Events stay `clarify:*` and CSS variables stay `--clarify-*`, to keep code short.

---

## 1. Who it's for, goals and non-goals

**Two users, served at once**
- **The developer** building an agentic chat in any business area. They want one tag that works with no setup and no dependencies, looks neutral, and can be themed to their brand.
- **The person answering**, who often writes a vague prompt. They want to reach a good response quickly: few choices, one question at a time, a sensible pick already suggested, and always a way out (skip, let the agent decide, or say it in their own words).

**Goals**
- One element that works in plain HTML, Astro, React, Vue, Svelte and Angular.
- Covers every state a clarifying flow can be in, and **makes mistakes cheap**: go back, edit, reset, undo, reopen.
- Two flows: **sequential** (one at a time, order matters) and **all at once** (order doesn't matter).
- Three input types: **single select**, **multi-select**, and a free-text **"Something else"**. Plain `text` questions too.
- Two placements: **replace** (takes over the composer) and **dock** (pinned above the composer, so it never scrolls away with messages).
- Leaves a **record** in the conversation once answered.
- **Your own words, always one step away**: minimise and type, or pick a **compose** option that starts a sentence in the composer for answers the user should write themselves.
- **Decide for me**, opt-in per question: the user hands the choice back to the agent, which then says what it chose (§4c).
- Keyboard-complete, screen-reader friendly, touch friendly, reduced-motion safe.
- **Works in any language and direction:** right-to-left layouts, plurals and local number formats from the start (§8).
- **Holds up with real content:** long questions, long options, many questions and small phone screens with the keyboard open (§8).
- Neutral look. Every colour, radius, space and font is a CSS variable, and **every default has a written reason** ([DESIGN.md](DESIGN.md)).

**Non-goals (v1)**
- **Branching** (show Q3 only if Q1 = X, with conditions declared up front and checked by the component). Considered in round 4 and deferred: the aim is a top-notch core, not more features.
- **Option previews** (a visual mockup next to an option, like Claude's `preview`). Deferred to v1.1. `fromClaude()` drops `preview`.
- Conditions on individual options, and adding follow-up questions to an open card.
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

## 3. The native format

```ts
interface Questionnaire {
  id: string;                       // ties answers back to the agent's request
  title?: string;                   // "A few questions before I search"
  flow?: 'sequential' | 'all';      // default 'sequential'
  source?: string;                  // "Claude", "Hotel search (MCP)": who is asking
  delegate?: boolean;               // default for every question's `delegate` (see §4c)
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
  delegate?: boolean;               // default false: show "Decide for me" in place of Skip (§4c)
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
  status: 'answered' | 'skipped' | 'delegated';   // delegated = "Decide for me"
  values: string[];                // option ids (text questions: [the text]), [] if skipped or delegated
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
| Option extras | description · recommended · disabled · compose | Previews are deferred to v1.1 |
| Question extras | required · delegate · min/max · default | `delegate` adds "Decide for me" in place of Skip (§4c) |

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
- What the user already typed is never overwritten: the sentence goes in front of it. The inserted text is briefly highlighted (600ms; a fading glow, so it stays with reduced motion).

**Short details stay in the card:** a `text` question with a `default` prefills a sentence or detail that you edit in place, and it shows in review like any other answer.

**Wiring the composer**
- **Auto:** if `composer` points to a `<textarea>`, an `<input>` or a `contenteditable`, the card swaps its placeholder, inserts compose sentences, and listens for the form's submit.
- **Manual:** the card fires `clarify:compose` with `{ text }` so the app can insert it, and the app calls `card.reply(text)` when the user sends while the card is minimised.

**What the agent gets:** `toClaude()` puts `message` into Claude's `response` field ("The user responded: …"), so the user's words win over the picks. The sent message is the record, with a small "+ 2 picks" tag that shows the picks.

---

## 4c. Decide for me (round 5)

**Why it's separate from Skip:** both let the agent carry on without an answer, but they mean different things. Skip reads as *"this doesn't matter to me"*, and the agent should say what it **assumed**. Decide for me reads as *"I trust you to pick"*, and the agent should say what it **chose**. Separate statuses let the agent's reply match what the user meant.

**Rules**
- **Opt-in per question** with `delegate: true`. Set `delegate` on the questionnaire to make it the default for every question.
- **One way out per question:** on a question with `delegate`, the "Decide for me" row **replaces Skip**. The user never sees both.
- **It's an answer, so it sits with the answers:** a quiet last row (after "Something else"), drawn like "Something else", with an icon instead of a number key. In the all-at-once flow it's the last chip.
- **It's exclusive:** picking it clears any picks or typed text on that question, and picking an option clears it. Each change is one undo step, like any other pick.
- **Sequential:** it moves on after the same 120ms confirm as a single pick, including on multi-select questions, because it's a complete answer on its own.
- **Required questions can't be delegated.** `required: true` wins and `delegate` is ignored with a warning. If the agent needs the user's answer, it shouldn't offer to decide.
- **Review and record** show it as an answer, not as a gap. The working copy is "Left to the agent" (wording still to settle). It isn't flagged the way skipped answers are, and it doesn't trigger the review step on its own.
- **What the agent gets:** `status: 'delegated'` with empty `values`. `toClaude()` sends a short instruction as that question's answer: "Up to you. Pick what fits and say what you chose." The app can override it.

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
`unanswered` · `answered` · `skipped` · `delegated` · `invalid` (required and empty, or below `min`) · `typing-other`

### Option-level
`default` · `hover` · `focus-visible` · `selected` · `recommended` · `disabled`

---

## 6. Recovery: making mistakes cheap

This is the part you called out. Each kind of mistake gets its own fix:

| Mistake | Recovery |
|---|---|
| Picked the wrong option in sequential (it auto-advanced) | **Back** (← key or the Back button) returns with the old choice still selected. The step counter is clickable. |
| Picked "Decide for me", then wanted to choose | **Back** returns to the question with "Decide for me" still marked. Picking an option replaces it, and **Undo** restores it. |
| Skipped one by accident | The skip toast says "Skipped Budget · **Undo**". Review flags skipped questions. |
| Answered several, want to start over | **Start over** in review. One level of **undo** after it ("Answers cleared · Undo"). |
| Hit Esc or minimise by accident | Nothing is lost. The card **minimises** to a pill and the draft is kept. Reopen restores the exact step. |
| Submitted, then noticed a mistake | An optional **undo window** before the result is sent. After that, **Edit answers** on the record emits `clarify:revise` with the new result. |
| Submit failed (the app rejected it, or the network) | The error is inline and **answers are never cleared**. Retry. |
| Picked a compose option by mistake | **Reopen** the pill: the card comes back on that step, and the started sentence is removed if you haven't touched it |
| Replied in your own words, then wanted to answer properly | **Answer the questions** on the record reopens the card and emits `clarify:revise` |
| Typed in "Something else", changed your mind | Picking an option clears the field, and **Undo** brings the text back. |

**How it works:** every change goes through one reducer. Answer changes push onto a **history stack** (capped at 50). **Undo** and **Start over** move through that stack. **Back** and **Edit** only navigate and never change answers, so they can't get out of sync with the data.

---

## 7. Public API (summary; full signatures in BUILD.md §6)

```html
<script type="module" src="agent-clarifier.js"></script>
<agent-clarifier placement="dock" flow="sequential"></agent-clarifier>
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
import { ask } from '@marigameo/agent-clarifier';
import { fromClaude, toClaude } from '@marigameo/agent-clarifier/adapters/claude';

canUseTool: async (name, input) => {
  if (name !== 'AskUserQuestion') return { behavior: 'allow', updatedInput: input };
  const result = await ask(fromClaude(input), { container: composerSlot, transcript: messages });
  return toClaude(result, input);
};
```

---

## 8. Theming, structure and quality bars

**Theming**
- The component uses Shadow DOM for clean isolation.
- Styling comes in three layers:
  1. **CSS variables**, the main way to restyle (about 25 tokens: `--clarify-bg`, `--clarify-fg`, `--clarify-muted`, `--clarify-border`, `--clarify-accent`, `--clarify-radius`, `--clarify-font`, `--clarify-space`, …)
  2. **`::part()`** for structural tweaks (`card`, `option`, `badge`, `footer`, …)
- Defaults are neutral greys with one accent, and they follow `prefers-color-scheme`, `[data-theme=dark]` or `color-scheme`.

**Accessibility**
- Single select is a `radiogroup`, multi-select is a `group` of checkboxes, and the question text is the group's label.
- A live region announces "Question 2 of 4", "Skipped", "Answers sent" and "Answers cleared".
- Focus moves into the card when it opens and back to the composer when it closes.
- Number keys are ignored while a text field has focus.
- All targets are 44px+ on touch, and the key-hint bar is hidden on `(hover: none)`.
- Reduced motion turns slides into crossfades: nothing moves or resizes, but nothing teleports either.
- WCAG AA contrast with the default tokens, checked by axe in tests.

**Motion**
- Step change: a 160ms slide plus fade.
- The card height animates between steps, so it doesn't jump (a lesson from the mode-picker audit).
- Collapsing into the record: 200ms.

**Language and direction** (round 5: built in from the first line of CSS, not checked at the end)
- **Right-to-left:** the CSS only uses logical properties (`margin-inline-start`, `inset-inline-end`, …), so the layout flips when the page's `dir` is `rtl`. Directional things mirror too: the back and forward icons, the step slide, and the arrow key that means "back".
- **Plurals:** strings can have plural forms ("Up to 1 choice" / "Up to 3 choices"), chosen with the browser's built-in `Intl.PluralRules` for the page's `lang`.
- **Numbers:** counts like "2 of 4" use the page's number format (`Intl.NumberFormat`). Number-key badges stay 1–9, because they name physical keys.

**Long content** (round 5)
- **Never cut off what the user needs to decide.** Question text, option labels and descriptions wrap. Long words and URLs break rather than widen the card.
- **Only summaries are shortened:** answer chips in the record and the pill text. The full text stays in the accessible name and on hover.
- **The card has a maximum height** (60% of the visible screen, set by `--clarify-max-height`). The header and footer stay in place and the questions scroll between them. A soft edge shadow appears **only while content is scrolled under it**, so the shadow always means "there's more here".
- **Text fields grow** up to about 5 lines, then scroll.

**Phone** (round 5)
- **The on-screen keyboard:** the card measures the *visible* screen (`visualViewport`), not the page. So with the keyboard open, the card shrinks and scrolls inside, and the composer stays in view.
- **No surprise keyboard:** on touch screens, opening the card never focuses a text field, because that would pop the keyboard up over the question. Focus goes to an option, or to the card itself.
- **Bottom safe area** (the iPhone home bar): this is the app's layout to handle, because the card sits inside the app's own bottom area. The component doesn't add its own inset, which would double it. The README shows where `env(safe-area-inset-bottom)` goes.
- Touch targets are **44px+ even where the visual is smaller** (chips, footer buttons, icon buttons): the hit area grows on `(pointer: coarse)` and the drawing stays the same.

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
- Turn on `delegate` where any sensible pick would do. When the user picks "Decide for me", **state what you chose**.

---

## 10. Project structure and milestones

```
agent-clarifier/
  src/
    agent-clarifier.ts   # the custom element (render + events)
    state.ts             # reducer, history, state machine (pure, unit-tested)
    styles.ts            # tokens + component CSS
    ask.ts               # promise helper
    adapters/claude.ts
    adapters/mcp.ts
  demo/                  # playground: every variant and state, theme switcher
  design/board.html      # the visual board under review now
  DESIGN.md              # the reason behind every token, motion value and layout rule
  tests/
  README.md
```

**Tooling:** Vite library mode, emitting ESM + types. It's published to npm and also served as a single `<script>` from a CDN (jsDelivr/unpkg) for no-build projects like the portfolio.

| # | Milestone | Done when |
|---|---|---|
| M0 | Plan + visual board reviewed, decisions settled | ✅ Round 4 |
| M1 | Schema + reducer + history | Unit tests pass for every transition |
| M2 | Sequential + all flows; single, multi and text inputs | Demo works with the mouse |
| M3 | Placements (replace, dock) + record + minimised pill | Demo works in a fake chat shell |
| M4 | Recovery: back, review, reset, undo, the undo window, revise, error | Every row in §6 can be demoed |
| M4b | Own words: minimise + send, compose options, composer auto-wire + manual | Both routes round-trip, with existing text kept |
| M5 | Keyboard + a11y + motion audit, RTL, long content, phone keyboard | axe is clean, with a keyboard-only and VoiceOver pass. RTL and long-content scenarios look right |
| M6 | Theming tokens + parts + Claude/MCP adapters | Two themes in the demo, plus an adapter round-trip test |
| M7 | README, playground deploy, npm publish, git push | Used in the portfolio story |

---

## 11. Decisions (all settled, round 4)

| # | Decision | Settled as |
|---|---|---|
| 1 | Name | `agent-clarifier`, published as **`@marigameo/agent-clarifier`** (`publishConfig.access: "public"`) |
| 2 | Review step default | **`auto`**: shown only when something was skipped or there are 3+ questions. `review="always"` / `"never"` override it |
| 3 | Undo window after submit | **Off by default.** Apps opt in with `undo-window="4000"` |
| 4 | Option previews | **Later (v1.1)** |
| 5 | Licence | **MIT** |
| 6 | Own-words copy | Placeholder **"Or reply in your own words…"**, and compose hint **"write it ↗"** |
| 7 | Branching | **Out of v1.** Scope stays as designed |
| 8 | Decide for me (round 5) | **In, opt-in per question** (`delegate`). It replaces Skip on that question, and the answer comes back as `delegated` (§4c) |
| 9 | Long content (round 5) | Wrap what the user decides on; only shorten summaries; a max-height card with pinned header and footer. **To be stress-tested visually later** |
| 10 | Phone (round 5) | The visible screen sets the size; no surprise keyboard; 44px hit areas; the safe area is the app's |
| 11 | Language and direction (round 5) | RTL from the start (logical properties only), plurals, local number formats |
| 12 | Yes/no (round 5) | **No new type.** A `single` question with two options keeps the same rows, keys and habits |
| 13 | Streaming (round 5) | **As planned:** questions appear as they arrive and can be answered once they've all arrived |
| 14 | Design rationale (round 5) | Every default token gets a written reason in [DESIGN.md](DESIGN.md). Values without a good reason are flagged for the next visual round |
