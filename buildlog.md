# Build Log: The Last Ascent — Genre: Survival & Resource Management

Kept during the build, per the format in *Creating and Maintaining a Build Log*:
a running list of locked decisions, then an entry per session.

**Tool(s), all sessions:** Claude Code (Anthropic), model Claude Opus 5,
driven conversationally from a terminal. No other code generator, no
second AI, and no third-party game template. Every source file here was
written by the model in response to prompts; the human directed, playtested,
rejected and approved. Where a single session used a different tool it is
named in that session's entry.

**Verification tooling:** Playwright driving real Chromium at 430 × 860, plus
scripted playthroughs that drive the simulation directly and report the curve.

Commit SHAs are in `git log`, and the messages carry the reasoning in full.

---

# PART 1 — Decisions locked so far

Re-read at the start of each session. Mirrored in `CLAUDE.md`.

## Genre floor — Survival & Resource Management

The guidance is explicit that a judge who cannot find the genre in your game
scores you badly in that lane. All three required elements, and where they are:

| Required element | Where it is |
|---|---|
| Gathering or collecting resources | Energy fragments and supply caches, collected by landing on or stepping into them |
| Converting them into something more useful through crafting, refining or upgrading | Energy → SHIELD (18), on the S key and a full-width button. The guidance's own core version asks for "a simple craft, refinement, or upgrade" — singular — so one reachable conversion clears the floor |
| A threat that escalates and that the player manages against | The storm line accelerates 1.3 → 1.7 levels/s and never stops; hazard density ramps from 0.30 to full by level 80 |

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
- **Danger ramps with height and reaches full early** — 0.30× at level zero to
  1.2× by level 80, then a plateau. It used to ramp across all 300 levels,
  which made the first two thirds read as easy.
- **Every upgrade is worn.** A perk the player cannot see is a perk they cannot
  play around; AIR SAVE in particular changes state mid-fall.
- **Milestones every 30 levels snapshot the score.** Dying keeps the last
  snapshot and loses everything since.
- **Summit at 300, and someone is standing on it.** Built at reset so they are
  on the tower from the first frame. Framing only — they cannot be hurt, there
  is no escort and no second win condition.
- **The climber is always on screen.** The camera is storm-anchored, but
  clamped so outrunning the line costs the multiplier and never the view.

## Controls

SPACE or tap to leap. A / D or swipe to change lane. **One spend: SHIELD, 18,
on the S key or a full-width button.** Reset arms on the first tap.

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
`vendor/`, zip ≤ 35MB. Currently 204KB.

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

## Session 11 — cutting two spends, and what the cut cost

Three spends were measured and two were deleted. A scripted run spent **zero
energy across twenty eight seconds** while able to afford a shield for 84% of
it, because the thumb never leaves the jump and three small buttons at the
bottom of a portrait screen are not reachable mid-climb. Three spends that
never fire are the "six things that each half-work" the guidance names.

SHIELD survives, on the **S** key, at **18** — double its old price, because it
is the only sink for energy now. SURGE paid to push back the storm, which is
the multiplier the whole game is built on: paying to reduce your own pay rate
needed a second of thought the player does not have. GRAPPLE bought height, and
height is free — press the jump.

**The cut was much larger than it looked, and only measurement showed it.**
SURGE was the scripted climber's constant crutch; without it, at the shipping
density, the summit went unreached on all ten seeds. Two findings came out of
the sweep that followed:

- **`scrollMax` does nothing to the bot.** 1.7 and 1.55 gave byte-identical
  results, because a policy that jumps on every grounded frame is never caught
  by the line. Every death is a spike or a gap. A dial that cannot move the
  measurement is not a difficulty dial for that measurement.
- **The shield's price *is* the hit budget.** A full climb absorbs about nine
  hits, so cost and hazard density are the same knob viewed from two ends.
  Density fell to 1.35 and the price doubled: fewer hits to take, each one
  dearer to prevent. Careful play now banks 91 against a blind climber's 15,
  where before the cut the two sat at 22 and 16.

