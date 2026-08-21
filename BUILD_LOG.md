# The Last Ascent — build log

Kept during the build, per the format in *Creating and Maintaining a Build Log*:
a running list of locked decisions, then an entry per session.

**AI tooling:** Claude Code (Anthropic), model Claude Opus 5, driven
conversationally from a terminal. No other code generator, and no third-party
game template. Every source file here was written by the model in response to
prompts; the human directed, playtested, rejected and approved.

**Verification tooling:** Playwright driving real Chromium at 430 × 860, plus
scripted playthroughs that drive the simulation directly and report the curve.

Commit SHAs are in `git log`, and the messages carry the reasoning in full.

---

# PART 1 — Decisions locked so far

Re-read at the start of each session. Mirrored in `CLAUDE.md`.

## Core systems

- **Nothing carries the climber upward.** He stands on a ledge, the tower falls
  away, and every level is a jump the player asked for. **One press is one
  level**, and no upgrade may change that.
- **You can steer in mid-air.** Jumping on the beat and choosing the landing
  lane on the way up is the technique; steering only while grounded is strictly
  worse. This is stated in the tutorial because it is not discoverable.
- **Energy is simultaneously the score and the survival budget**, and it pays
  more the closer the sight line is — ×2 within three levels, ×4 within one and
  a half. The thing chasing you is the thing paying you. This is the game's
  differentiator and is not negotiable.
- **The sight line is the only clock.** It starts at 1.3 levels/s, accelerates
  to 1.7, and never stops. Standing still is losing.
- **Spikes cost a life, 2.2 levels and a stun. Falling below the line costs a
  life** and returns you four levels above it. Three lives, one healed per
  milestone.
- **Danger ramps with height**, 0.30× at the bottom to 1.9× at the summit.
- **Milestones every 30 levels snapshot the score.** Dying keeps the last
  snapshot and loses everything since.
- **Summit at 300.**

## Controls

SPACE or tap to leap. A / D or swipe to change lane. Three spends: SHIELD 9,
SURGE 12, GRAPPLE 15. Reset arms on the first tap.

## The rules that protect Playability

Playability is 25% and a jumping game is where it is easiest to lose it.

1. **Lanes are a snapped index, never a float.** There is no "slightly off".
2. **The world is a grid of `(lane, level)` cells** and each cell is one group
   in the scene. Collision is a map lookup on landing. There is no continuous
   collision anywhere, which is what keeps it deterministic and physics-free —
   and grouping is what makes a mirroring turn safe.
3. **Coyote time, input buffering, and 1.4s of immunity after a hit.** Without
   them the game reads as broken input rather than as difficulty.
4. **Nothing may fail the player without warning.** The tower turn is
   telegraphed four ways for 1.6 seconds.

## Scope — locked out, not pending

One tower, one climber, one resource. No multiplayer, no physics library, no
ragdolls, no weather simulation, no meta-progression, no second environment.

## Constraints — competition rules

Portrait, single-player, zero external network requests, `index.html` at the
top level of the zip containing all our own code unminified, libraries in
`vendor/`, zip ≤ 35MB. Currently about 190KB.

---

# PART 2 — Session log

## Session 1 — the decision to build a second candidate

`../beanstalk` was finished, tested and submittable, but the human judged its
engagement ceiling too low and wanted something kinetic. The model advised
against switching — one entry is allowed and the time was better spent
finishing — and the human reaffirmed, so this was built as a second candidate.
Both exist; the choice is made at the deadline on evidence.

**The model was wrong about something and was corrected.** It claimed the player
"must not control the runner or the genre floor collapses". The human asked
where the rules said that. They do not — it was a design opinion stated as a
constraint. **Verify a claim is a rule before presenting it as one.**

## Session 2 — first build, and three balance bugs

Scripting a playthrough before writing any tests found three bugs that reading
the design would not: the storm rose at 0.06 levels/s against a climb of 0.91
so nothing ever threatened; a constant climb speed meant a scripted run took
zero damage on every seed; and health pips plus the storm were two failure
meters for one event.

Also: sections generated at the split left the split level ungenerated,
`scene.fog` at 14–26 rendered the whole scene as flat sky because an
orthographic camera at z=30 puts everything thirty units away, and `seed()`
reset the run without restarting it so probes measured nothing.

## Session 3 — first human playtest

*"I don't know how to play, graphic also ugly, what is triangle and diamond
for? a pill? not climber?"*

The climber and the hazards were both capsules — the worst possible pair to
confuse. The climber became a figure, hazards became three spikes, gaps got
broken stubs, and effects were tied to states worth noticing. The hint line
became the entire tutorial, ordered by urgency.

## Session 4 — second playtest, and the elevator problem

*"There is no climbing action, just the whole thing move down by default. **But
it is fun.**"* Those three words are why this project continued.

Also *"no difference I touch the diamond or triangles"* — a plain bug: the grid
cell was deleted on pickup but the mesh never removed, so collecting looked
like nothing happened. And *"what's space jump for?"* — it was for nothing: a
clear lane was guaranteed every level, and the arc was shorter than the time to
cross one, so a jump usually expired before reaching what it was aimed at.

