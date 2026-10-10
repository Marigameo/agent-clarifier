# agent-clarifier

A plug-and-play web component (`<agent-clarifier>`) that lets a chat agent ask clarifying questions before it acts. It's inspired by Claude's `AskUserQuestion` card. It works in any framework, has zero runtime dependencies, is neutral by default, and is themed with `--clarify-*` CSS variables.

Owner: Mariappan (Mari), a design engineer. Pronouns: they/them unless told otherwise. This build is also being documented as a portfolio story, so **the process matters as much as the result.**

## Read first

| File | What it is |
|---|---|
| `PLAN.md` | **What** to build: the spec (format, variants, states, recovery, own words, decisions in §11). |
| `BUILD.md` | **How** to build it: architecture, state and transition tables, keyboard/focus/ARIA spec, full API, composer integration, milestones with acceptance criteria. **Implement from this.** |
| `design/board.html` | The early visual sketch, **frozen in round 6**: Mari couldn't judge enough from it. Kept for the story. |
| `demo/` | **The playground**: the real component in a fake chat, with scenarios, controls and an event log (`pnpm dev`). Visuals are judged and decided here (BUILD §2.1). |
| `DESIGN.md` | **Why** every default looks the way it does: what each visual signal means, every token with its reason and measured contrast, and open findings (F1–F15). A new value needs a reason here before it ships. |
| `JOURNAL.md` | Round-by-round log: the brief, Mari's feedback, the decisions made and why. |
| `process/` | Frozen snapshots of each review round (plan, and board renders or playground screenshots). |

## Working rules

1. **Never destroy process.** `PLAN.md` is a working copy. At every review round, snapshot it into `process/NN-name/`, with playground screenshots (light, dark, phone). (Before round 6 the board was snapshotted too.) Then log the round in `JOURNAL.md` (brief, feedback, the decisions and why, artifacts) and commit. **Never edit anything in `process/`.**
2. **Plan and visuals before code**, and review before building anything substantial. Mari likes to discuss decisions first: give options with a recommendation, then apply only what was agreed, one round at a time.
3. **Wording:** offer options in chat before changing user-facing copy. Write plainly, with no jargon in the UI.
4. **Check before reporting done:** light, dark and phone width (375px). For the playground, use headless Chrome screenshots. On this Mac, Chrome writes the PNG and then hangs on exit, so poll for the file and kill the process. Captures narrower than 500px get cropped, so capture at 500.
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

## How we build

BUILD.md is **agreed** (round 5, frozen in `process/06-build-agreed/`). Mari wants to **learn each stage**:
- Before each step, explain what we're building and why, plus the technical idea behind it.
- Build in small pieces they can review.
- **Verify visually wherever possible:** test reports and screenshots, and light, dark and 375px once there's UI.

## Done: M1 · Model (BUILD.md §10)

`src/model/` (types, normalize, reducer, selectors) and `src/labels.ts`: 435 tests, 100% lines.
- **Tooling:** TS 7, oxlint, Vite 8 (Rolldown, minified), Vitest 5, size-limit. `pnpm check` runs everything.
- **Practice:** after each module, inject user-visible bugs and confirm a test fails. Test at boundaries.
- **Size:** a target, not a wall (Mari's call). Polish first, then propose cuts. The model alone is ~4 KB gzipped.

## Done: M2 · Element + flows (plus M3's placements, pulled forward in round 7)

Sequential and all-at-once flows, every input type, loading/streaming, replace and dock with real composer wiring, keyboard (BUILD §5.1), focus (§5.2), live region (§5.4), and ARIA (§5.5).
- **Tests:** 16 component tests in real Chrome (`tests/component`, Vitest browser mode, system Chrome) and 440 unit tests.
- **Checking visuals:** `node scripts/shots.mjs <dir> "name=query|step|…"`, using the steps `click:` (in the component), `pclick:` (in the page), `key:`, `type:` and `wait:`.

## Round 8: Claude decides, Mari audits

From round 8, **Mari delegates design and copy calls to Claude** and will audit the finished state later. Log each call in the journal as Claude's, with its reason. Still ask before anything public (repo visibility, npm) or any scope change.

## Next

M4 leftovers, then M5 (motion: height animation and step slide; axe; IME), then M6 (`ask()`, the Claude and MCP converters, `jsx.d.ts`), then M7 (README, framework smoke examples). Then size work: the target is 12 KB and we're at about 18. Propose the cuts.

**Tooling on this machine:** Node 22, pnpm, and `gh` (logged in as Marigameo). npm isn't logged in yet; that's needed only for publishing at M7.