The suite lost the SURGE and GRAPPLE tests — keeping tests for deleted features
is how a suite starts lying — and gained tests that the spend is *reachable*:
that S buys it, that holding S does not buy repeatedly, that exactly one spend
button exists at thumb size showing its key, and that the tutorial names it.

## Session 12 — the ramp, and letting a weak bot set the design

*"Why so little hazard now? Too easy."* — and the answer was that the model had
cut density to satisfy a measurement rather than a player.

**The scripted climber looked exactly one level ahead.** A lane clear now and
blocked above trapped it every time, so it was a far weaker player than a
person — and when deleting SURGE dropped it to zero summits, the density was
lowered to buy them back. At the *same* setting, one-level scored 0 summits and
75 average levels where a four-level lookahead scored 2 and 159. **The tower
was never too dense; the instrument was too blind, and a real design change was
made to satisfy it.** The suite reads four levels ahead now — roughly what fits
on the portrait screen, roughly what a person works from.

Fixing the instrument also exposed a helper bug: `climbTo` had
`if (keepEnergy) setEnergy(...) else if (health <= 1) buy('shield')`, so any
test pinning energy never shielded at all. It survived while the tower was
gentle and started failing the moment it was not, which reads as a difficulty
problem and is a one-word bug.

Then the real complaint: *"still easy until 200 level."* Correct, and
arithmetic confirmed it — danger ramped linearly to the **summit**, so level
200 sat at 1.23 of an eventual 1.7 and half the climb was below what level 150
felt like. Difficulty now reaches full at `dangerFull: 80` and plateaus:

| Level | before | now |
|---:|---:|---:|
| 25 | 0.42 | **0.58** |
| 50 | 0.53 | **0.86** |
| 100 | 0.77 | **1.20** |
| 200 | 1.23 | 1.20 |

Hard early rather than impossible late — steepening the ramp while keeping a
1.7 top put the summit out of reach of every policy available.

**Sealed floors measure 0% at every density tested up to 2.4**, so the
generator always leaves a lane and high density is hard rather than unfair.
That is the number to check before pushing density again.

## Session 13 — the upgrades nobody could see

*"When can air save be used? There is no notification like a shield. Maybe give
the man a dress or flying hat."*

Exactly right, and the worst case named first: the shield had a bubble, the
five split perks had nothing, and AIR SAVE is the only one whose state changes
*during* a fall — the moment you need to know whether you still have it is the
moment you are falling.

Each perk is now something the climber wears, on a different part of the
silhouette so they stack without merging: a flight cap (AIR SAVE), a halo
(MAGNET), boots (SPRING), gloves (GRIP), shoulder pips (SPARE SHIELD). The cap
is lit while the extra press is in hand and goes dead grey the instant it is
spent. One function drives all of it from state, so a new perk is one line
rather than a new system.

**Two placement bugs were caught by looking at a screenshot, not by the tests.**
The cap was centred below the crown of the head, so it buried its own base and
showed a sliver; the spare-shield pips were on the back of the pack, where the
camera never sees them. A marker behind the model is the same as no marker, and
the seam reported both as correctly visible.

## Session 14 — warnings where the eyes actually are

*"My focus is on the man and nearby levels, hard to read notice and warning at
top, that's why I need some indicator on the man, like the shield with green
ball."*

Every warning lived on the hint line at the top of a 860px portrait screen. The
player's eyes are on the climber and the two or three levels around him, so a
turn telegraphed for 1.6 seconds was telegraphed somewhere nobody was looking.

The fix deliberately does **not** invent a second priority ladder. `hint()`
already ranks every warning and tags it with a tone; the alert ring renders
*that* at the climber's feet as colour and pulse — red for a threat, violet and
spinning for an incoming turn, gold for a burning cache — with pulse rate tied
to the same rank. The text stays for anyone who wants to read it. A test
asserts the two can never disagree.

