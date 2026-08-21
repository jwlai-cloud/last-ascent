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

Current: **7/7 packaging · 70/70 smoke · 9/9 zip.**

`npm run test:smoke` alone is not sufficient — it tests `src/`, and the
submitted `index.html` is a different file.

## The three deliverables

| # | What | Where | State |
|---|---|---|---|
| 1 | Playable prototype `.zip` | `last-ascent.zip`, rebuilt by `npm run package` | ✅ ~190KB of a 35MB cap |
| 2 | Design intent, 500 words max, text-only `.docx` | `submission/last-ascent-design-intent.docx` | ✅ 463 words, official 7-section template, no identifying metadata |
| 3 | Build log, markdown | `BUILD_LOG.md` | ✅ two-part format per the official guidance |

Edit `submission/design-intent.txt` and regenerate the `.docx`; never hand-edit
the `.docx`.

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
| `dangerCeiling` | 1.9 | Hazard density at the summit; does not touch the opening |
| `dangerFloor` | 0.30 | Hazard density at level zero |
| `routes.DANGER.hazard` | 0.32 | The base rate. **0.34 made it unwinnable for the bot** |
| `scrollStart` / `scrollMax` | 1.3 / 1.7 | The line. Above roughly 1.9 no play keeps up |

## Still open

1. **The playtest gate — five full runs.** Not done. Every substantial bug on
   this project was found by a person playing, not by the suite: the flat-sky
   fog, the capsule climber, uncollected diamonds, a grapple that resolved
   nothing. The suite is good at stopping regressions and structurally poor at
   finding that class of fault.
2. **Which game to submit.** Beanstalk is calmer, finished, and carries its
   engagement through a push-your-luck flower. This one is kinetic and has the
   sharper hook. Both are green and both have all three deliverables.
