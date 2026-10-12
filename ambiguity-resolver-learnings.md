# Ambiguity resolver for chat agents: learnings (draft)

> Working notes, not the story. Research first, then a story and a reusable component.
> Started 10 Oct 2026. Inspired by Claude's clarifying-question card (AskUserQuestion).

---

## 1. The problem in one line

People type short, vague prompts ("give me some hotel recommendations in London"). The agent can **guess**, which is fast but often wrong and expensive to redo, or it can **ask**, which costs a moment but gets it right. The ambiguity resolver is the UI for the asking: short, structured, and easy to skip.

**Why it matters more for agents than for chat:**
- In plain chat, a wrong guess costs one more message. In agent work (deep research, code, multi-step tasks) it costs minutes of compute and a result you throw away.
- Research names the gap: the **gulf of envisioning** (Subramonyam & Seifert, CHI 2024). Users struggle to turn intent into a prompt because they don't know (1) what the task should be, (2) how to instruct the model, and (3) what to expect back. Clarifying questions close the gap *from the model's side*: they ask what the user didn't know to say.

---

## 2. Teardown: Claude's question card (from the screenshot)

### Anatomy

| Part | What it does | Note |
|---|---|---|
| Question title | "What's your budget per night for this trip?" | Serif, sentence case, reads like a person asking |
| Step counter | "2 of 4" | Questions come one at a time, with a sense of how many are left |
| Close (×) | Dismiss the whole set | Different from Skip (see §4) |
| Numbered options | 1, 2, 3 in square badges | The number *is* the keyboard shortcut |
| Active row | Filled background + → arrow | Shows where Enter will go |
| "Something else" | Pencil icon, faint text, turns into a text field | The escape hatch: always one row, never hidden |
| Skip | Bottom right, secondary button | Moves past this question without answering |
| Hint bar | "↑↓ to navigate · Enter to select · Esc to skip" | Teaches the keyboard model under the card |
| "Thinking" above | The agent is still *mid-turn* | It's paused, not done: the question is a tool call, not a reply |

### Behaviours worth noting
- **It takes the composer's place.** You can't type a new prompt while it's open, so the agent's question can't get lost among new messages. That's a strong choice (see tension B in §4).
- **One question per screen.** Each step is a single decision, not a form to scan.
- **Options are short labels** ($250-400/night). Claude's tool spec also allows a `description` under each label, plus an optional visual `preview` (markdown or HTML) for layout and colour choices.
- **The free-text row is built in.** The host adds "Something else"/"Other" itself, so the model doesn't have to.

### The contract behind it (Claude Agent SDK, `AskUserQuestion`)
Taken from the official docs, so this part is verified:
- **1-4 questions** per call, **2-4 options** per question.
- Each question: `question` (full text), `header` (≤12 chars, a chip label), `options[]` (`label`, `description`, optional `preview`), `multiSelect`.
- The model is told to put a recommended option **first**, with "(Recommended)" at the end of its label.
- The answer goes back as `answers: { [questionText]: label | label[] | customText }`.
- An optional `response` field: the user closes the card and types a general reply instead. Claude then gets "The user responded: …" rather than per-question answers.
- The host **only renders**: Claude writes the questions, and the app can't add its own to this flow.
- It can wait forever. The run stays paused until the user answers, and long waits can be *deferred* and the session picked up later.
- Not available inside subagents, only in the main thread.

```json
{
  "questions": [{
    "question": "What's your budget per night for this trip?",
    "header": "Budget",
    "multiSelect": false,
    "options": [
      { "label": "$250-400/night", "description": "Boutique, good locations" },
      { "label": "$400-600/night", "description": "Upscale, 4-5 star" },
      { "label": "$600+/night",   "description": "Luxury" }
    ]
  }]
}
```

---

## 3. How others do it

