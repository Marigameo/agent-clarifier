# Round 26 · Chat demo audit (frozen before fixes)

12 Oct 2026, at `c07e5d2`. Subject: `demo/chat.*` (the page around the component, not `src/`).
Brief (Mari): audit the demo against the design skills used for the component earlier, and improve it. "The UI looks good, but very much cluttered here & there."

**Lenses** (the same skills as rounds 9–16, fetched fresh): Jakub Krehel's `better-layout`, `better-ui`, `better-typography`,
`better-colors`, `better-writing`, `better-accessibility` and `break` (github.com/jakubkrehel/skills @ c0588bb); Emil Kowalski's
`emil-design-eng`, `find-animation-opportunities` and `review-animations` (github.com/emilkowalski/skills @ 2d22863).

**How:** four read-only reviewers in parallel (A layout + UI, B typography + colours + writing, C accessibility + break,
D motion + craft), each rendering the page in real Chrome (390×844 @2x touch, light and dark, 320, landscape 844×390, desktop
1280–1440, forced colours, reduced motion, zoom), measuring computed styles, axe, mutation logs and slowed-clock filmstrips.
"Before" renders: `process/25-chat-demo/shots/`.

## The clutter, measured

- The hotel result showed **9 bordered boxes + 1 hairline** at once (record, 3 hotel cards, 3 starter chips, composer, header line),
  **4 leading edges** (12, 16, 18, 20px), two radii for the same kind of card (14 vs the record's 16), **5 text colours**,
  **15px text at weights 400, 500, 600 and 700**, and the user's priorities repeated on every hotel card (wrapping mid-tag).
- The starter row came back after every reply (85px, 3 boxes), cut "Write a launch emai|" mid-word, hid the third chip off-screen,
  and couldn't be scrolled with a mouse (hidden scrollbar).
- The page's warm greys (OKLCH hue ~95) sat next to the card's neutral ones: two "muted" greys and two border colours on one screen.
  DESIGN.md F9 had dropped warm off-whites for the card because they read as Claude's look.

## Findings (merged across reviewers) and decisions

| # | Finding | From | Decision |
|---|---|---|---|
| 1 | Starter row: cut off, shown after every reply, unreachable by mouse | A1 | **Apply.** Starters stack inside the empty state; after a reply, one quiet text line offers the other two |
| 2 | Empty state heading pinned under ~520px of blank | A2 | **Apply.** The greeting group sits in the upper middle |
| 3 | Hotel result: 3 boxes, repeated tags, "/night" ×3, filler | A3, B3 | **Apply.** One list with dividers; perks said once in the lead; price per card, rating in the sub line; new copy |
| 4 | 4 leading edges, 2 radii | A4 | **Apply.** One 16px edge; 16px radius on page cards |
| 5 | Header: 5 elements in 63px, avatar repeats the favicon; hover sticks after a tap | A5, D4 | **Apply.** Avatar removed; hovers gated to `(hover: hover) and (pointer: fine)` |
| 6 | Turns not grouped by space (14px everywhere vs 8px inside a reply) | A6 | **Apply.** 12px within a turn, 24px before each user message; the two asides merged into one 13px line |
| 7 | Email preview: hairline under subject, "From:" line, and an ink button identical to Send (collects dead clicks; ink means "this acts") | A7, B6 | **Apply.** No hairline or From line; the button drawn quiet (bubble fill); docs line gets a link text; new Excited copy |
| 8 | Warm palette vs the card's neutral one; intro text 4.45:1; link underlines 1.1:1 | B1, B2, A8, C8 | **Apply.** The card's neutrals (#666 on #f0f0f0 = 5.04:1); underlines in `--soft` |
| 9 | Too many sizes and weights (12/13/14/15/16/22/30 + monospace) | B4 | **Apply.** 14px body (DESIGN §6: the card matches chat text), 13px secondary, 600 for emphasis; kicker in plain sans, not uppercase |
| 10 | Fallback says "or ask in your own words" right after that failed | B5 | **Apply** new copy |
| 11 | Order reply repeats #48213 three times; support-bot filler | B7 | **Apply** new copy |
| 12 | Framing copy: straight apostrophes, "sensible defaults", "replies are made up" twice | B8 | **Apply** |
| 13 | **Landscape phone (844×390): the desktop frame renders and clips the card's footer: the question can't be finished** | C1 | **Apply.** Phone layout also when `max-height: 520px` |
| 14 | **A long URL in the composer widens the app to 1414px** | C2 | **Apply.** `min-inline-size: 0; overflow-wrap: anywhere` |
| 15 | `aria-live` on `<main>` stacks four announcements (own message echoed, whole record, card's "Answers sent.", whole reply); typing silent | C3 | **Apply.** One stable visually-hidden status: "Assistant is typing…", then the reply |
| 16 | Speaker only shown by position and fill (gone in forced colours) | C4 | **Apply.** Visually-hidden "You:" / "Assistant:" |
| 17 | Theme toggle labelled "Switch to dark" under a dark OS | C5 | **Apply** |
| 18 | Focus drops to `<body>` for ~1.9s after a starter | C6 | **Apply.** Focus the thread (no keyboard pop-up) |
| 19 | Composer has no focus indicator in forced colours | C7 | **Apply** |
| 20 | No heading on phones; icon buttons and Send 36px | C (notes) | **Apply.** The header title is the page's `h1`; targets 44px |
| 21 | **The record teleports from the composer into the thread in one frame** | D1 | **Apply.** It rises in like a message |
| 22 | **Reduced motion removes the fades** (DESIGN §7: fades stay, nothing moves) | D2 | **Apply.** Opacity-only fades under reduce |
| 23 | Typing dots run backwards at first, last peak after short thinks | D3 | **Apply** |
| 24 | Send and starters have no press feedback | D5 | **Apply,** pointer-only (`:not(:focus-visible)`), 0.97 |
| 25 | ~1s of dead time while steps 2–4 stream invisibly | D6 | **Apply.** Sequential cards stream question 1 only |
| 26 | Starters appear with no fade; `rise` keeps every bubble's animation alive (`both`) and uses the weak default ease-out | D7, D8 | **Apply** (the card's curve, no fill) |
| 27 | Send looks active with an empty box; dark-mode phone frame invisible | D (notes) | **Apply** |

## Turned down

- Shadows instead of borders (A): the component's record is bordered and shadowless; shadowed demo cards beside it would be a second style.
- Removing the composer border (A): it's an input; its edge stays.
- A peek carousel for starters (A): three items fit stacked.
- Theme crossfade, transition on the composer focus border, smooth scrolling for new messages, staggering result cards, animating the thread's height (D): each fails a `find-animation-opportunities` question (purpose, frequency, speed, function).
- Matching the card's tokens by importing them (B): would mean editing `src/`; the page moves to the same values instead.
- Dropping the starters' area labels (B): they show "one per business area"; at 13px in the neutral grey they stop competing.
- Removing the subtitle on phones (A): it's the only "nothing real happens" disclosure there.