Two things the work turned up:

- **A dead entry in the tone map.** `close` was mapped to a colour but sits at
  rank 3, below the rank-4 gate, so it could never fire. A map entry that
  cannot fire is a lie about what the ring can say.
- **The camera is anchored to the storm, not the climber** (`centre =
  game.storm + 6.4`). A screenshot taken after `setStorm(-400)` showed an empty
  scene and looked like a serious rendering bug; it is a test-seam artifact,
  since no player can push the line 400 levels down. Worth knowing before the
  next person loses an hour to it.

## Session 15 — a reason to climb, and a camera that lost the player

*"What will be the winning ending? Does it require the game to play forever?"*

It does not. The rules require a *"clear goal and a win, lose, or reset
state"* — **or**, not and — and progression *"within a single play session"*,
which is also why there is no meta-progression tree. The summit, the two loss
states and reset already satisfied it.

The second question was better: *"should we have something at the 300 level
top, someone you will save?"* The argument against is our own working
agreement — a story that lives in a sprite is decoration, and Focus is scored.
The argument for won: the summit was a number and a glowing ball that only
existed **after** you had won, which is a target rather than a reason. Someone
standing up there, built at reset so they are on the tower from the first
frame, makes the goal a thing you can look at.

It is framing and only framing: no escort, no NPC that can be hurt, no rescue
timer, no second win condition. A test asserts the set of run-ending kinds is
still exactly `fell` and `summit`, so a second failure state cannot appear
quietly.

**And building it exposed the worst bug in the project.**

A screenshot taken near the summit came back with no climber in it. The camera
is anchored to the storm — `centre = game.storm + 6.4` — deliberately, since
the line is the clock and pinning it on screen is what makes closing on it feel
like closing on it. But it was anchored to the storm and nothing else, with no
clamp, and a climber gains on the line at roughly a level a second.

Measured across four seeds of competent play:

| Seed | reached | max gap | frames with the climber off the top |
|---:|---:|---:|---:|
| 1 | 111 | 50.6 | **81%** |
| 7 | 67 | 35.6 | **79%** |
| 13 | 24 | 15.2 | 30% |
| 21 | 146 | 75.4 | **83%** |

Past a gap of about 16 he was not drawn at all. Outrunning the storm is
supposed to cost the multiplier, not the ability to see yourself.

`camLead` clamps it: inside the zone the game is actually played in the
framing is byte-identical to before, and past that the camera follows the
climber. A test now asserts the climber stays inside the frame across full
runs with three levels of margin above him, because **every other test in the
suite asks the simulation what happened rather than whether it could be seen**
— which is exactly why 94 checks passed over a game that was invisible for
four fifths of a run.

## Session 16 — the markers nobody could read, and an unreachable opening


*"What is the hat triangle for, and foot circle?"*

Both had been built two sessions earlier and both were explained to the player
**in chat**, which is worth nothing to a judge opening the zip. The game itself
said nothing about either. Learning a mechanic from outside the game is the
same as not learning it.

The tutorial now names both channels — what the climber wears and what the ring
at his feet means — and two guards assert it keeps naming them, because every
other piece of tutorial text on this project has gone stale at least once.

Better than text: **the marker pops as the perk is granted.** The feed already
shouted the name and a new object already appeared on the climber, but nothing
tied the two together. The pop puts the word and the object on screen in the
same moment, which is the only moment the mapping can be learned.

*"If you cannot collect diamond in the first few levels, then no need to show
any there."*

Correct, and the reason is structural. The climber **starts standing on level
zero**, so a fragment in a neighbouring lane there can only be had by
sidestepping before the very first jump — while the game is telling him to
jump — and once he jumps he can never come back down. Measured: the seeds that
lost energy in the opening were exactly the seeds that generated it at level
zero.

