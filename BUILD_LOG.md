# The Last Ascent — build log

Kept during the build, per the format in *Creating and Maintaining a Build Log*:
a running list of locked decisions, then an entry per session.

**AI tooling:** Claude Code (Anthropic), model Claude Opus 5, driven
conversationally from a terminal. No other code generator, and no third-party
game template. Every source file here was written by the model in response to
prompts; the human directed, playtested, rejected and approved.

**Verification tooling:** Playwright driving real Chromium at 430 × 860, plus
scripted playthroughs that drive the simulation directly and report the curve.

---

# PART 1 — Decisions locked so far

Re-read at the start of each session. Mirrored in `CLAUDE.md`, which loads into
every session automatically.

## Core systems

- **Energy is simultaneously the score and the survival budget.** One resource.
  Every point spent staying alive comes off the number being maximised.
- **Energy is worth more the closer the storm is** — ×2 within three floors, ×4
  within one and a half. The thing that kills you is the thing that pays you.
  This is the game's differentiator and is not negotiable.
- **A hit costs height, not hit points.** Slipping 1.5 floors feeds the storm,
  and the storm is the only way to lose.
- **The storm is a share of climb speed**, 0.80 rising +0.09 per split, so it
  gains on a clean run by the last section.
- **Climb speed ramps** 0.975 per floor — speed is the escalation.
- **The route choice uses the same input as the moment-to-moment.** You choose
  by being in that lane at the split. No menu, no pause, no second control.
- **Reaching floor 20 banks what you did not spend. Dying banks nothing.**

## Controls

Swipe left/right to change lane, tap to jump. Arrows or A/D and space on a
keyboard. Three spends: shield, surge, grapple. Reset arms on the first tap.

## The three structural rules that protect Playability

Playability is 25% and a runner is where it is easiest to lose it. These are
load-bearing, not polish:

1. **Lanes are discrete and snapped.** Horizontal position is a lane index,
   never a float. There is no "slightly off" to feel bad about.
2. **The world is a grid of `(lane, floor)` cells.** Collision is a map lookup
   at floor crossings. There is no continuous collision anywhere in the game,
   which is what keeps it deterministic, testable and physics-free.
3. **Coyote time and input buffering, 120ms each.** Without them a platformer
   reads as broken input rather than as difficulty.

## Scope — locked out, not pending

One tower, one climber, one resource. No health bar, no second economy, no
meta-progression or settlement, no unlockables between runs, no multiplayer, no
physics library, no ragdolls, no weather simulation, no second environment.

## Constraints — competition rules

Portrait, single-player, zero external network requests, `index.html` at the
top level of the zip containing all our own code unminified, libraries in
`vendor/` and not embedded, zip ≤ 35MB. Currently 178KB.

---

# PART 2 — Session log

## Session 1 — the decision to build a second candidate

**AI tools used:** Claude Code / Opus 5.

**What happened:** `../beanstalk` was finished, tested and submittable, but the
human judged its engagement ceiling too low and wanted something kinetic. The
model's advice was not to switch — one entry is allowed, and 19 days is better
spent finishing than restarting. The human reaffirmed, so this was built as a
second candidate rather than a replacement. Both exist; the choice is made at
the deadline on evidence.

**Key decisions, and why:**

- **Runner energy, but the player is not judged on reflexes.** A pure runner
  fits none of the three genres. The genre floor — gathering, converting, an
  escalating threat — had to stay dominant, so the moment-to-moment is two
  verbs and the decisions live in routing and spending.
- **The differentiator was chosen deliberately, not discovered.** The guidance
  tells every tower-defense entrant to build the same vertical lane, and by the
  same logic every climbing prototype will reward climbing fast. Making energy
  pay more near the storm inverts that: the skill becomes riding the front.
- **The model was wrong about one thing and was corrected.** It claimed the
  player "must not control the runner or the genre floor collapses". The human
  asked where the rules said that. They do not — it was a design opinion stated
  as a constraint. Direct control is allowed; the real risk is only that the
  hybrid crowds out the genre.

**What I learned:** verify a claim is a rule before presenting it as one.

## Session 2 — build steps 1-3, and three balance bugs

**What was built:** three snapped lanes, the grid world, automatic climb, the
storm, slips, splits, the three spends, the summit, banking and best-score
persistence.

**What playtesting changed.** Before writing a single test, the model scripted a
five-day playthrough and printed the curve. It found three bugs that reading the
design would not have:

| Bug | Evidence | Fix |
|---|---|---|
| The storm never threatened | It rose 0.06 floors/s against a climb of 0.91, so the gap grew to twenty | Storm is now a *share of climb speed*, crossing 1.0 by the last section |
| No difficulty at all | A constant 1.1s per floor gives over a second to read three lanes; a scripted run took **zero damage on every seed** | Speed ramps 0.975 per floor, tightening to ~0.6s |
| Two failure meters for one event | Health pips and the storm both punished a hit | Health cut. A hit costs height, height feeds the storm, storm is the only loss |

Cutting health also removed a spend, so "heal" became **grapple** — buying
height directly, which is a genuinely distinct job rather than a second way to
undo a slip.

**Biggest problems, and how they were solved:**

- Sections were generated at the moment of the split, which left the split floor
  itself ungenerated — a hole in the tower and a cell that resolved to nothing.
  Generation now runs two sections ahead, contiguously.
