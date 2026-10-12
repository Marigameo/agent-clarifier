# agent-clarifier

`<agent-clarifier>` is a web component that lets a chat agent **ask clarifying questions before it acts**. It works in any framework or none, has zero runtime dependencies, looks neutral by default, and is themed with CSS variables.

**[See it in a chat app →](https://marigameo.github.io/agent-clarifier/chat.html)** An assistant that asks before it acts, phone first: plan a trip, draft an email, sort out an order. Open it on your phone, too.

**[Try every variant in the playground →](https://marigameo.github.io/agent-clarifier/)** Every scenario and setting, in light and dark, at desktop and phone widths.

```html
<agent-clarifier composer="#message"></agent-clarifier>
<form><textarea id="message"></textarea><button>Send</button></form>

<script type="module">
  import { ask } from 'https://cdn.jsdelivr.net/npm/@marigameo/agent-clarifier@0.1.0/dist/index.js';

  const result = await ask({
    id: 'trip',
    questions: [{
      id: 'area', prompt: 'Which area would you like to stay in?', type: 'single',
      options: [{ id: 'soho', label: 'Soho', recommended: true }, { id: 'kx', label: 'King’s Cross' }],
    }],
  });
  console.log(result.answers.area.labels); // ["Soho"]
</script>
```

**What's in it**
- **Two flows:** one question at a time (`sequential`), or all at once (`all`).
- **Inputs:** single choice, multiple choice (with limits), text, a "Something else" row, and an optional **Decide for me**.
- **Placements:** it takes the composer's place (`replace`, like Claude's card), or sits on top of it (`dock`).
- **Mistakes are cheap:**
  - Back keeps your answer
  - Undo instead of "Are you sure?"
  - a review step with Edit
  - minimise instead of close, with nothing lost
  - an optional undo window after Send
  - "Edit answers" on the record it leaves in the conversation
- **Your own words, always one step away:** a message sent from the composer while the card waits *is* the answer.
- **Accessible:** complete by keyboard, roving focus, screen-reader announcements, and axe-clean in light and dark.
- **Built for real use:** RTL, plurals, local digits, long content, phone keyboards, reduced motion.
- **Converters** for Claude's `AskUserQuestion` and MCP elicitation (about 1 KB each, imported separately).

---

## Install

```sh
npm install @marigameo/agent-clarifier
```

```js
import '@marigameo/agent-clarifier'; // defines <agent-clarifier>
```

Importing it on a server (Astro, Next, Nuxt) is safe: nothing touches the DOM until the element is used in a browser.

**Load it when it's needed.** The card only appears when the agent asks something, so it doesn't have to load with the page. Import it on first use, and your page pays nothing up front:

```js
async function clarify(questions) {
  const { ask } = await import('@marigameo/agent-clarifier');
  return ask(questions);
}
```

To have it ready before the first question arrives, start the same `import()` when the chat opens. An `<agent-clarifier>` already in your markup waits, empty, until the code arrives.

**From a CDN,** pin a version (`…/npm/@marigameo/agent-clarifier@0.1.0/dist/index.js`), so a new release never changes your page without you knowing.

---

## Use it with Claude (Agent SDK)

```ts
import { ask } from '@marigameo/agent-clarifier';
import { fromClaude, toClaude } from '@marigameo/agent-clarifier/adapters/claude';

const options = {
  canUseTool: async (toolName, input) => {
    if (toolName !== 'AskUserQuestion') return { behavior: 'allow', updatedInput: input };
    const result = await ask(fromClaude(input, { source: 'Claude' }), {
      container: composerSlot, // where the card appears while it asks
      transcript: messageList, // where it stays as a record afterwards
      composer: '#message',
    });
    return toClaude(result, input); // the whole canUseTool result
  },
};
```

What Claude receives:
- **Answers** keyed by question text, in the original option labels (multiple choice is joined with `", "`).
- **"Something else"** as the user's own text.
- **Decide for me** as "Up to you. Pick what fits and say what you chose."
- **A reply in the user's own words** as `response`.
- **Skip all** as a short `response` asking Claude to use its judgement and say what it assumed.
- **An expired card** as a `deny`.

Every message can be changed with `toClaude(result, input, { skipMessage, delegateMessage, dismissMessage })`.

## Use it with MCP elicitation

```ts
import { ask } from '@marigameo/agent-clarifier';
import { fromElicitation, toElicitation } from '@marigameo/agent-clarifier/adapters/mcp';

async function onElicit(params, serverName) {
  const q = fromElicitation(params, { source: serverName }); // null for URL mode
  if (!q) return handleUrlMode(params);
  return toElicitation(await ask(q, { container: composerSlot, transcript: messageList }), params);
}
```

It accepts every form shape in the 2026-07-28 spec:
- `enum`, `oneOf` with `const`/`title`, and the legacy `enumNames`
- multi-select arrays, with `minItems`/`maxItems`
- booleans (shown as Yes/No)
- strings and numbers (shown as text)
- defaults

The results map to MCP actions:
- **Sent** → `accept`, with typed `content`
- **Skip all** → `decline`
- **Closed or expired** → `cancel`

It never sends an `accept` the schema would reject: a required field missing, a number that isn't one (or isn't whole, for `integer`), or fewer picks than `minItems`. Those fields are left out, and a missing required one turns the answer into `decline`.

