# Submission checklist — The Last Ascent

Deadline **2026-09-08 13:00 PT**. Rules verbatim in `docs/competition-rules.md`.

**Only one entry may be submitted per person.** `../beanstalk` is the other
candidate and is further along on verification. Pick one at the deadline.

## Build it

```bash
npm run package        # writes dist/ and last-ascent.zip, validating as it goes
npm run test:package   # packaging checks, then the guidance's own test procedure
```

## The three deliverables

| # | What | Where | State |
|---|---|---|---|
| 1 | Playable prototype `.zip` | `last-ascent.zip`, rebuilt by `npm run package` | ✅ 178KB of a 35MB cap |
| 2 | Design intent, 500 words max, text-only `.docx` | `submission/last-ascent-design-intent.docx` | ✅ 490 words, official 7-section template, no identifying metadata |
| 3 | Build log, markdown | `BUILD_LOG.md` | ✅ two-part format per the official guidance |

Edit `submission/design-intent.txt` and regenerate the `.docx`; never hand-edit
the `.docx`.

## What packaging already checks

Run automatically; it refuses to write a zip that would fail.

- No external request anywhere in the markup — one CDN reference fails the entry
- Our own CSS and JS inlined into `index.html`, unminified
- `three.min.js` in `vendor/`, referenced relatively, not embedded
- Nothing pointing at `./src/`
- `index.html` at the top level of the zip, not inside a folder
- Inside the 35MB cap

## Verified

```
npm run test:package
  7/7   packaging checks
  45/45 smoke checks against the packaged build
  8/8   zip checks, run the guidance's own way
```

## Still open

1. **Balance has never been tuned against a human.** Scripted policies read the
   grid perfectly and a person does not, so the real difficulty is a guess. The
   suite pins the skill curve — a 90% player summits, a 20% player dies — but
   where a real thumb sits on that scale is unknown.
2. **Re-play since the feel changes.** Climbing motion, pickup feedback, jump,
   lives, upgrades and sound all landed after the last play.

## Verify by hand before uploading

The guidance's own procedure, automated by `npm run test:zip`, but worth doing
once by eye: unzip into a clean folder, serve it locally, open a private
window, turn the internet off, play a full session in portrait.

Then check the `.docx` opens in something other than the tool that wrote it.