| Product / spec | How it asks | What I'd take |
|---|---|---|
| **Claude** (app + Claude Code) | Card in place of the composer, one question per step, numbered options, Something else, Skip | The keyboard model and the escape hatch |
| **Cursor** plan mode | Multiple-choice picker in plan mode, then a plan | Their bug: a "select all that apply" question moved on after one click. **Multi-select must never auto-advance.** They also switch the picker off for some models, which then ask in plain text instead. |
| **ChatGPT deep research** | Asks follow-ups in plain text before a long run (in some modes it shows an editable research plan instead) | Ask *before* expensive work, not halfway through |
| **MCP elicitation** (spec, June 2025) | A server asks for a flat form (string, number, boolean, enum) through the client | The **three outcomes**: `accept`, `decline` (an explicit no) and `cancel` (closed it). Also: always show *who* is asking, and never ask for secrets this way. |
| **LangGraph `interrupt()`** / CopilotKit | The graph pauses and the UI resumes it with a value | Two kinds of pause: **model-initiated** (the agent chose to ask) vs **graph-enforced** (this step always needs a human). Same UI, different trigger. |
| **Shape of AI**: Follow up pattern | Clarifying questions are one of six follow-up types | "Before generation for compute-heavy tasks." Keep lists short, tie them to the last turn, and set them apart from the answer. |

---

## 4. Design tensions (where the real decisions are)

**A. Ask vs assume**
- Ask when the answer *changes the outcome* and a wrong guess is *costly to redo*.
- Assume (and say what you assumed) when a guess is cheap to correct.
- Research: models often *see* the ambiguity when asked to judge it, but in normal answering they mostly just answer ("Knowing but Not Showing", 2026). Retrieved context makes them ask even less. And under a tight budget (asking on only 10% of turns), picking *which* turns to clarify well roughly doubled the gains over picking at random (Zhang & Choi, 2023).
- → **The component is only half of it. The other half is the trigger policy** (when the model calls it). It's worth shipping prompt guidance with the component.

**B. Block the composer, or not?**
- Claude blocks: the question can't scroll away, and the user knows what's expected.
- But people sometimes want to say "actually, never mind, do X". Claude's `response` field covers this: close the card and type freely.
- → Block by default, but let **Esc / ×** hand the composer back, and send whatever is typed next as a reply to the questions.

**C. Skip vs close vs decline**
- Skip = "no preference on *this* one, use your judgement."
- Close (×) = "stop asking, just go" (MCP: `cancel`).
- Decline = "I don't want to answer that" (MCP: `decline`).
- → After a skip, the agent should **say what it assumed** in its reply ("No budget given, so I've mixed price ranges.") so the user can still steer.

**D. One at a time vs all at once**
- Stepper (Claude): calm, one decision per screen, good on mobile. The cost is that you can't see all 4 questions at once.
- Form: quick to scan, but feels like paperwork.
- → Stepper, with a **review/summary at the end** (or answered questions shown as chips) so you can go back and change one.

**E. Options the model makes up**
- Options are generated, so they can overlap, miss the real answer, or be too similar.
- → Always keep the free-text row. Cap at 4 options. Mark one as recommended so "just press Enter" is a sensible default.

**F. What stays in the transcript**
- After answering, the card should collapse into a **record** (the question plus the answer chosen) so the conversation shows *why* the agent did what it did.
- Open question: can you edit an answer afterwards and re-run?

---

## 5. Interaction + accessibility checklist (for the component)

