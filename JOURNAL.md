# clarify-card: build journal

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

## Story notes (to use later)

- The arc: **borrow the feel, not the pixels** → research → plan → board → feedback → draft mode → build.
- Good before/after pairs: the v1 first render vs after the review fixes (the checkbox and radio fix is a small, clear example).
- The renders in each round are ready to use as story images.
