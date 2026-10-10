# agent-clarifier: build journal

> Called `clarify-card` until the naming round below. The snapshots in `process/` keep the old name, because they are history.

> The story's source material. Every round of research, design and review is logged here, with the artifacts kept in `process/`.
> Built with Claude (Claude Code) as a pair: I set the direction and make the calls, and Claude researches, drafts and builds.

## How this folder works

- `design/board.html` and `PLAN.md` are the **working copies**. They change every round.
- At each review round, both are **snapshotted** into `process/NN-name/`, along with full-page renders (light, dark, phone). **Snapshots are never edited afterwards.**
- References and screenshots go into the round they belong to.
- Git history is the second safety net.

```
process/
  00-research/         learnings draft + the Claude screenshot that started it
  01-board-v1/         first plan + board, renders before and after the review fixes
  02-draft-mode/       plan + board with draft mode added
  03-own-words/        draft mode simplified, "Reply in your own words" removed
  04-build-plan/       scope lock + BUILD.md as first delivered for review
  05-coverage/         who it's for, decide for me, long content / phone / RTL rules, DESIGN.md
  06-build-agreed/     PLAN + BUILD + DESIGN as approved, the baseline the build starts from
  08-claude-calls/     design calls delegated to Claude: palette, contrast, elevation, records
  (from round 6, review rounds snapshot playground screenshots; the board is frozen)
```

---

## Round 0 · Research (10 Oct 2026)

**Spark:** Claude's clarifying-question card. While answering, Claude takes over the composer with a short questionnaire: numbered options, "Something else", Skip, and "2 of 4". (`process/00-research/claude-question-card.jpg`)

**What I did:** learnt before designing. I took Claude's card apart, read the `AskUserQuestion` docs, and looked at Cursor plan mode, ChatGPT deep research, MCP elicitation, LangGraph interrupts and Shape of AI's Follow up pattern. I also read the research on when models should ask. (`process/00-research/learnings.md`)

**What stuck:**
- The gulf of envisioning: users don't know what to say, so the agent should ask.
- Models often *notice* a prompt is ambiguous but rarely *ask*, so the trigger matters as much as the UI.
- Cursor's multi-select auto-advance bug: multi-select must never move on by itself.
- MCP's accept / decline / cancel: Skip and Close mean different things.

---

## Round 1 · Plan + board v1