- `scene.fog` at 14–26 rendered the entire scene as flat sky colour, because an
  orthographic camera parked at z=30 puts every object about thirty units away.
  The human reported it as "cannot see the people". Removed.
- `seed()` reset the run without restarting it, so every scripted probe measured
  an empty run.

## Session 3 — the first human playtest

**Playtest verdict, verbatim:** *"I don't know how to play, graphic also ugly,
what is triangle and diamond for? a pill? not climber? not other effects?"*

The polish half is not scored and was left alone. The rest was a real failure
against the guidance's own checklist — *"a player can tell your game pieces
apart and read what is happening at a glance"*.

**What changed:**

- The climber was a capsule and so were the hazards, which is the worst possible
  pair to confuse. The climber is now a figure — head, suit, arms, legs, pack —
  with limbs that alternate as it climbs and tuck mid-jump.
- Hazards are three spikes rather than one cone, because a row of spikes is the
  most universally understood "do not touch" shape there is.
- Gaps were drawn as nothing, which reads as absence of information rather than
  danger. They now have broken stubs at each side.
- Effects, each tied to a state worth noticing: camera shake on a slip, the
  energy readout bumps on a pickup, fragments bob, the storm front churns, and
  lightning fires inside the storm so the danger band reads as alive and worth
  being near rather than merely fatal.
- The tutorial is one hint line ordered by urgency — the thing directly above
  you first, then what the storm is paying, then the route choice.

**A bug worth recording:** `lightningTimer` was never declared, and had been
throwing on every frame. An earlier edit had already rewritten the line that a
later edit tried to patch, and the string replace silently no-opped rather than
failing. Nothing caught it until the browser console was checked directly.

## Session 4 — packaging and submission artifacts

Packaging and zip verification were ported from `../beanstalk`, where they were
already proven, rather than rewritten. First run: 7/7 checks, 178KB zip, well
inside the 35MB cap.

**Considered and rejected this session:** building on an off-the-shelf Three.js
action template. The code was MIT, but the bundled art carried separate
licences, the template shipped ragdoll physics which is out of scope, an HDRI
and rigged character would threaten the size cap, and — decisively — *"the build
log should show the AI did the heavy lifting"*. Starting from a finished game
makes this document evidence against the entry rather than for it.

## Session 5 — the second human playtest, and the verdict that matters

**Playtest verdict, verbatim:** *"there is no climbing action, just the whole
thing move down by default. **but it is fun**"* and, in a second pass, *"no some
effect, there is no difference I touch the diamond or triangles. what's the
update of bottom tools, and what's space jump for?"*

The three words that matter are "but it is fun". That is the playtest gate
signal this project existed to get, and it is the reason the work below was
worth doing rather than abandoning the prototype.

**What was wrong, and it was all fair:**

- **The climb read as an elevator.** The body glided upward at a constant rate
  past a scrolling wall. It is now stepped: the simulation still advances
  `floor` continuously — nothing about collision or determinism changed — but
  the body is drawn lunging to the next ledge and settling on it, hand over
  hand in time with the pull. The same number, rendered differently.
- **Nothing passed, so ascent was invisible** whatever the body did. The tower
  face now has windows, a few of them lit.
- **Collecting a fragment looked like nothing happened, because it was.** The
  grid cell was deleted but the mesh was never removed, so the diamond stayed
  on screen after pickup. This was the single worst piece of feedback in the
  build and it was a plain bug. Fragments now burst upward and fade.
- **A hit looked like a pickup.** Slipping now flares the whole body red,
  shakes the camera harder, and names the cost — "HIT −1.5 FLOORS".
- **A bought shield was only visible on the button that bought it**, which is
  the wrong place — the player is watching the climber. It is a bubble now.
- **The spend buttons taught nothing when unaffordable.** They now read "need 5
  more" or "active" rather than sitting greyed out in silence.

**And jump was genuinely pointless — the playtest was right to ask.** Two
compounding reasons, both real:

1. A clear lane is guaranteed on every floor, so swiping always sufficed.
2. The arc lasted a fixed 0.42s while crossing a floor takes about 1.15s, so a
   jump usually expired before reaching the thing it was aimed at.

Jump now **skips a floor entirely** — no spikes, and no energy either — and its
duration is measured in floors rather than seconds, so it always clears the
next line whenever it is pressed. That makes it a trade in the game's own
currency, and it is self-limiting: jumping every floor is perfect safety and
zero income, which is the same decision the whole game is about.

**A bug worth recording, because it happened twice.** Both `lightningTimer` and
`flash` were used before being declared, and in both cases the cause was the
same: a string replace targeting a line that an earlier edit had already
rewritten, which silently no-opped instead of failing. The first threw on every
frame for an entire session before the console was checked. Grep for the actual
line before patching it.

---

# Still outstanding, stated plainly

- **There is no smoke test for this project.** Everything above was verified by
  scripted playthroughs, screenshots and console checks, not by a suite. The
  sibling project has 51 checks; this has none. That is the next task.
- **The playtest gate is provisionally passed.** The human's verdict after
  playing was "but it is fun", which is the signal the gate exists to produce.
  It has not yet been re-played since the climbing motion, pickup feedback and
  jump were fixed, and those change the feel substantially.
- Balance has been tuned only against scripted policies that read the grid
  perfectly. A human does not, so the difficulty is genuinely unknown.
