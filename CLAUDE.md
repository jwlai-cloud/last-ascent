# The Last Ascent

A portrait Three.js prototype for the Meta Horizon Creator Competition: Game
Prototype. Genre: Survival & Resource Management. Deadline **2026-09-08 13:00 PT**.

Climb a collapsing tower you cannot stop climbing, above a rising storm. Energy
is both your score and your only means of survival, so every point spent staying
alive is taken off the number you are trying to maximise.

Sibling project: `../beanstalk` is finished and tested, and is the fallback if
this one fails its playtest gate. Do not delete it, and do not merge the two.

## Read these before changing anything

- `docs/game-design.md` — the authoritative spec. Where code and spec disagree,
  the spec is the intent and the code is the bug.
- `docs/competition-rules.md` — the competition's hard constraints, verbatim,
  including the genre floor and the six-step "test it the way we will run it".
- `NEXT_STEPS.md` — current state and the next task.

## Hard constraints — competition rules, not preferences

1. **Portrait orientation.** Single-player. No landscape layout, no orientation
   change during play.
2. **No external network requests, ever.** No CDNs, no web fonts, no analytics.
   A single external request fails the submission.
3. **`index.html` at the top level of the zip**, containing all of *our own*
   game code, readable and unminified. Third-party libraries live in `vendor/`
   and must NOT be embedded in `index.html`.
4. **Modular development is fine** — `src/` is inlined into `index.html` by the
   packaging step. Do not hand-write one giant file, and do not minify our code.
5. Total zip ≤ 35MB.

## The genre floor — a judge must be able to find these

From the official design guidance, for Survival & Resource Management:

> gathering or collecting resources; converting them into something more useful
> through crafting, refining or upgrading; a threat that escalates and that the
> player manages against.

Here: collecting energy fragments; converting energy into shields; the storm
rising from below. If a change weakens any of the three, it is
wrong regardless of how good it feels.

## Explicitly out of scope

- Multiplayer of any kind.
- **Any physics solver, ragdoll, or physics library.** The climber moves on
  kinematic arcs between grid cells. This is not a preference — see below.
- Detailed creature animation. Hazards are capsules and silhouettes.
- Dynamic weather systems or day/night cycles. The storm is one rising number
  with a visual, never a simulation.
- Meta-progression, settlement building, unlocks between runs. Judges play one
  sitting; anything that only unlocks later will not be seen.

## The three structural rules that protect Playability

Playability is 25% and a runner is where it is easiest to lose. These are
load-bearing:

1. **Lanes are discrete and snapped.** The climber's horizontal position is a
   lane index, never a float. There is no "slightly off".
2. **The world is a grid of `(lane, floor)` cells.** Collision is a cell
   lookup. There is no continuous collision anywhere in the game, which is what
   keeps it deterministic, testable, and free of physics.
3. **Coyote time and input buffering are not polish.** Removing them makes the
   game feel broken. Keep both.

## What the judges score

| Weight | Criterion | What carries it here |
|---:|---|---|
| 30% | Player Engagement | The route choice, and energy being score and fuel at once |
| 25% | Playability | Snapped lanes, grid collision, two verbs, input forgiveness |
| 20% | Core Loop Design | Climb, collect, choose, spend, survive |
| 15% | Focus | One resource, three spends, two verbs. Cut before adding. |
| 10% | Originality | The score *is* the survival budget |

**Visual polish is explicitly not scored.** The bar is legibility: the player
must read lane, hazard, gap and storm distance at a glance.

## Working agreements

- **One tower, one climber, one resource.** No second level, no second economy.
- **Every mechanic must be a system, not decoration.** Visual polish scores
  zero, so a joke that lives in a sprite is wasted work.
- **Keep numbers in one config object** near the top of the game source.
- **Playtest before adding.** The loop is playable at build step 4. If the swipe
  does not disappear from your attention, the fix is tuning what exists.
- Prefer the smallest change that works. Reuse before writing more.

## Commands

```bash
npm install            # dev-only Playwright, never ships in the zip
npm run serve          # static server on 4190
npm run test:smoke     # portrait control and loop checks in real Chromium
npm run package        # inline src/ into dist/index.html, validate, write the zip
npm run test:package   # the smoke suite against the packaged build, then the zip
```

`npm run test:smoke` tests `src/`. The submitted `index.html` is a different
file. Before any submission, `npm run test:package` is the one that counts.

The suite drives a real browser at 430 × 860. Half of it pauses the render loop
and advances the simulation by hand through `window.ascent.step(dt, n)`, so
timings are exact rather than wall-clock guesses. Keep `getState()` current.

## Code conventions

- Vanilla ES2022, no build step, no framework, no bundler.
- `src/ascent.js` is an IIFE reading `window.THREE` from the local vendor copy.
- Comments explain *why*, especially for tuned constants.
- Match the surrounding style rather than introducing a new one.

## Branching

`main` lands through pull requests. `git config core.hooksPath .githooks` once
per clone enables a guard that refuses a direct push to `main`.