**Keyboard**
- `1-9` picks an option. `↑/↓` moves. `Enter` confirms. `Esc` skips. `Tab` reaches Skip and Close.
- Number keys must **do nothing while typing in "Something else"**.
- Multi-select: `Space` toggles, `Enter` confirms, never auto-advances.
- `←` or Shift+Tab goes back a step (Claude doesn't show this. Worth testing.)

**Focus**
- When the card opens, focus moves to the first (recommended) option.
- When it closes or finishes, focus goes back to the composer.

**Screen readers**
- Single choice is a `radiogroup` (or native `fieldset` + radios) and multi-select is checkboxes. The question is the legend.
- A live region announces "Question 2 of 4" on each step, and "Answers sent" at the end.
- The hint bar is visible text, not only `aria` labels.

**Touch + motion**
- Rows have 44px+ targets, and the hint bar is hidden on touch, since there are no keys.
- Steps change with a short slide or fade, which reduced motion turns into a plain swap.
- The card shouldn't jump in height between steps (the same lesson as the mode-picker audit).

**States to design**
- Loading (questions are streaming in)
- Each step
- Free text being typed
- Multi-select with 0 or more picked
- Submitting
- Collapsed into the transcript as a record
- Error or timeout
- Closed/skipped, with the agent's assumption shown afterwards

---

## 6. Reusable component: first sketch (not built yet)

**Goal:** one drop-in that renders Claude's `AskUserQuestion` input as is, and can also read MCP elicitation enums.

- **Form:** a framework-agnostic web component, `<clarify-card>`, in plain JS + CSS custom properties for theming. It works in Astro, React or plain HTML.
- **In:** the `questions` array (Claude's schema).
- **Out:** a `clarify:submit` event with `{ answers, response? }` in Claude's response shape, plus `clarify:skip` / `clarify:cancel`, so it maps 1:1 to the SDK's `canUseTool` and to MCP's accept/decline/cancel.
- **Options:** `mode="stepper|form"`, `blocking` (hide the composer), `labels` (i18n: "Something else", "Skip").
- **Extras:**
  - a ~10-line adapter for the Agent SDK `canUseTool`
  - a short "when to ask" prompt snippet for the model side (tension A)

```html
<clarify-card blocking></clarify-card>
<script type="module">
  const card = document.querySelector('clarify-card');
  card.questions = toolInput.questions;           // straight from AskUserQuestion
  card.addEventListener('clarify:submit', (e) => resolve({
    behavior: 'allow',
    updatedInput: { questions: toolInput.questions, ...e.detail },
  }));
</script>
```

---

## 7. Open questions (for me to decide before the story)

1. **Context:** is this tied to Strive's chat (like the mode picker) or kept generic as a studio experiment?
2. **Live demo:** should the story include a playground (like `ModePlayground`) with the London hotel example?
3. **Scope of the component:** just the card, or the card plus the trigger guidance?
4. **Variants to prototype:** stepper vs form, blocking vs inline, with and without previews?
5. **Name:** "Ambiguity resolver", "Clarify card", "Question card"?

---

## 8. Possible story spine (rough)

1. **Backstory**: vague prompts and costly guesses.
2. **Homework**: Claude's card taken apart, plus how others ask.
3. **The tensions**: ask vs assume, block vs inline, skip vs close.
4. **Options**: variants prototyped.
5. **Interaction audit**: keyboard, focus, screen readers, touch.
6. **Design call**.
7. **The component**: `<clarify-card>`, drop-in for the Agent SDK and MCP.
8. **What I'd keep**.

---

## Sources

- Claude Agent SDK: [Handle approvals and user input](https://code.claude.com/docs/en/agent-sdk/approvals) (AskUserQuestion schema, limits, previews, `response` field)
- [MCP spec: Elicitation (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- [Cursor: Plan mode](https://cursor.com/blog/plan-mode) · [Multi-select auto-advance bug](https://forum.cursor.com/t/plan-mode-bug-select-all-that-apply-question-auto-advances-after-one-click/143705)
- [OpenAI: Deep research FAQ](https://help.openai.com/en/articles/10500283-deepresearch-faq)
- [Shape of AI: Wayfinders / Follow up](https://www.shapeof.ai/pattern-types/wayfinders)
- [CopilotKit: Human in the loop (useHumanInTheLoop vs useInterrupt)](https://docs.showcase.copilotkit.ai/langgraph/human-in-the-loop)
- Subramonyam & Seifert: [Bridging the Gulf of Envisioning (CHI 2024)](https://arxiv.org/pdf/2309.14459)
- Su & Cardie: [Knowing but Not Showing: LLMs Recognize Ambiguity but Rarely Ask](https://arxiv.org/abs/2605.25284)
- Zhang & Choi: [Clarify When Necessary (2023)](https://arxiv.org/abs/2311.09469)
- Madge, Purver & Poesio: [Referential ambiguity and clarification requests: humans vs LLMs](https://arxiv.org/abs/2507.10445)
- [Active task disambiguation with LLMs](https://arxiv.org/abs/2502.04485)
