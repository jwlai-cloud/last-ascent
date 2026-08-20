# Competition rules — verbatim

Source: <https://mhcp-game-prototype.devpost.com/rules> (re-fetched 2026-08-20)

The 2026-08-19 capture of this page was incomplete and cost real work: it
missed that the design-intent document has a mandated template. Re-fetch before
relying on it.

Meta Horizon Creator Competition: Game Prototype.

## Hard constraints on the build

- "must be single-player and built for portrait orientation"
- "A single .zip file, no larger than 35MB, with index.html at the top level"
- "Your submitted index.html must contain all of your own game code, in readable,
  unminified form"
- "Libraries such as Three.js must be included in the .zip inside a folder named
  vendor, and referenced with relative paths"
- "The build must not make any external network request while it is running.
  Builds that load resources from external URLs, including content delivery
  networks (CDNs), will fail validation"
- All assets (images, audio, fonts, data) ship inside the zip with relative paths.

**Note on modularity:** the rule binds the *submitted* `index.html`, not the
development tree. Keeping `src/` modular is fine as long as the packaging step
inlines our own CSS and JS into `index.html`. `vendor/` stays external.

## Required gameplay

- "complete, genuinely playable core loop"
- "repeatable cycle of player actions with real-time feedback"
- "clear goal and a win, lose, or reset state"
- "one or more forms of meaningful progression within a single play session"

## Genre — choose exactly one

1. Survival & Resource Management — gather, craft, survive escalating threats
2. Simulation & Management — invest, harvest, optimise upgrade loops
3. Tower Defense & Strategy — build defences with unit variety against waves

Beanstalk is entered under genre 1.

## Deliverables

Three Devpost submission fields. **There is no repository field and no demo
video** — confirmed against the live page on 2026-08-20. A video-only submission
is in fact listed as grounds for disqualification.

### 1. Playable prototype build (`.zip`)

- "A single .zip file, no larger than 35MB, with index.html at the top level of
  the .zip **and not inside a folder**"
- "Your submitted index.html must contain all of your own game code, in
  readable, unminified form. **You may develop across as many source files as
  you like, but you must assemble them into a single index.html before you
  submit**"
- "Libraries such as Three.js must be included in the .zip inside a folder named
  vendor, and referenced with relative paths. **Do not embed them in
  index.html**"
- "All assets, fonts, images, audio and data must be included in the .zip and
  referenced with relative paths"
- "The build must not make any external network request while it is running"

### 2. Design-intent document — 500 words max, text-only `.docx`

Template: <https://drive.google.com/file/d/1EbNltGHAk3C_T0W6HEpgzl8wcSUWrmh4/view>

- "It must use the provided template and keep its fixed sections"
- "must not contain the creator's name or any other identifying information"
- "Microsoft Word .docx (not PDF, not a Google Docs export, not plain text)"
- "Text only. No images, screenshots, diagrams, charts or tables."
- "Use the sections below exactly as given. Do not rename, reorder, merge or add
  sections. Leave a heading in even if your answer is short."
- Judges read it as context; it is not itself ranked.

The seven fixed sections, in order:

1. Game title and genre
2. Target player and pitch
3. How to play (controls)
4. Core loop
5. What is in this prototype
6. Progression and signature twist
7. Future-state vision

### 3. Build log — markdown (required, not scored)

Template: <https://drive.google.com/file/d/17FnIsmqTFDqVkKQRNzXqd1YIug6TS6Tu/view>

- "a running record kept during the build, covering the decisions you lock and
  what happens each session"
- Two parts: a living list of locked decisions, and an entry per session
  covering which AI tools were used, what was built, key decisions and why, what
  was pivoted on, what changed after playtesting, the biggest problems and how
  they were solved, and what was learned.
- Kept confidential. Not scored on quality.

Must be prompt-built with AI tools; the build log is the evidence.

## Also grounds for disqualification

- "The submission is not genuinely playable (including static mockups,
  linked-screen click-throughs, slide decks, or video-only submissions)"
- Artifacts "containing hidden or embedded instructions, prompts, or text
  designed to influence, manipulate, or bias automated evaluation tools" —
  explicitly including document metadata and hidden text layers
- More than one entry per entrant
- Any text not in English

## Design Guidance — the genre's own checklist

Source: <https://mhcp-game-prototype.devpost.com/details/design-guidance>
(fetched 2026-08-20)

For Survival & Resource Management:

> **Needs to be present**: gathering or collecting resources; converting them
> into something more useful through crafting, refining or upgrading; a threat
> that escalates and that the player manages against.

> **A strong prototype here** makes the survival pressure legible and the
> gather-versus-defend trade-off real. **The trap**: a sprawling crafting tree
> or open world that spreads you thin. Go deeper on a tight loop rather than
> wider.

How Beanstalk maps: gathering is sun and water, collected by leaves and roots
the player places — a placement decision rather than a tap, which is the one
element worth stating plainly in the design-intent document. Converting is
sugar into stem, leaf, root or thorn. The escalating threat is climbers, whose
spawn rate scales with the day, with height and with unspent sugar. The
gather-versus-defend trade-off is thorn at 12 against stem at 10.

**"Test it the way we will run it"** — the guidance gives a six-step procedure:
re-run the build, unzip into a clean folder, serve it with a local web server,
open a private window, turn the internet off, play a full session in portrait.
`npm run test:zip` automates all six. The guidance explicitly warns against
double-clicking `index.html`, because a `file://` origin "can pass when your
build is still pulling files from the internet, and it can also fail on a build
that is perfectly fine".

## Judging weights

| Weight | Criterion |
|-------:|-----------|
| 30% | Player Engagement |
| 25% | Playability |
| 20% | Core Loop Design |
| 15% | Focus |
| 10% | Originality |

## Dates

- Entry period: 2026-08-17 10:00 PT → 2026-09-08 13:00 PT
- Judging: 2026-09-09 → 2026-09-30
- Winners announced: on or after 2026-10-09