**Brief I gave:**
- A web component that works in any framework, as its own package, pushed to git.
- Both flows: sequential (order matters) and all at once (order doesn't).
- Single and multi-select.
- Two placements: replace the composer, or docked above it so it never gets lost among messages.
- **Every state**, especially **easy to revert, reset, backtrack and recover**.
- Neutral, and themed with CSS variables.
- Plan and visuals first, with a review before any build.

**On input formats** I asked why the format matters. Answer: who writes the questions changes things. A hand-written questionnaire, Claude's `AskUserQuestion` and MCP elicitation each have their own shape. The decision: **one native format plus small optional converters**. The native format adds stable ids, required, min/max and a recommended flag.

**What came back:** `process/01-board-v1/` (PLAN.md + board.html, 30+ frames in 8 sections).

**Calls made in v1, and why:**
- **Minimise instead of ×.** Closing shouldn't lose answers, so the card folds into a "2 of 4 answered · Reopen" pill.
- **Undo over confirm.** Start over and Skip are one click, with Undo in the card footer. No "Are you sure?" dialogs.
- **One history stack** behind Back, Undo, Reset and Edit, so they can never get out of sync with each other.
- **Focus is a ring, selection is a fill**, so both can show at once for keyboard users.
- **Errors only after a send attempt**, never while someone is still answering.
- **The record stays in the transcript.** The card collapses into a summary where it was asked, which shows why the agent did what it did.

**Review fixes before I saw it** (compare `renders/first-render-*` with `renders/after-fixes-light.png`):
1. The Anatomy section promised a "who is asking" line, but the card didn't show one. Added.
2. One subtitle said "except dates" when the required question was trip length.
3. Unchecked checkboxes looked like empty number badges, so they got an outline.
4. Single-select checks were square like checkboxes, so they became round.

> Note: the v1 board and plan in `01-board-v1/` were rebuilt after round 2 by undoing exactly the round-2 edits. The rebuilt board's render matches the original v1 render **pixel for pixel** (0 differing pixels). The renders are the originals.

---

## Round 2 · Draft mode (prefill, edit, then send)

**My feedback:** "This looks amazing." Then I asked for a way to **prefill and not send**. In sensitive cases, or when a decision isn't a simple choice and needs explaining in text, the user should be able to pick, have the answer prefilled, add context and then send. It should be opt-in.

**What came back:** `process/02-draft-mode/`, a new board section (H1–H5) and plan §4b.

**Calls made:**
- **Three levels of opt-in** (`submit`): `send` (default), `draft` (always prefill), and `choice` (the user picks between **Send** and **Edit first**).
- **The agent or the app can turn it on.** The question set's setting beats the attribute.
- **`explain: true` leaves a "why?" placeholder** in the draft, and the cursor lands on it. This is for choices that need a reason.
- **Never overwrite what the user typed.** Answers go above existing text, and Discard removes only the inserted part.
- **Going back after editing** never silently wipes the edits: the user picks "Keep my draft" or "Update draft", and an update can be undone.
- **The sent message is the record.** The agent gets the exact text plus the structured picks. For Claude, the text goes into `response`, so the user's words win.

**Open:** labels ("Add to message", "Edit first") and the draft's wording ("Here's what I'm after:" vs plain bullets).

---

## Round 3 · Simplify: one way to answer, one way out

Before building, I reviewed the board and pushed back on two things.

**1 · "Reply in your own words" (C1)**
- **My feedback:** the intent and how it works aren't clear from the link alone. It's too much control when minimise and Esc already exist.
- **Decision:** removed it. **Minimising gives the composer back**, and its placeholder changes to **"Or reply in your own words…"**, so the input itself explains what typing does. A message sent while the card is minimised **is the answer**, along with the picks so far. Dock already worked this way, so both placements now share one rule.
- **New state:** the record reads "Replied in your own words · 2 picks kept", with **Answer the questions** to reopen the card (board E6).

**2 · Draft mode was confusing**
- **My feedback:** What is "Edit first"? Why does Send fill the composer instead of sending? If review already lets you edit each answer, prefilling the composer with the same picks is redundant. Prefill only makes sense for answers that aren't terms, like a sentence or a detail.
- **Decision:** dropped draft as a mode: `submit`, Edit first, Add to message, the "Filled from your answers" strip, Keep/Update draft, and `explain`. In its place:
  - a **`compose` option**, for an answer the user should write themselves (sensitive, personal or long). Picking it minimises the card and starts the sentence in the composer, e.g. "For accessibility, I need ". It then follows rule 1. The row shows a **"write it ↗"** hint because it leaves the card.
  - **short details stay in the card**, as a `text` question with a `default`.
- **Why it's better:** one way to answer (the card, with review for edits) and one way out to your own words (the composer). No new strip, state or button. The compose option reuses minimise.

**What came back:** `process/03-own-words/`. Board C1, C2 and D5 were updated, section 4 was rewritten as "In your own words" (H1–H3), and E6 plus a compose-option state were added. In the plan, §4b was rewritten, and the API lost `submit`, `format`, `complete()` and `clarify:draft` and gained `reply()` and `clarify:compose`.

**Open:** the copy for the placeholder ("Or reply in your own words…") and the compose hint ("write it ↗").

---

## Naming · clarify-card → agent-clarifier

- **I wanted** a name that describes the use case by itself.
- **Candidates:** `clarify-card`, `ambiguity-resolver`, `clarifying-questions`, `agent-clarify`, `ask-user-question`, `agent-questions`, `chat-clarifier`, `clarification-card`. All were free on npm.
- **Ruled out:**
  - **Names built on "card" or "panel"** describe the look, not the job. The component is also a pill, a docked tray and a record.
  - **`ambiguity-resolver`** sounds like an NLP library that resolves ambiguity *for* you. Here the user resolves it.
  - **`clarifying-questions`** was Claude's first vote. My pushback: it's a component, and "clarifying questions" sounds like an action. A component should be a noun, like `<dialog>` or `date-picker`.
- **Decision: `agent-clarifier`.** It's a noun, so it reads as a thing. It names both the job (clarifying) and the context (agents asking before acting), and `<agent-clarifier placement="dock">` reads naturally. Events and CSS variables keep the short `clarify:` / `--clarify-*` prefix.
- **Published as `@marigameo/agent-clarifier`.** The scope ties it to me and can't clash with anyone else's package. The tag stays `<agent-clarifier>`.

---

## Round 4 · Scope lock, last decisions, build plan

**Branching, considered and deferred.** I asked whether we'd planned for branching: put the most important question first, and let later questions depend on earlier answers, with the conditions declared up front and checked by the component, so there's no extra round trip. Claude proposed a design for it: a JSON `when` condition, a step count that only ever shrinks, a "Because you picked X" line, and hidden answers kept rather than deleted. Then I pulled it back: **"Let's not complicate for now. Let's build this functionally top notch rather than bloating in more supports."** Branching, option previews and option-level conditions are out of v1.

**Working agreement:** every decision gets made here first. Then comes a detailed build plan, which we review and agree on, and only then does implementation happen in its own session in this folder.

**Last decisions** (all four went with Claude's recommendation):
- **Review step:** `auto`. It only shows when something was skipped or there are 3+ questions.
- **Undo window after send:** off by default, opt-in with `undo-window`.
- **Option previews:** later (v1.1).
- **Copy:** "Or reply in your own words…" and "write it ↗".
- **Licence:** MIT.

**Spec tidy:** cleared leftovers from earlier rounds: "Reset in the menu" (there's no menu), "Esc or ×" (there's no × any more), and "Back moves through history" (Back only navigates; only undo and start over use history).

**What came back:** `BUILD.md`, the implementation plan:
- the tech choices
- the repo layout
- normalising rules
- the state and transition tables
- the keyboard, focus and ARIA spec
- the full API, events and converter mappings
- composer integration
- milestones with acceptance criteria
- a definition of done
- risks
- a list of "calls made" for me to check

**Status:** waiting for my review of BUILD.md. Snapshot: `process/04-build-plan/` (PLAN.md and BUILD.md as delivered for review. The board hadn't changed since round 3 apart from its name, so there are no new renders).

---

## Round 5 · Who it's for, a coverage check, and "everything has a meaning" (10 Oct 2026)

**Brief I gave:** before building, I restated what I want, so we're working from my words and not only from the plan.
- **Who it's for:** someone building an agentic, generative-UI chat in any business area. Their users write vague prompts, so the system asks clarifying questions to gather context and guide them toward what they meant.
- **For the person answering:** quick and easy. No overload, one question at a time.
- **Not too specific.** It must cover: yes/no or one of two; multi-select; single-select; questions in order; questions in any order; skip, or answer in your own words; **decide for me**; required vs optional; selection limits; loading and streaming; i18n and RTL; mobile; long content.
- **Not a Claude copy.** It should be better, with clear reasons to choose it. Interactions and details like shadows matter: **everything we put in should have a meaning.**

**What Claude found** checking my list against PLAN and BUILD:
- **Already covered:** 1–6, 8, 9 and 10.
- **Partly covered:** i18n/RTL (only a "sanity check" at M5) and mobile (no plan for the on-screen keyboard).
- **Missing:** "decide for me" and long content.
- **Also flagged:** the "meaning" standard wasn't written down anywhere, and the board breaks it in places. The card has the same shadow in replace mode, where nothing sits beneath it; the dock shadow is hard-coded; and the CSS uses left/right throughout.

**My calls** (Claude gave options, with a recommendation for each):
- **Decide for me: option B,** opt-in per question (`delegate`). The other options were renaming Skip (A), or showing both Skip and Decide for me (C).
  - It **replaces** Skip on that question, so there's still one way out.
  - It comes back as `delegated`, separate from `skipped`.
  - **Why:** "skip" means *say what you assumed*, and "decide for me" means *say what you chose*. Showing both would be the overload I want to avoid.
- **Long content:** Claude's rules (below). **We'll revisit this and stress-test it visually later.**
  - wrap everything the user decides on
  - only shorten summaries
  - a card with a maximum height, its header and footer pinned, and a shadow only when content is scrolled under an edge
  - text fields that grow
- **Phone:** the visible screen sets the card's size, opening the card never pops up the keyboard, and hit areas are 44px.
- **Everything else** went with Claude's recommendations:
  - RTL from the first line of CSS, plus plurals and local number formats
  - yes/no stays a two-option `single`
  - streaming stays as planned
  - a written design rationale

**Details Claude worked out while writing it up** (logged in BUILD §13, items 9–14, for me to check):
- Decide for me is a **row, not a footer button**, because it's an answer.
- It **counts as answering**.
- **Required beats delegate.**
- On multi-select it **moves on by itself**, since it's a complete answer.
- The card's maximum height is **60% of the visible screen**.
- **A correction:** in chat, Claude said the component would handle the iPhone home-bar area in dock mode. Looking closer, the card sits inside the app's own bottom area, so adding the inset would double it. The safe area stays the app's job, with a README recipe.

**What came back:**
- **`DESIGN.md` (new).** The meaning of each visual signal, then every default token with its reason, marked ✅ / ⚠️ / ❓. **Contrast was measured, not assumed.** 15 findings are waiting for the next visual round. The biggest:
  - **The "faint" grey fails AA as text** (2.9:1 in light, 3.7:1 in dark), although the plan promised AA defaults. axe would have caught it at M5; now it's caught before any code.
  - **The warm greys aren't neutral,** and they echo Claude's own look.
  - **Compact density has two inline edges,** 2px apart.
- **PLAN:**
  - who it's for (§1)
  - §4c Decide for me
  - `delegate` and `delegated` in the format
  - a recovery row for it
  - the language and direction, long content and phone rules (§8)
  - decisions 8–14
- **BUILD:**
  - the `DELEGATE` action and what clears it
  - normalising rules
  - ARIA for the new row
  - converter mappings
  - §8.1–8.3 (RTL, long content, phone), plus a test that fails if `left`/`right` appear in the CSS
  - plural and number formatting in labels
  - M1, M2 and M5 acceptance criteria updated
  - new risks

**Open:**
- **Copy** for the delegated answer in review and the record (working copy: "Left to the agent").
- **The DESIGN.md findings** (F1–F15) and the missing board frames, for the next visual round.
- **BUILD.md** is still "for review".

Snapshot: `process/05-coverage/` (PLAN.md, BUILD.md, DESIGN.md). The board hasn't changed this round; its frames come next.

**Outcome: I approved BUILD.md** ("looks good"), with every call in §13 accepted as written, items 1–14. Its status is now **agreed**, frozen in `process/06-build-agreed/`.
- **How we'll work from here:** go through each milestone together, explaining the what and the why before the code, and **check visually at every stage where we can**.
- **Still open:** the copy for a delegated answer, and DESIGN.md findings F1–F15. Both are due before M2, the first UI milestone.

---

## M1 · The model (10 Oct 2026)

**How we worked:** a pairing session. Before each file Claude explained the idea behind it, I made the calls, and then it was built. No visual checks until there's UI (my call).

**Tooling, and what we learnt**
- **TypeScript 7 everywhere** (my call: "update to latest in all places").
  - TS 7 is the native compiler and drops the JavaScript API that `vite-plugin-dts` and `typescript-eslint` use, so both crashed.
  - Claude first pinned TS 6, then tested TS 7 in a scratch folder. TS 7 writes `.d.ts` files itself, and **oxlint** doesn't need the API.
  - Result: 11 dev tools down to 7, and the build went from ~310ms to ~15ms.
- **Vite stays** (my question: is it the standard?). There's no single standard: Lit uses Rollup, Web Awesome uses esbuild, and newer libraries use tsdown. Vite won because we need a dev server, a library build and Vitest's browser mode, and only Vite gives all three in one tool.
- **The size check was measuring the wrong file.** Vite leaves whitespace in ES library builds, so we now minify fully, and the number is what ships.

**What was built:** `types`, `normalize`, `reducer` (with history), `selectors` and `labels`.
- **435 tests**: 100% of lines and 99.4% of branches covered.
- **The reducer tests come in four groups:**
  - a matrix (every action × every status)
  - one test per transition
  - one scenario per recovery row
  - the result rules

**Ideas worth keeping**
- **Two layers of types.** Forgiving input, strict inside. `normalize` is the only bridge, and it takes `unknown`, because agent JSON arrives where TypeScript can't check it.
- **A pure reducer:** `reducer(state, action, env)`. The clock comes in through `env`, so a test can say "now = 1000" and check that the undo deadline is exactly 5000.
- **If nothing changes, return the same object.** Picking the same option twice adds no undo step, and the element can skip re-drawing with `next === prev`.
- **The compiler as a checklist.** Removing one `case` failed the build with "not assignable to never".
- **Toasts hold data, not words,** so the model never knows the language.

**The deliberate-break check** (Claude's practice, used on every module): inject bugs a user would notice, and confirm a test fails.
- **100% coverage hid weak tests twice.** "More than 9 options" was tested with 12, so a limit of 10 also passed. "Review from 3 questions" was tested with 2 and 4, never exactly 3.
- **Lesson: test at the boundary, not on either side of it.** After the fixes, all 20 injected bugs across the model are caught.

**My calls**
- Multi-select defaults to `min: 1`, so Continue always means "I picked something".
- Warnings print **codes, not sentences** (saves about 0.4 KB; the README will explain each code).
- **Size is a target, not a wall: polish first, then measure and cut.** The finished model is **3.98 KB of the 12 KB** target.

**Claude's suggestions I accepted:**
- An answered card can't be expired.
- Skip all is hidden when a question is required.
- A toast lasts until the next action that changes something.
- An optional text question needs text, or Skip.
- Edit answers on an all-at-once card reopens the form.
- Multi-select picks are sent in the options' order.

**Spec gaps that writing code exposed** (all now in BUILD.md):
- the reducer's `env`
- `TEXT_FOCUS` and `RESET`
- streaming with no complete question yet, and streaming while minimised
- the extra rules for messy agent JSON
- explicit public `Labels` keys

**A surprise in the locale data:** plain `ar` now uses Western digits (24) in the Unicode data browsers follow. `ar-EG` and `ar-SA` use Arabic-Indic (٢٤), and Persian uses its own (۲۴). So the page's full language tag decides, and we never force a style.

**Still open:**
- the copy for a delegated answer
- DESIGN.md findings F1–F15, plus the missing board frames

Both are for the visual round, before M2.

---

## Round 6 · From the board to a playground (10 Oct 2026)

**My feedback:** I made the board for rough visuals, and **I can't judge enough from it.** Testing the real component needs a playground: the real thing, wired to dummy data.

**Options Claude gave:**
- **A:** a playground page served by Vite (recommended)
- **B:** Storybook (heavy, and shows components in isolation instead of inside a chat)
- **C:** Ladle or Histoire (built around React or Vue)
- **D:** a small app per framework (a final check, not a design tool)

**My calls:**
- **A, the playground:** the real `<agent-clarifier>` in a fake chat, with scenarios for every case on my list, controls, an event log, the result as JSON, and every setting in the URL.
- **Skip the board's visual round.** The board is frozen as the early sketch. DESIGN.md findings F1–F15 and the delegated-answer copy are decided **in the playground**, on the real component, and review rounds snapshot playground screenshots.

**Why:** you can't judge a shadow, a grey or a 120ms confirm from a static drawing. You can when you click through it inside a chat at phone width.

**Plan changes:** BUILD §2.1 describes the playground. The milestone criteria now refer to playground scenarios instead of board frames, and M2 starts with the playground.

---

## Round 7 · Using it for real: long content and the composer (10 Oct 2026)

Clicking through the first playground build raised two things.

**1 · Long content was cut off.** The card had no height limit yet, so it grew past the chat and was clipped.
- **Fixed now** instead of at M5: the card is capped at 60% of the visible screen, the questions scroll, the footer stays put, and an edge shadow shows only while more is hidden.
- **The phone screenshot then exposed a second problem:** a 300-character question pinned at the top took 60% of the card. Claude's options:
  - A: always pinned
  - B: always scrolls
  - C: pinned when short, scrolls when it's taller than a third of the card (recommended)
- **My call: C.** It's done with `position: sticky` and one flag, so nothing moves in the DOM.

**2 · "What if the user types in the composer instead? Should the card dismiss? Claude hides the composer."** The playground showed neither placement yet, so the composer just sat there.
- Claude restated the rule from round 3: **replace** (the default, like Claude) hides the composer, and minimising gives it back reading "Or reply in your own words…". **Dock** keeps it visible.
- In both, **typing never dismisses; sending does.** The message becomes the answer, and the record has "Answer the questions" to undo that.
- **Why not dismiss on typing:** typing is tentative, people glance back at the options, and a stray key shouldn't hide the questions.
- **My call: build the placements next** (pulled forward from M3, before the all-at-once form), so the playground behaves like a real chat.

**What came with it**
- **Sending from the composer:** the element listens on the form in the capture phase. While the card waits for an answer, it takes the message as `clarify:reply` and stops the app's normal send. Otherwise the message passes through untouched.
- **A bug that only a real page shows:** `hidden` on the composer's form was overridden by the app's own `.composer { display: flex }`. Hiding now adds an inline `display: none !important` and restores everything exactly.
- **Where the record lives:**
  - The element sits at the composer while it asks.
  - When it becomes a record, the app moves it into the transcript.
  - On `clarify:reopen` it moves back, and that event now also fires when a record is reopened.
  - The playground does this; `ask()` will do it in M6.
- Compose options start their sentence in the composer, and Reopen takes it back out if it wasn't touched.
- **Size:** 14.6 KB gzipped (target 12). As agreed, we polish first and cut later.

---

## M2 · The element, both flows, keyboard and screen reader (10 Oct 2026)

**What was built, in three steps, each checked in the playground:**
1. **The sequential flow and the playground.** The element is one loop: event → action → reducer → render → `clarify:*` events. Views build their DOM once, then update in place.
2. **The all-at-once form and streaming.** Chips; errors only after a send attempt; "show what has arrived" while streaming, with nothing pickable until it's complete.
3. **Keyboard, focus and screen reader:**
   - **Keys:** 1–9 pick, arrows move (chips also ←/→, mirrored in RTL), Home/End, Space/Enter, ← back (→ in RTL), Esc minimises (or leaves "Something else" with the text kept), ⌘Z/Ctrl+Z undo (except inside text fields, where it's the browser's own), and IME composition is ignored.
   - **Roving tabindex:** one Tab stop per group (the picked, else the recommended, else the first option).
   - **Focus:** it follows into each new view and is never lost to `<body>`. Dock mode never steals it. On touch screens a text field is never auto-focused, so the keyboard doesn't pop up.
   - **A polite live region** announces the question, skips, limits, Decide for me, review, sent, minimised and failed.

**Component tests run in real Chrome** (Vitest browser mode, using the Chrome already installed):
- each flow keyboard-only and mouse-only
- arrows and roving tabindex
- undo, Esc and RTL
- errors only after a send attempt
- both placements, including the app-CSS hiding bug from round 7
- sending as the answer, normal messages passing through, compose insert and take-back
- focus on reopen

**The deliberate-break check** on the keyboard code caught 4 of 4: number keys ignored, RTL not mirrored, no focus on open, Esc in the field minimising.

**Bugs found by looking, not by tests:**
- `display` rules overriding `hidden`
- the app's CSS overriding the hidden composer
- the source line missing while streaming
- rows jumping when streaming ended

**Numbers:** 456 tests (440 unit, 16 component). Size **17.8 KB** gzipped against the 12 KB target. Polish first, cut later (my call).

**Next:** a review round in the playground. Settle DESIGN.md F1–F15 with live comparisons, the open copy ("Left to the agent", "A few questions", "Required"), and the record's final design.

---

## Round 8 · I delegate the design calls (10 Oct 2026)

**My call:** "Choose things for me. Later I'll audit with some skills." Rather than adjusting things in the playground one by one, I'll review the finished state and work on the gaps I notice. **So every decision below is Claude's**, made against DESIGN.md's principles, with reasons recorded for my audit.

**Claude's calls**
- **Palette: neutral greys** (F9). "Neutral by default" was the promise, any brand accent sits on grey without clashing, and the warm off-whites read as Claude's own look. The warm set stays as a theme made with tokens only.
- **Contrast, measured, not assumed** (F1–F3):
  - all text is ink or muted (≥ 4.5:1 on the selected fill)
  - "faint" is used only for edges (≥ 3:1)
  - the text field finally has a visible outline
- **Elevation means "floats over the conversation"** (F4, F5, F14):
  - no shadow on the card in replace mode, since it takes the composer's place
  - the dock shadow is a token
  - in dark mode, floating things get a 1px top highlight, because shadows barely show there
- **Geometry:**
  - concentric 8px row corners (F7)
  - radii from tokens (F8)
  - four type sizes (F10)
  - compact density with one 16px edge (F6)
  - 52px rows kept, with the reason written down (F12)
- **Focus rings for keyboard users only.** After a click, focus still moves (so the keyboard can take over) but the ring stays hidden. The screenshots showed it as noise for mouse users.
- **Toasts pause while hovered or focused** (F13).
- **The undo window is now visible:** "Sending in 3s · Undo", and ⌘Z also works.
- **Records, final designs:**
  - answered: a ✓ line plus one line per answer
  - skipped and replied: a single line with the way back
  - replied: the user's own message becomes their chat bubble
  - expired: dashed
- **Copy kept as the working copy:** "Left to the agent", "A few questions", "Required". The Decide-for-me icon is a hand-off arrow.

**Snapshot:** `process/08-claude-calls/` (PLAN, BUILD, DESIGN, desktop light/dark and phone sheets).

**Numbers:** 456 tests. Size 18.3 KB gzipped against the 12 KB target; cuts come after polish.

---

## M3–M7 · Finishing the build on my delegation (10 Oct 2026)

**Context:** with round 8 I handed the calls to Claude, so this stretch was built end to end. The calls Claude made are logged here for my audit.

**What was added**
- **Recovery (M4):** settled progress dashes are buttons that jump back. The dashes now show on every step, and the pick count and key hint step aside in narrow cards.
- **Motion (M5):**
  - the card's height animates between views
  - steps slide 12px in the reading direction (mirrored in RTL)
  - opening fades up
  - nothing moves under reduced motion
  - the animation clock was slowed through Chrome's DevTools Protocol to check it
- **Focus rings follow page-wide input modality:** a card opened by pressing Enter shows its ring, one opened by a click doesn't.
- **The accessibility audit (M5):** axe-core ran on 12 views in light and dark. Contrast passed everywhere once fades finished. It found four real issues, all fixed:
  - **"Something else"** had its field nested in the radio. Claude's call: the field now opens just below the row.
  - **`aria-required`** was on multi groups, where it isn't allowed.
  - **The review list** had buttons inside its `dl` rows.
  - **Button names** didn't start with the visible word.
  - Plus a test that keys pressed while an IME is composing are ignored.
- **`ask()` (M6):** resolves on send, skip, reply or expire, and never rejects for user actions. With a `transcript`, each ask gets its own card, which moves into the conversation as a record. Plus typed events, and opt-in JSX typings that are type-checked against React 19.
- **Converters (M6):** first a research agent checked the current specs (Claude Agent SDK `AskUserQuestion`; MCP 2026-07-28). What it found changed the plan:
  - Claude's multi-select answers are one `", "`-joined string.
  - There's no official skip field, so skips go through `response`, in the user's voice.
  - "(Recommended)" is a convention, not a field, so labels are sent back unchanged.
  - MCP has three single-select shapes plus multi-select arrays.
- **Claude's calls on the converters:**
  - `toClaude()` returns the whole `canUseTool` result (one-line integration)
  - MCP never sends an `accept` that's missing a required field (it declines instead)
  - the converters are separate ~1.1 KB entries, with the shared id helpers split out so a converter doesn't pull in all of normalize
- **M7:**
  - React 19 and Vue 3 smoke tests in Chrome, plus server-side import
  - the README (quick start verified against the built file; the Vue template syntax verified with Vue's compiler)
  - two unused labels removed

**Process fixes**
- **The size check had been failing quietly since M2 step 1**, because I'd said "polish first". A check that's always red gets ignored, so it now guards at 20 KB, and 12 KB stays the target for a size round.
- **The deliberate-break check** caught 5/5 injected bugs in the converters.

**Numbers:** 508 tests (unit + component in real Chrome), green. Core 19.7 KB gzipped; the converters are about 1.1 KB each.

**Waiting on me:**
1. **Size:** cut behaviour to reach 12 KB, or revise the target. Claude's measurements and options are below.
2. **Manual checks:** a VoiceOver pass, and a real phone with its keyboard.
3. **Svelte 5:** it hasn't been tested.
4. **Publishing:** npm and a public repo, both my go-ahead.
5. **My audit of round 8's calls,** and a native speaker's review of the sample Arabic labels.

---

## Story notes (to use later)

- The arc: **borrow the feel, not the pixels** → research → plan → board → feedback → draft mode → **simplify** (cut a mode, a link and a strip) → **scope lock** (said no to branching) → build plan → build.
- Good before/after pairs: the v1 first render vs after the review fixes (the checkbox and radio fix is a small, clear example).
- Round 2 → 3 is a good "less is more" beat: draft mode got simpler when I asked what each control was for.
- The renders in each round are ready to use as story images.
- Round 5 is the "measure, don't assume" beat: writing a reason for every token showed that the default grey failed the contrast the plan promised. It was caught on paper, before any code.
- M1's "100% coverage, still weak tests" beat: deliberately breaking the code found two boundary blind spots that coverage couldn't see.
- Skip vs Decide for me is a good small example of meaning over features: same outcome for the agent, different intent from the user, so a different reply.
