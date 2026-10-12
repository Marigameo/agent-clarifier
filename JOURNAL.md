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

## Round 9 · Motion audit with Emil Kowalski's skill (10 Oct 2026)

**Brief (mine):** the build is done. Now I want to audit and improve the experience, one external skill at a time, and be able to answer for every interaction, colour and shadow. The first skill is Emil Kowalski's `find-animation-opportunities`. It's read-only and built around restraint: an idea survives only if it passes how often, what job, speed, and whether moving it gets in the way.

**What Claude found** (full report frozen in `process/09-motion-audit/audit.md`). The existing motion was already purposeful and tokenised. Four proposals, five turned down:
1. **Toast entrance:** the toast carrying Undo swapped in unnoticed where the dashes were.
2. **The doc said 200ms for the fold, the code used 160ms.** An honest drift between DESIGN §7 and the code.
3. **Press feedback** on buttons, chips and icon buttons (`scale(.97)`).
4. **Reduced motion "gentler, not zero":** keep fades, drop movement. This changed a principle in DESIGN §1, so it was flagged as my call.

Turned down: fills on option rows (keyboard-paced), shrinking an option row, a pulse on the pill, an error shake, and the animated countdown. Each is logged with the question that failed it.

**My decision:** take all four.

**What Claude built, and the calls made along the way** (Claude's, with reasons, per round 8):
- **Toast:** fades in with a 4px rise via `@starting-style`, and leaves the same way (`leave()` in `motion.ts`). The dashes come back without a fade, because they're rebuilt on every update and an entrance would replay constantly.
- **Fold:** a new `fold` move at **1.25 × `--clarify-duration`** (200ms by default), not a new public token. That keeps the API unchanged (scope lock), and an app that retunes speed keeps the ratio.
- **Press:** pointer-only, through the existing live `data-pointer` hook. Keyboard presses already show a ring and repeat too fast to animate. Text links don't shrink.
- **Reduced motion:** views, the toast and the compose glow fade; nothing moves or resizes. The spinner and shimmer still stop, because they move.

**Caught by looking, not by tests:** Claude made filmstrips with Chrome's animation clock slowed 10× (`scripts/motion-strips.mjs`). They showed **the pill turning into an oval** during the fold: a `999px` radius on an element whose height animates from the card's size. Fix: the pill fades only. The strips also made the ease-out visible, with ~70% of the distance covered in the first quarter of the time.

**Caught while building:** the toast's exit fade opened a race. A timeout landing after Undo would have cleared the *next* toast, so now only the toast that was fading times out.

**Tests:** 3 new component tests (fold timing and the pill not moving, the reduced-motion crossfade, and the toast's entrance, exit and race). Deliberately breaking each change made a test fail, 4/4. 511 green.

**Size:** +280 B gzipped (19.95 KB against the 20 KB guard). It adds to the size decision that's already waiting on me.

**Docs:** DESIGN §1 and §7 rewritten (every motion value with its reason, plus a "not animated, on purpose" table). BUILD, PLAN and README brought in line with the new reduced-motion rule.

**My hands-on check (11 Oct):** I went through Claude's six-point list: keyboard speed run, toast in, out and hover, press with mouse vs Space, fold and reopen in light and dark, macOS Reduce motion, and phone taps. Everything looks good, so I signed it off.

**Artifacts:** `process/09-motion-audit/` (audit.md, PLAN.md, DESIGN.md, renders: five filmstrips plus toast light, dark and phone).

---

## Round 10 · Craft audit with Emil Kowalski's `emil-design-eng` (11 Oct 2026)

**Brief (mine):** the second skill in the audit series. This one is Emil's general design-engineering checklist (easing, speed, press and hover, performance, reduced motion, the Sonner principles), run the same way: Claude audits read-only, I pick, Claude builds, tests and documents. I also asked that every change stay tracked, because I'll be telling this as a UX story.

**What Claude found** (frozen in `process/10-craft-audit/audit.md`). Round 9 had covered most of the motion, so this pass found **gaps in feedback and invisible edge cases**:
1. Buttons, chips and the pill's Reopen didn't react to hover; only rows did.
2. Hover was gated by `(hover: hover)` alone, so some touch screens kept a fill after a tap.
3. The toast's timer kept running in a hidden tab, so you came back and Undo was gone.
4. The shimmer repainted every frame on the main thread, so it stuttered exactly while streaming.
5. The toast left as slowly as it arrived.
6. The spinner was 0.8s.

**My decision:** take all six, and raise the size guard to 21 KB for now. I want a polished component first and will come back to size on its own.

**Claude's calls while building** (with reasons):
- **Hover fills are instant.** They happen tens of times a day, and a fade would trail the mouse.
- **The primary button's hover is derived:** `color-mix(fg 88%, bg)`, so a brand colour gets a matching hover for free. Its border goes transparent on hover, so no darker ring shows. Contrast: 11.9 (light) · 11.1 (dark).
- **The tab-hidden pause reuses the existing check:** one condition added to the hover and focus check.
- **The shimmer sweeps in the reading direction** (reversed in RTL), which came free with the transform rewrite.
- **The toast exit is 0.75× the base duration,** a ratio like the fold's 1.25×, so there's still only one public speed token.

**Kept, with reasons** (now in DESIGN §7 so I can answer for them):
- **Our easing:** measured 73% at a quarter of the time, against Emil's 78%. Same family, the difference is invisible.
- **No ease-in-out for the height change:** the height would lag behind the content.
- **The step slide when using the keyboard,** against the skill's "never". Cards are occasional, the slide says which direction you moved, and my own speed run in round 9 felt fine.
- **Animating height** despite "only `transform`/`opacity`": one element, 160ms, and a transform squashes text.

**Verified:** 4 new component tests, and deliberately breaking each change made a test fail, 4/4. 514 green. Zoomed rest-vs-hover pairs in light and dark. A touch-phone capture showing a row tapped on then off keeps no fill. A shimmer filmstrip. `scripts/shots.mjs` gained `hover:`, `tap:` and `touch=1`. Size 20.07 KB (+120 B).

**Artifacts:** `process/10-craft-audit/` (audit.md, PLAN.md, DESIGN.md, renders).

---

## Round 11 · Interface audit with Jakub Krehel's `better-interface` (11 Oct 2026)

**Brief (mine):** improve the interface itself. The skill is an orchestrator: it runs six domain skills (accessibility, layout, writing, typography, colors, UI), requires evidence for every claim, merges findings that share a root cause, ranks by user impact, caps the report at 15, and ends in Block or Approve. I asked for everything to be tracked.

**How Claude ran it:**
- Six read-only reviewers, one per domain, each loaded its own skill (3,520 lines of rules) and rendered the playground in real Chrome.
- Between them, ~30 measurement scripts covered: 320px; 200% and 400% zoom; Windows contrast themes (forced colors); the accessibility tree; German-length labels; Arabic; touch; pixel-sampled contrast.
- Claude then merged the overlaps and re-rated two findings:
  - "send failed gives no next step": HIGH → MEDIUM, because the visible Try again is right there
  - the warm theme's failures rank last, since they're demo-only
- Claude also re-checked the surprising findings in code and screenshots before reporting.
- The frozen report and before-renders were saved **before any fix**: `process/11-interface-audit/`.

**What it found:** Block, with 10 HIGH. Unlike rounds 9–10 (feel), these are places the component **broke** for real users:
1. Windows contrast themes lost every focus ring and pick.
2. Keyboard focus could land on rows hidden under the sticky header.
3. Pressing Send by keyboard dropped focus to the page.
4. A one-question card failed to send silently.
5. Skipping into a text question lost its Undo at once.
6. The toast read "↶ Und" at 320px.
7. Long questions opened scrolled past their own start.
8. The Recommended badge failed AA on a selected row.
9. "Pick one to continue" appeared under a text box.
10. Expired-record answers sat behind a hover-only tooltip.

There were also 5 MEDIUMs in the table and 15 smaller findings beyond the cap.

**My decision:** fix the 10 HIGHs and the 5 MEDIUMs now, and leave the rest for round 12. For the copy I took Claude's suggestion: "Answer this to send" and "Pick at least {min}".

**Claude's calls while building (with reasons):**
- **The audit's fix for #5 would have broken undo.** It said "make focusing do nothing". But focusing a text field is what saved the undo step for typing, and keeping it as it was made the toast's Undo step back over an empty focus snapshot. That's a second bug the audit didn't see: Undo looked dead after a skip. Fix: the undo step moves to the **first keystroke** of a typing session. Focusing changes nothing, the toast stays, and Undo undoes the skip.
- **#7 was narrowed rather than deleted.** The row is only left out of view while the header is tall (when the question itself needs the space); short questions still scroll the focused row into view.
- **Shared code:** the failure banner is now one helper used by all three views that can send, instead of a third copy.
- **#13 has two layers:** `<bdi>` in the views, and FSI…PDI marks in label placeholders. The marks are invisible; tests strip them where they compare text.
- **An extra detail:** a focused invalid field gets a thicker danger edge, so focus stays visible in the error state.

**Verified:**
- 13 new component tests, one per fix, each named after the failure it prevents. 529 green.
- **Deliberate breaks caught 7 of 10 at first.** The three misses were weak tests, not weak fixes:
  - Send never actually got pressed by the keyboard.
  - The break I made removed only a backup guard.
  - The toast test didn't check that the toast stays inside the card. With the old CSS the toast spilled out of the card instead of being cut, which the test wasn't looking at.

  All three were rewritten; 10 of 10 now fail when their fix is undone.
- **After-renders** (`renders/after/`), the same cases as before: forced colors (focus, picks, fields), the toast at 320, long-open at 375, the footer with 8 questions at 320, yes/no failure, badge, Arabic with Latin values, the blocked-send copy, plus regular light, dark and phone.
- **A capture artifact, not a bug:** a Playwright click scrolled a chip under the header. Probing showed only Playwright's own scroll-into-view helper does this; real mouse and DOM clicks don't.
- **Size:** 20.67 KB (+600 B), under the 21 KB guard.

**Cross-check against rounds 9–10 (asked by me afterwards):**
- I asked whether round 11 undid anything from the earlier audits.
- Claude diffed what round 11 touched against the round 9–10 rules. The motion code (`motion.ts`, the compose glow, every transition and keyframe) was untouched.
- **It found one interaction:**
  - Round 11 marks a busy Send `aria-disabled` instead of `disabled`, so it keeps focus.
  - Round 10's hover rule and round 9's press rule only skipped `:disabled`.
  - So a busy "Sending…" button darkened on hover and shrank on press, as if it could be pressed.
- **Fixed:** both rules now skip `[aria-disabled="true"]` too. A test was added, and deliberately breaking the fix makes it fail.
- The first version of that test passed while testing nothing: Playwright won't hover a control it considers disabled. It now hovers before the send.

**Not verified:** real screen readers (and whether announcements survive the live region being re-attached on view swaps), a real Windows contrast theme, real iOS focus-zoom, Firefox and Safari.

**Docs:**
- DESIGN §1, §2 and §8 updated, plus a new **§9**: what broke, for whom, and the fix.
- BUILD §8.2 and the copy list, and the README token row.

**Artifacts:** `process/11-interface-audit/`: audit.md (frozen before the fixes), PLAN.md, DESIGN.md, `renders/before/` (16), `renders/after/` (15).

---

## Round 12 · Polish: the findings beyond round 11's cap (11 Oct 2026)

**Brief (mine):** finish the rest of the round 11 audit.

**Count corrected:** Claude had said 15 findings beyond the cap; the real count was 21 (10 MEDIUM, 11 LOW). Claude flagged its own miscount before starting.

**Copy, my picks.** Claude offered options with a recommendation for each, and I took all four recommendations:
1. **Limit toast:** "Up to 3 picks. Unpick one first".
2. **During the undo window:** the button keeps its label, dimmed, and says "Sending…" only once it really sends.
3. **A failed send with no reason from the app:** adds "Your answers are kept."; screen readers also hear "Try again when you're ready."
4. **The compose cue, spoken:** "Finish this in the message box".

**Found while planning (Claude):** when the app sends the answers itself, the countdown kept showing "Sending in 1s · Undo" after the window had closed, and that Undo did nothing. The before-render proves it. It's fixed with #2: the window counts as open only while it really is, and the view redraws the moment it closes.

**Claude's calls (with reasons, in DESIGN §10):**
- **Type sizes as `max(px, rem)`.** Plain rem, which the skill suggested, would shrink the card to 8.75px in apps that use the 62.5% root trick. This way the card grows with the reader's font size but never drops below the design size.
- **Unavailable Continue and Send stay focusable** (`aria-disabled`) instead of leaving the Tab order. This extends round 11's rule for busy buttons to every unavailable one.
- **Lists and numbers through `Intl`,** and the danger fill derived from the danger colour.
- **Icons:** strokes that don't scale with the icon size; tighter padding on the icon side of buttons; the Undo icon flips in RTL.
- **Layout and type:** line-height 1.4; no faked italics; tabular digits on changing counts; one leading edge in compact; review dividers inset.
- **Phones:** 24px dash targets on touch; no blue tap flash.
- **Playground:** the warm demo theme re-measured.

**Verified:**
- 9 new component tests, each named after what the user sees; 539 green.
- **Deliberate breaks caught 7 of 7 on the first try.** Round 11's lesson held: each test was written to fail for the reason it names.
- **Before and after renders** for 14 cases from one script, plus light, dark and phone.

**Size:** 21.12 KB. That's over the 21 KB guard, so Claude raised it to 22 KB, following my round 10 call to polish first and do size separately. It's flagged for me to overrule.

**A process slip, caught and fixed:** snapshotting `PLAN.md` into the round folder overwrote the frozen plan. macOS file names ignore case, so `plan.md` and `PLAN.md` are the same file. Nothing had been committed, so the plan was restored word for word as `round-plan.md`, with a note inside saying why. Rule for later rounds: never name a round file after a root doc.

**Artifacts:** `process/12-polish/` (round-plan.md frozen before the fixes, PLAN.md, DESIGN.md, `renders/before/` 14, `renders/after/` 17).

---

## Round 13 · Break: worst-case content with Jakub Krehel's `break` (11 Oct 2026)

**Brief (mine):** stress the component to see whether the UI breaks, and fix whatever adds real value.

**How it ran:**
- Claude built a scratch page, `demo/break.html`, with the real component rendered 34 times. Each instance gets one worst-case scenario on the axes whose cue matched: content length, content shape, quantity, container and state.
- The page adds only labels, widths and fixture data.
- Claude loaded it once, looked once, and marked every break under its label, so the page is the report.
- Full report: `process/13-break/report.md`.

**What broke (6 of 34; 26 survived):**
1. **A long unbreakable question label in the answered record** squeezed the answer to one character per line, out of the card. The section was 3,303px tall. Round 11's "let answers wrap" fix had exposed it: the old ellipsis used to hide it.
2. **Squeezed by a flex sibling, the card collapsed to a sliver.** A size container (`container-type`, which powers the narrow-card layouts) has no minimum width of its own.
3. **Built-in English labels on a right-to-left page** read "of 1 1" and "Trip planner Asked by".
4. **A `disabled` card** looked exactly like an enabled one.
5. **The source dot** squashed when a long source wrapped.
6. **The expired record's icon** floated mid-paragraph.

Two scenarios were observed and left alone, with reasons: an empty prompt is dropped with a warning, and stacked combining marks are abusive input.

**Claude's fixes (with reasons, in DESIGN §11):**
- A capped label column (40%) in the record.
- `min-inline-size: min(100%, 280px)` on the host: it keeps a phone's width, or its container's if that's narrower.
- `unicode-bidi: plaintext` on label text, so it takes its own direction.
- A dimmed disabled card.
- The dot and the icon sit on the first line.

**Verified:**
- 5 tests, with deliberate breaks caught 5/5. The first versions of two tests were weak, again: one checked an element that wasn't there, and one read opacity mid-fade. Both were fixed first.
- The real Arabic scenario is unchanged.
- 544 green; 21.28 KB.

**For me to try:** dark mode, browser zoom and reduced motion on `/demo/break.html`. These are viewing modes, so the page doesn't simulate them. Then tab through the instances.

**The harness stays up** (`demo/break.*`), as the skill asks. It gets deleted when I say I'm done with it.

**Artifacts:** `process/13-break/` (report.md, `renders/before/` 9, `renders/after/` 11).

---

## Round 14 · Quiet chrome, inline "Something else" (11 Oct 2026)

**Brief (mine):** a few doubts about the finished card, posted one at a time, to discuss before changing anything.

**1. "Why mix blue and black?"** The CTAs are black and the active state is blue.
- Claude explained the split (DESIGN §1: ink means "this acts", the accent means "look here"). It also pointed out what was actually wrong: blue had four jobs on one card (the source dot, my pick, the agent's Recommended badge, focus). A blue badge next to a blue pick blurred "what I chose" with "what the agent suggests".
- **I showed a shadcn questionnaire** (monochrome, a soft halo focus ring). Claude prototyped a monochrome card (the accent defaulting to ink) and a halo ring in ink and in grey. It injected the CSS into the live component, so `src/` wasn't touched, and rendered light, dark and 375px side by side.
- **My call: keep the blue.** It conveys "your pick / where you are" better than grey or black. The board is kept for the record in `design/explorations/01-focus-and-colour/`.
- **My call: the badge and the "Asked by" dot turn grey. The user's decision should be the loudest thing on the card.** That's now a principle at the top of DESIGN §1.

**2. Claude's own card** (a screen recording on my desktop; Claude pulled 44 frames out of it with headless Chrome, since there's no ffmpeg here). I wanted two things from it:
- **"Something else" turns into the input in the same row,** and the other options fade. Ours opened a second box below the row.
- **The checkbox looked too big.** It was 26px, the size of the number-key slot. Claude found no reason for it beyond that.

**Claude's picks for the details (I said go ahead with them):**
- Fade the other options **only on single**, and only once there's text. On multi, the text is added to the ticks, so a fade would say they don't count when they do.
- **Fade = ink to muted.** Nothing turns see-through: opacity already means disabled, and Claude's own fade is under 2:1 on options you can still click.
- **No send arrow inside the row:** Claude's single questions have no footer; ours do, and two send buttons would compete.
- The field stays a DOM sibling of the radio, drawn over the row's label area. That respects round 8's `nested-interactive` reason. Keyboard and ARIA are unchanged.
- Multi's "Something else" gets a checkbox like its neighbours; it's where a click unticks it.
- The placeholder defaults to the label. A 16px checkbox, centred in the 26px slot so the labels keep one edge.
- Also fixed: divider stubs at the corners of a keyboard-focused row. Claude spotted them in its own prototype screenshots.

**Verified:**
- 8 new component tests. 10 deliberate breaks, caught 10/10: a blue badge, a blue dot, a fade on multi, a fade by opacity, a fade while still empty, the field dropping below the row, a 26px box, an off-centre box, the stub, an empty placeholder.
- One existing test changed on purpose: unticking a multi "Something else" is now a click on its checkbox, because the text area types.
- 552 green, 100% lines. 21.5 KB (+0.22 KB).

**Not in this round:** the all-at-once flow's "Something else" chip still opens a field under the chips. Other details from Claude's card (no footer on single, Skip inside the Other row, "0 selected", a fade between steps) were noted, not asked for.

**Artifacts:** `process/14-quiet-and-inline/` (round-plan.md frozen before the changes, PLAN.md, DESIGN.md, `reference/` 3, `renders/before/` 8, `renders/after/` 8). `design/explorations/01-focus-and-colour/`.

**Follow-up: a bug I found in round 14's own change.** Unticking "Something else" with the mouse left a blue ring on it, with divider stubs at its corners.
- **Claude's diagnosis, two causes:**
  1. The ring was drawn with `:focus-within`, which also matches when the row itself has focus. That's what a click on its checkbox gives it, so a mouse user got a keyboard-only ring.
  2. The new divider selector for the wrapped row outweighed every rule that hides dividers next to a lit row. Hover, on the row or the row above it, and the "Decide for me" row below it all leaked stubs, not just focus.
- **Fix:**
  - The divider's show rule moved inside `:where()`, which gives it zero specificity, so any hide rule wins.
  - The hover rules now know about the wrapper.
  - The ring shows only while the field's input has focus.
- **Verified:** 3 tests reproduced it first (2 failed before the fix). 5 deliberate breaks, caught 5/5. Renders in `process/14-quiet-and-inline/renders/followup/`.
- **The lesson** (it's round 13's beat again): wrapping one row changed how heavy its selectors were, and the screenshots I checked (typing, keyboard focus) were exactly the states where the old rules still happened to win. Mouse hover and untick weren't in the render set; they are now.

---

## Round 15 · Checkbox motion, with Emil Kowalski's animation skills (11 Oct 2026)

**Brief (mine):** Claude's checkbox seemed to animate a little on click, which gave it a feel; ours looked plain. Should we animate? Then: yes, but adhere to Emil Kowalski's skills (emilkowal.ski/skill). The right animation, at the right level, only where it makes sense.

**What the recording actually showed:**
- Claude went through it at 60fps, one frame every 16ms, and measured the blue pixels in each frame. **Claude's checkbox doesn't animate:** it's fully checked in one frame.
- The "feel" was the **screen recorder's click circle** (macOS "show mouse clicks").
- I still wanted motion; the skills decide how much.

**How it was built:** with Emil's `animate` skill (repo `emilkowalski/skill` at `e8a175d`), then checked with his `review-animations` skill. The decisions, in the skill's order (full table in `process/15-checkbox-motion/round-plan.md`):
- **Gate:** frequent toggles are "near-imperceptible only". **Keyboard toggles are a disqualifier,** so Space and the number keys stay instant.
- **Purpose:** feedback (a press) and state indication (the tick).
- **Ingredients:**
  - CSS transitions.
  - The press: `transform: scale(.95)` at our 160ms.
  - The tick: revealed left to right by `clip-path`, in 120ms (0.75×), starting from the stroke's edge.
  - Our existing ease-out token.
  - Unticking: instant.
  - Reduced motion: no press, and the tick fades.
- **Turned down:** animating the single-choice key (single moves on at 120ms), a fading row fill (round 9's reason), a bounce, a tick wipe on the all-flow chips, an animated uncheck.
- **Self-review against the skill's 10 standards: approve.** One note: the press is symmetric, as in the skill's own button recipe. The asymmetric-timing rule is for hold interactions, and the tick itself is asymmetric (in 120ms, out instantly).

**Verified:**
- 5 component tests, using the browser's DevTools protocol to hold a real mouse press and to emulate reduced motion. 7 deliberate breaks, caught 7/7:
  - a keyboard toggle that animates
  - an animated untick
  - a press that's too deep
  - no press at all
  - an off-token duration
  - no fade under reduced motion
  - motion that ignores reduced motion
- Measured: the box is 16 → 15.2px while held, and stays 16px under reduced motion.
- Filmstrips with the clock slowed 10× (before/after; light, dark, reduced motion, and keyboard): `process/15-checkbox-motion/renders/`, made with `strip.mjs` in the same folder.
- 560 green; 21.59 KB.

**For me to feel-check** (the skill says feel can't be settled from code): click a few checkboxes in `pnpm dev` at normal speed, then with DevTools' animation panel at 10%, and again tomorrow with fresh eyes.

**Artifacts:** `process/15-checkbox-motion/` (round-plan.md frozen before the change, PLAN.md, DESIGN.md, strip.mjs, `renders/before/` 3, `renders/after/` 3).

---

## Round 16 · Re-checking the skill audits after rounds 14–15 (11 Oct 2026)

**Brief (mine):** I'd evaluated the design with several skills (emil-design-eng, animate and others). Do they still hold after the latest commits?

**How it ran (Claude):**
- A read-only audit of the `159efe3..HEAD` diff (two files) against Emil Kowalski's skills, from his repo at `e8a175d`.
- Jakub Krehel's better-interface and break aren't on this machine, so rounds 11 and 13 were re-checked against their frozen reports, plus the 34-case break page.
- A probe: does the tick replay when a step is re-drawn? It doesn't, on Back, reopen or Edit.
- A stress page for the new states, with a forced-colors pass: `process/16-skill-recheck/stress.html`.
- The report was frozen before any fix: `process/16-skill-recheck/audit.md`.

**Held:** animate and review-animations (round 15), emil-design-eng's checklist (round 10), find-animation-opportunities (round 9), the round 10 craft fixes, and every round 11 interface fix except one.

**Found, both round-14 side effects:**
- **F1 (MED, a regression of round 11 #1):** in Windows contrast themes, an open "Something else" had no edge unless focused, and on single nothing marked it as the pick.
- **F2 (LOW-MED):** a long custom label was cut mid-word once it became the placeholder.

**My call:** fix both, F2 with option (a), which keeps the label readable while the field is empty.

**How (a) was built (Claude's call, with the reason):**
- An `<input>` always centres its text vertically, so a caret can't sit on a wrapped label's first line.
- BUILD §8.2 had specified a growing `<textarea>` for "Something else" all along; the build had drifted to an input. Going back to the spec does (a) exactly: the placeholder wraps in full, the caret sits on line one, and it hides on the first keystroke.
- Bonus: a long typed answer now wraps and grows the row instead of scrolling out of sight.
- Row and field now share one grid cell, so the taller of the two sets the height. The row's label leaves the layout while the field is open; the row keeps its name through `aria-label`. Enter never adds a line.
- F1: a 1px `CanvasText` edge on the open row, the existing 2px `Highlight` while focused.

**Caught on the way:** the first render showed the field invisible. The row is positioned, so it painted over the static field. A long URL also pushed the field past the card. Both were fixed before anything was committed. A test now checks that the textarea is the topmost element at its own centre, since a layout check alone passed while it was hidden.

**Verified:**
- 5 new tests, plus the paint check. 8 deliberate breaks, caught 8/8. Two needed sharper tests first: an unbreakable string, and the axe suite for the row's name.
- Typical scenarios look the same as after round 14 (light, dark, 375px).
- 565 green; 21.68 KB (+0.09 KB).

**Artifacts:** `process/16-skill-recheck/` (audit.md frozen before the fixes, stress.html and stress-shot.mjs, `renders/before/` 2, `renders/after/` 2 plus `typical/` 8).

---

## Round 17 · The pick limit becomes a quiet notice (11 Oct 2026)

**Brief (mine):** should messages like "Up to 2 picks. Unpick one first" be a different colour than black? They're warnings, right? Insights first, no change.

**Claude's reading:**
- It isn't an error or a warning. A reasonable tap was refused, with how to swap.
- **Orange would be wrong:** it scolds, and it dilutes the colour kept for real failures. There's no amber token, and the message isn't a warning anyway.
- **Black was off too:** the ink fill means "this acts", and this toast has nothing to press. Beside Continue it made two black slabs, louder than my own picks, which breaks my round-14 principle.

**Options given:** (A) a quiet notice, recommended; (B) prevent instead of refuse (grey out the unpicked rows); (C) keep it; (D) orange.

**A correction, caught by my question:** Claude had said round 9 "already turned down shaking the row". It hadn't. Round 9 rejected a shake for a *missing required answer*. A shake for the limit was never evaluated. Claude said so, and gave the reasons it would likely be rejected now (it moves what you act on next; number keys make it keyboard-triggered). It's logged in DESIGN §13 as decided in round 17.

**My call: proceed with A** (Claude's recommendation):
- The limit message is ink text (500, no fill) on the card's 20px edge, where the count sits.
- The black fill stays only on toasts with Undo.
- It fades in and out, without the 4px rise.
- Same timer, pauses, live region and wording; `part="toast notice"`.

**Verified:**
- 3 tests. 6 deliberate breaks, caught 6/6: black again, muted instead of ink, off the edge, the Undo toast losing its fill, rising in, sinking out.
- Renders in light, dark, 375px and the all-at-once flow; the Undo toast is unchanged.
- 568 green; 21.73 KB.

**Artifacts:** `process/17-limit-notice/` (round-plan.md frozen before the change, PLAN.md, DESIGN.md, `renders/before/` 4, `renders/after/` 5).

---

## Round 18 · The stuck header lost its top padding (11 Oct 2026)

**Brief (mine):** on long content, scrolling moved the top so it looked like there was no padding at all. Congested.

**Claude's diagnosis (measured, not guessed):**
- Unscrolled, the sticky header's own box started 15px below the card's top. Scrolled, "Asked by" sat 1px from the edge.
- The source line's 14px top margin was **collapsing through** the header (CSS margin collapse: a first child's top margin can escape its parent), so it lived outside the sticky box. When the box stuck, the margin was left behind.
- It happens only when the header sticks: on a phone the long header counts as "tall" and scrolls away (round 7).
- The same bug was visible in the all-at-once flow (my round-17 screenshot) and in review, since every view shares the header.

**Fix (Claude's call):** `display: flow-root` on the header, so child margins stay inside it. One line, and the stuck header now matches the unscrolled one (15px either way).

**Verified:**
- A test scrolls a card whose header sticks and checks the gap doesn't change. It fails without the fix.
- Before/after renders scrolled 200px: light, dark, all at once, 375px.
- 569 green.

**Artifacts:** `process/18-sticky-header/` (scrolled.mjs, `renders/before/` 4, `renders/after/` 4).

---

## Round 19 · Space between filled rows (11 Oct 2026)

**Brief (mine):** when several rows are filled at once they look like they overlap: two picks, a pick next to a hovered row, and skipped rows on review. Should there be space between them?

**Exploration (Claude):** `design/explorations/02-row-spacing/`. CSS injected into the live component, compared side by side in light, dark and 375px:
- **Gap:** each fill is drawn 2px inside its row.
- **Merge:** filled neighbours join into one block.

Claude recommended Gap: one rule for every case, each answer stays its own object, and no layout change. Merge only joins rows in the same state, and on review it made two skipped questions read as one item.

**My call: Gap.**

**Built:**
- A 2px transparent block border on option and review rows, with the fill clipped to the padding box and 2px less padding. Rows keep their exact heights.
- The radius `8px / 10px` keeps the clipped fill's corners round.
- Dividers moved onto the row boundary.

**Caught while building (Claude):**
- **Contrast themes paint transparent borders** (round 11's focus-ring trick relies on it), so every row would have been lined. The inset is off there, with the padding back.
- **The `background` shorthand on selected and hover rows reset `background-clip`,** so picks still painted into the gap. The first renders looked right only because a keyboard focus ring sat on the row. A test measuring the fill's box caught it. Row states now set `background-color`. Re-rendered with the mouse only, so no ring hides anything.
- One break slipped past at first: giving the padding back can't be seen on 52px rows. A test with a described row now catches it.
- **A process slip:** the first commit went in without these docs (a script error), with a stale DESIGN snapshot in `process/19-row-gap/`. It was amended before pushing, so the round's snapshot matches.

**Verified:**
- 5 tests. 7 deliberate breaks, caught 7/7.
- Contrast themes and compact density checked on round 16's stress page.
- 574 green; 21.82 KB.

**Artifacts:** `process/19-row-gap/` (round-plan.md, PLAN.md, DESIGN.md, `renders/before/` 8, `renders/after/` 8), `design/explorations/02-row-spacing/`.

---

## Round 20 · Hover and the arrow stay in sync (11 Oct 2026)

**Brief (mine):** Emil Kowalski's "7 practical animation tips", section 6 (*Keep your animations fast*), has a note about select and hover states. Make sure ours follows it: when I hover rapidly, the arrow and the fill should show up in sync.

**Claude's check:**
- The article's rule: hover seen tens of times a day should be instant.
- Our CSS has no transition on a row's fill or arrow (round 9 already decided hover is instant).
- Verified in a real browser, not just in the code: the mouse stepped across the rows one frame at a time. The hovered row's fill and arrow switch in the same frame, with zero animations running.

**Found:** a lone arrow. The card focuses a row when it opens. With a mouse, its focus ring is hidden (rings are for the keyboard), but its arrow wasn't, so an arrow stayed on a row the mouse had left. That's the out-of-sync I'd noticed.

**Fix (Claude's call):**
- The arrow only shows with its partner: the fill under a mouse, the ring for the keyboard.
- Kept on purpose: after keyboard use there are two arrows, each with its own partner (ring + arrow, fill + arrow). Hiding the keyboard one while the mouse is over the list would take it away from keyboard users whose mouse rests on the card.

**Verified:**
- 3 tests: rapid hover with fill and arrow together in the same frame and nothing animating; no lone arrow with a mouse; keyboard keeps ring + arrow.
- 3 deliberate breaks, caught 3/3: the lone arrow, a fading fill that lags the arrow, the keyboard losing its arrow. One break first missed its target (a wrong anchor string) and was redone, so that pass doesn't count as evidence.
- Frame strips before/after, light and dark (`hover-frames.mjs`).
- 577 green.

**Artifacts:** `process/20-hover-sync/` (hover-frames.mjs, `renders/before/` 1, `renders/after/` 2).

---

## Round 21 · Navigation in the footer, dashes that say more (11 Oct 2026)

**Brief (mine):** a suggestion I'd got: the progress dashes are barely usable (bigger targets); should "2 of 4" move to the footer; Back at the top or the bottom? Insights first, no change.

**How it went:**
1. **Claude's pros and cons:**
   - Keep the count in the header: the footer's left is the status slot, and a toast would hide the count.
   - Move Back to the bottom-left: it fixes a ~38px title jump between steps and groups the "go back" controls.
   - Give the dashes 24px targets and a hover cue, not pills.
2. **A second session (no codebase) pushed back.** Claude checked each point against the code and measurements:
   - "Make skipped steps clickable": already true.
   - "Encode state in the dashes": right, and it exposed a gap. Dashes were coloured by position, so the current step looked answered and answered later steps looked unvisited after going back.
   - "Reserve Back's slot": yes, as a dimmed, focusable Back.
   - "Footer stability": the concern was right, but the fix is Back's position, not a min-height.
   - The tooltip: not now.
3. **Its final proposal:** a Claude-style "‹ 2 of 4 ›" pager in the header, dropping the dashes. Claude turned it down with a measurement. The premise "the card is top-anchored" is wrong: it's bottom-anchored, so the header is the edge that moves. Back at the top went 586 → 581 → 743px across steps while the footer stayed at 903. Claude's own card moves the same way in my recording. Two parts also went beyond layout: the component isn't capped at 4 questions, and "review only if skipped" would reopen a round-4 decision.

**My call:** go ahead with Claude's plan.

**Built:**
- Back at the footer's start (dimmed on step 1, focusable; outside the toast slot; review too). The header has no Back, so the title keeps one edge.
- Pressing Back with the button keeps focus on Back, so repeated Enter goes back and never picks. The ← key still lands on the options.
- Dashes by status (current, answered, skipped, not reached), 24×24 targets 24px apart on every pointer, and an instant hover cue.

**Caught on the way:**
- **At 320px**, once the buttons wrapped, the footer's `space-between` pushed the dashes away from Back. Now `flex-start`.
- **Round 17's notice test failed on purpose:** the notice no longer starts on the 20px edge (Back does). It now starts where the dashes do. The test and DESIGN §13 were updated.
- Two first test failures were artifacts (measured mid-slide; the test runner refusing to click an `aria-disabled` control), not bugs.

**Added in the same round (my request, from a screenshot of Claude's card):** on hover, the number key should change subtly. Ours didn't: `key-bg` (#f0f0f0) was 2% from the hover fill (#f5f5f5), so the key faded into a hovered row.
- Claude's call: one step toward ink (`color-mix(key-bg 92%, fg)` → #dfdfdf light, #3b3b3b dark) and the number in ink (12.8 · 9.6:1). The mix comes from the tokens, so a theme's key follows. Mouse only and instant, like the fill. It also applies to the "Something else" and Decide-for-me icons.
- Left out on purpose: picked rows (they keep the accent key), checkboxes, disabled rows, and keyboard focus. The key goes with the fill, as the arrow does (round 20).
- 2 tests in `hover-sync.test.ts`. 3 deliberate breaks (no rule, number left grey, applied to every row), caught 3/3. Renders: `process/21b-key-hover/renders/` (before and after: light, dark, "Something else", phone). It has its own folder because `21-footer-nav/` was already committed.

**Also added (my request):** once "Something else" was picked, its pencil key (#f0f0f0) was a touch lighter than the picked row (#ececec).
- Claude's call: a picked row's plain keys (the pencil, and Decide for me, which had the same issue) take the row's fill, `--clarify-selected`, so no square sits on the pick. Dark had it the other way round (#2c2c2c on #303030), and this fixes that too. Numbered keys keep the accent.
- Computed colours match in all four cases (light/dark × "Something else"/Decide for me). 2 tests in `hover-sync.test.ts`; removing the rule fails both. Renders: `process/21c-picked-key/renders/` (before and after: light, dark, phone).

**Two more findings, both fixed (my request):**
- **The pencil stayed grey while "Something else" was active** (I spotted it). The quiet rows (`.quiet`) turn their label from grey to ink once picked, but the icon had no matching rule: the label read #1c1c1c and the pencil #666 in every state (open and empty, typing, blurred with text). Decide for me had the same split. Claude's call: the picked plain key's icon takes `fg`, so the row reads as picked in one colour. Not the accent fill the numbered keys get: the open field already has the blue focus ring, and a quiet row shows its pick by fill and ink (round 14: blue is for picks and focus, and once is enough).
- **A pressed Decide for me lost its fill under the mouse** (Claude flagged it from the CSS, I asked to check it; confirmed in the browser). On text questions Decide for me is a toggle button (`aria-pressed`), and the hover fill and hover key skipped only `aria-checked` rows. Hovering a pressed one showed the lighter hover fill (#f5f5f5 under #ececec · #292929 under #303030) with a dark key square, so it looked unpicked. Both hover rules now skip `aria-pressed` too.
- Measured before and after in light and dark across 7 states (rest, open, typing, blurred, after Back, pressed and hovered, mouse away): all now match the fill, with the icon ink with the label. 1 new test and 2 extended in `hover-sync.test.ts`. 3 deliberate breaks (icon left grey, hover fill on pressed rows, hover key on pressed rows), caught 3/3. Renders: `process/21d-quiet-row-ink/renders/` (before and after: "Something else" while typing in light, dark and phone; pressed Decide for me under the mouse in light and dark).

**The pencil, second pass (I chose B):** after the ink change I still couldn't see a difference. In my screenshot the pencil had gone from #666 to #1c1c1c, but a 14px stroke darkening beside a grey placeholder doesn't read as "active", so Claude's first call was too quiet.
- Claude rendered three options in light and dark (`design/explorations/03-active-pencil/compare.png`): **A** ink icon (what shipped), **B** the accent-filled key every other picked option gets, **C** an accent icon with no fill (reads like a link). Claude recommended B: typing in "Something else" *is* picking it, so it should look like its neighbours do when picked. The earlier worry, two blues with the focus ring, didn't hold up once they were seen together. **I chose B.**
- Applied by dropping the `:not(.plain)` exception: one rule now fills every picked key, checked or pressed, so Decide for me fills too. The forced-colors rule got the same change, so a picked plain key shows `Highlight` there, where before it had no high-contrast signal at all.
- Tests: the 3 picked-key tests now expect the accent fill, measured against the theme's own accent. Putting `:not(.plain)` back fails all 3. Renders: `process/21e-pencil-filled/renders/after/` ("Something else" open and typing in light, dark, phone and RTL; pressed Decide for me under the mouse in light and dark; forced colors). The "before" is `21d-quiet-row-ink/renders/after/`.

**Verified:**
- 8 tests. 7 deliberate breaks, caught 7/7.
- Renders: step 1 and 2, after jumping back, skipped, review, dash hover, dark, 375, 320, RTL.
- 590 green (with the key hover, picked keys, quiet-row ink and the filled pencil); **21.93 KB, close to the 22 KB guard** (the size round is still Mari's to schedule).

**Artifacts:** `process/21-footer-nav/` (round-plan.md frozen before the change, PLAN.md, DESIGN.md, `renders/before/` 8, `renders/after/` 10).

---

## Round 22 · Size (12 Oct 2026)

**Brief (mine):** I want this to feel light, so nobody thinks twice about installing it. Is an npm package the right way to ship it, or is there something better? What can be optimised without breaking any feature or styling? Is the current size OK for a component like this, and what's a fair benchmark? Plan first, no changes.

**How Claude worked:** it measured first, then ran three read-only agents in parallel, each in a throwaway copy of the repo: a JS byte audit, a CSS byte audit, and a benchmark of 25 comparable packages built with our own Vite settings. Every proposed saving was applied and measured, not estimated. Plan frozen before any change: `process/22-size/round-plan.md`. Peer sizes: `process/22-size/benchmarks.md`.

**What it found:**
- **Already lean.** Zero dependencies, fully minified JS and CSS, no dead code, no unused selectors. Gzip already absorbs repetition: the dark tokens are written twice and that costs 56 B.
- **21.9 KB sits with the mid-weight widgets** (cmdk 16.4, Shoelace's dialog 17.1 + 4.1 CSS, tom-select 17.6 + 2.0, vaul 20.6, choices.js 20.7 + 2.3). It's 2–4× the "small and polished" references (sonner 9.3, Lit 5.9), and far below the chat kits it would sit beside (chatscope 39 + 6, deep-chat 105, CopilotKit ~800).
- **Every safe change adds up to ~0.6 KB.** 12 KB would mean cutting features. That target was set in M1, before rounds 9–21 added motion, accessibility fixes and polish.
- **"Heavy" is judged from two numbers browsers never download:** npm's "Unpacked Size" (380 KB, of which 245 KB was source maps), and the page-load cost (the card only appears when an agent asks, so it can load on first use).
- **npm is the right channel.** It feeds jsDelivr, unpkg and esm.sh for free.

**I asked what "optional features" would mean** (they're optional to use today). Claude: optional to use, but always downloaded, since one file holds every view. Making them optional to download means opt-in imports (breaks zero-config) or chunks fetched when the card opens (a visible delay at the worst moment, async rendering, ~3 KB saved and only for some apps). Loading the whole component on first use gets a better result for everyone.

**My decisions:**
1. **The target is about 21 KB, guarded tightly**, instead of 12 KB.
2. Packaging: take the recommendation.
3. **Numeric action types: yes.** I mostly code with agents, so readable strings in the debugger matter less than the bytes.
4. Fix the bug the audit found.

**What changed:**
- **The "Something else" field is 16px on touch again** (a bug, found by the CSS audit). Its `font: inherit` (specificity 0,1,1) had outranked round 11's touch rule (0,0,1) since round 16, so iOS zoomed the page on focus. The touch rule now names the field. New `touch-fields.test.ts` emulates touch through Chrome's DevTools protocol and checks every field is ≥ 16px. It failed (14px) before the fix.
- **The npm package ships no source maps:** 115 → 43.5 KB packed, 380 → 133 KB unpacked. They still build locally.
- **The README** shows loading on first use (`await import(...)` inside the function that asks), with a note on preloading when the chat opens, and pinning a version on a CDN.
- **Build settings:** lightningcss no longer adds light/dark toggles we never use (−30 B), and the minifier treats property reads as side-effect free (−28 B; never write a bare `el.offsetWidth;` to force a reflow, the comment says why).
- **Private CSS tokens get one-letter names at build time** (`scripts/short-tokens.ts`, −119 B). The source keeps the readable names; public `--clarify-*` names never change. The three the TypeScript reads keep theirs, and a unit test fails if the code starts reading another.
- **Duplicate CSS rules merged** (−92 B): option and review rows share the fill inset and dividers, plus focus rings, foot rules and the reduced-motion blocks. Comments moved to follow their rules.
- **Action types are named numeric constants** (`src/model/act.ts`, −323 B). The `Action` type uses `typeof Act.X`, so the compiler still checks every action is handled. The test table stays keyed by name, so test titles read "SELECT in hidden", not "2 in hidden".
- **The budget:** `size-limit` guards the core at **21.5 KB gzip** and adds a **19.2 KB brotli** line. BUILD §0 and §11, README and DESIGN §18 are updated.

**Turned down (Claude's calls):**
- Stripping `/* @__PURE__ */` from the output (−40 B). The JS audit said they do nothing for apps. They do: they let an app's bundler drop `ask()` when it isn't used.
- Dropping the developer warnings in production (−202 B): developers would lose documented warnings.
- Mangling state field names (−155 B): it changes the public `snapshot`.
- Native `light-dark()`: it drops Safari 16.4–17.4.
- Lazy chunks per feature (see above).

**Found along the way: a check that checked nothing.** While proving the new token test could fail, Claude found that the unit tests receive the stylesheet as an **empty string**: Vitest swaps CSS for "" unless told otherwise. So the RTL guard ("a test fails if `left`/`right` creep in", BUILD §8.1) had been passing on nothing since M2. Its self-test only checked the regex, never the file. Run by hand on the real CSS it found 0 physical properties, so the promise held in practice. The unit project now loads the CSS, and a new first test fails if the stylesheet is ever empty again.

**Verified:**
- `pnpm check`: **597 green**, 100% lines.
- Deliberate breaks, caught 5/5: two tokens sharing a short name, a JS-read token missing from the keep list, an injected `margin-left`, two actions sharing a number, and the 14px bug itself.
- **CSS changes are pixel-identical.** Every computed style and element box was dumped on all 34 break-page scenarios: light, dark, forced colours, reduced motion, 375px touch, 60 Tab steps, 6 arrow steps and 40 hovers (137 snapshots). Before vs after: 0 differences. The tool is now `scripts/style-dump.mjs` for future rounds. A 1px change, injected to prove the tool can see one, showed up as 336. This also stands in for re-running the skill checks after option-row changes: nothing they judged can have moved.
- Renders: `process/22-size/renders/` (step 1 in light, dark and phone; "Something else" typed on a touch phone at 16px; a multi with two picks).

**Numbers** (core + shared chunk):

| | Minified | Gzip | Brotli |
|---|---|---|---|
| Before | 73.1 KB | 21.93 KB | 19.44 KB |
| After | 70.6 KB | **21.37 KB** | **19.09 KB** |

The converters are unchanged (1.18 and 1.15 KB).

**Artifacts:** `process/22-size/` (round-plan.md and benchmarks.md frozen before the change, PLAN.md, DESIGN.md, renders/).

---

## Round 23 · Pre-release review and simplify (12 Oct 2026)

**Brief (mine):** I'm done with the changes. What are the next steps to publish? Push the commits, make the repo public, publish to npm. Do everything up to the final publishing step, after a code review and a simplify pass. Plan first.

**The plan (Claude's), which I took as recommended:** review → simplify → release prep → this round → push → (stop) repo public → (stop) npm publish → check it's live. Version **0.1.0**, not 1.0.0: the VoiceOver and real-phone passes and Svelte are still open, and 0.x lets the API move in minors while real users report. Ship with those three listed as known gaps. Keep the commit email as it is (rewriting history would change every hash the journal cites). Hosting the playground on GitHub Pages is a separate follow-up.

**How Claude worked:** four read-only reviewers in parallel, one per area (model and converters; element, composer and `ask()`; views; styles and packaging), on everything that ships rather than a diff, since this is the first public release. Each finding was reproduced (Vitest or Playwright probes, and a scratch project that installed the packed tarball) and then spot-checked against the code. The review was frozen before any fix: `process/23-release/review.md`. No P0, and no HTML injection anywhere: all model text goes in as text.

**What it found (44, of which 9 were P1)**, the ones users would have hit first:
- **Types turned into `any`** for every app on TypeScript's `node16`/`nodenext` setting: the shipped `.d.ts` files imported without `.js` extensions. With `skipLibCheck` this failed silently.
- **The README's own React line broke the build:** `import '…/jsx'` pointed at a types-only export.
- **Three README recipes were broken:** load on first use lost properties set before the code arrived; `ask()` + transcript dropped focus to `<body>` after Send; and `ask()` waited forever if the model sent no usable questions.
- **React controlled composers:** a sent reply came back on the next render (the card wrote past React's value tracker).
- **Safari with a Japanese or Chinese keyboard:** the Enter that confirms a word also moved to the next question.
- **A multi-select could go over `max`** through "Something else", and focus fell to `<body>` after Undo on the "Sending in…" bar.

**What I decided:** fix all P1 and P2 except long MCP lists (documented instead: a real fix means a new way to choose from long lists, outside the scope lock), the cheap P3s, docs for jsdom and BUILD §6.1, and leave Vue/Preact typings for v1.1.

**What changed** (three commits):
- **Packaging:** `.js` extensions in every relative import; `/jsx` has an empty runtime file; source maps stay local, with no `sourceMappingURL` comment pointing at a missing file; `VERSION` is 0.1.0 and a test ties it to `package.json`; `prepublishOnly` runs `pnpm check`; **`publint` and `attw` (Are the Types Wrong) run in `pnpm check` against the packed package**, so the types bug can't come back; repository, homepage and bugs links; README links absolute (relative ones are dead on npmjs.com), the CDN example pinned, `--clarify-accent-soft` documented as what it really is (the pill dot's halo).
- **Model:** an open "Something else" holds a pick slot even before it has text (the "n of max" count agrees); dashes never jump past a step the user hasn't settled; `__proto__`, `__other` and `__delegate` are reserved ids; the MCP converter keeps fields with a blank title, leaves out values the schema would reject and checks required fields as own keys; both converters tolerate malformed input; a label override with a non-string plural form is ignored instead of crashing later.
- **Element, composer, `ask()`, views:** properties set before the upgrade are kept; a card opened before it's on the page takes focus once it is; an update in place that removes the focused control puts focus back in the card; IME and held keys are ignored; a stream that ends with nothing usable goes hidden; one countdown timer that stops with the window; the live region is never re-inserted; the composer is looked up again if it mounts later, and a bad selector doesn't throw; composer writes go through `setRangeText` (BUILD §7 said so all along); compose into a `contenteditable` inserts a text node and keeps rich text; no empty placeholder is left behind; an old record never undocks the live card; the pill updates while questions stream in; a pick-limit notice hit again while fading comes back; the all-at-once "Something else" is the growing textarea BUILD §8.2 specified (round 16 had fixed only the step view).
- **Docs:** `ask()` rejects only when nothing can be shown; `clarify:revise` after `ask()`; MCP limits; jsdom.

**Simplify** (four parallel cleanup reviews: reuse, simplification, efficiency, altitude). It caught **a regression in one of the fixes**: the "bring the notice back" code ran on every render, so it could cut a normal fade short, and in its first new home it also cancelled a new toast's fade-in, which an old motion test caught. It now runs once, when a new toast arrives, and cancels only the fade-out. The rest made the fixes smaller: `reach()` already implies "settled", `ask()` needed no guard of its own, dead timer clears, shared helpers, the reserved ids in one place. Turned down: two items that would change behaviour.

**Size (my call):** the fixes cost **0.41 KB** (21.37 → 21.78 KB gzip, 19.09 → 19.46 brotli). Simplify saved bytes before compression and almost nothing after, and round 22 had already taken every safe saving. I raised the guards to **21.9 / 19.6 KB**, keeping round 22's tight margin, rather than drop fixes for real bugs. The README's "about 21 KB" still holds.

**Verified:**
- `pnpm check`: **626 green**, 100% lines; publint "All good"; attw green for `node16` and `bundler` on every entry.
- **Every new test failed before its fix:** 9 unit and 21 component tests, including a real React 19 controlled textarea.
- Deliberate breaks: an extensionless import in the built types (attw: "Internal resolution error"), and `VERSION` out of step with `package.json`.
- A scratch app installed the packed tarball: types match under `nodenext` and `bundler` (only the four lines written to fail do), a Vite app importing `/jsx` builds, and the server import works in Node 22.
- **Firefox and WebKit** (Playwright) grow "Something else" from one line to two in both views, like Chrome: `field-sizing` is supported everywhere now, so finding #44 needed no change.
- `style-dump`: 0 differences across 137 snapshots outside the one field that changed on purpose.
- Renders: `process/23-release/shots/` (step 1 in light, dark and phone; the all-at-once "Something else" wrapping on a phone; a multi with "Something else" ticked).

**Released (my go-ahead):** I made the repo public and published **`@marigameo/agent-clarifier@0.1.0`** to npm, then tagged `v0.1.0` with a GitHub release that lists the known gaps.
- **The dry run found one more thing:** `npm publish --dry-run` sets a "dry run" flag that the new `attw` check's own `npm pack` also obeyed, so no tarball was written for it to inspect. Fixed before publishing.
- **2FA:** my npm 2FA is a passkey in iCloud Keychain, so there's no 6-digit code. npm only offers the browser step to an interactive terminal, so Claude ran the publish under a pseudo-terminal (`script`) with `--auth-type=web --browser=false`. The approval link expires after about 5 minutes; the first one ran out.
- **Checked live:** the tarball on npm is byte-for-byte the one tested (same shasum). It installs from npm and imports in Node, it's served by jsDelivr and unpkg, and the README's opening example, loaded from jsDelivr in Chrome, renders the card and resolves `ask()` with the answer.

**Artifacts:** `process/23-release/` (review.md frozen before the fixes, PLAN.md, DESIGN.md, shots/).

---

## Story notes (to use later)

- The arc: **borrow the feel, not the pixels** → research → plan → board → feedback → draft mode → **simplify** (cut a mode, a link and a strip) → **scope lock** (said no to branching) → build plan → build.
- Good before/after pairs: the v1 first render vs after the review fixes (the checkbox and radio fix is a small, clear example).
- Round 2 → 3 is a good "less is more" beat: draft mode got simpler when I asked what each control was for.
- The renders in each round are ready to use as story images.
- Round 5 is the "measure, don't assume" beat: writing a reason for every token showed that the default grey failed the contrast the plan promised. It was caught on paper, before any code.
- M1's "100% coverage, still weak tests" beat: deliberately breaking the code found two boundary blind spots that coverage couldn't see.
- Skip vs Decide for me is a good small example of meaning over features: same outcome for the agent, different intent from the user, so a different reply.
- Round 9 is the "restraint" beat: a motion audit whose output is mostly *no*. Five ideas turned down with reasons, four small changes taken. And the slowed-clock filmstrip caught a bug (the pill drawn as an oval) that no test was looking for.
- Round 10 is the "invisible care" beat: none of its six changes is something a user would point at (a hover that answers, a toast that waits for you in another tab, a shimmer that doesn't stutter while streaming). That's the point. Good pairing with round 9's restraint: one round says no to motion, the next says yes to feedback.
- Round 11 is the "who did we leave out" beat: polish rounds made it feel good; this one found who it failed (Windows contrast themes, keyboard, 320px phones, Arabic, screen readers), with a before/after render for each. Two sub-beats: the audit's own suggested fix (#5) would have broken undo, so judgment over checklists; and 3 of 10 tests passed while testing nothing until a deliberate break exposed them.
- Round 12's small beat: a status that lies is worse than no status. "Sending in 1s · Undo" stayed on screen after Undo had stopped working; the fix was to make every status match reality (the button too).
- Round 13 is the "fixes have side effects" beat: the worst break the stress page found (an answer squeezed to one character per line) was created by round 11's own fix (answers wrap instead of truncating). Audits judge rules; a stress page shows what the content does to them.
- Round 14 is the "try it, then keep what you had" beat: a monochrome redesign was prototyped and rendered side by side, and I kept the blue. The experiment still paid off by naming the real problem: blue had four jobs, and only one of them was mine. "The user's decision is the loudest thing on the card" came out of saying no to the bigger change.
- Round 15 is the "look closer" beat: the animation I wanted to copy didn't exist. Frame by frame, Claude's checkbox fills in a single frame; the feel came from the screen recorder's click circle. We animated anyway, but by the rules: what to animate came from a skill whose first job is saying no (keyboard toggles, the single key, the uncheck, a bounce), and what's left is a 0.8px press and a 120ms tick.
- Round 16 is the "audits expire" beat: every skill had passed, and two rounds of my own requests later, one of round 11's accessibility fixes had quietly gone (round 14 deleted the box that carried it). Re-running the checks after changes is part of the work, not a formality. And the fix for the other finding was already written down: the spec said textarea; the build had drifted to an input.
- Round 17 is the "colour is a word" beat: I asked for a warning colour, and the answer was that the message wasn't a warning and wasn't an action either. So it lost its colour instead of gaining one. A small honesty beat too: a claimed precedent ("round 9 rejected that") turned out not to exist, and saying so mattered more than the answer.
- Round 19's beat: a screenshot can agree with you for the wrong reason. The "after" render showed the gap, but only because a focus ring drew it; the actual fill still bled through (a CSS shorthand quietly reset the clip). The test that measured the fill's box is what told the truth.
- Round 21 is the "measure the premise" beat: two AI sessions argued Back's position with good-sounding reasons. The tie-breaker was one number per step: which edge of the card actually moves. The confident "top-anchored, so the header never moves" was simply wrong for this component, and a probe showed it in a minute.
- Round 22 is the "weigh it before you diet" beat: I asked to make it smaller, and the measurements said it was already lean. Twenty-five real packages, built the same way, put 21 KB among single-purpose widgets that do less. The honest result was a better target, not a smaller number: ~0.6 KB of real savings, a package a third of its old size, 0 KB at page load, and two quiet bugs (a 14px field, and an RTL guard that had been checking an empty string since M2).
- Round 23 is the "read it as a stranger" beat: 22 rounds of tests were green, and the first reviewers who read the package the way a user would (install the tarball, follow the README) found that three of its own recipes didn't work and that TypeScript users on one common setting would get no types at all. The tests only ever imported the source. A second beat: the simplify pass found a regression in one of the fixes, then an old motion test caught the next attempt. Checks on the checks, again.
