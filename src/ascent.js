/*
 * The Last Ascent — a climber you cannot stop, a storm you cannot outrun for
 * free, and one resource that is both the score and the fuel.
 * See docs/game-design.md for the authoritative spec.
 *
 * The whole prototype rests on one structural decision: THE WORLD IS A GRID.
 * The climber occupies a lane index and a continuous height; everything else
 * lives in an integer (lane, floor) cell. Collision is a cell lookup. There is
 * no continuous collision anywhere in this game, which is what keeps it
 * deterministic, testable, physics-free, and free of the float-precision feel
 * bugs that make a hand-rolled platformer miserable.
 */
(() => {
  'use strict';
  const T = window.THREE;
  if (!T) throw new Error('The Last Ascent needs ./vendor/three.min.js');

  /*
   * Every balance number lives here. This is a game about tuning; a bare
   * constant buried in the logic is a number nobody will ever find again.
   */
  const config = {
    lanes: 3,
    laneWidth: 1.55,
    summit: 100,             // floors to the beacon. Almost nobody gets there.

    /*
     * Milestones every twenty floors, each one a SCORE SNAPSHOT: your energy
     * total is recorded, and dying keeps the last snapshot rather than
     * everything.
     *
     * A hundred-floor tower with banking only at the top would mean almost
     * every run scores zero, which kills the chase the score exists to create.
     * Snapshots keep a deep run worth something without softening the real
     * asymmetry — everything collected since the last milestone is still lost,
     * and spending still comes straight off the next snapshot.
     */
    milestoneEvery: 20,
    titles: ['SURVIVOR', 'CLIMBER', 'ASCENDANT', 'STORMPROOF', 'THE LAST ASCENT'],
    /*
     * Speed is the escalation, the way it is in every runner. A constant
     * 1.1s per floor gave an attentive player over a second to read three
     * lanes and swipe, which is no decision at all — a scripted run took zero
     * damage on every seed. It tightens to about 0.6s by the summit.
     */
    climbTime: 1.8,          // seconds per floor at floor zero
    /* GREATER than one. It was .975, which made `pow(ramp, floor)` shrink with
     * height, so the climb got steadily *slower* — the exact opposite of the
     * intent — and because the storm is a share of climb speed the chase never
     * tightened either. Speed is the escalation and it has to accelerate. */
    speedRamp: 1.012,
    splitEvery: 6,           // floors between choices — ten of them in a run

    /*
     * The storm. One rising number, never a weather simulation.
     *
     * It rises slightly slower than the climb (0.91 floors/s), so a clean run
     * gains about 0.19 floors a second — and the ramp at each split takes it
     * past climbing speed by the last section. Early floors are a cushion you
     * spend later. The first version had it rising at 0.06 and the gap grew to
     * twenty; there was no game in it.
     */
    stormStart: -4,          // floors below the climber at the start
    stormFraction: .78,      // storm speed as a share of CLIMB speed, not an absolute
    stormRampAdd: .02,       // added at every split; sixteen of them reach 1.10

    /*
     * A hit costs height, not hit points. This is the only failure axis in the
     * game: hazards and gaps make you slip, slipping feeds the storm, and the
     * storm is the one way to lose. Health pips were cut for this — two
     * failure meters for one event is the "six things that half-work" trap.
     */
    slip: 1.5,               // floors lost to a hazard or a missed ledge

    /*
     * Health is back, and the numbers are why. Over a hundred floors, losing
     * only height meant mistakes were unlimited: a scripted run took twenty
     * eight hits and still reached the summit. Health bounds sloppiness in a
     * way height loss cannot.
     *
     * It is not a second economy. There is no heal to buy — a milestone
     * restores one, so the arc of a run is survive to the next checkpoint,
     * bank, patch up, go again.
     */
    health: 3,
    healOnMilestone: 1,

    /* Hits in quick succession cost progressively more height. One mistake is
     * a stumble; three in a row is a fall. */
    /*
     * Recovery after a slip. Without it, dropping 1.5 floors puts you BELOW the
     * hazard you just hit, so you climb straight back into it — and the streak
     * multiplier turns that into an unavoidable death spiral. During recovery
     * you can still collect; you just cannot be hit again.
     */
    recover: 1.4,            // seconds of immunity after a slip

    comboWindow: 4,          // floors of clean climbing that clears the streak
    comboGrowth: .7,         // extra slip per repeat, as a share of the base
    maxSlip: 5,

    /*
     * Input forgiveness. Not polish — a platformer without these reads as
     * broken input rather than as difficulty, and Playability is 25%.
     */
    coyote: .12,             // seconds after leaving a ledge that a jump still works
    buffer: .12,             // seconds before landing that a jump press is remembered
    /* A jump lasts until just past the NEXT floor line, not a fixed 0.42s.
     * Fixed-duration jumps were shorter than the ~1.15s it takes to cross a
     * floor, so a jump usually expired before reaching the thing it was aimed
     * at — which is exactly why the playtest asked what jump was even for.
     * Defining it in floors rather than seconds makes it always do its job. */
    jumpClear: .18,          // extra seconds held past the floor line, for forgiveness
    jumpHeight: .55,         // floors of arc, purely visual — the grid decides outcomes

    /*
     * THE EDGE. Energy is worth more the closer you are to the storm, so the
     * thing that kills you is the thing that pays you.
     *
     * Every other climbing prototype in this genre rewards climbing fast. This
     * one punishes it: outrun the storm and you outrun your own income, so the
     * skill is riding just above the front. It makes the storm gap the most
     * interesting number on screen rather than merely the scariest, and it
     * turns SURGE into a real dilemma — it saves your life and cuts your pay.
     */
    riskBands: [
      { within: 1.5, mult: 4, label: 'IN THE TEETH' },
      { within: 3.0, mult: 2, label: 'CLOSE' },
    ],
    baseMult: 1,

    /*
     * Upgrades are attached to the LANES at a split, not offered on a menu.
     * Choosing a lane already chooses a route; now it chooses a perk too, so
     * the wanted upgrade is sometimes sitting in the dangerous lane. No pause,
     * no second screen, and one decision instead of two.
     *
     * They also shore up the genre floor: the requirement is converting
     * resources "into something more useful through crafting, refining or
     * upgrading", and consumable spends alone made that thin.
     */
    upgrades: [
      { id: 'doubleJump', name: 'DOUBLE JUMP', blurb: 'one more jump in the air' },
      { id: 'magnet',     name: 'MAGNET',      blurb: 'pull energy from nearby lanes' },
      { id: 'longJump',   name: 'LONG JUMP',   blurb: 'jumps skip one more floor' },
      { id: 'spareShield',name: 'SPARE SHIELD',blurb: 'a free shield at every split' },
      { id: 'anchor',     name: 'ANCHOR',      blurb: 'slips cost far less height' },
    ],
    anchorRelief: .4,        // floors shaved off a slip per stack
    minSlip: .3,

    hintDwell: 3.2,          // seconds a coaching line holds before a calmer one takes the slot

    // Energy is the score AND the survival budget. One resource, three spends.
    /*
     * Three spends with genuinely distinct jobs — preventive, reactive, and
     * progress. "Heal" was cut with the health pips; a second way to undo a
     * slip would have done the same job as surge.
     */
    cost: { shield: 6, surge: 8, grapple: 10 },
    surgePush: 1.5,          // floors the storm is knocked back — exactly one slip
    grappleClimb: 2,         // floors gained instantly: energy bought as height
    summitBonus: 50,

    // Per-lane character. The danger lane is where the score is.
    routes: {
      SAFE:    { energy: .35, hazard: .05, gap: .05 },
      DANGER:  { energy: 1.6, hazard: .42, gap: .28 },
      UNKNOWN: { energy: 1.0, hazard: .25, gap: .18 },   // rerolled per section
    },
  };

  const colors = {
    sky: 0x121a2e, tower: 0x2b3350, towerEdge: 0x3d4870, ledge: 0x55628f,
    climber: 0xffd9a0, suit: 0x3f7fd6, pack: 0x2b3350,
    energy: 0x66e0c8, hazard: 0xe0556b, splitPlate: 0x4a5a8f, storm: 0x4a2440, rubble: 0x6b5560, window: 0x141c33, windowLit: 0xffb45c,
    safe: 0x63c47a, danger: 0xe0556b, unknown: 0xc79bf0, beacon: 0xffe066,
  };

  const ui = Object.fromEntries([
    'game', 'floor', 'energy', 'health', 'best', 'stormGap', 'multiplier', 'feed', 'routeHint',
    'buyShield', 'buySurge', 'buyGrapple', 'costShield', 'costSurge', 'costGrapple',
    'startModal', 'modalButton', 'modalTitle', 'modalCopy', 'modalIcon', 'modalKicker',
    'reset', 'mute', 'summitGoal', 'splitChoice', 'pick0', 'pick1', 'pick2',
    'climbFill', 'climbNext',
  ].map(id => [id, document.getElementById(id)]));

  const BEST_KEY = 'lastascent.best';
  const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
  const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* not worth a crash */ } };

  /*
   * Sound, synthesised at runtime. Not a single audio file: every asset would
   * have to ship inside the zip and be referenced relatively, and a bundled
   * sample buys nothing a two-oscillator blip does not. This costs zero bytes
   * and makes zero requests, which is the rule that matters most.
   *
   * The context is created on the first click, because browsers refuse to
   * start audio before a gesture.
   */
  let audio = null, muted = false;

  function initAudio() {
    if (audio) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }

  function tone({ freq, to = freq, dur = .12, type = 'sine', gain = .18, delay = 0 }) {
    if (!audio || muted) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    vol.gain.setValueAtTime(0, t);
    vol.gain.linearRampToValueAtTime(gain, t + .008);      // a click without an attack
    vol.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(vol).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + .02);
  }

  function noise({ dur = .18, gain = .2, freq = 900 }) {
    if (!audio || muted) return;
    const t = audio.currentTime;
    const frames = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, frames, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = audio.createBufferSource();
    src.buffer = buf;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    const vol = audio.createGain();
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(filter).connect(vol).connect(audio.destination);
    src.start(t);
  }

  /* One voice per event, and the pickup is pitched by the risk multiplier so
   * the ear learns the band before the eye reads the number. */
  function sound(kind, mult = 1) {
    if (!audio || muted) return;
    if (kind === 'pickup') {
      const base = mult >= 4 ? 880 : mult >= 2 ? 700 : 560;
      tone({ freq: base, to: base * 1.5, dur: .1, type: 'triangle', gain: .13 });
      if (mult >= 2) tone({ freq: base * 2, to: base * 3, dur: .09, type: 'sine', gain: .07, delay: .04 });
    }
    if (kind === 'slip') { noise({ dur: .3, gain: .22, freq: 420 }); tone({ freq: 200, to: 70, dur: .3, type: 'sawtooth', gain: .14 }); }
    if (kind === 'jump') tone({ freq: 320, to: 620, dur: .13, type: 'square', gain: .07 });
    if (kind === 'spend') tone({ freq: 500, to: 760, dur: .1, type: 'square', gain: .1 });
    if (kind === 'upgrade') [0, .07, .14].forEach((d, i) => tone({ freq: 520 * (1 + i * .26), dur: .16, type: 'triangle', gain: .12, delay: d }));
    if (kind === 'summit') [0, .1, .2, .34].forEach((d, i) => tone({ freq: 440 * Math.pow(1.26, i), dur: .5, type: 'triangle', gain: .15, delay: d }));
    if (kind === 'dead') { noise({ dur: .7, gain: .3, freq: 300 }); tone({ freq: 160, to: 40, dur: .8, type: 'sawtooth', gain: .18 }); }
  }

  let renderer, scene, camera, world, climberMesh, climberLimbs, shieldMesh, stormMesh, lightning, clock = 0, last = 0;
  let shake = 0, flash = 0, lightningTimer = 1;
  let game = null;

  const mat = (color, roughness = .8) => new T.MeshStandardMaterial({ color, roughness, metalness: 0 });
  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  const laneX = i => (i - (config.lanes - 1) / 2) * config.laneWidth;

  /*
   * Deterministic RNG. A run is a seed, so a test can replay one exactly and a
   * balance probe means something. Mulberry32 — three lines, good enough.
   */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function init() {
    renderer = new T.WebGLRenderer({ canvas: ui.game, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    scene = new T.Scene();
    scene.background = new T.Color(colors.sky);
    /* No fog. With an orthographic camera parked at z=30 every object sits
     * about thirty units away, so a 14-26 fog range rendered the entire scene
     * as flat sky colour — the climber included. Depth is carried by the lane
     * shading instead, and atmosphere is not scored. */

    // Orthographic keeps the framing maths exact and reads the vertical axis
    // better than perspective, which is the axis the whole game happens on.
    camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 200);
    camera.position.set(0, 0, 30);

    scene.add(new T.HemisphereLight(0xbfd4ff, 0x2a1f3a, 2.2));
    const key = new T.DirectionalLight(0xfff0d0, 1.5);
    key.position.set(-5, 12, 10);
    scene.add(key);

    world = new T.Group();
    scene.add(world);

    buildStatics();
    reset();
    bind();
    resize();
    new ResizeObserver(resize).observe(ui.game.parentElement);
    requestAnimationFrame(frame);
  }

  function buildStatics() {
    // The tower face sits behind the lanes so the climber always reads in front.
    mesh(new T.BoxGeometry(config.laneWidth * config.lanes + 1.4, 400, 1), mat(colors.tower), world, 0, 180, -1.5);
    for (let i = 0; i <= config.lanes; i++) {
      mesh(new T.BoxGeometry(.06, 400, .2), mat(colors.towerEdge), world,
        laneX(i) - config.laneWidth / 2, 180, -.85);
    }

    /* Windows up the tower face. Without something passing, vertical motion is
     * invisible however well the body is animated — that was the playtest note
     * about the climb feeling like an elevator. A few are still lit, which
     * gives the eye something to track and says the tower is abandoned rather
     * than empty. Built once, never touched again. */
    const dark = mat(colors.window, .95);
    const lit = mat(colors.windowLit, .4);
    lit.emissive = new T.Color(colors.windowLit);
    lit.emissiveIntensity = .5;
    for (let f = -2; f < 130; f++) {
      for (let lane = 0; lane < config.lanes; lane++) {
        if ((f * 7 + lane * 3) % 5 > 2) continue;
        const onFire = (f * 13 + lane * 5) % 17 === 0;
        mesh(new T.BoxGeometry(.36, .52, .12), onFire ? lit : dark, world,
          // z must clear the tower's front face at -1.0, or the windows are
          // embedded inside the wall and invisible. They were.
          laneX(lane) + ((f + lane) % 2 ? .36 : -.36), f + .55, -.92);
      }
    }

    /* A capsule is not a climber. This is a figure: head, torso, two arms, two
     * legs, with the limbs alternating as it climbs. Nothing here is art — it
     * exists so a player can tell at a glance which thing on screen is them,
     * which is the one visual bar the guidance actually sets. */
    climberMesh = new T.Group();
    world.add(climberMesh);
    const skin = mat(colors.climber, .45);
    skin.emissive = new T.Color(colors.climber);
    skin.emissiveIntensity = .28;
    const suit = mat(colors.suit, .5);
    suit.emissive = new T.Color(colors.suit);
    suit.emissiveIntensity = .18;

    skin.userData = {}; suit.userData = {};
    mesh(new T.SphereGeometry(.2, 12, 10), skin, climberMesh, 0, .52, 0);
    mesh(new T.BoxGeometry(.34, .44, .26), suit, climberMesh, 0, .2, 0);
    climberLimbs = {
      armL: mesh(new T.BoxGeometry(.11, .34, .11), skin, climberMesh, -.24, .34, .04),
      armR: mesh(new T.BoxGeometry(.11, .34, .11), skin, climberMesh, .24, .34, .04),
      legL: mesh(new T.BoxGeometry(.13, .34, .13), suit, climberMesh, -.11, -.16, 0),
      legR: mesh(new T.BoxGeometry(.13, .34, .13), suit, climberMesh, .11, -.16, 0),
    };
    // A pack, so the silhouette is asymmetric and reads as facing away from you.
    mesh(new T.BoxGeometry(.26, .3, .14), mat(colors.pack, .6), climberMesh, 0, .22, -.2);

    /* A bought shield was only visible as a highlight on the button that bought
     * it, which is the wrong place — the player is looking at the climber. */
    shieldMesh = mesh(new T.SphereGeometry(.62, 14, 12),
      new T.MeshBasicMaterial({ color: colors.energy, transparent: true, opacity: .22, depthWrite: false }),
      climberMesh, 0, .2, 0);
    shieldMesh.visible = false;
    climberMesh.traverse(o => {
      if (o.material && o.material.emissive) o.userData.baseColor = o.material.emissive.getHex();
    });

    /* The storm is one slab whose top edge is the number. No simulation — the
     * guidance bans weather systems and this stays a rising threshold. */
    stormMesh = mesh(new T.BoxGeometry(config.laneWidth * config.lanes + 3, 60, 3), mat(colors.storm, .95), world, 0, -60, .6);
    stormMesh.material.transparent = true;
    stormMesh.material.opacity = .82;

    /* Additive and unlit, or it renders as a solid grey rectangle that reads
     * as a rendering bug rather than as a flash. Narrow, so it is a bolt. */
    lightning = mesh(
      new T.PlaneGeometry(.14, 3.4),
      new T.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }),
      world, 0, -60, .78);
    lightning.visible = false;
    lightning.userData.flash = 0;
  }

  /* ── the world grid ─────────────────────────────────────────────────────────
   * A cell is `${lane}:${floor}` and holds at most one of energy / hazard / gap.
   * Sections of `splitEvery` floors are generated when the climber commits to a
   * route, so the lane you chose is the lane that gets that route's character.
   */
  /* Sections are always generated ahead of the climber, contiguously, so the
   * route you are steering into is already on screen when you choose it. An
   * earlier version generated at the moment of the split, which left the split
   * floor itself ungenerated — a hole in the tower and a cell that resolved to
   * nothing. */
  function ensureGenerated() {
    while (game.generatedTo < game.floor + config.splitEvery * 2) {
      const routes = rollRoutes();
      game.sectionRoutes.set(game.generatedTo, routes);
      game.sectionUpgrades.set(game.generatedTo, rollUpgrades());
      generateSection(game.generatedTo, routes);
      markSplit(game.generatedTo);
      game.generatedTo += config.splitEvery;
    }
  }

  const sectionStart = f => Math.floor(f / config.splitEvery) * config.splitEvery;
  const routesAt = f => game.sectionRoutes.get(sectionStart(f)) || game.sectionRoutes.get(0);
  const upgradesAt = f => game.sectionUpgrades.get(sectionStart(f)) || game.sectionUpgrades.get(0);

  /* Three different upgrades per split, so the choice is always between three
   * real things rather than the same perk in three lanes. */
  function rollUpgrades() {
    const pool = config.upgrades.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(game.rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, config.lanes);
  }

  /* A band across the tower at each split with each lane's perk named on it.
   * The choice has to be visible before it is made, or it is not a choice. */
  function markSplit(floor) {
    if (floor === 0) return;
    const ups = game.sectionUpgrades.get(floor);
    for (let lane = 0; lane < config.lanes; lane++) {
      const plate = mesh(new T.BoxGeometry(config.laneWidth * .86, .5, .1),
        mat(colors.splitPlate, .5), game.props, laneX(lane), floor - .35, .35);
      plate.material.emissive = new T.Color(colors.splitPlate);
      plate.material.emissiveIntensity = .35;
      game.splitLabels.push({ mesh: plate, floor, lane, upgrade: ups[lane] });
    }
  }

  function generateSection(fromFloor, routeByLane) {
    for (let f = fromFloor; f < fromFloor + config.splitEvery; f++) {
      for (let lane = 0; lane < config.lanes; lane++) {
        const route = config.routes[routeByLane[lane]];
        const roll = game.rand();
        let kind = null;
        if (roll < route.gap) kind = 'gap';
        else if (roll < route.gap + route.hazard) kind = 'hazard';
        else if (roll < route.gap + route.hazard + route.energy) kind = 'energy';
        if (kind) game.cells.set(`${lane}:${f}`, kind);
      }
      // A floor with no way through is a dead end, not difficulty. Always clear one.
      const blocked = [0, 1, 2].every(l => ['gap', 'hazard'].includes(game.cells.get(`${l}:${f}`)));
      if (blocked) game.cells.delete(`${Math.floor(game.rand() * config.lanes)}:${f}`);
    }
    renderSection(fromFloor);
  }

  function renderSection(fromFloor) {
    for (let f = fromFloor; f < fromFloor + config.splitEvery; f++) {
      for (let lane = 0; lane < config.lanes; lane++) {
        const kind = game.cells.get(`${lane}:${f}`);
        const x = laneX(lane), y = f;
        if (kind !== 'gap') {
          mesh(new T.BoxGeometry(config.laneWidth * .88, .16, .8), mat(colors.ledge), game.props, x, y, 0);
        } else {
          /* A gap was drawn as nothing at all, which reads as "no information"
           * rather than "danger". Broken stubs at each side say a ledge used to
           * be here and is not any more. */
          for (const side of [-1, 1]) {
            const stub = mesh(new T.BoxGeometry(config.laneWidth * .2, .16, .8), mat(colors.rubble), game.props,
              x + side * config.laneWidth * .34, y, 0);
            stub.rotation.z = side * .28;
          }
        }
        if (kind === 'energy') {
          const e = mesh(new T.OctahedronGeometry(.26), mat(colors.energy, .25), game.props, x, y + .55, .5);
          e.material.emissive = new T.Color(colors.energy);
          e.material.emissiveIntensity = .75;
          e.userData.baseY = y + .55;
          game.spins.push(e);
          game.meshes.set(`${lane}:${f}`, e);
        }
        if (kind === 'hazard') {
          /* Three spikes, not one cone. A row of spikes is the most universally
           * understood "do not touch" shape there is, and it cannot be mistaken
           * for the climber or for a pickup. */
          const spikeMat = mat(colors.hazard, .45);
          spikeMat.emissive = new T.Color(colors.hazard);
          spikeMat.emissiveIntensity = .45;
          for (const off of [-.32, 0, .32]) {
            mesh(new T.ConeGeometry(.14, .46, 6), spikeMat, game.props, x + off, y + .31, .4);
          }
        }
      }
    }
  }

  /* The three lanes for the next section, shuffled so the danger lane is never
   * in the same place twice. UNKNOWN is rerolled each time, which is the point
   * of it — it can be better than DANGER or worse. */
  function rollRoutes() {
    const names = ['SAFE', 'DANGER', 'UNKNOWN'];
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(game.rand() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    config.routes.UNKNOWN = {
      energy: .4 + game.rand() * 2.2,
      hazard: .05 + game.rand() * .5,
      gap: .05 + game.rand() * .3,
    };
    return names;
  }

  function reset(seed) {
    if (game?.props) world.remove(game.props);
    const props = new T.Group();
    world.add(props);

    game = {
      rand: rng(seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0)),
      props, spins: [], splitLabels: [],
      cells: new Map(),
      meshes: new Map(),   // cell key -> mesh, so a collected fragment can be removed
      popping: [],         // meshes mid-pickup animation
      lane: 1,
      laneVisual: 1,       // eased toward `lane` for the eye only; the grid uses `lane`
      floor: 0,            // continuous height in floors
      energy: 0,
      storm: config.stormStart,
      stormFraction: config.stormFraction,
      health: config.health,
      combo: 0, comboAt: 0,   // consecutive hits, and the floor of the last one
      recover: 0,          // seconds of post-slip immunity remaining
      airborne: 0,         // seconds left in the current jump arc
      jumpSpan: 1,         // how long that arc was, so it can be drawn
      peak: 0,             // highest floor reached, which is what a slip takes back
      coyote: 0, buffered: 0,
      shield: false,
      running: false, paused: false,
      over: null, banked: 0, newBest: false, milestone: 0,
      sectionRoutes: new Map(), sectionUpgrades: new Map(),
      generatedTo: 0, nextSplit: config.splitEvery,
      upgrades: Object.fromEntries(config.upgrades.map(u => [u.id, 0])),
      airJumps: 0,          // air jumps left in the current jump, from DOUBLE JUMP
      collected: 0, spent: 0, slips: 0, skipped: 0,
      hint: null, hintRank: -1, hintUntil: 0, hintTime: 0,
      taughtJump: false, taughtSwipe: false,
    };

    ensureGenerated();
    sync();
  }

  /* Expressing the storm as a share of climb speed rather than an absolute
   * keeps the chase tight however fast the climb gets. Declared here because
   * the jump length is measured in floors and needs it. */
  const climbSpeed = () => Math.pow(config.speedRamp, Math.max(0, game.floor)) / config.climbTime;

  // ── input ──────────────────────────────────────────────────────────────────

  function moveLane(dir) {
    if (!game.running) return false;
    const next = Math.min(config.lanes - 1, Math.max(0, game.lane + dir));
    if (next === game.lane) return false;
    game.lane = next;
    return true;
  }

  /* Long enough to clear the next floor line whenever it is pressed. */
  const jumpDuration = () => {
    // LONG JUMP carries the arc over additional floor lines.
    const spanFloors = 1 + game.upgrades.longJump;
    const toNext = (Math.floor(game.floor) + spanFloors - game.floor) / climbSpeed();
    return toNext + config.jumpClear;
  };

  function jump() {
    if (!game.running) return false;
    if (game.airborne > 0 && game.coyote <= 0) {
      // DOUBLE JUMP spends an air jump; otherwise the press is buffered for
      // landing, which is most of what "responsive" means in a platformer.
      if (game.airJumps > 0) {
        game.airJumps--;
        game.airborne = jumpDuration();
        game.jumpSpan = game.airborne;
        sound('jump');
        return true;
      }
      game.buffered = config.buffer;
      return false;
    }
    game.airborne = jumpDuration();
    game.jumpSpan = game.airborne;
    game.airJumps = game.upgrades.doubleJump;
    game.coyote = 0;
    game.buffered = 0;
    sound('jump');
    return true;
  }

  // ── simulation ─────────────────────────────────────────────────────────────

  /* Everything that resolves does so when the climber crosses a floor line.
   * That is the only moment the grid is consulted, which is what makes the
   * whole thing deterministic and testable. */
  /*
   * A jump SKIPS a floor rather than merely surviving it. Nothing on a skipped
   * floor resolves — no spikes, and no energy either.
   *
   * The playtest asked what jump was for, and the honest answer was nothing: a
   * clear lane is guaranteed on every floor, so swiping always sufficed.
   * Skipping makes it a trade in the game's own currency — jump past a floor
   * you cannot reach safely, and pay for it by leaving that floor's energy
   * behind.
   */
  function crossFloor(f) {
    if (game.airborne > 0) { game.skipped++; return; }

    // MAGNET sweeps the neighbouring lanes on the way past.
    for (let r = 1; r <= game.upgrades.magnet; r++) {
      for (const lane of [game.lane - r, game.lane + r]) {
        if (lane < 0 || lane >= config.lanes) continue;
        if (game.cells.get(`${lane}:${f}`) === 'energy') collect(lane, f);
      }
    }

    const kind = game.cells.get(`${game.lane}:${f}`);

    if (kind === 'energy') { collect(game.lane, f); return; }

    // Immune while recovering from the last slip, but still able to collect.
    if (game.recover > 0) return;

    if (kind === 'gap') return slip('SLIPPED');
    if (kind === 'hazard') return slip('HIT');
  }

  function collect(lane, f) {
    {
      const key = `${lane}:${f}`;
      game.cells.delete(key);
      /* Remove the mesh. It used to stay on screen after being collected, so
       * picking a fragment up looked like nothing had happened at all — the
       * single worst piece of feedback in the build. */
      const m = game.meshes.get(key);
      if (m) {
        game.meshes.delete(key);
        game.spins.splice(game.spins.indexOf(m), 1);
        m.userData.pop = 1;
        game.popping.push(m);
      }
      const band = riskBand();
      game.energy += band.mult;
      game.collected += band.mult;
      showFeed(band.mult > 1 ? `+${band.mult}  ${band.label}` : '+1');
      sound('pickup', band.mult);
      ui.energy.classList.remove('pulse');
      void ui.energy.offsetWidth;
      ui.energy.classList.add('pulse');
    }
  }

  /* Slipping is the only punishment in the game, and it is paid in the one
   * currency that matters to the storm: height. */
  /* How much a fragment is worth right now, which is entirely a function of
   * how close the storm is. */
  function riskBand() {
    const gap = game.floor - game.storm;
    for (const b of config.riskBands) if (gap <= b.within) return b;
    return { within: Infinity, mult: config.baseMult, label: '' };
  }

  function slip(reason) {
    if (game.shield) {
      game.shield = false;
      showFeed('SHIELD HELD');
      sound('spend');
      return;
    }

    // A streak of hits costs more each time, and clean climbing clears it.
    if (game.floor - game.comboAt > config.comboWindow) game.combo = 0;
    game.combo++;
    game.comboAt = game.floor;

    const base = Math.max(config.minSlip, config.slip - game.upgrades.anchor * config.anchorRelief);
    const cost = Math.min(config.maxSlip, base * (1 + (game.combo - 1) * config.comboGrowth));

    game.floor = Math.max(game.storm, game.floor - cost);
    game.health--;
    game.slips++;
    game.recover = config.recover;
    shake = 1.6 + game.combo * .3;
    sound('slip');
    flash = 1;                       // the climber flares red and drops
    hurt(`${reason}  −${cost.toFixed(1)}${game.combo > 1 ? `  ×${game.combo} STREAK` : ''}`);

    if (game.health <= 0) {
      end('fell', 'YOU FELL', 'Three hits and the tower had you.');
    }
  }

  function tick(dt) {
    game.hintTime += dt;
    const before = Math.floor(game.floor);
    const speed = climbSpeed();
    game.floor += speed * dt;
    game.peak = Math.max(game.peak, game.floor);
    const after = Math.floor(game.floor);

    // Airborne first, so a jump started this frame covers this frame's floor.
    if (game.airborne > 0) {
      game.airborne = Math.max(0, game.airborne - dt);
      if (game.airborne === 0) game.coyote = config.coyote;
    } else if (game.coyote > 0) {
      game.coyote = Math.max(0, game.coyote - dt);
    }
    if (game.recover > 0) game.recover = Math.max(0, game.recover - dt);
    if (game.buffered > 0) {
      game.buffered = Math.max(0, game.buffered - dt);
      if (game.airborne === 0) { game.buffered = 0; game.airborne = jumpDuration(); game.jumpSpan = game.airborne; }
    }

    for (let f = before + 1; f <= after; f++) {
      if (!game.running) break;
      crossFloor(f);
      if (f >= game.nextSplit) reachSplit(f);
    }
    ensureGenerated();

    // The storm closes on you whatever you do.
    game.storm += speed * game.stormFraction * dt;
    if (game.running && game.storm >= game.floor) {
      end('storm', 'THE STORM TOOK YOU', 'It was always going to be faster than you.');
    }
    if (game.running) checkMilestone();
    if (game.running && game.floor >= config.summit) summit();

    sync();
  }

  /* A milestone records the score rather than taking the wallet, so it costs
   * the player nothing and still makes a deep run worth something. */
  function checkMilestone() {
    const reached = Math.floor(game.floor / config.milestoneEvery);
    if (reached <= game.milestone || reached === 0) return;
    game.milestone = reached;
    game.banked = Math.max(game.banked, game.energy);
    // A milestone patches you up. This is the only way to regain health, which
    // is what makes reaching one a relief rather than only a number.
    const healed = game.health < config.health;
    game.health = Math.min(config.health, game.health + config.healOnMilestone);
    game.combo = 0;
    const title = config.titles[Math.min(reached - 1, config.titles.length - 1)];
    showFeed(`FLOOR ${reached * config.milestoneEvery} · ${title}${healed ? '  +1 LIFE' : ''}`);
    sound('upgrade');
    ui.best.parentElement.classList.add('flash');
    setTimeout(() => ui.best.parentElement.classList.remove('flash'), 700);
  }

  /* Crossing into a new section is the moment the choice locks in: the lane
   * the climber happens to be in is the route they took. No menu, no pause. */
  function reachSplit(f) {
    game.nextSplit = sectionStart(f) + config.splitEvery;
    game.stormFraction += config.stormRampAdd;

    /* The lane you happen to be in is the route AND the upgrade. One decision,
     * made with the same swipe as everything else. */
    const perk = upgradesAt(f)[game.lane];
    if (perk) {
      game.upgrades[perk.id]++;
      showFeed(`${perk.name}  ·  ${routesAt(f)[game.lane]} ROUTE`);
      sound('upgrade');
    } else {
      showFeed(`${routesAt(f)[game.lane]} ROUTE`);
    }
    if (game.upgrades.spareShield && !game.shield) game.shield = true;
  }

  // ── spending: the decision the game is built on ────────────────────────────

  function canAfford(kind) {
    if (!game.running || game.energy < config.cost[kind]) return false;
    if (kind === 'shield') return !game.shield;
    return true;
  }

  /* Every spend takes the number the player is trying to maximise straight
   * back down. That is the whole design — survival is never free. */
  function buy(kind) {
    if (!canAfford(kind)) return false;
    game.energy -= config.cost[kind];
    game.spent += config.cost[kind];
    sound('spend');
    if (kind === 'shield') { game.shield = true; showFeed('SHIELDED'); }
    if (kind === 'surge') { game.storm -= config.surgePush; showFeed('SURGE'); }
    if (kind === 'grapple') { game.floor += config.grappleClimb; showFeed('GRAPPLE'); }
    sync();
    return true;
  }

  // ── ending ─────────────────────────────────────────────────────────────────

  function summit() {
    const g = new T.Group();
    g.position.set(laneX(game.lane), config.summit + 1, .5);
    game.props.add(g);
    const b = mesh(new T.SphereGeometry(.5, 12, 10), mat(colors.beacon, .3), g);
    b.material.emissive = new T.Color(colors.beacon);
    b.material.emissiveIntensity = .9;
    sound('summit');
    end('summit', 'ESCAPED', `Beacon lit with ${game.energy} energy still in hand, plus a ${config.summitBonus} summit bonus.`);
  }

  function end(kind, title, copy) {   // eslint-disable-line no-unused-vars
    game.running = false;
    game.over = kind;
    /* Dying keeps the last milestone snapshot and loses everything gathered
     * since it. Reaching the beacon banks the lot, plus the bonus. */
    if (kind === 'summit') game.banked = game.energy + config.summitBonus;

    const previous = loadBest();
    game.newBest = game.banked > previous;
    if (game.newBest) saveBest(game.banked);
    const best = Math.max(previous, game.banked);

    const near = game.newBest ? `A new best. The old one was ${previous}.`
      : best ? `Your best is ${best} — ${best - game.banked} short.`
        : 'Reach the summit and the energy in hand is yours to keep.';

    ui.modalIcon.textContent = kind === 'summit' ? '🛰️' : kind === 'storm' ? '🌩️' : '💀';
    const rank = game.milestone ? config.titles[Math.min(game.milestone - 1, config.titles.length - 1)] : 'FELL SHORT';
    ui.modalKicker.textContent = `FLOOR ${Math.floor(game.floor)} OF ${config.summit} · ${rank}`;
    ui.modalTitle.textContent = game.banked ? `BANKED ${game.banked}` : title;
    ui.modalCopy.textContent = `${copy} ${near}`;
    ui.modalButton.textContent = 'CLIMB AGAIN';
    ui.startModal.classList.add('show');
    sync();
  }

  // ── presentation ───────────────────────────────────────────────────────────

  function showFeed(text) {
    ui.feed.textContent = text;
    ui.feed.classList.remove('show');
    void ui.feed.offsetWidth;
    ui.feed.classList.add('show');
  }

  function hurt(text) {
    showFeed(text);
    ui.game.parentElement.classList.remove('hurt');
    void ui.game.offsetWidth;
    ui.game.parentElement.classList.add('hurt');
  }

  function sync() {
    if (!game) return;
    const floorNow = Math.max(0, Math.floor(game.floor));
    ui.floor.textContent = floorNow;
    ui.summitGoal.textContent = config.summit;

    /* A bar toward 100 with the milestones ticked on it, so "how far to the
     * top" and "how far to the next bank" are one glance rather than two. */
    ui.climbFill.style.height = `${Math.min(100, floorNow / config.summit * 100)}%`;
    const nextMs = (game.milestone + 1) * config.milestoneEvery;
    ui.climbNext.textContent = floorNow >= config.summit ? 'SUMMIT'
      : `${Math.max(0, nextMs - floorNow)} to bank`;
    ui.energy.textContent = game.energy;
    ui.best.textContent = Math.max(loadBest(), game.banked);
    ui.health.textContent = '♥'.repeat(Math.max(0, game.health)) + '♡'.repeat(Math.max(0, config.health - game.health));
    ui.health.className = `stat-value health${game.health <= 1 ? ' critical' : ''}`;

    const gap = game.floor - game.storm;
    const band = game.running ? riskBand() : { mult: 1, label: '' };
    ui.stormGap.textContent = `${gap.toFixed(1)}`;
    ui.stormGap.parentElement.classList.toggle('close', band.mult >= 2);
    ui.stormGap.parentElement.classList.toggle('teeth', band.mult >= 4);
    ui.multiplier.textContent = `×${band.mult}`;
    ui.multiplier.className = `multiplier${band.mult >= 4 ? ' teeth' : band.mult >= 2 ? ' close' : ''}`;

    ui.costShield.textContent = config.cost.shield;
    ui.costSurge.textContent = config.cost.surge;
    ui.costGrapple.textContent = config.cost.grapple;
    /* A disabled button that says nothing teaches nothing. Each one now states
     * either what it does or exactly how much more energy it needs. */
    for (const [kind, btn] of [['shield', ui.buyShield], ['surge', ui.buySurge], ['grapple', ui.buyGrapple]]) {
      const afford = canAfford(kind);
      btn.disabled = !afford;
      const short = config.cost[kind] - game.energy;
      const note = btn.querySelector('small');
      if (kind === 'shield' && game.shield) note.textContent = 'active';
      else if (!afford && short > 0) note.textContent = `need ${short} more`;
      else note.textContent = note.dataset.label;
    }
    ui.buyShield.classList.toggle('active', game.shield);

    /* Show the three perks while a split is approaching, and mark the one the
     * climber is currently lined up to take. */
    const toSplitNow = game.nextSplit - game.floor;
    const showPicks = game.running && toSplitNow <= 3.2;
    ui.splitChoice.hidden = !showPicks;
    if (showPicks) {
      const perks = upgradesAt(game.floor + config.splitEvery) || [];
      for (let lane = 0; lane < config.lanes; lane++) {
        const el = ui[`pick${lane}`];
        el.querySelector('b').textContent = perks[lane]?.name || '';
        el.querySelector('small').textContent = perks[lane]?.blurb || '';
        el.classList.toggle('chosen', lane === game.lane);
      }
    }

    const [text, tone] = hint();
    ui.routeHint.textContent = text;
    ui.routeHint.className = `route-hint ${tone}`;
  }

  /*
   * There is no tutorial screen, so this one line is the whole tutorial.
   * Ordered by what the player needs to know NOW: the thing about to hurt them,
   * then the thing that pays, then the choice, then the ambient state. The
   * first playtest said "I don't know how to play" — everything the game knew
   * was on screen except the part that tells you what to do about it.
   */
  function wantedHint() {
    if (!game.running) return [4, 'Swipe to change lane · tap to jump', ''];

    // What is directly above you decides everything for the next second.
    const next = Math.floor(game.floor) + 1;
    const ahead = game.cells.get(`${game.lane}:${next}`);
    if (ahead === 'gap') { game.taughtJump = true; return [5, 'GAP AHEAD — TAP TO JUMP', 'danger']; }
    if (ahead === 'hazard') { game.taughtJump = true; return [5, 'SPIKES — TAP TO JUMP OR SWIPE AWAY', 'danger']; }

    if (game.health === 1) return [5, 'ONE LIFE LEFT — reach the next milestone to patch up', 'danger'];

    const band = riskBand();
    if (band.mult >= 4) return [4, `IN THE TEETH · energy pays ×${band.mult}`, 'danger'];
    if (band.mult >= 2) return [3, `Close to the storm · energy pays ×${band.mult}`, 'close'];

    const toSplit = game.nextSplit - game.floor;
    if (toSplit <= 2.5) {
      const routes = routesAt(game.floor + config.splitEvery);
      return [3, `${routes[game.lane]} ahead · swipe to choose`, routes[game.lane].toLowerCase()];
    }

    // Nothing urgent: teach the thing that makes the game make sense.
    if (game.floor > 3 && band.mult === 1) return [1, 'Too far above the storm · energy only pays ×1', ''];
    const name = routesAt(game.floor)?.[game.lane] || '';
    return [0, `${name} lane`, name.toLowerCase()];
  }

  /* A line holds for hintDwell unless something more urgent wants the slot, so
   * a line can actually be finished. Threats always preempt. */
  function hint() {
    const [rank, text, tone] = wantedHint();
    if (game.hint === null || rank > game.hintRank || game.hintTime >= game.hintUntil) {
      if (text !== game.hint) game.hintUntil = game.hintTime + config.hintDwell;
      game.hint = text;
      game.hintRank = rank;
      game.hintTone = tone;
    }
    return [game.hint, game.hintTone || ''];
  }

  function render(dt) {
    // The eye gets an eased lane; the grid never does.
    game.laneVisual += (game.lane - game.laneVisual) * Math.min(1, dt * 18);
    const jumping = game.airborne > 0;
    const arc = jumping
      ? Math.sin((1 - game.airborne / (game.jumpSpan || 1)) * Math.PI) * config.jumpHeight
      : 0;
    /*
     * The climb is STEPPED, not smooth. The simulation advances `floor`
     * continuously — that stays exactly as it was, so nothing about collision
     * or determinism changes — but the body is drawn lunging to the next ledge
     * and settling on it.
     *
     * A playtest note: "there is no climbing action, just the whole thing move
     * down by default". It was right. A body gliding upward at a constant rate
     * past a scrolling wall is an elevator. A body that reaches, pulls, and
     * lands on each ledge in turn is climbing, and it is the same number
     * rendered differently.
     */
    const phase = game.floor - Math.floor(game.floor);
    const pull = 1 - Math.pow(1 - phase, 2.4);      // fast lunge, then settle
    const settle = Math.sin(Math.min(1, phase * 3.2) * Math.PI) * .06;
    const climbY = jumping ? game.floor : Math.floor(game.floor) + pull;

    climberMesh.position.set(laneX(game.laneVisual), climbY + .55 + arc - settle, .9);
    climberMesh.rotation.z = (game.lane - game.laneVisual) * .45;
    climberMesh.scale.y = 1 - settle * 1.4;         // a small compression on landing

    /* A slip flares the whole body red. Collecting pops a green fragment
     * upward; slipping turns the player red and drops them. The playtest could
     * not tell the two apart, and they should not be confusable at all. */
    flash = Math.max(0, flash - dt * 2.4);
    climberMesh.traverse(o => {
      if (!o.material || !o.material.emissive) return;
      if (o.userData.baseEmissive === undefined) o.userData.baseEmissive = o.material.emissiveIntensity || 0;
      o.material.emissiveIntensity = o.userData.baseEmissive + flash * 1.6;
      if (flash > 0) o.material.emissive.setHex(colors.hazard);
      else if (o.userData.baseColor !== undefined) o.material.emissive.setHex(o.userData.baseColor);
    });

    /* Hand over hand, in time with the pull rather than on a free-running
     * sine: one arm is reaching for the next ledge while the other holds. */
    if (climberLimbs) {
      const lead = Math.sin(phase * Math.PI * 2);
      const tuck = jumping ? -1.1 : 0;
      const reach = -1.5 * (1 - pull);              // arms high at the start of a pull
      climberLimbs.armL.rotation.x = reach + lead * .5 + tuck;
      climberLimbs.armR.rotation.x = reach - lead * .5 + tuck;
      climberLimbs.legL.rotation.x = -lead * .55 - (jumping ? .9 : 0);
      climberLimbs.legR.rotation.x = lead * .55 - (jumping ? .9 : 0);
    }

    // Blink while recovering, so immunity is visible rather than inferred.
    climberMesh.visible = game.recover <= 0 || Math.floor(clock * 12) % 2 === 0;
    shieldMesh.visible = game.shield && climberMesh.visible;
    if (game.shield) shieldMesh.scale.setScalar(1 + Math.sin(clock * 6) * .05);

    stormMesh.position.y = game.storm - 30;
    stormMesh.scale.x = 1 + Math.sin(clock * 2.2) * .015;   // the front churns

    /* Lightning inside the storm. It is the only thing telling the player the
     * danger band is alive and worth being near. One timer, one plane. */
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      lightningTimer = .45 + Math.random() * 1.5;
      lightning.position.set(laneX(Math.floor(Math.random() * config.lanes)) + (Math.random() - .5) * .5, game.storm - 1, .78);
      lightning.rotation.z = (Math.random() - .5) * .3;
      lightning.userData.flash = .16;
    }
    lightning.userData.flash = Math.max(0, lightning.userData.flash - dt);
    lightning.visible = lightning.userData.flash > 0;
    lightning.material.opacity = (lightning.userData.flash / .16) * .85;

    for (const e of game.spins) {
      e.rotation.y += dt * 2.4;
      e.position.y = e.userData.baseY + Math.sin(clock * 3 + e.userData.baseY) * .09;
    }

    // Collected fragments burst upward and fade, so the pickup is unmissable.
    for (let i = game.popping.length - 1; i >= 0; i--) {
      const m = game.popping[i];
      m.userData.pop -= dt * 3.4;
      if (m.userData.pop <= 0) { game.props.remove(m); game.popping.splice(i, 1); continue; }
      const t = 1 - m.userData.pop;
      m.scale.setScalar(1 + t * 1.8);
      m.position.y += dt * 3.2;
      m.rotation.y += dt * 9;
      m.material.opacity = m.userData.pop;
      m.material.transparent = true;
    }

    const view = 12;
    const host = ui.game.parentElement, rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const aspect = rect.width / rect.height;
    /* The climber sits low in frame so the player reads what is coming rather
     * than what is passed. Shake decays out of the value a slip sets. */
    shake = Math.max(0, shake - dt * 3.2);
    const centre = game.floor + view * .18 + Math.sin(clock * 55) * shake * .32;
    camera.top = centre + view / 2;
    camera.bottom = centre - view / 2;
    camera.left = -view * aspect / 2;
    camera.right = view * aspect / 2;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const host = ui.game.parentElement, rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
  }

  function frame(now) {
    const dt = Math.min(.035, (now - last || 16) / 1000);
    last = now;
    clock += dt;
    if (game.running && !game.paused) tick(dt);
    render(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function start(seed) {
    initAudio();                      // browsers require a gesture; this is one
    ui.reset.classList.remove('arm');
    ui.reset.textContent = '↺';
    reset(typeof seed === 'number' ? seed : undefined);
    game.running = true;
    game.hint = null; game.hintRank = -1; game.hintUntil = 0;   // drop the stopped-state line
    ui.startModal.classList.remove('show');
    sync();
  }

  function askReset() {
    if (!game.running) return start();
    if (ui.reset.classList.contains('arm')) return start();
    ui.reset.classList.add('arm');
    ui.reset.textContent = 'SURE?';
    showFeed('TAP AGAIN TO RESTART');
    setTimeout(() => { ui.reset.classList.remove('arm'); ui.reset.textContent = '↺'; }, 2200);
  }

  function bind() {
    ui.modalButton.addEventListener('click', () => start());
    ui.reset.addEventListener('click', askReset);
    ui.mute.addEventListener('click', () => {
      muted = !muted;
      ui.mute.textContent = muted ? '🔇' : '🔊';
      ui.mute.classList.toggle('off', muted);
      if (!muted) sound('spend');
    });
    ui.buyShield.addEventListener('click', () => buy('shield'));
    ui.buySurge.addEventListener('click', () => buy('surge'));
    ui.buyGrapple.addEventListener('click', () => buy('grapple'));

    window.addEventListener('keydown', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLane(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') moveLane(1);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
    });

    /* Swipe or tap, on the arena only. A short movement is a tap and jumps; a
     * horizontal drag past the threshold changes lane. Deliberately generous:
     * a missed input reads as a broken game. */
    const arena = ui.game.parentElement;
    let sx = 0, sy = 0, t0 = 0, used = false;
    arena.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; t0 = clock; used = false; });
    arena.addEventListener('pointermove', e => {
      if (used) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(e.clientY - sy)) {
        moveLane(Math.sign(dx));
        used = true;
      }
    });
    arena.addEventListener('pointerup', e => {
      if (used) return;
      const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (moved < 26 && clock - t0 < .4) jump();
    });
  }

  /*
   * Test seam. Keep in step with the simulation.
   *
   * `energy` is the live bank and `banked` is what a finished run kept — they
   * are named apart deliberately, because only a summit banks anything.
   */
  window.ascent = {
    getState: () => ({
      running: game?.running, over: game?.over,
      floor: game?.floor, floorInt: Math.floor(game?.floor ?? 0),
      lane: game?.lane, laneVisual: game?.laneVisual,
      energy: game?.energy, shield: game?.shield, health: game?.health, combo: game?.combo,
      maxHealth: config.health,
      storm: game?.storm, stormGap: (game?.floor ?? 0) - (game?.storm ?? 0),
      stormFraction: game?.stormFraction, climbSpeed: game ? climbSpeed() : 0, peak: game?.peak,
      multiplier: game?.running ? riskBand().mult : 1, hint: game?.hint,
      upgrades: game && { ...game.upgrades }, airJumps: game?.airJumps,
      upgradesAhead: game && upgradesAt(game.floor + config.splitEvery)?.map(u => u.id),
      airborne: game?.airborne, coyote: game?.coyote, buffered: game?.buffered, recover: game?.recover,
      routes: game && routesAt(game.floor), routesAhead: game && routesAt(game.floor + config.splitEvery),
      nextSplit: game?.nextSplit, generatedTo: game?.generatedTo,
      collected: game?.collected, spent: game?.spent, slips: game?.slips, skipped: game?.skipped,
      banked: game?.banked, newBest: game?.newBest, best: loadBest(),
      summit: config.summit, cost: config.cost, slipFloors: config.slip,
      milestone: game?.milestone,
    }),
    start, reset, buy, jump, moveLane,
    cellAt: (lane, floor) => game.cells.get(`${lane}:${floor}`) ?? null,
    setCell: (lane, floor, kind) => {
      if (kind) game.cells.set(`${lane}:${floor}`, kind);
      else game.cells.delete(`${lane}:${floor}`);
    },
    setEnergy: n => { game.energy = n; sync(); },
    setStorm: n => { game.storm = n; sync(); },
    /* Reseeding regenerates: the sections already built came from the old
     * stream, so seeding without a reset changes almost nothing. */
    seed: n => { const was = game.running; reset(n); game.running = was; },
    mute: on => { muted = !!on; },
    grant: (id, n = 1) => { game.upgrades[id] = n; sync(); },   // tests need a perk without waiting for a split
    setRecover: n => { game.recover = n; },
    clearBest: () => saveBest(0),
    pause: on => { game.paused = !!on; },
    step: (dt, times = 1) => { for (let i = 0; i < times && game.running; i++) tick(dt); },
  };

  init();
})();
