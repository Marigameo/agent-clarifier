# agent-clarifier: build plan (v1)

> **How** to build what [PLAN.md](PLAN.md) specifies and [design/board.html](design/board.html) shows.
> Written so a build session can implement it without re-deciding anything. If something here conflicts with PLAN.md, raise it with Mari before choosing.
> Status: **for review (round 4).** Once agreed, this file is frozen into `process/04-build-plan/` and implementation starts at M1.

---

## 0. Scope lock

**In v1:**
- **Flows:** `sequential` and `all`.
- **Inputs:** `single`, `multi`, `text`, plus the "Something else" row.
- **Placements:** `replace` and `dock`. **Density:** `comfortable` and `compact`.
- **States:** every state in PLAN §5.
- **Recovery:** every row in PLAN §6.
- **Own words:** minimise and send, plus `compose` options.
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
| Size | **≤ 12 KB gzipped** for the core, about 1 KB per converter. Checked in CI with `size-limit`. | Plug and play should mean light |
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
    composer.ts           # find, hide/show, placeholder swap, insert, flash, submit listener
    labels.ts             # default English strings + merge
    styles.ts             # constructable stylesheet: tokens, light/dark, component CSS
    ask.ts                # promise helper
    adapters/
      claude.ts           # fromClaude / toClaude
      mcp.ts              # fromElicitation / toElicitation
    jsx.d.ts              # React / Preact IntrinsicElements typing
  tests/
    unit/                 # model + adapters (node)
    component/            # element in a real browser (Vitest browser mode)
    e2e/                  # demo pages: flows, axe, screenshots
  demo/
    index.html            # playground: fake chat shell + controls + scenario presets
    scenarios.ts          # one preset per board frame id (A1, B1 … H3)
  design/board.html       # visual reference (working copy)
  process/                # frozen snapshots, never edited
  PLAN.md  BUILD.md  JOURNAL.md  CLAUDE.md  README.md  LICENSE
```

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
| More than 9 options | Keep the first 9 and warn (number keys only go to 9) |
| Fewer than 2 options on single or multi | Warn, and still render |
| More than one `recommended` | Keep the first and warn |
| `min` > number of options, or `min` > `max` | Clamp and warn |
| `default` points to an unknown option | Ignore it and warn |
| A `compose` option on a multi question | Ignore `compose` and warn (compose only works on single) |
| `other: true` together with a `compose` option on the same question | Allowed, but warn ("two free-text routes"). The board's H1 uses `other: false`. |
| **No questions** | **Refuse:** fire `clarify:error` `{ reason: 'empty' }` and stay `hidden` |

### 3.2 Result rules

- `answers` always has **one entry per question**: `answered` or `skipped`. An unanswered question at submit time counts as `skipped`.
- `labels` are the visible option labels. "Something else" text appears in `other`, and in `labels` as the typed text.
- **If every question is skipped, the result's status is `skipped`** (not `submitted`, and no review step). This is the same as "Skip all".
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

interface Draft { values: string[]; other: string; otherActive: boolean; skipped: boolean; text: string }

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
  toast: Toast | null;              // { kind, text, undo: boolean }
  record: Record_ | null;           // { kind: 'answered'|'skipped'|'replied'|'expired', result }
  revising: boolean;                // reopened from a record: the next submit fires clarify:revise
  compose: { text: string; touched: boolean } | null;
  undoUntil: number | null;         // undo window deadline (ms timestamp)
  history: Snapshot[];              // past { step, drafts, status }, capped at 50
}
```

### 4.2 Actions and transitions (`reducer.ts`)

**Push history** = snapshot `{ step, drafts, status }` before applying. **Undo** restores the latest snapshot. Navigation never pushes.

