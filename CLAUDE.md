# agent-clarifier

A plug-and-play web component (`<agent-clarifier>`) that lets a chat agent ask clarifying questions before it acts. It's inspired by Claude's `AskUserQuestion` card. It works in any framework, has zero runtime dependencies, is neutral by default, and is themed with `--clarify-*` CSS variables.

Owner: Mariappan (Mari), a design engineer. Pronouns: they/them unless told otherwise. This build is also being documented as a portfolio story, so **the process matters as much as the result.**

## Read first

| File | What it is |
|---|---|
| `PLAN.md` | **What** to build: the spec (format, variants, states, recovery, own words, decisions in §11). |
| `BUILD.md` | **How** to build it: architecture, state and transition tables, keyboard/focus/ARIA spec, full API, composer integration, milestones with acceptance criteria. **Implement from this.** |
| `design/board.html` | The visual board: every variant and state, drawn with the real `--clarify-*` tokens. Open it in a browser; it has a theme toggle. |
| `DESIGN.md` | **Why** every default looks the way it does: what each visual signal means, every token with its reason and measured contrast, and open findings (F1–F15). A new value needs a reason here before it ships. |
| `JOURNAL.md` | Round-by-round log: the brief, Mari's feedback, the decisions made and why. |
| `process/` | Frozen snapshots of each review round (board, plan, renders). |

## Working rules

1. **Never destroy process.** `PLAN.md` and `design/board.html` are working copies. At every review round, snapshot both into `process/NN-name/`, with full-page renders (light, dark, phone). Then log the round in `JOURNAL.md` (brief, feedback, the decisions and why, artifacts) and commit. **Never edit anything in `process/`.**
2. **Plan and visuals before code**, and review before building anything substantial. Mari likes to discuss decisions first: give options with a recommendation, then apply only what was agreed, one round at a time.
3. **Wording:** offer options in chat before changing user-facing copy. Write plainly, with no jargon in the UI.
4. **Check before reporting done:** light, dark and phone width (375px). For the board, use headless Chrome screenshots. On this Mac, Chrome writes the PNG and then hangs on exit, so poll for the file and kill the process. Captures narrower than 500px get cropped, so capture at 500.
5. **Decisions are Mari's.** In the journal, use "I" for Mari's calls and say plainly when something was Claude's suggestion.
6. Commit after each milestone or round, and push to the private repo at the end of each milestone. Ask before anything public: making the repo public, or publishing to npm.
7. **Scope is locked** (BUILD.md §0). The aim is a top-notch core, not more features. Don't add anything outside it. If something seems missing or costly, raise it with Mari.

## Decided so far (details in JOURNAL.md)

- **Name:** `agent-clarifier`, published on npm as **`@marigameo/agent-clarifier`**. `package.json` needs `"publishConfig": { "access": "public" }`. The element is `<agent-clarifier>`. Events are `clarify:*` and CSS variables are `--clarify-*`.
- **Format:** one native format plus optional converters, `fromClaude`/`toClaude` and `fromElicitation`/`toElicitation`.
- **Flows:** `sequential` (one at a time) and `all` (all at once). **Inputs:** single, multi, text, plus the "Something else" row. **Placements:** `replace` (takes the composer's place) and `dock` (pinned above the composer).
- **Recovery:**
  - Minimise instead of closing, into a pill, with the draft kept.
  - Undo instead of confirmation dialogs.
  - One history stack behind undo and start over. Back and edit only navigate and never change answers.
  - A review step with per-answer Edit.
  - A record stays in the transcript, with "Edit answers".
- **Own words:**
  - There's no "Reply in your own words" link. When the card is minimised, the composer placeholder reads "Or reply in your own words…", and **a message sent then is the answer**, along with the picks so far.
  - A `compose` option starts a sentence in the composer, for answers users should write themselves.
  - Short details stay in the card, as a `text` question with a `default`.
- **Draft mode was dropped** in round 3 because it was confusing. Don't bring back `submit`, "Edit first" or the drafting strip.

- **Settled in round 4:**
  - review step `auto`
  - undo window off by default
  - option previews later (v1.1)
  - MIT licence
  - copy: "Or reply in your own words…" and "write it ↗"
- **Branching is out of v1.** So are option previews and icon slots.

- **Settled in round 5:**
  - Who it's for: developers of agentic chats in any business area, and their users, who write vague prompts.
  - **Decide for me** is opt-in per question (`delegate`). It replaces Skip on that question and returns `delegated`. Required beats delegate.
  - Long content: wrap whatever the user decides on, and only shorten summaries. The card has a max height of 60% of the visible screen, with the header and footer pinned, and a scroll-edge shadow only when content is hidden. To be stress-tested visually.
  - Phone: the size comes from `visualViewport`, nothing focuses a text field on touch, hit areas are 44px, and the safe area is the app's job.
  - RTL from the start: logical properties only, with a test that fails on `left`/`right`. Plurals and number formats via `Intl`.
  - Yes/no is a two-option `single`, with no new type.
  - Every default has a reason in `DESIGN.md`.

## Before M1

BUILD.md is marked **"for review" (round 5)**. When Mari approves it, or asks for changes and then approves:
1. Apply any changes.
2. Change its status line to "agreed".
3. Snapshot `PLAN.md` + `BUILD.md` + `DESIGN.md` into the next `process/NN-name/`.
4. Log the outcome in JOURNAL.md, including Mari's answers to BUILD.md §13, "calls made" (items 1–14).
5. Commit and push, then start M1.

**Before M2** (not M1, which has no UI): a visual round on the board settles the DESIGN.md findings F1–F15 and adds the missing frames: Decide for me, long content, RTL, and phone with the keyboard open. The copy for a delegated answer ("Left to the agent" is the working copy) still needs Mari's pick.

## Next: M1 (BUILD.md §10)

- Scaffold: Vite library mode, TS strict, Vitest, size-limit.
- `src/model/`: `types`, `normalize`, `reducer` (with history), `selectors`, plus `labels`.
- Table-driven tests for every transition (BUILD §4.2), every normalising rule (§3.1) and every recovery row (PLAN §6). Coverage ≥ 95%.

No UI in M1. After M1, follow M2–M7 in order.

**Tooling on this machine:** Node 22, pnpm, and `gh` (logged in as Marigameo). npm isn't logged in yet; that's needed only for publishing at M7.
