# agent-clarifier: build plan (v1)

> **How** to build what [PLAN.md](PLAN.md) specifies. [design/board.html](design/board.html) is the early sketch (frozen in round 6). The **playground** (`demo/`, §2.1) is where visuals are judged and decided.
> Written so a build session can implement it without re-deciding anything. If something here conflicts with PLAN.md, raise it with Mari before choosing.
> Status: **agreed (round 5, 10 Oct 2026).** Mari approved it with every "call made" in §13 accepted. Implementation follows the milestones in §10.

---

## 0. Scope lock

**In v1:**
- **Flows:** `sequential` and `all`.
- **Inputs:** `single`, `multi`, `text`, plus the "Something else" row.
- **Placements:** `replace` and `dock`. **Density:** `comfortable` and `compact`.
- **States:** every state in PLAN §5.
- **Recovery:** every row in PLAN §6.
- **Own words:** minimise and send, plus `compose` options.
- **Decide for me:** opt-in per question with `delegate` (PLAN §4c).
- **Real-world layout:** long content, phone keyboard, RTL, plurals and number formats (PLAN §8).
- **Undo window:** off by default.
- **Converters:** Claude and MCP.
- **The `ask()` helper.**
- **Styling:** CSS-variable theming, light and dark, `::part()`.
- **Quality:** a11y, keyboard and motion.

**Not in v1:**
- branching, and conditions on individual options
- option previews (v1.1)
- icon slots
- adding questions to an open card
- validation beyond required, min and max
- any networking

**Quality over features:** if something above turns out costly, it's cut and logged in JOURNAL.md, never half-built.

---

## 1. Technical decisions

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript, strict | Typed format and events are the product for developers |
| Element | Vanilla custom element, **open Shadow DOM** | Works in every framework with zero dependencies. Open shadow lets tests and devtools see inside. |
| Rendering | **A builder per view plus targeted updates** (§4.3). No framework, no virtual DOM. | Focus, text selection and running animations survive updates. Keeps the size budget. |
| Build | Vite library mode → ESM + `.d.ts` (via `vite-plugin-dts`) | Simple and standard |
| Package manager | pnpm | Already on this machine |
| Tests | Vitest (unit), Vitest browser mode with Playwright (component), Playwright (e2e, axe, screenshots) | Real browsers for focus, keyboard and Shadow DOM |
| Browsers | Last 2 versions of Chrome, Edge, Firefox and Safari (Safari ≥ 16.4) | Needed for `color-mix()`, `:focus-visible` and Web Animations |
| Size | **Target ≤ 12 KB gzipped** for the core, about 1 KB per converter. Checked with `size-limit`. **Mari's call (M1): polish first, then measure and cut.** The target guides us; it doesn't block a quality feature. If we go over, cuts are proposed to Mari, never made silently | Plug and play should mean light |
| Runtime deps | **None** | |
| Licence | MIT | |
| Node | 22 | Installed |

---

## 2. Repo layout

```
agent-clarifier/
  src/
    index.ts              # public entry: defines <agent-clarifier>, re-exports types, ask()
    element.ts            # AgentClarifier class: attributes, properties, methods, events, focus, composer wiring
    model/
      types.ts            # Questionnaire, Question, Option, ClarifyResult, Answer, State, Action
      normalize.ts        # validate + fill defaults → NormalizedQuestionnaire (or errors)
      reducer.ts          # (state, action) → state. Pure. Includes history
      selectors.ts        # progress, canContinue, needsReview, buildResult, ...
    view/
      dom.ts              # tiny h() helper + icon SVGs
      step.ts             # sequential step view
      form.ts             # all-at-once view
      review.ts           # review view
      chrome.ts           # header, footer, toast, banner, hint bar
      pill.ts             # minimised pill
      record.ts           # record variants (answered / skipped / replied / expired)
      skeleton.ts         # loading view
      motion.ts           # height animation, step slide, reduced-motion guard
      viewport.ts         # visible-screen height (visualViewport) → --_vvh; scroll-edge shadows
    composer.ts           # find, hide/show, placeholder swap, insert, flash, submit listener
    labels.ts             # default English strings + merge, plural forms, number format, lang/dir lookup
    styles.ts             # constructable stylesheet: tokens, light/dark, component CSS
    ask.ts                # promise helper
    adapters/
      claude.ts           # fromClaude / toClaude
      mcp.ts              # fromElicitation / toElicitation
    jsx.d.ts              # React / Preact IntrinsicElements typing
  tests/
    unit/                 # model + adapters (node)
    component/            # element in a real browser (Vitest browser mode)
    e2e/                  # playground scenarios: flows, axe, screenshots
  demo/
    index.html            # the playground (§2.1)
    main.ts               # controls, URL state, event log
    scenarios.ts          # dummy questionnaires, one per case to judge
    playground.css        # the playground's own look (never shipped)
  design/board.html       # the early sketch, frozen in round 6
  process/                # frozen snapshots, never edited
  PLAN.md  BUILD.md  DESIGN.md  JOURNAL.md  CLAUDE.md  README.md  LICENSE
```

### 2.1 The playground (round 6)

The real `<agent-clarifier>`, wired to dummy data, inside a fake chat. It's dev-only and never shipped. `pnpm dev` opens it.