A question shows at most 9 choices, one per number key. An `enum` with more keeps the first 9 and warns `too-many-options`, so for a long list (countries, say) change that field to a text question before calling `ask()`.

---

## Writing questions yourself

```ts
const questionnaire = {
  id: 'hotel',                      // ties the answers back to your request
  title: 'A few questions before I search',
  source: 'Trip planner',           // shown as "Asked by Trip planner"
  flow: 'sequential',               // or 'all'
  delegate: false,                  // offer "Decide for me" on every question
  questions: [
    { id: 'area', label: 'Area', prompt: 'Which area would you like to stay in?', type: 'single',
      options: [
        { id: 'covent', label: 'Covent Garden', description: 'Theatres, busy at night', recommended: true },
        { id: 'southbank', label: 'South Bank', description: 'River views, quieter' },
      ] },
    { id: 'budget', label: 'Budget', prompt: 'What’s your budget per night?', type: 'single', delegate: true,
      options: [{ id: 'low', label: '$250–400' }, { id: 'mid', label: '$400–600' }] },
    { id: 'extras', label: 'Priorities', prompt: 'What matters most?', type: 'multi', max: 2,
      options: [{ id: 'walk', label: 'Walkable' }, { id: 'quiet', label: 'Quiet at night' }] },
    { id: 'notes', label: 'Notes', prompt: 'Anything else I should know?', type: 'text', default: 'For 2 adults' },
  ],
};
```

| Question field | Meaning |
|---|---|
| `type` | `single`, `multi` or `text` |
| `options` | 2 to 9 (the number keys go up to 9) |
| `other` | The "Something else" row. Default `true` on single/multi; `{ label, placeholder }` to word it |
| `required` | Default `false`. Required questions can't be skipped or delegated |
| `delegate` | Show **Decide for me** in place of Skip |
| `min` / `max` | Multi only. `min` defaults to 1, so Continue always means "I picked something" |
| `default` | Option id(s), or the text for a text question |
| option `compose` | Picking it starts this sentence in the composer instead, e.g. `"For accessibility, I need "` |

