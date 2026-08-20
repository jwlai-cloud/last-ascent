# The Last Ascent — game design

Genre: **Survival & Resource Management**. Portrait, single-player, one tower.
Competition rules and judging weights: `docs/competition-rules.md`.

This is the authoritative spec. Where the code and this document disagree, this
document is the intent and the code is the bug.

---

## The pitch

> You are climbing a gigantic abandoned tower above a storm-filled city. You
> never stop climbing. The storm never stops rising. Everything you pick up on
> the way is both your score and your only way to survive the next floor — and
> spending it to stay alive is spending the run you came for.

## The core loop

```
   CLIMB automatically, always upward
        │
   SWIPE between three lanes · TAP to jump
        │
   COLLECT energy    ──►  energy is your SCORE
        │                 energy is also your only FUEL
        ▼
   AT EACH SPLIT choose a lane:  SAFE · DANGER · UNKNOWN
        │
   SPEND energy to survive  ──►  and your score goes down as you do
        │
   THE STORM rises from below, faster each floor
        │
   REACH THE SUMMIT (floor 20) and bank what is left
```

Primary action: **steering a climber you cannot stop.** The repeating decision
is *spend to live, or keep to score.*

## The one idea the design rests on

**Energy is simultaneously the score and the survival budget.**

There is exactly one resource. Every fragment you collect raises your score.
Every point you spend on a shield, a surge or a heal takes it straight back off.
So survival is never free and never abstract — the cost of staying alive is
displayed as the number you are trying to maximise, going down.

This is what stops the game being a reflex test with a counter attached. A
better player is not the one with faster thumbs; it is the one who needed to
spend less.

## Why the route choice is the whole game

Every four floors the tower splits and the three lanes visibly diverge:

| Lane | What it gives | What it costs |
|---|---|---|
| **SAFE** | Wide platforms, few hazards | Almost no energy — the storm gains on you |
| **DANGER** | Dense energy, collapsing ledges | Damage if you misjudge it |
| **UNKNOWN** | A sealed section — could be a windfall or a trap | You do not know until you are in it |

**The choice uses the same input as the moment-to-moment.** You choose a route
by being in that lane when you reach the split. No menu, no pause, no modal, no
second control scheme. That single decision keeps Focus intact (there is no
second UI to build) and Playability intact (the run is never interrupted).

Three lanes, one swipe, and the strategy layer and the action layer share an
input. That is the design.

## How the rubric weaknesses are engineered out

A runner is a riskier prototype than a menu game. These are deliberate,
non-negotiable structural choices, not polish:

### Playability — 25%, the biggest risk in a runner

- **Three discrete lanes, snapped.** No analog horizontal position, ever. A
  swipe changes lane index. There is no "slightly off" to feel bad about.
- **Constant ascent speed the player cannot control.** Removes an entire class
  of "am I doing this right" confusion, and it makes the storm chase legible.
- **The world is a grid of `(lane, floor)` cells.** Hazards, platforms and
  energy live in integer cells. Collision is a cell lookup, not geometry.
  **There is no physics solver, no collision solver, and no float-precision
  feel bug, because there is no continuous collision at all.**
- **Coyote time and input buffering, 120ms each.** The difference between a
  platformer that feels good and one that feels broken, for about ten lines.
- **Two verbs only.** Swipe to change lane, tap to jump.

### Focus — 15%, whose named failure mode is six half-working things

- **One resource.** Energy. Health is three pips, which is a life counter and
  not an economy.
- **Three spends.** Surge, shield, heal. Each has a distinct job.
- **Cut before building:** jump charge, temporary shelter, gear durability,
  settlement building, meta-progression, unlockables between runs.

### Engagement — 30%

- Push-your-luck is native rather than bolted on: the danger lane is where the
  score is, and the summit banks only what you did not spend.
- Every run differs by which routes you took and what the unknown lane held.
- Near-miss memory: the summit is reachable but the *rich* summit is not, quite.

## Numbers

All tunable, all in one `config` object.

- **Floors to the summit:** 20.
- **Climb speed:** 1 floor / 1.1s, constant.
- **Storm:** starts 4 floors below, closes 0.06 floors/s, +12% each split.
- **Energy fragment:** 1 each. Safe lane ~1/floor, danger ~4/floor.
- **Health:** 3 pips. A hazard costs 1.
- **Spends:** shield 6 (absorb one hit), surge 8 (push the storm back 1.5
  floors), heal 10 (one pip).
- **Split:** every 4 floors, so four choices per run.
- **Session length:** about 90 seconds, which is what lets a judge play twice.

## Win / lose

- **Win:** reach floor 20. Score is the energy you still hold, plus a summit
  bonus. The escape beacon fires.
- **Lose:** the storm reaches you, or health hits zero. **You bank nothing** —
  the same asymmetry that makes a run worth finishing.
- **Reset:** one button, always available.

## What this is not

Out of scope by the competition's own design guidance, and not open for
revisiting:

- No physics solver, no ragdolls. The climber moves on kinematic arcs between
  grid cells.
- No detailed creature animation. Hazards are capsules and silhouettes.
- No weather *system*. The storm is a single rising number with a visual, not a
  simulation. Storm surges, if added, are discrete telegraphed events.
- No multiplayer, no meta-progression, no settlement, no second arena.
- No landscape layout, no orientation change.

## Build order

1. The tower, the three lanes, constant ascent, and the camera. Lane changes
   snap and feel right at 430 × 860.
2. Grid cells: platforms, gaps, energy. Collection and the score readout.
3. The storm, health, and the two losing states.
4. Splits and the three route types. **The game is judgeable at the end of this
   step — playtest it five times before adding anything.**
5. The three spends, and the score-versus-survival tension they create.
6. The summit, the beacon, banking, and best-score persistence.

Then: packaging, the design-intent `.docx`, and the build log.

## The playtest gate

At the end of step 4, play it five times. The test is not whether it seems fun
in the abstract. It is whether the swipe feels good enough that you stop
noticing it, and whether you ever regret a route.

If the input does not disappear, no amount of design fixes it, and the honest
move is to fall back to `../beanstalk`, which is finished and tested.
