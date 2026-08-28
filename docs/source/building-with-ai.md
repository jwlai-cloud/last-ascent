# Building a Prototype with AI (case study)

> Verbatim extraction of the official PDF, captured 2026-08-24.
> Kept because the 2026-08-19 capture of the rules was incomplete and cost real work.
> The Official Rules are authoritative; where this disagrees with them, the Rules win.

Building a Prototype with AI: a case study 
What this is, and what it is not 
Before running this competition, we built a prototype under the same constraints you have: with 
AI,
 in
 
Three.js,
 for
 a
 mobile
 browser.
 
A
 small
 arcade
 shooter,
 built
 over
 about
 five
 days
 by
 someone
 who
 did
 not
 write
 the
 code.
 
This is a write-up of how that went. It is here because a few people asked what the process actually
 looks
 like.
 
It is one approach, not the approach. Nothing here is required. You can use different tools, a different
 order,
 or
 no
 process
 at
 all.
 
Plenty
 of
 good
 prototypes
 will
 be
 built
 in
 ways
 that
 look
 nothing
 like
 this.
 
How you build is not scored. The judging criteria are about the game a player experiences: is it
 engaging,
 does
 it
 work,
 is
 the
 core
 loop
 good,
 is
 it
 focused,
 is
 it
 original.
 
Nobody
 is
 scoring
 your
 method,
 and
 following
 this
 guide
 will
 not
 earn
 you
 points.
 
What is required is on the next section, and only that. 
What your submission actually has to be 
These are requirements. Everything after this section is optional. 
● Single-player. No multiplayer of any kind. ● Fixed portrait orientation. It must not rotate. ● A self-contained build. Everything bundled inside your .zip, referenced with relative paths,
 and
 no
 network
 request
 of
 any
 kind
 while
 the
 game
 runs.
 
No
 
CDN
 links.
 ● A single .zip, 35MB or under , with index.html at the top level of the zip. Your game code
 in
 index.html, readable and unminified. Libraries in a vendor folder. ● Three artifacts: the build, a design-intent doc, and a build log. 
The Official Rules are the authoritative version. If anything here disagrees with them, the 
Rules
 win.
 
Read
 the
 
Design
 
Guidance
 for
 what
 judges
 reward
 and
 for
 genre
 detail.
 
One thing worth knowing up front, because it is the single most common way a build fails validation:
 
AI
 will
 link
 to
 
Three.js
 on
 the
 internet
 unless
 you
 tell
 it
 not
 to.
 
More
 on
 that
 below.
 
 

How our build went 
Designing it with AI first 
We used two tools: a conversational AI for design, and a separate AI coding agent for the build. 
That
 split
 is
 not
 necessary,
 and
 plenty
 of
 people
 do
 the
 whole
 thing
 in
 one
 tool.
 
What
 we
 got
 out
 of
 it
 was
 arriving
 at
 the
 build
 with
 a
 design
 that
 had
 already
 been
 argued
 with,
 and
 two
 
AIs
 catching
 each
 other's
 mistakes.
 
We started with a few sentences. Not a pitch, just the idea: 
I want to build a [GENRE] game inspired by [REFERENCE GAMES]. It runs
 in
 a
 mobile
 browser
 in
 fixed
 
PORTRAIT
 orientation,
 built
 in
 
HTML5/Three.js,
 and
 it
 is
 
SINGLE-PLAYER.
 
The
 vibe
 is
 
[AESTHETIC].
 
The
 basic
 idea:
 
[1-3
 
SENTENCES
 
ON
 
THE
 
CORE
 
GAMEPLAY].
 
The most useful thing we did in the whole design phase was stop specifying and let the AI ask instead:
 
Before you start designing, interview me. Ask about every aspect of this
 game:
 mechanics,
 controls,
 art
 direction,
 audio,
 progression,
 difficulty,
 narrative,session
 length,
 and
 technical
 constraints.
 
Do
 not
 assume
 anything.
 
Ask
 everything.
 
Answering that in one long unfiltered pass surfaced decisions we had not realised we had opinions
 about.
 
Dictating
 rather
 than
 typing
 made
 it
 looser
 and
 better.
 
Then:
 
Based on our conversation, produce a complete game design document covering
 mechanics,
 progression,
 art
 direction,
 audio,
 narrative,
 technical
 requirements,
 and
 scope.
 
What came back was overscoped and slightly contradictory, which we gather is normal. 
Two different documents, easily confused. The design document above is yours , a
 working
 reference.
 
The
 competition
 separately
 asks
 for
 a
 design-intent
 doc
 of
 

None about 500 words on a fixed template, which is a short summary for judges. They are
 not
 the
 same
 thing.
 
Arguing with the design before building it 
This was the highest-value hour of the project. We had the AI critique its own design as two different
 experts:
 
