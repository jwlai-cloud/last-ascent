# The Last Ascent — handoff

Written 2026-08-20. Deadline **2026-09-08 13:00 PT**.

## Where this came from

A deliberate second candidate alongside `../beanstalk`, which is finished,
tested and submittable. Beanstalk scores higher on the realised rubric today;
this one has a higher ceiling on Engagement, which is 30%.

**You may only submit one entry** — the rules cap it at one per individual, and
a second entry is disqualified while the first stands. Both projects exist so
the choice can be made at the deadline on evidence rather than now on a guess.

## The edge over everything else in this track

Every other climbing prototype rewards climbing fast. This one does not:

> **Energy is worth more the closer you are to the storm.** ×2 within three
> floors, ×4 within one and a half.

The thing that kills you is the thing that pays you, so outrunning the storm
means outrunning your own income, and the skill is riding just above the front.
It makes the storm gap the most *interesting* number on screen rather than
merely the scariest, and it turns SURGE into a dilemma — it saves your life and
cuts your pay.

Combined with the second rule — energy is simultaneously the score and the only
survival budget — every decision in the game is the same decision, asked at
different pressures.

## Current state — the jump-driven rewrite, tested and packaged

```bash
npm run serve          # 4190
npm run test:smoke     # 70/70
npm run test:package   # packaging, the suite against the zip, then the zip itself
```

Nothing carries the climber upward. He stands on a ledge, the tower falls away,
and every level is a jump the player asked for. The sight line is what used to
be the storm: one rising number, now the bottom of the frame, and the only
clock. `BUILD_LOG.md` PART 1 is the authoritative list of locked decisions.

All three submission deliverables are written and current — the zip, a
463-word design-intent `.docx` on the official seven-section template, and the
build log. `SUBMISSION.md` is the checklist.

## Next task — the playtest gate

**Five full runs, and it is the only thing left that matters.** Every
substantial bug on this project was found by a person playing rather than by
the suite: fog rendering the scene as flat sky, the climber and the hazards
both being capsules, collected diamonds never leaving the screen, a grapple
that resolved nothing where it landed. The suite stops regressions well and is
structurally poor at finding that class of fault.

Then choose between this and `../beanstalk`. Both are green, both have all
three deliverables, and only one can be submitted.

## Balance, and how to move it

The tower is at the edge of winnable for the scripted policy, which is a much
weaker player than a person — a human summited 300 where the policy could not
pass 159. Treat the regression as a floor against unwinnability, not a measure
of difficulty. `dangerCeiling` (1.9) hardens the summit without touching the
opening and is the dial to reach for first.

## Do not

- Do not add health, a second resource, or meta-progression.
- Do not add a physics library. Collision is a cell lookup and must stay one.
- Do not let the runner crowd out the genre: gathering, converting and the
  escalating threat all have to stay findable by a judge.
