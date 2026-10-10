# agent-clarifier

A plug-and-play web component (`<agent-clarifier>`) that lets a chat agent ask clarifying questions before it acts. It's inspired by Claude's `AskUserQuestion` card. It works in any framework, has zero runtime dependencies, is neutral by default, and is themed with `--clarify-*` CSS variables.

Owner: Mariappan (Mari), a design engineer. Pronouns: they/them unless told otherwise. This build is also being documented as a portfolio story, so **the process matters as much as the result.**

## Read first

| File | What it is |
|---|---|
| `PLAN.md` | The spec: format, variants, states, recovery, API, theming, a11y, milestones (§10), open decisions (§11). **The source of truth.** |
| `design/board.html` | The visual board: every variant and state, drawn with the real `--clarify-*` tokens. Open it in a browser; it has a theme toggle. |
| `JOURNAL.md` | Round-by-round log: the brief, Mari's feedback, the decisions made and why. |
| `process/` | Frozen snapshots of each review round (board, plan, renders). |

## Working rules

1. **Never destroy process.** `PLAN.md` and `design/board.html` are working copies. At every review round, snapshot both into `process/NN-name/`, with full-page renders (light, dark, phone). Then log the round in `JOURNAL.md` (brief, feedback, the decisions and why, artifacts) and commit. **Never edit anything in `process/`.**
2. **Plan and visuals before code**, and review before building anything substantial. Mari likes to discuss decisions first: give options with a recommendation, then apply only what was agreed, one round at a time.
3. **Wording:** offer options in chat before changing user-facing copy. Write plainly, with no jargon in the UI.
4. **Check before reporting done:** light, dark and phone width (375px). For the board, use headless Chrome screenshots. On this Mac, Chrome writes the PNG and then hangs on exit, so poll for the file and kill the process. Captures narrower than 500px get cropped, so capture at 500.
5. **Decisions are Mari's.** In the journal, use "I" for Mari's calls and say plainly when something was Claude's suggestion.
6. Commit after each milestone or round. Ask before pushing, or before anything public: making the repo public, or publishing to npm.

## Decided so far (details in JOURNAL.md)

- **Name:** `agent-clarifier`. Events are `clarify:*` and CSS variables are `--clarify-*`.
- **Format:** one native format plus optional converters, `fromClaude`/`toClaude` and `fromElicitation`/`toElicitation`.
- **Flows:** `sequential` (one at a time) and `all` (all at once). **Inputs:** single, multi, text, plus the "Something else" row. **Placements:** `replace` (takes the composer's place) and `dock` (pinned above the composer).
- **Recovery:**
  - Minimise instead of closing, into a pill, with the draft kept.
  - Undo instead of confirmation dialogs.
  - One history stack behind back, undo, reset and edit.
  - A review step with per-answer Edit.
  - A record stays in the transcript, with "Edit answers".
- **Own words:**
  - There's no "Reply in your own words" link. When the card is minimised, the composer placeholder reads "Or reply in your own words…", and **a message sent then is the answer**, along with the picks so far.
  - A `compose` option starts a sentence in the composer, for answers users should write themselves.
  - Short details stay in the card, as a `text` question with a `default`.
- **Draft mode was dropped** in round 3 because it was confusing. Don't bring back `submit`, "Edit first" or the drafting strip.

## Open decisions (PLAN.md §11)

- **npm:** unscoped `agent-clarifier`, or `@marigameo/agent-clarifier`?
- **Review step:** shown automatically, or always?
- **Undo window after submit:** off or on by default?
- **Previews on options:** in v1 or later?
- **Licence:** MIT?
- **Copy:** "Or reply in your own words…" and "write it ↗".

## Next: M1

Per PLAN.md §10:
- Scaffold: Vite library mode, TypeScript, ESM + types, Vitest.
- `src/state.ts`: the format types, a reducer, the state machine (hidden → loading → answering ⇄ reviewing → submitting → answered, plus minimised, error and expired), and a history stack capped at 50.
- Unit tests for every transition and every recovery row in PLAN.md §6.

No UI in M1. After M1, follow M2–M7 in order. Each milestone gets a commit and a journal entry, plus a board snapshot whenever the visuals change.

**Tooling on this machine:** Node 22, pnpm, and `gh` (logged in as Marigameo). npm isn't logged in yet; that's needed only for publishing at M7.