- **Fake chat:** messages, a real `<textarea>` composer and a send button. Width presets: 375 (phone), 768 and full.
- **Scenarios:** dummy questionnaires covering every case on Mari's list, including yes/no, single, multi with limits, required, sequential, all at once, Decide for me, long content, streaming, a failing send and Arabic RTL.
- **Controls:** placement, flow, density, review, undo window, theme (light, dark, warm), language/direction, and "slow send" / "failing send".
- **Readouts:** a live event log (`clarify:*` with `detail`), the last `ClarifyResult` as JSON, and the reducer state.
- **Every setting lives in the URL** (`?scenario=long&dir=rtl&theme=dark`), so a case is a link. Screenshots, Playwright tests and review rounds all use those links.
- **DESIGN.md findings (F1–F15) are decided here**, on the real component, often as a toggle to compare live (warm vs neutral greys, replace shadow on/off).
- **Review rounds snapshot playground screenshots** (light, dark, 375) into `process/` in place of board renders.

**Package `exports`:**
- `.` → `dist/index.js`. Importing it defines the element (guarded for SSR: no-op if `customElements` is undefined). It also exports `AgentClarifier`, `ask` and all types.
- `./adapters/claude` and `./adapters/mcp`
- `./jsx` → types only
- For no-build sites (like the portfolio): `<script type="module" src="https://cdn.jsdelivr.net/npm/@marigameo/agent-clarifier/dist/index.js">`

`package.json` includes `"sideEffects": ["./dist/index.js"]` and `"publishConfig": { "access": "public" }`.

---

## 3. Data contract

The types from PLAN §3, finalised. `preview` is removed for v1.

### 3.1 Normalising and validating (`normalize.ts`)

Runs on every `open()`. It **fixes what it can, warns once per issue** (`console.warn('[agent-clarifier] …')`), and only refuses when nothing sensible can be shown.

| Input problem | Behaviour |
|---|---|
| `flow` missing | `'sequential'` |
| `other` missing on single or multi | `true` |
| `required` missing | `false` |
| Question `id` missing or duplicated | Make one from the index (`q1`, `q2`…) and warn |
| Option `id` missing or duplicated | Make one from the label (slug, made unique) and warn |
| `label` missing | Use the prompt |
| `min` / `max` missing on multi | `min` = 1 (so Continue always means "I picked something"; Skip is the way past with none), `max` = the number of options |
| `default` given as a string on single or multi | Wrap it in an array |
| More than 9 options | Keep the first 9 and warn (number keys only go to 9) |
| Fewer than 2 options on single or multi | Warn, and still render |
| More than one `recommended` | Keep the first and warn |
| `min` > number of options, or `min` > `max` | Clamp and warn |
| `default` points to an unknown option | Ignore it and warn |
| A `compose` option on a multi question | Ignore `compose` and warn (compose only works on single) |
| `other: true` together with a `compose` option on the same question | Allowed, but warn ("two free-text routes"). The board's H1 uses `other: false`. |
| `delegate` missing | Take the questionnaire's `delegate`, else `false` |
| `delegate: true` together with `required: true` on the same question | `required` wins: drop `delegate` and warn. A questionnaire-level `delegate` skips required questions **silently**, because that's the expected mix |
| Questionnaire `id` missing | A short stable hash of the prompts (`c` + djb2), and warn |
| `flow` not `sequential` or `all` | `'sequential'`, and warn |
| Question not an object, or no prompt | Leave it out and warn |
| `type` missing or unknown | `single` if it has options, else `text`, and warn |
| Options on a `text` question | Ignore them and warn |
| Option not an object, or no label | Leave it out and warn |
| A `recommended` option that's `disabled` | Drop the badge and warn (focus must never land on a disabled option) |
| `min` < 1 on multi | 1, and warn |
| `min` / `max` on single or text | Ignore and warn |
| `default` on a disabled option, or more defaults than `max` allows | Ignore or trim, and warn |
| Blank strings (`""`, `"  "`) | Count as missing |
| **No questions** | **Refuse:** fire `clarify:error` `{ reason: 'empty' }` and stay `hidden` |

**Implementation:** `normalize()` is pure. It returns `{ ok, q, warnings }` with each warning as `{ code, at }` (for example `{ code: 'too-many-options', at: 'questions[1]' }`), and the element prints them. Ids are generated by `slug()` (keeps letters in any script) and `claim()` (adds `-2`, `-3` until free).

### 3.2 Result rules

- `answers` always has **one entry per question**: `answered`, `skipped` or `delegated`. An unanswered question at submit time counts as `skipped`.
- `labels` are the visible option labels. "Something else" text appears in `other`, and in `labels` as the typed text. A `delegated` answer has empty `values` and `labels`.
- **If every question is skipped, the result's status is `skipped`** (not `submitted`, and no review step). This is the same as "Skip all". **A delegated answer counts as an answer here**: it's a choice the user made, so a card with every question delegated is `submitted`.
- `delivery: 'composer'` always comes with `message` (trimmed, never empty).

---

## 4. Architecture

```
 open(q) ─▶ normalize ─▶ reducer(state, action) ─▶ new state ─▶ element.render(state, prev)
                              ▲                                     │
            DOM events ───────┘   (keyboard, pointer, composer)     ├─ view swap?  → build view, animate height
                                                                    └─ same view?  → update(view, state)
                                                                    └─ fire events (clarify:*) from transitions
```

