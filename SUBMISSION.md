# Submission checklist — The Last Ascent

Deadline **2026-09-08 13:00 PT**. Rules verbatim in `docs/competition-rules.md`.

**Only one entry may be submitted per person**, and a second is disqualified
while the first stands. `../beanstalk` is the other candidate. Pick one.

## Build and verify

```bash
npm run package        # writes dist/ and last-ascent.zip, validating as it goes
npm run test:package   # packaging, then the suite against the packaged build,
                       # then the guidance's own six-step procedure on the zip
```

Current: **7/7 packaging · 84/84 smoke · 9/9 zip.**

`npm run test:smoke` alone is not sufficient — it tests `src/`, and the
submitted `index.html` is a different file.

## The three deliverables

| # | What | Where | State |
|---|---|---|---|
| 1 | Playable prototype `.zip` | `last-ascent.zip`, rebuilt by `npm run package` | ✅ ~190KB of a 35MB cap |
| 2 | Design intent, 500 words max, text-only `.docx` | `submission/last-ascent-design-intent.docx` | ✅ 463 words, official 7-section template, no identifying metadata |
| 3 | Build log, markdown | `BUILD_LOG.md` | ✅ two-part format per the official guidance |

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