Review this entire design document wearing two expert hats, one at a
 time.
 Hat 1, expert game designer: look for design gaps, conflicting mechanics,balance
 problems,
 missing
 specifications,
 and
 anything
 that
 makes
 the
 game
 less
 fun
 or
 confusing.
 Hat 2, expert game producer: look for scope risks, technical infeasibility,schedule
 concerns,
 and
 anything
 that
 would
 stop
 this
 from
 shipping.
 For every issue, classify it BLOCKER, HIGH, MEDIUM, or LOW, and number
 them
 all.
 
The first pass came back with about thirty issues and several blockers. The second, after resolving
 those,
 found
 around
 a
 dozen.
 
The
 third
 was
 cleanup.
 
Somewhere
 in
 the
 first
 pass
 was
 the
 single
 biggest
 design
 decision
 of
 the
 project,
 and
 we
 would
 not
 have
 found
 it
 by
 staring
 at
 the
 doc
 ourselves.
 
When we did not understand why the AI thought something was a problem, asking it to explain was
 usually
 worth
 more
 than
 the
 fix
 itself.
 
None of this is binding. The design kept changing once the thing was playable, which is the point
 of
 building
 a
 prototype
 at
 all.
 
Handing over to the coding agent 
The coding agent had never seen any of the design conversation, so everything had to travel with
 it:
 

Create a handoff package for an AI coding agent that will build this
 game.
 
It
 has
 never
 seen
 our
 conversation,
 so
 everything
 must
 be
 self-contained.
 
Include:
 1. The final design document, complete. 2. A phase-by-phase build plan. Put the fundamentals (core loop, basic
 mechanics,
 player
 controls)
 in
 the
 earliest
 phases,
 then
 layer
 in
 complexity
 later.
 
Each
 phase
 must
 produce
 a
 playable,
 testable
 chunk
 
I
 can
 try
 and
 give
 feedback
 on
 before
 moving
 on.
 3. A short context file (project overview, key decisions, constraints).
 
Core-loop-first mattered more than we expected. Playing the heart of the game in the first couple
 of
 days
 is
 where
 we
 learned
 whether
 it
 was
 fun,
 and
 it
 was
 much
 cheaper
 to
 change
 then
 than
 later.
 
Before letting it write anything, we had it interrogate the plan: 
I'm handing you a game design from another AI tool. Before we build:
 1. Read everything carefully. 2. Audit for conflicts between the design doc and the build plan. 
Flag
 any
 inconsistencies.
 3. Identify technical risks. What could go wrong architecturally? 4. Assess the build plan and restructure it if needed. 5. Make sure each phase produces a playable, testable chunk I can try
 before
 moving
 on.
 The design document is the source of truth. If the plan contradicts it,
 the
 design
 doc
 wins.
 
It caught things the design tool had missed, which is a good argument for the two-tool split even though
 it
 is
 not
 required.
 
The constraints we wish we had set on day one 
We did not, and it cost us. An AI coding agent will pull Three.js from a CDN, build in landscape,
 and
 split
 your
 code
 across
 files
 unless
 told
 otherwise.
 
All
 three
 are
 things
 the
 

None competition does not allow, and all three are far cheaper to set at the start than to retrofit at the end.
 
If we were starting again, this would go in before any code existed: 
Four hard constraints for this build. 1. SINGLE-PLAYER. No multiplayer of any kind. 2. FIXED PORTRAIT. Size the canvas to a phone-shaped portrait viewport.
 
It
 must
 not
 rotate
 or
 reflow
 to
 landscape.
 3. FULLY SELF-CONTAINED. Bundle every library, font, image, sound and
 data
 file
 into
 the
 project
 folder
 and
 reference
 them
 with
 relative
 paths.
 
No
 
CDN
 links,
 no
 external
 
URLs,
 nothing
 loaded
 from
 the
 internet
 while
 the
 game
 runs.
 
If
 you
 would
 normally
 pull
 
Three.js
 from
 a
 
CDN,
 download
 it
 into
 a
 folder
 called
 vendor
 and
 reference
 it
 from
 there.
 
If
 it
 loads
 through
 an
 import
 map,
 keep
 the
 import
 map
 and
 repoint
 it
 at
 the
 local
 copy
 in
 vendor.
 4. FILE LAYOUT. Structure the source across as many modules as keeps
 the
 code
 clean,
 then
 set
 up
 a
 build
 step
 now,
 on
 day
 one,
 that
 assembles
 all
 of
 
MY
 game
 code
 into
 a
 single
 index.html.
 
That
 output
 must
 be
 
UNMINIFIED
 and
 readable,
 and
 third-party
 libraries
 must
 
NOT
 be
 embedded
 in
 it,
 they
 stay
 as
 separate
 local
 files
 in
 vendor.
 