| Action | Allowed in | Effect | History |
|---|---|---|---|
| `OPEN(q, partial)` | hidden, answered, expired | Reset the state. `loading` if partial, else `answering`. Apply `default`s | cleared |
| `STREAM(q, partial)` | loading | Replace `q`. Go to `answering` once `partial=false` | – |
| `SELECT(qid, opt)` | answering | Single: set the value and clear `other`. Sequential: schedule `NEXT` after 120ms (the element does the timing; the reducer stays pure) | push |
| `TOGGLE(qid, opt)` | answering | Multi: add or remove, blocked at `max` (toast "Up to N") | push |
| `OTHER_FOCUS(qid)` / `OTHER_INPUT(qid, text)` | answering | Set `otherActive`, and the text. Typing doesn't push on every key: one push when the field is entered | push (once) |
| `TEXT_INPUT(qid, text)` | answering | Text question value | push (once per focus) |
| `NEXT` | answering | If `returnTo='review'` → reviewing. Else step+1. After the last step → `needsReview` ? reviewing : `SUBMIT` | – |
| `BACK` | answering, reviewing | Step−1 (or from review back to the last step). Answers are untouched | – |
| `GOTO(step)` | answering | Only to steps that are answered or skipped (the clickable dots) | – |
| `SKIP(qid)` | answering | Mark it skipped, clear its values, then `NEXT`. Toast: "Skipped ‘Label’ · Undo" | push |
| `SKIP_ALL` | answering (all flow) | Every question skipped → result `skipped` → record `skipped`. Fires `clarify:skip` | push |
| `EDIT(qid)` | reviewing | Go to that step with `returnTo='review'` | – |
| `START_OVER` | reviewing | Clear all drafts, go to step 0. Toast: "Answers cleared · Undo" | push |
| `UNDO` | answering, reviewing | Restore the latest snapshot. Clear the toast | pop |
| `SUBMIT` | answering (all flow or last step), reviewing | All flow: if required questions are missing → `attempted=true` and stay. Else → `submitting`, with `undoUntil` if the undo window is on | – |
| `UNDO_SUBMIT` | submitting (before `undoUntil`) | Back to the previous status | – |
| `SUBMIT_OK` | submitting | Record `answered`. Clear history | cleared |
| `SUBMIT_FAIL(msg)` | submitting | → `error` with the message. Answers kept | – |
| `RETRY` | error | → `submitting` (fires submit again) | – |
| `MINIMISE` | loading, answering, reviewing, error | `resumeTo` = current status → `minimised`. Toast cleared | – |
| `REOPEN` | minimised | → `resumeTo`. If `compose` is untouched, the element removes the inserted sentence | – |
| `COMPOSE(qid, opt)` | answering | Record the pick as the answer, set `compose`, → `minimised` | push |
| `REPLY(text)` | minimised (dock: also answering and reviewing) | Record `replied`, result `delivery: 'composer'` with `message` and the picks so far | cleared |
| `REVISE` | answered (record of any kind except expired) | Reopen in reviewing (or step 0 if nothing was picked) with `revising=true` | cleared |
| `EXPIRE(msg?)` | anything except hidden | Record `expired`, read-only | cleared |
| `TOAST_TIMEOUT` | any | Clear the toast (after 5s, or on the next action) | – |

**Selectors:**
- `needsReview(state, reviewSetting)`: `'auto'` means something was skipped OR there are 3+ questions.
- `progress`: sequential is `{ step, total }`, all flow is `{ answered, total }`.
- `canContinue`: multi needs `values.length ≥ min`, required needs an answer, text and other need non-empty text.
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
| Option list (single) | `1`–`9` picks · `↑/↓` move · `Home/End` · `Enter` / `Space` picks · `←` back · `Esc` minimise · `⌘Z` / `Ctrl+Z` undo |
| Option list (multi) | `1`–`9` and `Space` toggle · `↑/↓` move · `Enter` continues (if allowed) · `←` · `Esc` · `⌘Z` |
| "Something else" field | Typing is normal (number keys type numbers) · `Enter` confirms (single: moves on) · `Esc` leaves the field with the text kept · `↑` at the start of the field goes back to the options |
| Text question | `Enter` continues · `Shift+Enter` adds a new line · `Esc` minimise |
| All flow | `Tab` moves between question groups and the footer · `←/→` and `↑/↓` move within chips · `Space`/`Enter` picks |
| Review | `Tab` through the Edit links · `Enter` on the primary button sends |
| Pill | `Enter` reopens |

