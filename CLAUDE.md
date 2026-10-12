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
- **Size:** see round 22 below: about 21 KB gzipped, guarded at 21.5 KB gzip and 19.2 KB brotli. The model alone is ~4 KB gzipped.

## Done: M2 · Element + flows (plus M3's placements, pulled forward in round 7)

Sequential and all-at-once flows, every input type, loading/streaming, replace and dock with real composer wiring, keyboard (BUILD §5.1), focus (§5.2), live region (§5.4), and ARIA (§5.5).
- **Tests:** 16 component tests in real Chrome (`tests/component`, Vitest browser mode, system Chrome) and 440 unit tests.
- **Checking visuals:** `node scripts/shots.mjs <dir> "name=query|step|…"`, using the steps `click:` (in the component), `pclick:` (in the page), `key:`, `type:` and `wait:`.

## Round 8: Claude decides, Mari audits

From round 8, **Mari delegates design and copy calls to Claude** and will audit the finished state later. Log each call in the journal as Claude's, with its reason. Still ask before anything public (repo visibility, npm) or any scope change.

## Status (end of the build on 10 Oct 2026)

M1–M7 are built. 597 tests are green (`pnpm check`, after round 22). The Definition of done in BUILD §11 shows what's still open:
- the manual VoiceOver and real-phone passes
- Svelte 5
- publishing, which needs Mari's go-ahead
- Mari's audit of the round-8 calls

## Round 9 onwards: audits with external skills

Mari shares one skill at a time. Claude runs it as a read-only audit and presents findings with exact values, plus what was turned down and why. Mari picks, then Claude applies, tests, and documents (DESIGN.md, a journal round, and a `process/NN-*` snapshot).
- **Round 9 · motion** (Emil Kowalski's `find-animation-opportunities`): toast in and out, a 200ms fold, pointer-only press feedback, and reduced motion as "fades stay, nothing moves". Report: `process/09-motion-audit/audit.md`.
- **Round 10 · craft** (Emil Kowalski's `emil-design-eng`): hover on buttons and chips (mouse only), the toast waits in a hidden tab, the shimmer on `transform`, the toast exits at 0.75×, the spinner at 0.6s. Report: `process/10-craft-audit/audit.md`.
- **Round 11 · interface** (Jakub Krehel's `better-interface`: six domain reviews, run as parallel read-only sub-agents): 10 HIGH and 5 MEDIUM fixed (forced colors, focus under the sticky header, focus lost on Send, silent send failure, lost Undo, toast and footer at 320, long questions, badge contrast, error copy, record truncation, and more). Report frozen before the fixes: `process/11-interface-audit/audit.md`; DESIGN §9. 
- **Round 12 · polish:** all 21 findings beyond round 11's cap (it was 21, not 15). Mari picked the copy from options. Also fixed: a stale "Sending in 1s · Undo" after the window had closed. Plan frozen first: `process/12-polish/round-plan.md`; DESIGN §10.
- **Round 13 · break** (Jakub Krehel's `break`): a stress page, `demo/break.html`, renders the real component under 34 worst-case scenarios. 6 breaks fixed (record label column, flex collapse, English labels in RTL, disabled look, source dot, record icon). Report: `process/13-break/report.md`. **Keep `demo/break.*` until Mari says to delete it.**
- **Round 14 · quiet chrome, inline "Something else"** (from Mari's questions, comparing a shadcn card and a recording of Claude's card). **Principle (Mari): the user's decision is the loudest thing on the card**, so the Recommended badge and the source dot are grey, and blue is kept for picks and focus (a monochrome trial was turned down: `design/explorations/01-focus-and-colour/`). "Something else" is typed in place (the field is a sibling drawn over the row; single fades the other labels to muted once there's text, multi doesn't). The checkbox is 16px in the 26px slot. Plan: `process/14-quiet-and-inline/round-plan.md`; DESIGN §12.
- **Round 15 · checkbox motion** (Emil Kowalski's `animate` + `review-animations`, from emilkowal.ski/skill). The multi checkbox gives a little under a held press (.95) and its tick is revealed by `clip-path` in 120ms. Pointer only: keyboard toggles and unticking are instant, and reduced motion fades the tick. (Claude's own checkbox doesn't animate; the recording's "feel" was the recorder's click circle.) Plan: `process/15-checkbox-motion/round-plan.md`; DESIGN §7.
- **Round 16 · re-check of the skill audits** after rounds 14–15: all held except two round-14 side effects, both fixed. In contrast themes an open "Something else" lost round 11's edge. A long custom label was cut as a placeholder, fixed by making the field the growing `<textarea>` BUILD §8.2 always specified (row and field share a grid cell; long answers wrap). Report: `process/16-skill-recheck/audit.md`. **Re-run the skill checks after any change to the option rows.**
- **Round 17 · the pick-limit notice.** "Up to N picks. Unpick one first" is ink text with no fill, not a black toast and not orange: the ink fill is only for toasts with Undo ("this acts"), and danger is only for failures. It fades only. DESIGN §13.
- **Round 18 · stuck-header padding.** The source line's margin collapsed out of the sticky header, so "Asked by" touched the card edge once scrolled. Fixed with `display: flow-root` on `.top`. DESIGN §14.
- **Round 19 · space between filled rows** (Mari chose *Gap* from `design/explorations/02-row-spacing/`). Fills are drawn 2px inside option and review rows (a transparent border, clip to the padding box, 2px less padding), so neighbours show a 4px gap and heights don't change. Row states use `background-color`, never the `background` shorthand, which resets the clip. Off in contrast themes. DESIGN §15.
- **Round 20 · hover sync** (Emil's "7 practical animation tips" #6). Hover is instant (verified frame by frame). Fixed a lone arrow: with a mouse, the focused row's arrow now hides with its ring. The arrow always travels with the fill (mouse) or the ring (keyboard). DESIGN §16.
- **Round 21 · navigation in the footer.** Back is at the footer's start (the card is bottom-anchored, so the footer is the edge that stays put), dimmed on step 1, and keeps focus after a press. The title has one edge. The dashes are coloured by status, with 24×24 targets and a hover cue. The count stays in the header. A header pager was turned down (the header moves). DESIGN §17.
- **Round 22 · size.** Measured, not guessed: three parallel audits (JS, CSS, 25 peer packages; `process/22-size/benchmarks.md`). 21.9 KB sat with mid-weight widgets, and every safe saving totalled ~0.6 KB, so **Mari set the target to about 21 KB** (12 KB retired). Now **21.37 KB gzip, 19.09 KB brotli**; size-limit guards 21.5 / 19.2 KB, and raising a guard needs a reason in the journal. The npm package ships no source maps (133 KB unpacked); the README shows loading on first use. Action types are numeric constants in `src/model/act.ts` (always use the names). Private `--_*` CSS tokens are shortened at build time (`scripts/short-tokens.ts`); a token the TypeScript reads must be in its `KEEP` list (a test enforces it). Also fixed: the "Something else" field was 14px on touch (iOS zoom), and the unit tests had been getting an empty stylesheet since M2 (the RTL guard checked nothing). **CSS changes meant to be invisible are checked with `scripts/style-dump.mjs`**: a computed-style dump of the break page, before vs after (DESIGN §18). Plan: `process/22-size/round-plan.md`.
- **Checking motion:** `node scripts/motion-strips.mjs <dir>` slows Chrome's animation clock 10× and writes filmstrips. `scripts/shots.mjs` also takes `hover:`, `tap:` and `touch=1`.

**Tooling on this machine:** Node 22, pnpm, and `gh` (logged in as Marigameo). npm isn't logged in yet; that's needed only for publishing at M7.
