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

## Blocking before this can be submitted

1. **There is no smoke test.** `../beanstalk` has 51 checks; this has none.
   Everything is verified by scripted playthroughs and screenshots. Playability
   is 25% and this is the gap.
2. **Balance has never been tuned against a human.** Scripted policies read the
   grid perfectly and a person does not, so the real difficulty is unknown.
3. **Re-play since the feel changes.** The climbing motion, pickup feedback and
   jump were all rewritten after the last play.

## Verify by hand before uploading

The guidance's own procedure, automated by `npm run test:zip`, but worth doing
once by eye: unzip into a clean folder, serve it locally, open a private
window, turn the internet off, play a full session in portrait.

Then check the `.docx` opens in something other than the tool that wrote it.