Input from an agent is checked at runtime: missing ids are made up, extra options are trimmed, and so on. Each fix prints a warning code (see [Warnings](#warnings)). A card with no usable questions fires `clarify:error` and stays hidden.

### What comes back

```ts
interface ClarifyResult {
  questionnaireId: string;
  status: 'submitted' | 'skipped' | 'dismissed'; // skipped = "just go"; dismissed = closed or expired
  delivery: 'card' | 'composer';                 // composer = the user replied in their own words
  answers: Record<string, {                       // one entry per question
    status: 'answered' | 'skipped' | 'delegated';
    values: string[];                             // option ids (text questions: [the text])
    labels: string[];                             // what the user saw, ready to put in a prompt
    other?: string;                               // "Something else" text
  }>;
  message?: string;                               // the user's own words, when delivery is 'composer'
}
```

---

## Placement and the composer

Point the card at your message box with `composer`. It works with a `<textarea>`, an `<input>` or a `contenteditable` element.

| | `placement="replace"` (default) | `placement="dock"` |
|---|---|---|
| While asking | The composer is hidden: the card takes its place | The composer stays, joined under the card |
| To answer in your own words | Minimise (⌄ or Esc); the composer comes back, reading "Or reply in your own words…" | Just type |
| Sending a message | It **is** the answer, along with any picks so far | Same |

While the card waits, the element catches the composer's `submit` **before your handler runs**. It delivers the message as `clarify:reply` and clears the box, so your app doesn't also send it as a normal chat message. Any other time, your composer works untouched. If your composer doesn't use a `<form>`, call `el.reply(text)` yourself.

**Docked look:** while a card is docked, the composer's container gets `data-clarifier-docked`. Square off its top corners:

```css
form[data-clarifier-docked] { border-start-start-radius: 0; border-start-end-radius: 0; }
```

**Where the record lives.** The card asks at the composer, but its record belongs in the conversation.
- **With `ask()`:** pass `transcript`, and each question set gets its own card. It moves into the transcript when it's done, and back to the composer if it's reopened.
- **Without `ask()`:** move the element into your transcript on `clarify:submit`, `clarify:skip`, `clarify:reply` or `clarify:expire` (or after you call `markAnswered()`), and back on `clarify:reopen`.

**Phones:**
- The card is capped at 60% of the *visible* screen, which follows the on-screen keyboard. The questions scroll inside it.
- A text field is never auto-focused on touch, so the keyboard doesn't pop up uninvited.
- Two app-side settings help:
  - add `interactive-widget=resizes-content` to your viewport meta (Chrome on Android)
  - put `env(safe-area-inset-bottom)` on your own bottom bar; the card doesn't add it, so it never doubles

---

## API

### Attributes and properties

| Attribute | Property | Values | Default |
|---|---|---|---|
| `placement` | `placement` | `replace` · `dock` | `replace` |
| `flow` | `flow` | `sequential` · `all` (the questionnaire's own `flow` wins) | `sequential` |
| `review` | `review` | `auto` (shown when something was skipped, or with 3+ questions) · `always` · `never` | `auto` |
| `undo-window` | `undoWindow` | ms after Send during which **Undo** cancels it; `0` is off | `0` |
| `composer` | `composer` | CSS selector, or the element itself | – |
| `composer-container` | `composerContainer` | What to hide in replace mode | the composer's `<form>` |
| `density` | – | `comfortable` · `compact` | `comfortable` |
| `theme` | – | `auto` · `light` · `dark` | `auto` |
| `disabled` | `disabled` | boolean | `false` |
| – | `questionnaire` | Setting it calls `open()` | – |
| – | `labels` | `Partial<Labels>`, see [Languages](#languages) | English |
| – | `state` (read-only) | `hidden` · `loading` · `answering` · `reviewing` · `submitting` · `error` · `minimised` · `answered` · `expired` | – |

### Methods

| Method | Does |
|---|---|
| `open(q, { partial? })` | Show a questionnaire. While a model is still writing it, call it repeatedly with `partial: true` (what has arrived shows, but can't be picked yet), then once without |
| `minimise()` / `reopen()` | Fold into the pill and back. Nothing is lost |
| `reset()` | Back to hidden, everything cleared |
| `markAnswered()` / `setError(message)` | After you prevented `clarify:submit` to send it yourself: success, or a failure that keeps the answers and offers **Try again** |
| `expire(message?)` | The agent moved on: a read-only record. Never overwrites an answered card |
| `reply(text)` | The user sent a message while the card waited (manual composer wiring) |

### `ask(questionnaire, options)`

It returns a promise of the `ClarifyResult`. It resolves when the user sends, skips, replies or the card expires, and it never rejects for something the user did. It rejects only when the questionnaire has nothing that can be shown (no usable questions), so your agent hears about it instead of waiting. The options are `element`, `container`, `transcript`, `placement`, `flow`, `review`, `undoWindow`, `composer` and `signal` (aborting expires the card). Calling `ask()` again on the same element expires whatever that card still had open.

The promise settles once. If the user later reopens the record ("Edit answers") and sends again, that arrives as `clarify:revise` on the element: listen for it if your agent should hear about changes.

### Events

All events bubble and cross shadow boundaries (`composed`), and they're typed on `HTMLElementEventMap`.

| Event | `detail` | Cancelable | When |
|---|---|---|---|
| `clarify:submit` | `ClarifyResult` | **yes** | Sent (after the undo window). Prevent it to send yourself, then call `markAnswered()` or `setError()` |
| `clarify:revise` | `ClarifyResult` | yes | Like submit, after "Edit answers" |
| `clarify:skip` | `ClarifyResult` | no | Skip all, or every question skipped |
| `clarify:reply` | `ClarifyResult` | no | A message from the composer was taken as the answer |
| `clarify:expire` | `ClarifyResult` | no | `expire()` was called |
| `clarify:change` | `{ answers }` | no | Any answer changed |
| `clarify:compose` | `{ text, questionId, optionId }` | **yes** | A compose option was picked. Prevent it to insert the text yourself |
| `clarify:dismiss` | `{ resumeTo }` | no | Minimised |
| `clarify:reopen` | – | no | Reopened from the pill or from a record |
| `clarify:error` | `{ reason: 'empty' }` | no | Nothing could be shown |

---

## Keyboard

| Where | Keys |
|---|---|
| Options | **1–9** pick · **↑ ↓** move · **Home End** · **Space / Enter** pick · **←** back (**→** in RTL) |
| Multiple choice | Numbers and Space toggle. **Enter** continues, because it never moves on by itself |
| "Something else" | Type normally (numbers type numbers) · **Enter** continues · **Esc** leaves the field with your text kept · **↑** at the start goes back to the options |
| Anywhere in the card | **Esc** minimises · **⌘Z / Ctrl+Z** undoes (inside a text field, it's the field's own undo) |
| All at once | **Tab** between questions, arrows within one, **Space** picks |

Each group of options is a single Tab stop (roving tabindex). Focus follows into every new view and never drops to `<body>`. Dock mode never takes focus from the composer when it opens. Focus rings show for keyboard users and not after a click. A polite live region announces the question number, skips, limits, review, sent and errors. Keys pressed while an IME is composing are ignored.

---

## Theming

The look is neutral by default and restyled with CSS variables. Set them anywhere they inherit from: `:root`, a container, or the element itself.

```css
agent-clarifier { --clarify-accent: #0b7a5f; --clarify-radius: 12px; --clarify-font: "Inter", sans-serif; }

/* Colours that carry meaning need a value per appearance: #0b7a5f is too dark to read on the dark card. */
@media (prefers-color-scheme: dark) { agent-clarifier:not([theme="light"]) { --clarify-accent: #5fa48d; } }
agent-clarifier[theme="dark"] { --clarify-accent: #5fa48d; }
```

Accent, danger and success each need a light and a dark value that pass 4.5:1 on the card. The soft fills behind the answered tick and errors are mixed from them automatically, so they follow your colours. The Recommended badge is grey on purpose: the user's pick should be the loudest thing on the card (restyle it with `::part(badge)` if you must).

| Token | Default (light / dark) | Used for |
|---|---|---|
| `--clarify-font`, `--clarify-font-title` | system UI | Text, titles |
| `--clarify-bg` | `#fff` / `#1f1f1f` | Card surface |
| `--clarify-fg` | `#1c1c1c` / `#ededed` | Text, the primary button |
| `--clarify-muted` | `#666` / `#a3a3a3` | All secondary text (AA on every fill) |
| `--clarify-faint` | `#888` / `#7a7a7a` | Edges only: checkbox rings, the text field outline (≥ 3:1) |
| `--clarify-border` | `#e6e6e6` / `#343434` | Card edge, dividers |
| `--clarify-hover`, `--clarify-selected` | `#f5f5f5`, `#ececec` / `#292929`, `#303030` | Row fills |
| `--clarify-key-bg` | `#f0f0f0` / `#2c2c2c` | Number-key badges |
| `--clarify-accent`, `-accent-fg`, `-accent-soft` | `#3b5bdb` / `#8ea6ff` | The user's picks, focus, links. `-accent-soft` (the halo on the minimised pill's dot) must be opaque: by default it's the accent mixed into the background |
| `--clarify-danger`, `-danger-soft` | `#c2410c` / `#f0895a` | Errors |
| `--clarify-success` | `#2f7d4f` / `#7cc79a` | The answered tick |
| `--clarify-radius`, `--clarify-radius-sm` | `16px`, `8px` | Card, rows (concentric: 16 − 8 inset) |
| `--clarify-shadow` | `none` | The card in replace mode (it sits in the composer's slot) |
| `--clarify-shadow-dock` | an upward shadow | The docked card, floating over the conversation |
| `--clarify-shadow-float` | a soft two-layer shadow | The minimised pill |
| `--clarify-duration`, `--clarify-ease` | `160ms`, `cubic-bezier(.2,.7,.2,1)` | Motion. The fold into the pill or record runs at 1.25×. With reduced motion, nothing moves; views crossfade |
| `--clarify-max-height` | 60% of the visible screen | Card height before it scrolls |

Dark mode follows `prefers-color-scheme`, or force it with `theme="dark"` or `theme="light"`. The reason behind each default is in [DESIGN.md](https://github.com/Marigameo/agent-clarifier/blob/main/DESIGN.md).

**Parts**, for structural tweaks with `::part()`: `card`, `header`, `title`, `step`, `option`, `option-key`, `option-label`, `option-description`, `badge`, `other`, `delegate`, `footer`, `button`, `button-primary`, `toast`, `notice` (a toast with nothing to press: the pick limit), `banner`, `pill`, `record`.

---

## Languages

```js
el.labels = { somethingElse: 'Autre chose', skip: 'Passer', stepOf: '{n} sur {total}' };
```

- Every visible string, including the screen-reader announcements, has a key in `Labels`, and you can override any of them.
- **Plurals:** a label can have plural forms, `{ one: '{n} pick kept', other: '{n} picks kept' }`. The right one is chosen with `Intl.PluralRules` for the page's `lang`.
- **Numbers** are written the local way with `Intl.NumberFormat`, and **the full language tag decides the digits**: `ar-EG` shows ٢ من ٤, while plain `ar` shows 2 من 4. The number-key badges always show 1–9, because they name physical keys.
- **Right to left:** set `dir="rtl"` on the page or a container, and the layout, arrows and back key mirror.

---

## Frameworks

| | |
|---|---|
| **React 19** | `<agent-clarifier questionnaire={q} onclarify:submit={(e) => …} />`. Objects are set as properties. For typing, `import '@marigameo/agent-clarifier/jsx'` once |
| **Vue 3** | Mark it as a custom element (`isCustomElement: (t) => t === 'agent-clarifier'`), then `:questionnaire="q"` and `@clarify:submit="…"` |
| **Svelte 5** | `<agent-clarifier questionnaire={q} onclarify:submit={(e) => …} />`. Objects are set as properties. The colon in the event name makes Svelte warn (`attribute_illegal_colon`), but the listener works: add `<!-- svelte-ignore attribute_illegal_colon -->` above it, or pass it through a spread, `{...{ 'onclarify:submit': handler }}` |
| **Angular** | Use it like any custom element; bind `questionnaire` as a property |
| **Astro, Next, Nuxt** | Safe to import on the server; it comes alive in the browser |

---

## Tell the model when to ask

Paste this into your system prompt:

> Ask clarifying questions only when the answer changes the result and a wrong guess is costly to redo. Ask at most 4 questions with 2 to 6 options each, and put a recommended option first. Never ask for anything you can read from the context. Offer "Decide for me" where any sensible pick would do. After a skip, say what you assumed; after "Decide for me", say what you chose.

---

## Warnings

Runtime fixes print `[agent-clarifier] <where>: <code>` to the console:

| Code | Means |
|---|---|
| `questionnaire-id` | No id; one was made from the questions |
| `flow` | Unknown flow; `sequential` used |
| `question-dropped` | A question with no prompt was left out |
| `type` | Missing or unknown type; guessed from the options |
| `question-id` / `option-id` | Missing or duplicate id; one was made up |
| `options-ignored` | Options on a text question are ignored |
| `option-dropped` | An option with no label was left out |
| `too-many-options` | More than 9; the first 9 are kept |
| `too-few-options` | Fewer than 2 (still shown) |
| `recommended-many` | More than one recommended; the first is kept |
| `recommended-disabled` | A disabled option can't be recommended |
| `compose-multi` | `compose` only works on single questions |
| `compose-and-other` | Both "Something else" and a compose option (two free-text routes) |
| `min-max` | min/max adjusted (multi only, 1 ≤ min ≤ max ≤ choices) |
| `default` | A default was ignored or trimmed (unknown, disabled or too many) |
| `delegate-required` | Required questions can't be delegated |

---

## Browser support and size

- **Browsers:** the last two versions of Chrome, Edge, Firefox and Safari (Safari 16.4+).
- **Size:** about 21 KB gzipped for the core (19 KB brotli, which is what CDNs send), and nothing at page load if you load it when it's needed (see Install). Each converter is about 1 KB, imported only if you use it.
- **Dependencies:** none at runtime.
- **Unit tests:** jsdom has no `ResizeObserver` or constructable stylesheets, so the element can't be created there. Test it in a real browser (Vitest browser mode, Playwright), or mock the module in jsdom tests.

## Development

```sh
pnpm install
pnpm dev     # the playground: the real component in a fake chat, with every scenario
pnpm check   # types, lint, unit + browser tests with coverage, build, size
```

The playground (also live at [marigameo.github.io/agent-clarifier](https://marigameo.github.io/agent-clarifier/)) covers every case, and each setting is in the URL (for example `/demo/?scenario=arabic&width=375&theme=dark`). The chat demo is `/demo/chat.html` (`?start=hotel|email|order` opens a conversation, `?theme=dark|light`). `node scripts/shots.mjs <dir> "name=query|click:…"` takes screenshots of any state.

How it was designed, round by round, is in [JOURNAL.md](https://github.com/Marigameo/agent-clarifier/blob/main/JOURNAL.md), with snapshots in [`process/`](https://github.com/Marigameo/agent-clarifier/tree/main/process).

## License

MIT © Mariappan