If
 you
 use
 a
 bundler,
 disable
 minification
 and
 mark
 the
 libraries
 external.
 
If your AI tool cannot do this for you 
Some AI tools build entirely in the browser and cannot pull library files into your project.
 
If
 yours
 cannot,
 ask
 in
 the
 competition
 channel
 or
 bring
 it
 to
 a
 mentor
 session.
 
It
 is
 a
 quick
 fix
 and
 we
 can
 walk
 you
 through
 it
 for
 whatever
 tool
 you
 are
 using.
 
Building it, phase by phase 
The build settled into a rhythm: agree the plan for a phase, let it build, play it, describe what felt wrong,
 iterate,
 move
 on.
 

Asking it to host the game locally so we could actually play each phase was the thing that kept the
 project
 honest:
 
Can you host the game so I can test it? Then tell me what I should verify
 in
 this
 phase.
 
I
 will
 be
 testing
 in
 portrait
 at
 a
 phone-sized
 viewport.
 
Describing the experience worked far better than describing the bug. The coding agent is good
 at
 diagnosing
 from
 plain
 language,
 and
 we
 were
 bad
 at
 guessing
 at
 causes:
 
We were tempted to say What worked better 
"There is a bug in the collision function" 
"When I fly into an enemy, nothing happens, no damage or explosion" 
"The spawn rate is too high" "Enemies appear so fast I cannot dodge any of them" 
"The object pool is not releasing" "My ship stops shooting after about ten seconds" 
We also kept the design doc alive, updating it between phases rather than mid-code, so it always
 described
 the
 game
 as
 it
 actually
 was
 rather
 than
 as
 we
 had
 originally
 imagined
 it.
 
The number that surprised us most: roughly two thirds of the total time went into playtesting and
 tuning,
 not
 into
 building
 features.
 
Generating
 a
 feature
 was
 fast.
 
Making
 it
 feel
 good
 was
 slow,
 and
 that
 gap
 is
 where
 the
 difference
 between
 a
 forgettable
 prototype
 and
 a
 fun
 one
 turned
 out
 to
 live.
 
Before any large new phase we had it clean up first: 
Before we start the next phase, audit all existing source files for bugs,technical
 debt,
 dead
 or
 duplicated
 code,
 and
 anything
 that
 could
 cause
 problems
 as
 we
 add
 complexity.
 
Fix
 what
 you
 find,
 and
 surface
 any
 design
 notes
 from
 earlier
 phases
 that
 need
 attention.
 
One audit found five real bugs and split a file that had grown to a thousand lines doing six unrelated
 jobs.
 
That
 refactor
 was
 only
 possible
 because
 the
 source
 was
 in
 separate
 modules,
 which
 is
 worth
 knowing
 if
 you
 are
 deciding
 how
 to
 organize
 things
 early.
 
Things we got wrong 

● AI edits fail silently on large files. After any refactor we learned to ask: "Verify that all the
 changes
 you
 just
 made
 actually
 landed
 correctly."
 
We
 lost
 time
 to
 a
 phantom
 bug
 that
 was
 really
 a
 failed
 edit.
 ● The AI never once told us something was not fun. It built everything we asked for, enthusiastically,
 including
 the
 things
 we
 should
 not
 have
 asked
 for.
 
Scope,
 taste
 and
 game
 feel
 stayed
 entirely
 with
 us.
 
Telling
 it
 to
 argue
 back
 helped:
 
Be objective. If any of my choices do not make sense from a design, technical,or
 player-experience
 standpoint,
 push
 back
 and
 tell
 me
 why.
 
Do
 not
 just
 build
 what
 
I
 ask,
 challenge
 it
 if
 there
 is
 a
 better
 option.
 
● We started polish too early once , and it disguised a core loop that was not yet good. 
Stripping
 it
 back
 was
 the
 right
 call
 and
 it
 stung.
 ● We used CDNs for everything : Three.js, the music, some images, the fonts. It worked fine
 for
 a
 personal
 project
 played
 online,
 and
 it
 would
 have
 failed
 this
 competition's
 validation
 four
 times
 over.
 
See
 below.
 
The things most likely to trip you up 
These are about the submission rather than the process, so they are worth taking seriously even
 if
 you
 ignore
 everything
 else
 here.
 
Anything that quietly reaches the internet. The obvious one is the Three.js CDN link. The less
 obvious
 ones
 are
 web
 fonts
 from
 a
 font
 service,
 placeholder
 images
 from
 a
 service
 like
 placehold.co,
 and
 music
 files
 hosted
 online.
 
Any
 of
 these
 will
 fail
 validation.
 
Bundle
 the
 font,
 draw
 or
 generate
 your
 art
 in
 the
 project,
 and
 download
 any
 music
 into
 your
 project
 folder
 and
 count
 it
 against
 your
 
