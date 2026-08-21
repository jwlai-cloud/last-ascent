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

## Current state — build steps 1-3 done, playable end to end

```bash
npm run serve          # 4190
npm run test:smoke     # 45/45
npm run test:package   # packaging, the suite against the zip, then the zip itself
```

Working: three snapped lanes, constant-but-accelerating climb, grid-cell world,
energy collection with the risk multiplier, hazards and gaps causing slips,
the rising storm, four route splits per run, three spends, the summit and
beacon, banking, best-score persistence, and reset.

Verified by scripted play: no runtime errors, a run reaches the summit, seeds
are reproducible, slips work.

### Three balance bugs found by scripting a playthrough, already fixed

- **The storm never threatened.** It rose at 0.06 floors/s against a climb of
  0.91, so the gap grew to twenty. It is now expressed as a *fraction of climb
  speed* (0.80, +0.09 per split), so it gains on a clean run by the last
  section and energy must be spent to reach the summit.
- **A constant climb speed meant no difficulty.** Over a second to read three
  lanes and swipe is not a decision; a scripted run took zero damage on every
  seed. Speed now ramps 0.975 per floor, tightening to about 0.6s by the top.
- **Health pips were a second failure meter for one event.** Cut. A hit costs
  height, height feeds the storm, and the storm is the only way to lose.

### Bugs worth knowing about

- Sections used to be generated at the split moment, which left the split floor
  itself ungenerated — a hole in the tower and a cell resolving to nothing.
  Generation now runs two sections ahead of the climber, contiguously.
- `scene.fog` at 14-26 rendered the entire scene as flat sky colour, because an
  orthographic camera parked at z=30 puts everything about thirty units away.
  Removed.
- `seed()` used to reset and silently stop the run, so probes measured nothing.

## Next task, in order

1. ~~Write the smoke test.~~ Done: 45 checks, half of them driving the paused
   simulation by hand. Writing it found two real bugs — the stopped-state hint
   line held for 3.2 seconds into a run and outranked real advice, and body
   text sat at 9.9px, under the readable floor. It also found a death spiral:
   slipping drops you *below* the hazard you just hit, so you climb back into
   it, and with the streak multiplier that is unavoidable. There is 1.4s of
   recovery immunity now, and the climber blinks through it.
2. **Judge the tower turn.** It is ON, at `config.flipChance` 0.55, so about
   half of the ten splits turn the tower. A random angle from
   `config.flipAngles` decides whether the lanes come back reversed, and it is
   telegraphed for `config.flipWarn` seconds with a banner, a countdown, a
   gold tint over the whole arena and a rising tone.

   The telegraph is the entire reason this is fair rather than a gotcha. An
   unannounced control inversion makes the player fail at the input instead of
   at the game, which is the failure mode the rest of the design spends its
   Playability budget avoiding. Warned, it becomes something to read and
   prepare for.

   `config.flipCompensates` is false: a swipe is world-relative, so after a
   reversing turn your controls are mirrored. Set it true and the turn becomes
   pure spectacle. Play both.

3. **The playtest gate — five runs.** The test is whether the swipe
   disappears from your attention. If it does not, no design fixes it and the
   honest move is to ship `../beanstalk`.
3. Tune the risk bands. `config.riskBands` is the single most load-bearing
   balance object in the game and has had no human play at all.
4. Packaging is already ported (`npm run package`, `npm run test:package`) but
   has never been run. Run it before trusting it.

## Do not

- Do not add health, a second resource, or meta-progression.
- Do not add a physics library. Collision is a cell lookup and must stay one.
- Do not let the runner crowd out the genre: gathering, converting and the
  escalating threat all have to stay findable by a judge.
