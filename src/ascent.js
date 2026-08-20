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
    summit: 20,              // floors to the escape beacon
    /*
     * Speed is the escalation, the way it is in every runner. A constant
     * 1.1s per floor gave an attentive player over a second to read three
     * lanes and swipe, which is no decision at all — a scripted run took zero
     * damage on every seed. It tightens to about 0.6s by the summit.
     */
    climbTime: 1.15,         // seconds per floor at floor zero
    speedRamp: .975,         // multiplied per floor climbed
    splitEvery: 4,           // floors between route choices — four choices per run

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
    stormFraction: .80,      // storm speed as a share of CLIMB speed, not an absolute
    stormRampAdd: .09,       // added at every split: .80 .89 .98 1.07 1.16

    /*
     * A hit costs height, not hit points. This is the only failure axis in the
     * game: hazards and gaps make you slip, slipping feeds the storm, and the
     * storm is the one way to lose. Health pips were cut for this — two
     * failure meters for one event is the "six things that half-work" trap.
     */
    slip: 1.5,               // floors lost to a hazard or a missed ledge

    /*
     * Input forgiveness. Not polish — a platformer without these reads as
     * broken input rather than as difficulty, and Playability is 25%.
     */
    coyote: .12,             // seconds after leaving a ledge that a jump still works
    buffer: .12,             // seconds before landing that a jump press is remembered
    jumpTime: .42,           // seconds airborne, fixed: a jump is a kinematic arc
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
    summitBonus: 25,

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
    energy: 0x66e0c8, hazard: 0xe0556b, storm: 0x4a2440, rubble: 0x6b5560,
    safe: 0x63c47a, danger: 0xe0556b, unknown: 0xc79bf0, beacon: 0xffe066,
  };

  const ui = Object.fromEntries([
    'game', 'floor', 'energy', 'best', 'stormGap', 'multiplier', 'feed', 'routeHint',
    'buyShield', 'buySurge', 'buyGrapple', 'costShield', 'costSurge', 'costGrapple',
    'startModal', 'modalButton', 'modalTitle', 'modalCopy', 'modalIcon', 'modalKicker',
    'reset', 'summitGoal',
  ].map(id => [id, document.getElementById(id)]));

  const BEST_KEY = 'lastascent.best';
  const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
  const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* not worth a crash */ } };

  let renderer, scene, camera, world, climberMesh, climberLimbs, stormMesh, lightning, clock = 0, last = 0;
  let shake = 0, lightningTimer = 1;
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
    mesh(new T.BoxGeometry(config.laneWidth * config.lanes + 1.4, 400, 1), mat(colors.tower), world, 0, 180, -1.4);
    for (let i = 0; i <= config.lanes; i++) {
      mesh(new T.BoxGeometry(.06, 400, .2), mat(colors.towerEdge), world,
        laneX(i) - config.laneWidth / 2, 180, -.85);
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
      generateSection(game.generatedTo, routes);
      game.generatedTo += config.splitEvery;
    }
  }

  const sectionStart = f => Math.floor(f / config.splitEvery) * config.splitEvery;
  const routesAt = f => game.sectionRoutes.get(sectionStart(f)) || game.sectionRoutes.get(0);

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
      props, spins: [],
      cells: new Map(),
      lane: 1,
      laneVisual: 1,       // eased toward `lane` for the eye only; the grid uses `lane`
      floor: 0,            // continuous height in floors
      energy: 0,
      storm: config.stormStart,
      stormFraction: config.stormFraction,
      airborne: 0,         // seconds left in the current jump arc
      peak: 0,             // highest floor reached, which is what a slip takes back
      coyote: 0, buffered: 0,
      shield: false,
      running: false, paused: false,
      over: null, banked: 0, newBest: false,
      sectionRoutes: new Map(), generatedTo: 0, nextSplit: config.splitEvery,
      collected: 0, spent: 0, slips: 0,
      hint: null, hintRank: -1, hintUntil: 0, hintTime: 0,
      taughtJump: false, taughtSwipe: false,
    };

    ensureGenerated();
    sync();
  }

  // ── input ──────────────────────────────────────────────────────────────────

  function moveLane(dir) {
    if (!game.running) return false;
    const next = Math.min(config.lanes - 1, Math.max(0, game.lane + dir));
    if (next === game.lane) return false;
    game.lane = next;
    return true;
  }

  function jump() {
    if (!game.running) return false;
    // Buffered: pressing just before you land still counts, which is most of
    // what "responsive" means in a platformer.
    if (game.airborne > 0 && game.coyote <= 0) { game.buffered = config.buffer; return false; }
    game.airborne = config.jumpTime;
    game.coyote = 0;
    game.buffered = 0;
    return true;
  }

  // ── simulation ─────────────────────────────────────────────────────────────

  /* Everything that resolves does so when the climber crosses a floor line.
   * That is the only moment the grid is consulted, which is what makes the
   * whole thing deterministic and testable. */
  function crossFloor(f) {
    const kind = game.cells.get(`${game.lane}:${f}`);

    if (kind === 'energy') {
      game.cells.delete(`${game.lane}:${f}`);
      const band = riskBand();
      game.energy += band.mult;
      game.collected += band.mult;
      showFeed(band.mult > 1 ? `+${band.mult}  ${band.label}` : '+1');
      ui.energy.classList.remove('pulse');
      void ui.energy.offsetWidth;
      ui.energy.classList.add('pulse');
      return;
    }

    // A jump carries you over a gap or a hazard. That is the entire skill.
    if (game.airborne > 0) return;

    if (kind === 'gap') return slip('SLIPPED');
    if (kind === 'hazard') return slip('HIT');
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
      return;
    }
    game.floor = Math.max(game.storm, game.floor - config.slip);
    game.slips++;
    shake = 1;
    hurt(reason);
  }

  /* Expressing the storm as a share of climb speed rather than an absolute
   * keeps the chase tight however fast the climb gets. Above 1.0 it gains on a
   * clean run, which is what forces energy to be spent in the last section —
   * and spending it is spending the score. */
  const climbSpeed = () => Math.pow(config.speedRamp, Math.max(0, game.floor)) / config.climbTime;

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
    if (game.buffered > 0) {
      game.buffered = Math.max(0, game.buffered - dt);
      if (game.airborne === 0) { game.buffered = 0; game.airborne = config.jumpTime; }
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
    if (game.running && game.floor >= config.summit) summit();

    sync();
  }

  /* Crossing into a new section is the moment the choice locks in: the lane
   * the climber happens to be in is the route they took. No menu, no pause. */
  function reachSplit(f) {
    game.nextSplit = sectionStart(f) + config.splitEvery;
    game.stormFraction += config.stormRampAdd;
    showFeed(`${routesAt(f)[game.lane]} ROUTE`);
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
    if (kind === 'shield') { game.shield = true; showFeed('SHIELDED'); }
    if (kind === 'surge') { game.storm -= config.surgePush; showFeed('SURGE'); }
    if (kind === 'grapple') { game.floor += config.grappleClimb; showFeed('GRAPPLE'); }
    sync();
    return true;
  }

  // ── ending ─────────────────────────────────────────────────────────────────

  function summit() {
    game.banked = game.energy + config.summitBonus;
    const g = new T.Group();
    g.position.set(laneX(game.lane), config.summit + 1, .5);
    game.props.add(g);
    const b = mesh(new T.SphereGeometry(.5, 12, 10), mat(colors.beacon, .3), g);
    b.material.emissive = new T.Color(colors.beacon);
    b.material.emissiveIntensity = .9;
    end('summit', 'ESCAPED', `Beacon lit with ${game.energy} energy still in hand, plus a ${config.summitBonus} summit bonus.`);
  }

  function end(kind, title, copy) {   // eslint-disable-line no-unused-vars
    game.running = false;
    game.over = kind;
    if (kind !== 'summit') game.banked = 0;   // dying banks nothing at all

    const previous = loadBest();
    game.newBest = game.banked > previous;
    if (game.newBest) saveBest(game.banked);
    const best = Math.max(previous, game.banked);

    const near = game.newBest ? `A new best. The old one was ${previous}.`
      : best ? `Your best is ${best} — ${best - game.banked} short.`
        : 'Reach the summit and the energy in hand is yours to keep.';

    ui.modalIcon.textContent = kind === 'summit' ? '🛰️' : kind === 'storm' ? '🌩️' : '💀';
    ui.modalKicker.textContent = `FLOOR ${Math.floor(game.floor)} · ${game.collected} COLLECTED · ${game.slips} SLIPS`;
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
    ui.floor.textContent = Math.max(0, Math.floor(game.floor));
    ui.summitGoal.textContent = config.summit;
    ui.energy.textContent = game.energy;
    ui.best.textContent = Math.max(loadBest(), game.banked);

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
    ui.buyShield.disabled = !canAfford('shield');
    ui.buySurge.disabled = !canAfford('surge');
    ui.buyGrapple.disabled = !canAfford('grapple');
    ui.buyShield.classList.toggle('active', game.shield);

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
      ? Math.sin((1 - game.airborne / config.jumpTime) * Math.PI) * config.jumpHeight
      : 0;
    climberMesh.position.set(laneX(game.laneVisual), game.floor + .55 + arc, .9);
    climberMesh.rotation.z = (game.lane - game.laneVisual) * .45;

    /* Limbs alternate as it climbs and tuck mid-jump. The cheapest possible way
     * to say "this is a person climbing" rather than "this is a shape moving
     * upward", which is the note the first playtest gave. */
    if (climberLimbs) {
      const swing = Math.sin(clock * 11) * .7;
      const tuck = jumping ? -1.1 : 0;
      climberLimbs.armL.rotation.x = swing + tuck;
      climberLimbs.armR.rotation.x = -swing + tuck;
      climberLimbs.legL.rotation.x = -swing * .7 - (jumping ? .9 : 0);
      climberLimbs.legR.rotation.x = swing * .7 - (jumping ? .9 : 0);
    }

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
    ui.reset.classList.remove('arm');
    ui.reset.textContent = '↺';
    reset(typeof seed === 'number' ? seed : undefined);
    game.running = true;
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
      energy: game?.energy, shield: game?.shield,
      storm: game?.storm, stormGap: (game?.floor ?? 0) - (game?.storm ?? 0),
      stormFraction: game?.stormFraction, climbSpeed: game ? climbSpeed() : 0, peak: game?.peak,
      multiplier: game?.running ? riskBand().mult : 1, hint: game?.hint,
      airborne: game?.airborne, coyote: game?.coyote, buffered: game?.buffered,
      routes: game && routesAt(game.floor), routesAhead: game && routesAt(game.floor + config.splitEvery),
      nextSplit: game?.nextSplit, generatedTo: game?.generatedTo,
      collected: game?.collected, spent: game?.spent, slips: game?.slips,
      banked: game?.banked, newBest: game?.newBest, best: loadBest(),
      summit: config.summit, cost: config.cost, slipFloors: config.slip,
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
    clearBest: () => saveBest(0),
    pause: on => { game.paused = !!on; },
    step: (dt, times = 1) => { for (let i = 0; i < times && game.running; i++) tick(dt); },
  };

  init();
})();