The fix moved into the generator rather than being cleaned up afterwards, and
that mattered. The clean-opening rule used to delete cells in `reset()` **after
the section had already been generated and drawn**, and `drawCell()` appends a
new group rather than replacing one — so a deletion after drawing cannot take
the mesh with it. Enforcing it at generation means the wrong cell never exists
and there is nothing to un-draw.

## Session 17 — reading the official guidance properly, and one reverted change

**Tool(s):** Claude Code (Anthropic), Claude Opus 5.

**What I built/changed:** no gameplay change shipped. Re-fetched all four
official sources — the Design Guidance page and the three linked PDFs
(*Building a Prototype with AI*, the *Design-Intent Document* template, the
*Build Log* guidance) — and saved verbatim extractions to `docs/source/` so the
next session argues with the text rather than with memory.

**Key decisions, and why:**

- **Renamed `BUILD_LOG.md` → `buildlog.md`.** The Build Log guidance specifies
  the filename literally: "File format: Markdown (.md), named buildlog.md."
  We had shipped the wrong name for the whole project.
- **Rewrote the design-intent doc against the actual template.** Section 4 is
  named "the most important section" and must cover the primary action, the
  goal and win/lose/reset, *the feedback that tells the player they are doing
  well or badly*, and *why the loop is fun to repeat*. Ours covered the first
  two. Section 6 must describe what a judge sees in **one sitting**; ours
  described the mechanic instead. Both rewritten, 486/500 words.
- **The generator now enforces the template**, not just the word count: exact
  section headings in order, and a check for tables or images, since the
  template forbids renaming, reordering, merging or adding sections. Proved by
  renaming a heading and watching the build refuse.

**What I pivoted on, and what changed my thinking:** two things, and both were
the model being wrong.

1. **`CLAUDE.md` had the Focus criterion backwards.** It said "cutting is as
   valuable as adding", and that framing drove real decisions this project —
   including deleting two spends. The guidance says the opposite: *"Focus
   penalises sprawl and half-built systems, not ambition and not depth. A
   deep, complete, well-made game is more focused, not less. So there is a
   floor here, not a ceiling."* Corrected in `CLAUDE.md` with the quote, so it
   cannot be re-derived wrongly.
2. **I proposed and built an upgrade economy, then reverted it.** Reading the
   genre floor I judged the "converting" leg too thin — one shield — and made
   the five split upgrades cost energy, priced on the plate before the swipe.
   Then I re-read the guidance's own core version: *"a small loop of gathering
   one or two resources, **a simple craft, refinement, or upgrade**, and an
   escalating threat"*. Singular. One reachable conversion clears the floor,
   and we have one.

**Biggest problem, and how I solved it:** the upgrade economy measured badly
and I nearly shipped it anyway because it *sounded* right. Numbers across ten
seeds:

| Pricing | summits | avg level | banked | perks bought |
|---|---:|---:|---:|---:|
| free (shipping) | 2/10 | 123 | 88 | 5.9 |
| flat 5 | 0/10 | 62 | 12 | 3.0 |
| 2 +3/split +6/stack | 0/10 | 80 | 18 | 3.1 |
| same, +50% energy income | 1/10 | 101 | 48 | 3.5 |

A control run at price 1 scored 108, proving the collapse was economic rather
than a bug. Nothing recovered the baseline without re-tuning the whole economy,
two weeks out, with the playtest gate still undone — which is precisely the
half-built system Focus punishes. Reverted.

**What I learned:** re-read the primary source before designing against a
requirement, not after. I built an economy to satisfy a floor the guidance says
is already met, and only the measurement stopped it shipping.

**Where things stand / next:** 7/7 packaging, 97/97 smoke, 9/9 zip. PR #3
merged. Next: **playtest by a person**, then choose between this and
`../beanstalk`, since only one entry may be submitted.

## Session 18 — submission artifacts

