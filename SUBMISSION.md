# Submission checklist — The Last Ascent

Deadline **2026-09-08 13:00 PT** (Devpost shows it as Sep 8, 4:00pm EDT — the
same instant). Rules verbatim in `docs/competition-rules.md`; the four official
sources are extracted verbatim into **`docs/source/`** and are the authority:

| File | What it settles |
|---|---|
| `design-guidance.md` | What judges reward, the genre floors, the readable-visuals bar, packaging |
| `design-intent-template.md` | The mandated 7 sections, 500 words, .docx, no identifying info |
| `build-log-guidance.md` | Two-part format, per-session fields, **and the filename `buildlog.md`** |
| `building-with-ai.md` | The requirements list and the six-step offline test |

Re-fetched 2026-08-24. The 2026-08-19 capture was incomplete and cost real
work, so re-read these late as well as early.

**Only one entry may be submitted per person**, and a second is disqualified
while the first stands. `../beanstalk` is the other candidate. Pick one.

## Build and verify

```bash
npm run package        # writes dist/ and last-ascent.zip, validating as it goes
npm run test:package   # packaging, then the suite against the packaged build,
                       # then the guidance's own six-step procedure on the zip
```

Current: **7/7 packaging · 97/97 smoke · 9/9 zip.**

`npm run test:smoke` alone is not sufficient — it tests `src/`, and the
submitted `index.html` is a different file.

## The official AI Submission Check — run 2026-08-24 on the packaged zip

The guidance offers an optional five-point pre-upload check. Result against
`last-ascent.zip`, verified by unzipping into a clean folder:

| # | Check | Result |
|---|---|---|
| 1 | Genre fit | **PASS** — Survival & Resource Management. Gather energy fragments and caches; convert energy → SHIELD (18, on `S`); escalating storm line plus hazard density ramping to full by level 80 |
| 2 | Readable code | **PASS** — 2438 lines, 52 function declarations, 154 comment blocks. Longest line is 1798 chars and is the tutorial prose paragraph, not code |
| 3 | Offline / no external links | **PASS** — zero remote URLs; no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` or `importScripts` |
| 4 | File structure | **PASS** — `index.html` at the root, one relative ref `./vendor/three.min.js`, libraries in `vendor/` |
| 5 | Single-player & portrait | **PASS** — no multiplayer, socket, WebRTC or server keywords; no orientation-change code |

## The three deliverables

| # | What | Where | State |
|---|---|---|---|
| 1 | Playable prototype `.zip` | `last-ascent.zip`, rebuilt by `npm run package` | ✅ ~190KB of a 35MB cap |
| 2 | Design intent, 500 words max, text-only `.docx` | `submission/last-ascent-design-intent.docx` | ✅ 463 words, official 7-section template, no identifying metadata |
| 3 | Build log, markdown | `buildlog.md` | ✅ two-part format, and **named `buildlog.md` exactly** — the guidance specifies the filename, and we shipped `BUILD_LOG.md` until 2026-08-24 |

The design-intent generator enforces the template rather than trusting it: exact
section headings in the official order, the 500-word cap, and a refusal if a
table or image appears. Renaming a heading fails the build.

Edit `submission/design-intent.txt`, then `npm run docx`. Never hand-edit the
`.docx` — it is generated, and the generator enforces the 500-word limit and
writes no `docProps`, so there is no `dc:creator` or `lastModifiedBy` to leak
into an anonymised judging round.

## What packaging already checks

Automatic, and it refuses to write a zip that would fail.

- No external request anywhere in the markup — one CDN reference fails the entry
- Our own CSS and JS inlined into `index.html`, unminified
- `three.min.js` in `vendor/`, referenced relatively, not embedded
- Nothing pointing at `./src/`
- `index.html` at the top level of the zip, not inside a folder
- Inside the 35MB cap

## The official pre-submission checklist

**Your game**

- [x] A player can play the core loop, reach a win/lose/reset, and play again
- [x] Progression or escalation within a single play session — density ramps to full by level 80, the storm accelerates, milestones every 30
- [x] Single-player, portrait, never changes orientation
- [x] The core elements of the chosen genre are clearly present *(see the AI check above)*
- [x] A player can tell the pieces apart and read what is happening at a glance
- [ ] **Everything works, nothing half-finished or left in as a stub** — believed true, but only a person playing can confirm it. See "Still open"

**Your build**

- [x] Single `.zip`, 204KB of a 35MB cap, `index.html` at the top level
- [x] All game code in `index.html`, unminified
- [x] Libraries in `vendor/`
- [x] Everything referenced with relative paths, nothing outside the zip
- [ ] **Played through with the internet off, from a local server, in a private window** — `npm run test:zip` automates all six steps and passes, but do it once by eye too

## Verify by hand before uploading

`npm run test:zip` automates the guidance's procedure — unzip clean, serve
locally, private window, internet off, full session in portrait — but do it
once by eye anyway. Then check the `.docx` opens in something other than the
tool that wrote it.

## The state of the balance, stated honestly

The tower sits at the edge of winnable **for the scripted policy**, which is a
markedly weaker player than a person: a human summited 300 on a build where the
policy could not pass 159. The balance regression is a floor against the game
becoming unwinnable — two summits in ten seeds — and not a measure of how hard
it feels to play.

The dials, in the order worth reaching for:

| Dial | Now | Effect |
|---|---|---|
| `cost.shield` | 18 | **Reach for this first.** With one spend left, the price *is* the hit budget: a climb absorbs ~9 hits, so 20 gave the bot 0 summits and 10 gave it 7 |
| `dangerFull` | 80 | The level danger stops rising at. **This is what makes the opening bite** — it used to be the summit, so level 200 sat at only 1.23 of 1.7 |
| `dangerCeiling` | 1.2 | Density from `dangerFull` upward — a plateau, not a slope. Trades directly against `cost.shield` |
| `dangerFloor` | 0.30 | Hazard density at level zero |
| `routes.DANGER.hazard` | 0.28 | The base rate |
| — | — | **Sealed floors measure 0% up to a 2.4 ceiling**, so density is hard rather than unfair. Check that before pushing it |
| `camAnchor` / `camLead` | 6.4 / 1.0 | Framing. `camAnchor` is the storm-anchored view the game is played in; `camLead` is the clamp that stops a fast climber leaving the frame. **Raising `camAnchor` without checking `camLead` can hide the climber again** |
| `scrollStart` / `scrollMax` | 1.3 / 1.7 | The line. **`scrollMax` does not move the bot at all** — a policy that jumps every grounded frame is never caught by it, so every scripted death is a spike or a gap. Tune it against a person, not against the suite |

## Still open

1. **The playtest gate — five full runs.** Not done, and now overdue for two
   reasons rather than one: holding a key used to auto-repeat the jump, so
   every difficulty impression formed before that fix was of a game that
   climbed itself; and the spend panel just went from three buttons to one. Every substantial bug on
   this project was found by a person playing, not by the suite: the flat-sky
   fog, the capsule climber, uncollected diamonds, a grapple that resolved
   nothing. The suite is good at stopping regressions and structurally poor at
   finding that class of fault.
2. **Which game to submit.** Beanstalk is calmer, finished, and carries its
   engagement through a push-your-luck flower. This one is kinetic and has the
   sharper hook. Both are green and both have all three deliverables.
