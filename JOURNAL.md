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

---

## Story notes (to use later)

- The arc: **borrow the feel, not the pixels** → research → plan → board → feedback → draft mode → **simplify** (cut a mode, a link and a strip) → **scope lock** (said no to branching) → build plan → build.
- Good before/after pairs: the v1 first render vs after the review fixes (the checkbox and radio fix is a small, clear example).
- Round 2 → 3 is a good "less is more" beat: draft mode got simpler when I asked what each control was for.
- The renders in each round are ready to use as story images.
- Round 5 is the "measure, don't assume" beat: writing a reason for every token showed that the default grey failed the contrast the plan promised. It was caught on paper, before any code.
- Skip vs Decide for me is a good small example of meaning over features: same outcome for the agent, different intent from the user, so a different reply.