### 4.1 State (`types.ts`)

```ts
type Status = 'hidden' | 'loading' | 'answering' | 'reviewing' | 'submitting'
            | 'answered' | 'error' | 'minimised' | 'expired';

interface Draft { values: string[]; other: string; otherActive: boolean; skipped: boolean; delegated: boolean; text: string }

interface State {
  status: Status;
  q: NormalizedQuestionnaire | null;
  partial: boolean;                 // still streaming questions in
  step: number;                     // sequential: current question index
  drafts: Record<string, Draft>;    // by question id
  returnTo: 'review' | null;        // set by Edit-from-review: the next Continue goes back to review
  resumeTo: Status | null;          // where Reopen returns (answering or reviewing)
  attempted: boolean;               // all flow: show required errors only after a send attempt
  error: string | null;
  toast: Toast | null;              // data, not words: { kind: 'skipped', questionId } | { kind: 'cleared' } | { kind: 'limit', max }
  record: ClarifyRecord | null;     // { kind: 'answered'|'skipped'|'replied'|'expired', result, message? }
  revising: boolean;                // reopened from a record: the next submit fires clarify:revise
  compose: { questionId: string; text: string } | null;   // "touched" is read from the composer by the element on reopen (§7)
  undoUntil: number | null;         // undo window deadline (ms timestamp)
  history: Snapshot[];              // past { step, drafts, status }, capped at 50
}
```

### 4.2 Actions and transitions (`reducer.ts`)

**The reducer is pure:** `reducer(state, action, env)`, where `env` = `{ review, undoWindow, now }`. Everything from the outside world (attributes, the clock) comes in through `env`, so the same inputs always give the same state.

**Push history** = snapshot `{ step, drafts, status }` before applying. **Undo** restores the latest snapshot. Navigation never pushes.

**Rules for every action** (settled while building M1):
- An action that isn't allowed, or **changes nothing**, returns the **same state object**. Picking the already-picked option adds no undo step, and the element can skip rendering with one `next === prev` check.
- States are never mutated (tests deep-freeze them), so snapshots can share drafts with the live state.
- A snapshot identical to the last one isn't pushed again.
- **A toast lasts until the next action that changes something**, unless that action sets a new toast. A no-op doesn't clear it.