## Session 5 — the movement rewrite

*"Keep the whole building flowing down, the man has to manually jump by hitting
space. If it is out of sight, it will cost one life."*

This replaced the core. The climb had run on a timer and steering was the only
verb that mattered; the player was a passenger with opinions. The storm became
the sight line, collapsing two systems into one.

**Four bugs found by tracing rather than reasoning**, each of which made the
game unplayable in a different way:

| Bug | Effect |
|---|---|
| The fall never terminated — `ledgeBelow` returned `floor(current)` and the test was `current <= rest`, true only at an exact integer | Every knock-off was instant death |
| Stacked gaps in a lane | One mistake became a seven-level plunge |
| A refused gap fell through to the hazard branch | Every refused gap silently became spikes |
| Spikes costing one level | A climber that never dodged beat one that did |

**And the source file was destroyed mid-session.** A patch helper sliced between
two markers that were in the wrong order; `str.replace("", x)` inserts between
every character, producing 1.5 million lines. `git checkout` restored it from
the last commit. The helper now refuses out-of-order markers and has caught
several bad patches since. **Commit before large refactors.**

## Session 6 — the suite rewritten, and what it caught

The suite was rewritten wholesale rather than patched: every assertion about an
automatic climb was false by design. Writing it found three more bugs — the
stopped-state hint held for 3.2 seconds into a run and outranked real warnings,
body text sat at 9.9px, and a slip dropped the climber *below* the spikes he
had just hit so he climbed back into them, which the streak multiplier made
unavoidable.

## Sessions 7–9 — difficulty, and what the tuning taught

Six rounds of *"still too easy"*, and the useful findings were about method
rather than numbers.

- **Every density sweep before a certain point measured nothing.**
  `config.routes.UNKNOWN` was rebuilt from hardcoded literals at the start of
  every section, so tuning it changed the report and not the game. It derives
  from DANGER now.
- **The scripted policies could not steer in mid-air**, so every reading was
  pessimistic about what a good player survives. Correcting it took a careful
  run from banking 260 to 446.
- **The balance check compared altitude.** Spamming the jump climbs higher
  because it never detours, but banked energy is what the game ranks.
- **A flat hazard rate made the game bimodal** — across a four-hundredths
  change the median run went from finishing to dying on level sixteen.
  Difficulty ramps with height now.
- **The bot is a much weaker player than the human.** A person summited 300 on
  a build where the policy could not pass 159. The balance regression is
  therefore a floor against unwinnability, not a measure of how hard it feels.

Lives went 3 → 5 → 6 → 3 across these rounds, and spikes stopped costing a life
and then started again. That reversal was correct: a hit that flashes the screen
and takes no visible resource reads as a bug, and the player's expectation beat
the cleverer design.

## Session 10 — depth, and the tower turn

*"It is 3d, but generally like a 2.5d feel, no depth feeling."* Structural, not
stylistic: an orthographic projection has no perspective convergence by
definition. Perspective camera, shadows, a parallax skyline and correctly-ranged
fog.

*"Should the whole area and camera angle suddenly rotate?"* Built, and the first
version mirrored the drawing — which moved the climber too, and mirroring the
whole scene is relationally a no-op. Reported precisely: *"lane composition
still the same, only key direction flip."* It mirrors the lane contents above
the climber now, telegraphed for 1.6 seconds.

## Session 11 — submission artifacts

Packaging and zip verification were ported from `../beanstalk` where they were
already proven. `npm run test:package` runs the guidance's own six-step
procedure: rebuild, unzip clean, serve locally, private window, internet off,
play a full session.

**Considered and rejected:** building on an off-the-shelf Three.js action
template. The code was MIT but the bundled art carried separate licences, it
shipped ragdoll physics which is out of scope, and decisively — *"the build log
should show the AI did the heavy lifting"*. Starting from a finished game makes
this document evidence against the entry.

---

# What the AI got wrong, and what caught it

A log that lists only successes is not evidence of a process.

| Error | Would review have caught it? | What caught it |
|---|---|---|
| Fog rendering the whole scene as flat sky | No | The human: "cannot see the people" |
| Climber and hazards both capsules | No | The human: "a pill? not climber?" |
| Collected fragments never removed from the scene | Unlikely | The human: "no difference I touch the diamond" |
| The fall never terminating | No — the arithmetic looks right | Tracing a run tick by tick |
| A refused gap becoming spikes | No | A density sweep that made the game harder when it should have been easier |
| Sweeps measuring a lane that was regenerated from literals | No | Results not matching the shipped build |
| Policies that could not steer mid-air | No | Careless play beating careful play |
| GRAPPLE not resolving where it landed | No | The human: "won't claim the diamond" |
| Destroying the source with an empty-string replace | N/A | A syntax error, then `git checkout` |
| A staleness guard that had itself gone stale | Yes | The suite failed |

The pattern: the model's errors clustered where the code was *locally* correct
and *systemically* wrong, and where a measurement was trusted without checking
it measured anything. Almost every one was caught by a human playing or by
making the program report on itself — very few by re-reading source.