35MB.
 
Sound effects are easier than you think. Simple retro effects can be generated in code via the
 
Web
 
Audio
 
API
 with
 no
 files
 at
 all,
 which
 is
 both
 quick
 and
 automatically
 self-contained.
 
Describe
 the
 sound
 in
 plain
 language
 and
 iterate.
 
Your browser will lie to you about whether the build is self-contained. After a week of building,
 everything
 you
 loaded
 from
 the
 internet
 is
 cached ,
 so
 a
 
CDN-dependent
 build
 runs
 perfectly
 on
 your
 machine
 and
 fails
 on
 ours.
 
This
 is
 the
 check
 that
 catches
 it:
 

1. RE-RUN YOUR BUILD. If you changed any source file since the last build,your
 index.html
 is
 stale
 and
 you
 are
 about
 to
 submit
 the
 wrong
 game.
 2. Unzip your submission into a clean folder. 3. Serve it with a local web server. Ask your coding agent to start one.
 4. Open it in a PRIVATE or incognito window, so nothing is cached. 5. Turn your internet off. 6. Play a full session in portrait, at a phone-sized viewport. If anything
 is
 missing,
 silent,
 or
 the
 screen
 is
 black,
 something
 is
 still
 loading
 from
 the
 internet.
 
Find
 it
 and
 bundle
 it.
 7. Open index.html in a text editor. You should be able to read your
 own
 game
 code
 in
 it.
 
If
 it
 is
 one
 long
 unreadable
 line,
 your
 build
 minified
 it.
 
Turn
 minification
 off
 and
 rebuild.
 
Do not test by double-clicking index.html. It can fail on a build that is completely fine, which
 sends
 people
 off
 undoing
 work
 that
 was
 correct.
 
Keep a build log as you go , rather than reconstructing one at the end. It is one of the three things
 you
 submit,
 it
 is
 not
 scored,
 and
 having
 your
 
AI
 maintain
 it
 from
 day
 one
 costs
 nothing.
 
The
 
Build
 
Log
 guide
 has
 the
 format.
 
Other ways people do this 
Worth saying plainly, because none of the above is required: 
● One tool instead of two. Design and build in the same conversation. Simpler, but you lose
 the
 cross-check.
 ● No design document at all. Start from a rough idea and let the game emerge through play.
 
This
 can
 work
 well
 for
 a
 tight
 single-loop
 prototype,
 which
 is
 exactly
 what
 this
 competition
 asks
 for.
 ● Start from something that already exists. A previous project of your own, reshaped. ● Design entirely on paper first , and use AI only for the build. ● Skip the phase structure. Build the whole thing in one long session and refine it. 
The only things that actually matter are on the submission page: a genuinely playable, focused, single-player
 game
 in
 portrait,
 packaged
 correctly.
 
How
 you
 get
 there
 is
 yours.
 
Quick reference: the prompts 

Lift any of these, change them, or ignore them. 
For Prompt 
Starting design 
"I want to build a [GENRE] game inspired by [GAMES]. Mobile browser, fixed portrait, single-player. [AESTHETIC]. [BASIC IDEA]." 
Being interviewed 
"Before you design, interview me about every aspect: mechanics, controls, art, audio, progression, narrative, constraints. Ask everything." 
The design document 
"Produce a complete game design document covering all aspects of the game." 
The expert-hat review 
"Review the design as expert game designer + expert producer. Classify every issue BLOCKER/HIGH/MEDIUM/LOW." 
The handoff "Create a self-contained handoff: final design doc, phase build plan (each phase a playable chunk), context file." 
Starting the build 
"Audit the handoff for conflicts and technical risks. The design doc is the source of truth." 
Build constraints 
"Single-player. Fixed portrait, phone viewport, must not rotate. Fully self-contained: bundle every library, font and asset locally, relative paths, no external URLs. My game code assembled into one unminified index.html; libraries stay separate in vendor." 
Playtesting "Host the game so I can test it. Then tell me what to verify. I'll be testing in portrait." 
Cleaning up "Audit all source files, fix issues, and surface any design notes that need attention." 
Verifying an edit 
"Verify that all the changes you just made actually landed correctly." 
Making it argue 
"Be objective. Push back if a choice does not make sense. Do not just build what I ask." 
The build log "Maintain a running build log. At the end of each session I'll ask you to update it." 
Final check "Cross-verify the game against the design doc. Flag discrepancies and dead code." 

Where to get help 
● The Design Guidance covers what judges reward, genre detail, and the visual clarity bar.
 ● The Build Log guide covers the format and a prompt to set it up. ● Mentor sessions run through the competition. Workshops, office hours and the rest. ● The competition channel is the fastest way to get a specific question answered, including
 anything
 in
 this
 write-up.
 
 