**Rules:**
- Keys are only handled when focus is inside the card.
- Ignore key events while composing (`event.isComposing`), so IME input is safe.
- `⌘Z` inside a text field is the browser's own undo, not ours.

### 5.2 Focus

- **On open:**
  - `replace`: focus the recommended option, else the first one.
  - `dock`: **don't steal focus.** The user may be typing in the composer. Focus moves in on the first keypress or click inside.
- **On step change:** focus the new step's recommended option, or the previously selected one.
- **On minimise:** focus the composer (in replace mode it's shown again). **On reopen:** restore the element that was focused.
- **When the record appears:** don't move focus. Announce it instead (§5.4).
- Focus is never lost to `<body>`. If the focused element is removed, focus moves to the card container (`tabindex=-1`).

### 5.3 Pointer and touch

- Whole rows are clickable, at 44px minimum (`compact`: 44px, `comfortable`: 52px).
- Hover styles only apply on `(hover: hover)`, and the key-hint bar hides on `(hover: none)`.
- Auto-advance waits 120ms so the selection is seen. A second click within that window doesn't double-advance.

### 5.4 Live region (polite, inside the shadow root)

These are exact strings and can be overridden through `labels`:
- "Question {n} of {total}: {prompt}"
- "Skipped {label}. Undo available."
- "Answers cleared. Undo available."
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
| `clarify:reopen` | – | no | Reopened |
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

**`toClaude(result, input, opts?)`**
- `answers` is keyed by the **original question text**, with values in the **original labels** (single: a string, multi: an array). "Something else" sends the typed text. Skipped questions are left out.
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
- `submitted` → `accept` with the content typed back from the schema.
- `skipped` → `decline`. `dismissed` → `cancel`.
- `delivery: 'composer'` → `accept` with the picks if every required field is answered, else `decline`. MCP has no free-text field, so the app reads `result.message` itself.

---

## 7. Composer integration (`composer.ts`)

| Task | `<textarea>` / `<input>` | `contenteditable` | No composer given |
|---|---|---|---|
| Hide (replace mode) | `hidden` on `composerContainer`, restored exactly afterwards | same | The app hides its own |
| Placeholder swap | Save, then set `placeholder`. Restored when the card is answered, expired or reset | `data-placeholder` / `aria-placeholder` | – |
| Insert a compose sentence | `setRangeText(text, 0, 0, 'end')` at the start, keeping existing text. Fires `input` | Insert a text node at the start, with the caret after it | `clarify:compose` only |
| Highlight | A 600ms soft outline pulse on the composer (Web Animations API). Ranges can't be highlighted in a textarea | A temporary `<mark>`, removed after 600ms | – |
| Detect "untouched" | The value still starts with the inserted text and nothing else changed | same | – |
| Detect send | `submit` on the composer's `form` (capture). The card reads the value before the app clears it | same | The app calls `reply(text)` |
| Docked look | Sets `data-clarifier-docked` on the composer container. The README gives a 3-line CSS recipe to square off its top corners | same | – |

The component **never** injects global styles or changes the composer's own styles, apart from the temporary animation and the `hidden` attribute.

---

## 8. Styling (`styles.ts`)

- A constructable stylesheet adopted by each shadow root (shared across instances).
- **Tokens:** exactly the list on the board (§8 of board.html), plus `--clarify-duration: 160ms` and `--clarify-ease: cubic-bezier(.2,.7,.2,1)`. Light defaults sit on `:host`.
- **Dark:** `:host([theme=dark])`, plus `@media (prefers-color-scheme: dark) { :host(:not([theme=light])) { … } }`.
- **Parts:** `card`, `header`, `title`, `step`, `option`, `option-key`, `option-label`, `option-description`, `badge`, `other`, `footer`, `button`, `button-primary`, `toast`, `banner`, `pill`, `record`, `hint`.
- **Icons:** inline SVGs using `currentColor`. No icon slots in v1.
- The board's CSS is the visual reference. Class names may differ, but **every frame on the board must be reproducible** in the demo.

---

## 9. Labels (`labels.ts`)

Every user-visible string has a key. The defaults:

> Something else · Skip · Skip all · Continue · Keep & next · Review · Send · Send answers · Start over · Edit · Answer · Back · Minimise · Reopen · Undo · Try again · Recommended · write it ↗ · Up to {max} · {n} of {total} · {n} of {total} answered · {n} of {total} picked · Pick one to continue · Check your answers · Your pick · Sending in {s}s · Or reply in your own words… · You answered {n} of {total} · Edit answers · Skipped. The agent used its own judgement. · Answer now · Replied in your own words · {n} picks kept · Answer the questions · Not answered. The agent continued without these. · Couldn't send your answers · Writing questions… · plus the live-region strings in §5.4

---

## 10. Milestones

Each milestone ends with tests green, a commit, and a JOURNAL.md entry. A board/demo snapshot goes into `process/` only when the visuals change. Push at the end of each milestone.

| # | Build | Done when |
|---|---|---|
| **M1 · Model** | Scaffold (Vite, TS strict, Vitest, size-limit, lint). `types`, `normalize`, `reducer`, `selectors`, `labels` | **Table-driven tests for every row in §4.2, every row in §3.1, and every recovery row in PLAN §6** (as reducer scenarios). Coverage ≥ 95% on `model/`. No DOM yet |
| **M2 · Element + flows** | `element.ts`, `view/step`, `form`, `review`, `chrome`, `skeleton`. Single, multi, text and other. Both flows. Keyboard §5.1. ARIA §5.5 | Component tests: each flow end to end with the keyboard only and with the mouse only. The demo playground shows board frames A1, B1–B4, D1–D4, E1 and E2 |
| **M3 · Placements + endings** | `pill`, `record` (all 4 kinds), `composer.ts` (hide/show, placeholder, send detection), replace and dock, minimise/reopen, reply | The demo's fake chat shell reproduces C1, C2, D5, E3–E6. Composer tests for textarea, input and contenteditable |
| **M4 · Recovery + own words** | Undo and history wiring, toasts, start over, edit-from-review, undo window, error/retry/`markAnswered`, revise, compose options (insert, highlight, untouched removal) | Every PLAN §6 row is demoable **and** covered by a component test. H1–H3 and D6 are reproduced |
| **M5 · Polish audit** | Motion (§4.3), focus (§5.2), live region (§5.4), reduced motion, touch sizes, IME, RTL sanity check | axe clean on every demo scenario (light and dark). Manual keyboard-only and VoiceOver (Safari) pass, logged in the journal. Playwright screenshots of every scenario at 1280 and 500 widths, light and dark |
| **M6 · Theming + converters + ask()** | Tokens, parts, the `theme` attribute, `ask()`, `adapters/claude`, `adapters/mcp`, `jsx.d.ts` | The board's F1–F3 themes reproduced using tokens only. Converter round-trip tests (including "(Recommended)" and skip). `ask()` tests. Size ≤ 12 KB gzipped |
| **M7 · Ship** | README (quick start, the Claude Agent SDK recipe, an MCP recipe, model-side guidance from PLAN §9, the docked CSS recipe, the API reference), demo deploy, `npm publish` | Installed fresh in a scratch Vite app **and** used in the portfolio via the CDN. Mari approves the repo going public and the npm publish |

---

## 11. Definition of done (v1)

- [ ] Every board frame is reproducible in the demo, in light and dark, at 1280 and 375–500 widths
- [ ] Every PLAN §6 recovery row is covered by a component test
- [ ] Keyboard-only, with no mouse needed anywhere; VoiceOver pass logged
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