Packaging and zip verification were ported from `../beanstalk` where they were
already proven. `npm run test:package` runs the guidance's own six-step
procedure: rebuild, unzip clean, serve locally, private window, internet off,
play a full session.

**Considered and rejected:** building on an off-the-shelf Three.js action
template. The code was MIT but the bundled art carried separate licences, it
shipped ragdoll physics which is out of scope, and decisively — *"the build log
should show the AI did the heavy lifting"*. Starting from a finished game makes
this document evidence against the entry.

## Session 19 — the human played it, and the submission materials

**Tool(s):** Claude Code (Anthropic), Claude Opus 5. No other AI tool was used
on this project at any point.

**What I built/changed:** no gameplay change. The human played the build — the
gate that had been outstanding for several sessions — and reported no defects
back. `The Last Ascent` was chosen over `../beanstalk` as the single entry.

Produced the Devpost-facing material, none of which is a required artifact:
a written story under Devpost's exact section headings, a core-loop diagram,
seven gallery screenshots, a 3:2 thumbnail, and two videos — 45 seconds of
uninterrupted play, and a 71-second captioned reel that demonstrates each
mechanic in turn.

**Key decisions, and why:** the repository was made **public** so the "Try it
out" field could point at the code. That publishes `buildlog.md`, which the
official guidance says is otherwise kept confidential by the organisers; the
tradeoff was raised and the human took it deliberately.

**Anything I pivoted on:** the first demo capture was a single competent run.
It never died, never spent a shield, never showed a gap or the summit — it
demonstrated that the game runs rather than what it is. Rebuilt as ten
choreographed scenes, each restarting the run so lives are full.

**Biggest problems, and how I solved them:**

- Driving input from Node round-tripped per keypress, far slower than the 3.3
  presses/second the game needs; the capture never got past level 4. Moving the
  driver inside the page onto `requestAnimationFrame` reached level 83.
- The caption bar sat directly over the storm-gap chip — the one number the ×4
  scene exists to show. Only visible by looking at sampled frames.
- `setFlip(1)` turned out to be **global and to survive `start()`**, so every
  split turned the tower and the seed that summits stopped summitting; the
  finale ended at 175 instead of 300 until it was reset to the shipping 0.55.
- Two seeds ending at exactly level 111 looked like a structural wall. It was
  not: 40 seeds give 31 distinct end levels, and the only repeated value with
  weight is 300 — five summits. Checked rather than assumed.

**What I learned:** a capture of a system is a measurement of it, and carries
the same failure modes — it needs sampling and checking, not trust. Three of
the four problems above were found by looking at frames, which is the same
lesson this project keeps relearning about screenshots versus tests.

**Where things stand / next:** submitted. 7/7 packaging, 97/97 smoke, 9/9 zip;
204KB zip; repository public. Remaining time goes to playtesting and re-uploading,
since Devpost accepts edits until the deadline.

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
| Holding a key auto-repeated the jump, so the tower climbed itself | No | Playing it after the rewrite |
| Three spends that no player could reach mid-climb | No | Instrumenting a run for energy actually spent |
| Cutting hazard density to satisfy a bot that could not see past one level | No | The human: "why so little hazard now?" |
| Danger ramping to the summit, so two thirds of the climb was easy | No | The human: "still easy until 200 level" |
| `keepEnergy` silently disabling shielding in a test helper | No | It only started failing once the tower got harder |
| Upgrades with no visible state at all | No | The human: "there is no notification like a shield" |
| A marker mesh placed behind the model, reported as visible by the seam | No | Looking at a screenshot |
| The camera losing the climber for ~80% of a competent run | No — 94 checks passed over it | A screenshot with no climber in it |

The pattern: the model's errors clustered where the code was *locally* correct
and *systemically* wrong, and where a measurement was trusted without checking
it measured anything. Almost every one was caught by a human playing or by
making the program report on itself — very few by re-reading source.