| Action | Allowed in | Effect | History |
|---|---|---|---|
| `OPEN(q, partial)` | hidden, answered, expired | Reset the state. `loading` if partial, else `answering`. Apply `default`s. `q` may be `null` while partial (no complete question yet) | cleared |
| `STREAM(q, partial)` | loading, or minimised from loading | Replace `q`. Go to `answering` once `partial=false`. If minimised, only `resumeTo` changes, so Reopen lands in `answering` | – |
| `SELECT(qid, opt)` | answering | Single: set the value and clear `other` and `delegated`. Sequential: schedule `NEXT` after 120ms (the element does the timing; the reducer stays pure) | push |
| `TOGGLE(qid, opt)` | answering | Multi: add or remove, blocked at `max` (toast "Up to N", no undo step). "Something else" with text counts as a pick. Picks are kept **in the options' order**, so the result reads the same however they were clicked. Clears `delegated` | push |
| `OTHER_FOCUS(qid)` / `OTHER_INPUT(qid, text)` | answering | Set `otherActive`, and the text. Clears `delegated`. Typing doesn't push on every key: one push when the field is entered | push (once) |
| `TEXT_FOCUS(qid)` | answering | The text field was entered. Mirrors `OTHER_FOCUS`, so a whole typing session is one undo step | push |
| `TEXT_INPUT(qid, text)` | answering | Text question value. Clears `delegated` | – (the push happened on `TEXT_FOCUS`) |
| `DELEGATE(qid)` | answering, on a question with `delegate` | Set `delegated`, clear `values`, `other` and `text`, unset `skipped`. Sequential: schedule `NEXT` after 120ms, **on multi too** (it's a complete answer). Picking it again in the all flow unsets it | push |
| `NEXT` | answering, sequential | Only when the current question is **settled** (answered, delegated or skipped). If `returnTo='review'` → reviewing. Else step+1. After the last step: nothing answered → finish as skipped; else `needsReview` ? reviewing : `SUBMIT` | – |
| `BACK` | answering, reviewing | Step−1 (or from review back to the last step). Answers are untouched | – |
| `GOTO(step)` | answering | Only to steps that are answered or skipped (the clickable dots) | – |
| `SKIP(qid)` | answering, on a question that is **not required** and has **no** `delegate` (there, "Decide for me" replaces Skip) | Mark it skipped, clear its values, then `NEXT` (sequential, current question only). Toast: "Skipped ‘Label’ · Undo" | push |
| `SKIP_ALL` | answering (all flow), **only if no question is required** (the element hides the button otherwise) | Every question skipped → result `skipped` → record `skipped`. Fires `clarify:skip` | cleared |
| `EDIT(qid)` | reviewing | Go to that step with `returnTo='review'` | – |
| `START_OVER` | reviewing | Clear all drafts, go to step 0. Toast: "Answers cleared · Undo" | push |
| `UNDO` | answering, reviewing | Restore the latest snapshot. Clear the toast | pop |
| `SUBMIT` | answering (all flow or last step), reviewing | If any question is **invalid** (required and empty, or picks below `min`) → `attempted=true` and stay. If nothing is answered → finish as skipped. Else → `submitting` with `resumeTo` = where it came from, and `undoUntil` = `now + undoWindow` if the window is on | – |
| `UNDO_SUBMIT` | submitting, while `now < undoUntil` | Back to `resumeTo` | – |
| `SUBMIT_OK` | submitting | Record `answered`. Clear history | cleared |
| `SUBMIT_FAIL(msg)` | submitting | → `error` with the message. Answers kept | – |
| `RETRY` | error | → `submitting` (fires submit again) | – |
| `MINIMISE` | loading, answering, reviewing, error | `resumeTo` = current status → `minimised`. Toast cleared | – |
| `REOPEN` | minimised | → `resumeTo`. If `compose` is untouched, the element removes the inserted sentence | – |
| `COMPOSE(qid, opt)` | answering | Record the pick as the answer, set `compose`, → `minimised` | push |
| `REPLY(text)` | minimised, answering, reviewing (the **element** only sends it while answering or reviewing in dock mode) | Text trimmed; blank → nothing. Record `replied`, result `delivery: 'composer'` with `message` and the picks so far | cleared |
| `REVISE` | answered (record of any kind except expired) | Sequential with answers → reviewing. All flow → the form (answering). After a skip, or with nothing picked → fresh drafts at step 0. `revising=true` until the next record | cleared |
| `EXPIRE(msg?)` | anything except hidden, **answered** and expired (an answer already given stays given) | Record `expired`, read-only, result `dismissed` | cleared |
| `RESET` | any | Back to `hidden`, everything cleared (the `reset()` method) | cleared |
| `TOAST_TIMEOUT` | any | Clear the toast (after 5s, or on the next action) | – |

**Selectors:**
- `needsReview(state, reviewSetting)`: `'auto'` means something was skipped OR there are 3+ questions. A delegated answer doesn't count as skipped.
- `progress`: sequential is `{ step, total }`, all flow is `{ answered, total }`. Delegated counts as answered.
- `canContinue`: multi needs `values.length ≥ min`, required needs an answer, text and other need non-empty text. `delegated` always satisfies it.
- `buildResult(state, kind)`

### 4.3 Rendering (`element.ts` + `view/*`)

- **One view per status:**
  - skeleton (loading)
  - step or form (answering)
  - review
  - pill (minimised)
  - record (answered or expired)
  - submitting and error reuse the review/step view, plus a banner or a progress footer
- **When the view changes**, build the new view, swap it in, and animate the card height from old to new (`motion.ts`, Web Animations API, `--clarify-duration`). With reduced motion: no height or slide animation, just an instant swap.
- **When the step changes**, the question body slides 12px with a fade (160ms), and the height animates.
- **Within a view**, `update()` only toggles classes, attributes and text, so focus, text selection and IME input survive.
- **Events** fire from transitions (compare previous and next status) in one place, `emitFor(prev, next, action)`. Every event is fired exactly once.

---

## 5. Interaction spec

### 5.1 Keyboard

| Context | Keys |
|---|---|
| Option list (single) | `1`–`9` picks · `↑/↓` move · `Home/End` · `Enter` / `Space` picks · `←` back (`→` in RTL) · `Esc` minimise · `⌘Z` / `Ctrl+Z` undo |
| "Decide for me" row | Reached with `↑/↓` like "Something else" (it has no number key) · `Enter` / `Space` picks |
| Option list (multi) | `1`–`9` and `Space` toggle · `↑/↓` move · `Enter` continues (if allowed) · `←` · `Esc` · `⌘Z` |
| "Something else" field | Typing is normal (number keys type numbers) · `Enter` confirms (single: moves on) · `Esc` leaves the field with the text kept · `↑` at the start of the field goes back to the options |
| Text question | `Enter` continues · `Shift+Enter` adds a new line · `Esc` minimise |
| All flow | `Tab` moves between question groups and the footer · `←/→` and `↑/↓` move within chips · `Space`/`Enter` picks |
| Review | `Tab` through the Edit links · `Enter` on the primary button sends |
| Pill | `Enter` reopens |

**Rules:**
- Keys are only handled when focus is inside the card.
- **Direction-aware:** "back" is the arrow pointing against the reading direction. Read `getComputedStyle(host).direction` when the key is pressed, so a `dir` change on the page is picked up without a re-render.
- Ignore key events while composing (`event.isComposing`), so IME input is safe.
- `⌘Z` inside a text field is the browser's own undo, not ours.

### 5.2 Focus

- **On open:**
  - `replace`: focus the recommended option, else the first one.
  - `dock`: **don't steal focus.** The user may be typing in the composer. Focus moves in on the first keypress or click inside.
  - **On touch screens (`pointer: coarse`), never auto-focus a text field**, on open or on a step change. It would pop the keyboard up over the question. If the step is a text question, focus the card container instead, and the keyboard opens when the user taps the field.
- **On step change:** focus the new step's recommended option, or the previously selected one.
- **On minimise:** focus the composer (in replace mode it's shown again). **On reopen:** restore the element that was focused.
- **When the record appears:** don't move focus. Announce it instead (§5.4).
- Focus is never lost to `<body>`. If the focused element is removed, focus moves to the card container (`tabindex=-1`).

### 5.3 Pointer and touch

- Whole rows are clickable, at 44px minimum (`compact`: 44px, `comfortable`: 52px).
- **Smaller controls keep a 44px hit area on touch:** chips (32px drawn), footer buttons (32px), icon buttons (28px) and the pill button get an invisible `::after` that extends the hit area to 44×44px under `(pointer: coarse)`. The drawing doesn't change, and hit areas never overlap a neighbour (the spacing is checked in the M5 audit).
- Hover styles only apply on `(hover: hover)`, and the key-hint bar hides on `(hover: none)`.
- Auto-advance waits 120ms so the selection is seen. A second click within that window doesn't double-advance.

### 5.4 Live region (polite, inside the shadow root)

These are exact strings and can be overridden through `labels`:
- "Question {n} of {total}: {prompt}"
- "Skipped {label}. Undo available."
- "Answers cleared. Undo available."
- "{label}: left to the agent." (wording follows the delegated-answer copy, still to settle)
- "Up to {max} choices."
- "Review your answers."
- "Answers sent."
- "Questions minimised. Type a message to reply in your own words."
- "Couldn't send your answers." plus the app's message

### 5.5 ARIA

- **Card:** `role="group"`, labelled by the title.
- **Single:** `role="radiogroup"` with roving `tabindex` and `role="radio"` / `aria-checked`. The number badge is `aria-hidden`.
- **Multi:** `role="group"` with `role="checkbox"` / `aria-checked`.
- **"Something else":** a radio or checkbox that becomes an `<input>` with `aria-label="Something else"`.
- **"Decide for me":**
  - On single, it's one more `radio` in the group.
  - On multi, it's a `checkbox` that unchecks the others: the same pattern as "None of the above". Its accessible description says "Clears your other picks".
  - On text questions, it's a toggle `button` with `aria-pressed`, under the field.
- **Review rows:** a `<dl>`, with each Edit link labelled "Edit {label}".
- **Required:** `aria-required`. Errors are linked with `aria-describedby`.
- **The pill:** a `button` labelled "{n} of {total} answered. Reopen questions".

---

## 6. Public API

### 6.1 Attributes ↔ properties (reflected)

| Attribute | Property | Values | Default |
|---|---|---|---|
| `placement` | `placement` | `replace` · `dock` | `replace` |
| `flow` | `flow` | `sequential` · `all` (the questionnaire's `flow` wins) | `sequential` |
| `density` | `density` | `comfortable` · `compact` | `comfortable` |
| `review` | `review` | `auto` · `always` · `never` | `auto` |
| `undo-window` | `undoWindow` | ms, `0` = off | `0` |
| `composer` | `composer` | CSS selector, or an element (property) | none |
| `composer-container` | `composerContainer` | What to hide in replace mode | the composer's `form`, else the composer itself |
| `theme` | `theme` | `auto` · `light` · `dark` | `auto` |
| `disabled` | `disabled` | boolean | `false` |
| – | `labels` | `Partial<Labels>` | English |
| – | `questionnaire` | Setting it calls `open()` | – |
| – | `state` (read-only) | the current `Status` | – |

### 6.2 Methods

```ts
open(q: Questionnaire, opts?: { partial?: boolean }): void   // also used to stream: call again with more questions
minimise(): void
reopen(): void
reset(): void                 // back to hidden, everything cleared
markAnswered(): void          // after a prevented submit, once the app's send succeeded
setError(message: string): void
expire(message?: string): void
reply(text: string): void     // manual composer wiring
```

### 6.3 Events (`bubbles`, `composed`)

| Event | `detail` | Cancelable | When |
|---|---|---|---|
| `clarify:change` | `{ answers }` | no | Any answer change |
| `clarify:submit` | `ClarifyResult` | **yes** | Send (after the undo window). **Not prevented** → answered at once. **Prevented** → stays `submitting` until `markAnswered()` or `setError()` |
| `clarify:revise` | `ClarifyResult` | yes | Like submit, but sent from a reopened record |
| `clarify:skip` | `ClarifyResult` (status `skipped`) | no | Skip all, or every question skipped |
| `clarify:reply` | `ClarifyResult` (delivery `composer`) | no | A message was sent while the card was minimised |
| `clarify:compose` | `{ text, questionId, optionId }` | **yes** | A compose option was picked. Prevent it to insert the text yourself |
| `clarify:dismiss` | `{ resumeTo }` | no | Minimised |
| `clarify:reopen` | – | no | Reopened: from the pill, **or from a record** (Edit answers / Answer the questions). Apps that move the record into the transcript move the element back to the composer on this event |
| `clarify:expire` | `ClarifyResult` (status `dismissed`) | no | `expire()` was called |
| `clarify:error` | `{ reason }` | no | The questionnaire couldn't be shown |

### 6.4 `ask()`

```ts
ask(q: Questionnaire, opts?: {
  element?: AgentClarifier;       // default: the first <agent-clarifier> in the document, else create one…
  container?: Element;            // …appended here (required if none exists)
  placement?, flow?, review?, undoWindow?, composer?;
  signal?: AbortSignal;           // abort → expire()
}): Promise<ClarifyResult>
```

It resolves on **submit** (and calls `markAnswered()` itself), **skip**, **reply** or **expire**. It never rejects for user actions. Calling it while another `ask()` is open expires the earlier one first.

### 6.5 Converters

**`fromClaude(input)`**
- The questionnaire `id` is a short hash of the question texts.
- Each question becomes:
  - `id`: a slug of `header` (made unique), else `q{n}`
  - `prompt`: the `question` text
  - `label`: `header`
  - `type`: `multiSelect ? 'multi' : 'single'`
  - `other`: `true`
- Options: a label ending in **"(Recommended)"** has that suffix removed and gets `recommended: true`. `preview` is dropped.
- Claude's format has no "decide for me", so `fromClaude(input, { delegate: true })` lets the app turn it on for every question.

**`toClaude(result, input, opts?)`**
- `answers` is keyed by the **original question text**, with values in the **original labels** (single: a string, multi: an array). "Something else" sends the typed text. Skipped questions are left out.
- **Delegated questions** send `opts.delegateMessage ?? "Up to you. Pick what fits and say what you chose."` as their answer, so the instruction sits next to the question it belongs to.
- `delivery: 'composer'` → `response: message`.
- Status `skipped` → `response: opts.skipMessage ?? "The user skipped these questions. Use your best judgement and say what you assumed."`
- `questions` is passed through unchanged.

**`fromElicitation(params)`**
- `message` → `title`. Each schema property becomes a question:
  - enum → single (with `enumNames` as labels)
  - boolean → single Yes/No
  - string → text
  - number or integer → text with `inputmode="decimal"` and a "Enter a number" check
- `required` carries over. `other` is `false`. The `source` is set by the caller.

**`toElicitation(result)`**
- `submitted` → `accept` with the content typed back from the schema. Delegated fields are left out of `content`, like skipped ones, because MCP has no way to say "you decide". (`fromElicitation` never turns `delegate` on.)
- `skipped` → `decline`. `dismissed` → `cancel`.
- `delivery: 'composer'` → `accept` with the picks if every required field is answered, else `decline`. MCP has no free-text field, so the app reads `result.message` itself.

---

## 7. Composer integration (`composer.ts`)

| Task | `<textarea>` / `<input>` | `contenteditable` | No composer given |
|---|---|---|---|
| Hide (replace mode) | `hidden` **plus inline `display: none !important`** on `composerContainer`, so the app's own CSS can't override it. Both restored exactly afterwards | same | The app hides its own |
| Placeholder swap | Save, then set `placeholder`. Restored when the card is answered, expired or reset | `data-placeholder` / `aria-placeholder` | – |
| Insert a compose sentence | `setRangeText(text, 0, 0, 'end')` at the start, keeping existing text. Fires `input` | Insert a text node at the start, with the caret after it | `clarify:compose` only |
| Highlight | A 600ms soft outline pulse on the composer (Web Animations API). Ranges can't be highlighted in a textarea | A temporary `<mark>`, removed after 600ms | – |
| Detect "untouched" | The value still starts with the inserted text and nothing else changed | same | – |
| Detect send | `submit` on the composer's `form`, in the **capture phase**, so it runs before the app's handler. **While the card waits for an answer** (minimised, or dock while answering/reviewing), the submit is stopped (`preventDefault` + `stopImmediatePropagation`), delivered as `clarify:reply`, and the box is cleared as a send would. Otherwise it passes through untouched | same | The app calls `reply(text)` |
| Docked look | Sets `data-clarifier-docked` on the composer container. The README gives a 3-line CSS recipe to square off its top corners | same | – |

The component **never** injects global styles or changes the composer's own styles, apart from the temporary animation and the hiding above.

**Where the record lives** (round 7). The element is placed at the composer while it asks. When it becomes a record (`clarify:submit` not prevented, `clarify:skip`, `clarify:reply`, `clarify:expire`, or after `markAnswered()`), the app moves the element into its transcript, so the record stays with the conversation. On `clarify:reopen` it moves it back. The playground shows this, `ask()` will do it for you (M6), and the README gives the five-line recipe.

---

## 8. Styling (`styles.ts`)

- A constructable stylesheet adopted by each shadow root (shared across instances).
- **Tokens:** exactly the list on the board (§8 of board.html), plus `--clarify-duration: 160ms`, `--clarify-ease: cubic-bezier(.2,.7,.2,1)` and `--clarify-max-height: 60%` (of the visible screen, §8.2). DESIGN.md may change values. Its findings are settled in the next visual round, before M2. Light defaults sit on `:host`.
- **Dark:** `:host([theme=dark])`, plus `@media (prefers-color-scheme: dark) { :host(:not([theme=light])) { … } }`.
- **Parts:** `card`, `header`, `title`, `step`, `option`, `option-key`, `option-label`, `option-description`, `badge`, `other`, `footer`, `button`, `button-primary`, `toast`, `banner`, `pill`, `record`, `hint`.
- **Icons:** inline SVGs using `currentColor`. No icon slots in v1. Directional icons (back, forward, the "write it ↗" arrow) mirror under `:host(:dir(rtl))`.
- The board's CSS is the **starting point** for styles. From round 6 the playground is the visual reference, and differences from the board are fine when they're deliberate and logged.
- **Every default value is explained in [DESIGN.md](DESIGN.md).** A new value needs a line there before it ships.

### 8.1 Direction (RTL)

- **Logical properties only:** `margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-start-start-radius`, `text-align: start`. **No `left`/`right`** anywhere in `styles.ts`. A unit test scans the stylesheet for physical properties and fails if it finds one, so this can't slip back in.
- The step slide moves in the reading direction: forward slides toward the inline start.

### 8.2 Long content

| Content | Rule |
|---|---|
| Prompt, option label, description | Wrap. `overflow-wrap: anywhere` so long words and URLs break. `text-wrap: pretty` on prompts. Never clamped |
| Record chips, review values, pill text | One line with an ellipsis. The full text goes in the accessible name and `title` |
| "Something else" and text questions | `<textarea>` that grows with its content (`field-sizing: content` where supported, else a measured height) up to 5 lines, then scrolls |
| The card | `max-height: var(--clarify-max-height, 60%)` **of the visible screen** (`--_vvh` from `viewport.ts`). The header and footer are fixed and the body scrolls (`overscroll-behavior: contain`) |
| Scroll edges | A 1px hairline plus a soft shadow at the top or bottom of the body, **shown only while content is hidden past that edge** (a scroll listener sets `data-scroll-top/bottom`). No overflow, no shadow |
| All-flow with many questions | The body scrolls. When the user tries to send with missing required answers, the first one scrolls into view (`block: 'nearest'`) and gets focus |

### 8.3 Phone

- `viewport.ts` listens to `visualViewport` `resize` and sets `--_vvh` on the host (throttled with `requestAnimationFrame`). With no `visualViewport`, it falls back to `100dvh`.
- When an element inside the card gets focus, it's scrolled into view with `block: 'nearest'`, so a focused row is never hidden behind the keyboard.
- No `env(safe-area-inset-*)` inside the component. The README recipe shows the app where to add it, and suggests `interactive-widget=resizes-content` in the viewport meta for Chrome on Android.

---

## 9. Labels (`labels.ts`)

Every user-visible string has a key. The defaults:

> Something else · Decide for me · Left to the agent *(working copy)* · Skip · Skip all · Continue · Keep & next · Review · Send · Send answers · Start over · Edit · Answer · Back · Minimise · Reopen · Undo · Try again · Recommended · write it ↗ · Up to {max} · {n} of {total} · {n} of {total} answered · {n} of {total} picked · Pick one to continue · Check your answers · Your pick · Sending in {s}s · Or reply in your own words… · You answered {n} of {total} · Edit answers · Skipped. The agent used its own judgement. · Answer now · Replied in your own words · {n} picks kept · Answer the questions · Not answered. The agent continued without these. · Couldn't send your answers · Writing questions… · plus the live-region strings in §5.4

**Plurals, numbers, language and direction** (round 5)
- A label is either a string or a set of plural forms: `{ one: 'Up to {max} choice', other: 'Up to {max} choices' }`. The form is chosen with `Intl.PluralRules(lang)` using the number in the string. `other` is required, and any language's forms (`zero`, `two`, `few`, `many`) are accepted.
- `{n}`, `{total}`, `{max}` and `{s}` are formatted with `Intl.NumberFormat(lang)`. **The full language tag decides the digits**, following Unicode CLDR as browsers do: `ar-EG` shows ٢ من ٤, plain `ar` shows 2 من 4, `fa` shows ۲. We never force a style. Number-key badges always show 1–9, because they name physical keys.
- **The first number in the values picks the plural form** (`{ n, total }` counts `n`). A missing form falls back to `other`. A malformed `lang` (like `en_US`) falls back to English instead of throwing.
- **`lang` and `dir` lookup moves to M2**: it needs the DOM, so it's tested with the element.
- `lang` comes from the closest ancestor with a `lang` attribute, else `<html lang>`, else `en`. Direction comes from CSS (`:dir()` and computed `direction`), so the component never needs its own `dir` attribute.
- Both `Intl` APIs are built into the browser: **no dependency, a few hundred bytes**.

---

## 10. Milestones

Each milestone ends with tests green, a commit, and a JOURNAL.md entry. Playground screenshots go into `process/` at each review round, when the visuals change. Push at the end of each milestone.

| # | Build | Done when |
|---|---|---|
| **M1 · Model** | Scaffold (Vite, TS strict, Vitest, size-limit, lint). `types`, `normalize`, `reducer`, `selectors`, `labels` | **Table-driven tests for every row in §4.2 (including `DELEGATE` and what clears it), every row in §3.1, and every recovery row in PLAN §6** (as reducer scenarios). Plural and number formatting tests for `labels` (English, Arabic, Polish). Coverage ≥ 95% on `model/`. No DOM yet |
| **M2 · Element + flows** | `element.ts`, `view/step`, `form`, `review`, `chrome`, `skeleton`. Single, multi, text and other, plus the "Decide for me" row. Both flows. Keyboard §5.1. ARIA §5.5. Logical properties only (§8.1), with the stylesheet scan test | Component tests: each flow end to end with the keyboard only and with the mouse only. The playground shows every M2 scenario (sequential and all at once with every input type, Decide for me, review, loading) in light, dark and at 375px |
| **M3 · Placements + endings** | `pill`, `record` (all 4 kinds), `composer.ts` (hide/show, placeholder, send detection), replace and dock, minimise/reopen, reply | The playground's fake chat shows replace and dock, the pill, and all four record kinds. Composer tests for textarea, input and contenteditable |
| **M4 · Recovery + own words** | Undo and history wiring, toasts, start over, edit-from-review, undo window, error/retry/`markAnswered`, revise, compose options (insert, highlight, untouched removal) | Every PLAN §6 row is demoable **and** covered by a component test. Compose and the undo window work in the playground |
| **M5 · Polish audit** | Motion (§4.3), focus (§5.2), live region (§5.4), reduced motion, touch hit areas (§5.3), IME, `viewport.ts` and the long-content rules (§8.2–8.3), and a full RTL pass | axe clean on every demo scenario (light and dark). Manual keyboard-only and VoiceOver (Safari) pass, logged in the journal. Playwright screenshots of every scenario at 1280 and 500 widths, light and dark. **Three new demo scenarios pass visually:** `dir="rtl"` (Arabic), long content (a 300-character prompt, 9 two-line options, a URL label, 8 questions in the all flow), and the phone keyboard (checked on a real phone, logged) |
| **M6 · Theming + converters + ask()** | Tokens, parts, the `theme` attribute, `ask()`, `adapters/claude`, `adapters/mcp`, `jsx.d.ts` | Three themes (light, dark, warm) in the playground using tokens only. Converter round-trip tests (including "(Recommended)" and skip). `ask()` tests. Size ≤ 12 KB gzipped |
| **M7 · Ship** | README (quick start, the Claude Agent SDK recipe, an MCP recipe, model-side guidance from PLAN §9, the docked CSS recipe, the API reference), demo deploy, `npm publish` | Installed fresh in a scratch Vite app **and** used in the portfolio via the CDN. Mari approves the repo going public and the npm publish |

---

## 11. Definition of done (v1)

- [ ] Every playground scenario works in light and dark, at 1280 and 375 widths
- [ ] Every PLAN §6 recovery row is covered by a component test
- [ ] Keyboard-only, with no mouse needed anywhere; VoiceOver pass logged
- [ ] RTL, long-content and phone-keyboard scenarios look right
- [ ] Every default token has a reason in DESIGN.md, and no finding there is left open
- [ ] axe: 0 violations across the scenarios
- [ ] Zero runtime dependencies; ≤ 12 KB gzipped core
- [ ] Works in plain HTML, React 19, Vue 3, Svelte 5 and Astro (one smoke example each in `demo/frameworks/`)
- [ ] README complete; JOURNAL.md up to date; `process/` snapshots taken
- [ ] Published as `@marigameo/agent-clarifier`, MIT

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Focus and keyboard bugs across Shadow DOM | Component tests run in real Chromium, WebKit and Firefox, not jsdom |
| Re-rendering loses focus or IME input | Views update in place (§4.3). An IME test types Japanese into "Something else" |
| The app clears the textarea before the card reads it | Listen in the capture phase on `submit`. The manual `reply()` is the fallback |
| React passing objects as attributes | Docs: set `questionnaire` and `labels` as properties (React 19 does this for custom elements). Typings in `jsx.d.ts` |
| SSR (Astro/Next) importing it on the server | `define()` is guarded. Nothing touches `window` at import time |
| Height animation jank | Measure with `getBoundingClientRect`, animate `height` with the Web Animations API, and fall back to an instant swap under reduced motion |
| Size creep | `size-limit` in CI fails the build above the budget |
| `visualViewport` behaves differently in iOS Safari and Chrome on Android | Feature-detect and fall back to `100dvh`. Checked on a real phone in M5, not only in emulation |
| A `left`/`right` slips into the CSS and breaks RTL | The stylesheet scan test (§8.1) |

---

## 13. Calls made in this plan (flag any you disagree with)

1. **Skipping every question = "Skip all"** (status `skipped`, no review step). Sequential flow has no separate Skip-all button.
2. **Dock mode doesn't steal focus on open.** Replace mode does.
3. **"Something else" typing is one undo step** (on entering the field), not one per key.
4. **`toClaude()` on Skip all** sends a short default response ("…use your best judgement and say what you assumed"), which can be overridden.
5. **A composer reply under MCP** becomes `accept` with the picks if every required field is answered, else `decline`. MCP has no free-text slot.
6. **The textarea highlight is an outline pulse on the composer**, since text inside a textarea can't be highlighted. A real highlight only works in `contenteditable`.
7. **No icon slots in v1.** Icons are inline SVGs that follow the text colour.
8. **Demo hosting:** GitHub Pages once the repo is public (Pages on a private repo needs a paid plan). Until then, the demo runs locally.

**Added in round 5:**

9. **"Decide for me" is a row, not a footer button.** It's an answer, so it sits with the answers, and it then works the same way in both flows and shows in review.
10. **Delegating counts as answering:** it never triggers the review step or the "every question skipped → `skipped`" rule.
11. **Required beats delegate.** If the agent needs the user's answer, it shouldn't offer to decide.
12. **On multi-select, "Decide for me" moves on by itself** in sequential, although picks on multi never do. It's a complete answer, so there's nothing left to add.
13. **The safe area is the app's job.** Adding `env(safe-area-inset-bottom)` inside the card would double up with the app's own padding. *(This corrects the round-5 chat proposal, which said the component would handle it in dock mode. In dock mode the composer sits below the card, so the home bar is the composer's concern.)*
14. **The card's max height is 60% of the visible screen** by default, so at least part of the conversation stays visible above it. It can be changed with `--clarify-max-height`.
