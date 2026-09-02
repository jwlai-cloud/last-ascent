## Inspiration

Every climbing game I have played rewards climbing fast. That always felt like a wasted tension: the thing trying to kill you is the most interesting thing on the screen, and the moment you escape it the game turns safe and boring.

So I inverted it. Energy is worth **four times more within 1.5 levels of the storm** and double within three. Outrun the line and you outrun your own income. The best place to stand is the one that nearly kills you, and the whole game is the argument you have with yourself about how close to sit.

## What it does

A single-player, fixed-portrait climb up a 300-level collapsing tower, with a storm line rising underneath you that never stops.

1. **Press once, climb one level.** Nothing carries you upward. Stand still and the tower falls away beneath you.
2. **Choose one of three lanes, in mid-air.** A ledge is safe, spikes cost a life and your footing, a gap drops you through.
3. **Gather energy** where you land — and energy is simultaneously your score and your only survival budget.
4. **Convert it.** One spend: 18 energy buys a shield that eats the next hit, paid straight out of the number you are scored on.
5. **Bank or push.** Every 30th level snapshots your score. Die and you keep only the snapshot. Reach 300 and keep everything, plus a 300 bonus.

Every fourteen levels the lanes split into **safe / danger / unknown**, each carrying a different upgrade, so one swipe picks your route, your risk and your perk together. Sometimes the tower turns and the lanes above you come back mirrored, with 1.6 seconds of warning telegraphed four different ways.

## How we built it

Vanilla ES2022 and Three.js. **No engine, no bundler, no framework, and no asset files at all** — every mesh is procedural geometry and every sound is synthesised at runtime through the Web Audio API. The whole submission is a **204KB zip** that makes zero network requests.

The decision that made it work: **the world is a grid of `(lane, level)` cells in a `Map`**. Collision is a map lookup on landing. No continuous collision anywhere, no physics solver, and no "slightly off" lane — which is what keeps a jumping game deterministic and fair.

Development ran across as many modules as kept it readable, with a packaging step that inlines my own code into one unminified `index.html` and leaves Three.js external in `vendor/`.

`window.ascent.getState()` / `step(dt)` / `setCell()` is a test seam wired into the same tick the render loop drives, so **97 automated Playwright checks** run against real Chromium at 430×860 — including a balance regression that plays ten seeded runs and asserts careful play still beats careless.

Built entirely by prompting Claude Code (Claude Opus 5). Every source file was written by the model; I directed, playtested, rejected and approved. The session-by-session record, including everything that failed, is in the build log.

## Challenges we ran into

**Holding the jump key climbed the tower by itself.** The keydown handler had no `e.repeat` guard, so holding space fired at the OS auto-repeat rate — quietly restoring the exact automatic-climb model the game had been rewritten to remove. Every difficulty judgement made before I found it had been measured against a game you could hold a key on.

**The camera lost the player for about 80% of a competent run.** The view was anchored to the storm line — deliberately, since the line is the clock — but with no clamp. A climber gains on the line at roughly a level per second, so past a gap of about 16 the climber simply was not drawn. Every check in the suite passed over this, because all of them ask the simulation what happened rather than whether it could be seen.

**A test bot that could only see one level ahead was setting the difficulty.** When it started failing I reduced hazard density to compensate. That was backwards: at the identical setting, a one-level policy scored 0 summits and 75 average levels where a four-level lookahead scored 2 and 159. The tower was never too dense — the instrument was too blind, and I had changed the game to satisfy it.

**I built an upgrade economy and then deleted it.** Reading the genre requirements I decided the "converting resources" leg was too thin and made all five perks cost energy. Measured across ten seeds it took average levels from 123 to 80 and summits from 2 to 0, and nothing recovered it without re-tuning the entire economy a week from the deadline. Reverted. A half-tuned system is worth less than no system.

## Accomplishments that we're proud of

- **97/97 automated checks**, 7/7 packaging checks, and the competition's own six-step offline procedure all passing against the packaged zip.
- **204KB total**, with zero asset files and zero network requests.
- A balance regression that measures the right thing: careful play banks **88** against a reckless climber's **11**, and a competent policy summits **5 times in 40 seeds** — hard, but demonstrably winnable.
- **Every upgrade is visible on the climber** — a cap for the extra mid-air jump that greys the instant you spend it, plus a halo, boots, gloves and shoulder pips — and a ring at his feet carries the same warning the text does, because a player's eyes are on the character, not on a line of text at the top of the screen.

## What we learned

**Automated tests are structurally blind to whether a game can be seen.** Four separate defects were caught by looking at a screenshot or by a person playing — the invisible climber, a marker mesh placed behind the model, unreadable upgrade state, and pickups at level zero that could never be collected — while a large and genuinely useful test suite passed over every one of them. The suite is excellent at stopping regressions and nearly useless at finding that class of fault.

The second lesson is cheaper to state and was more expensive to learn: **when a measurement disagrees with the design, check the measurement first.**

## What's next for The Last Ascent

Keep one tower, one climber, one resource, and deepen the reasons to stay low rather than bolting on a second economy: hazard types that change *where* the safe lane is rather than how many hazards there are, and a real reason to deliberately drop back toward the line.
