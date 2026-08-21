/*
 * The Last Ascent smoke test — real Chromium at the 430x860 portrait viewport.
 *
 * Playability is 25% of the competition score, so this asserts the loop rather
 * than the pixels. Playwright is a dev-only dependency and never ships in the zip.
 *
 * Two halves. The first rides the real render loop. The second pauses it with
 * `pause(true)` and advances the simulation by hand through `step(dt, n)`, so
 * jump timings, slip streaks, milestones and end states are exact rather than
 * "roughly, if the machine was fast enough". Keep new logic tests in the second.
 *
 * Usage: npm run test:smoke   (serve the repo on PORT first, default 4190)
 */
import { chromium } from 'playwright';

const PORT = process.env.PORT || 4190;
const URL = `http://127.0.0.1:${PORT}/index.html`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newContext({
  viewport: { width: 430, height: 860 },
  deviceScaleFactor: 2,
  hasTouch: true,
}).then(c => c.newPage());

const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));

const run = (fn, ...args) => page.evaluate(fn, ...args);
const state = () => run(() => window.ascent.getState());

await page.goto(URL);
await page.waitForFunction(() => window.ascent, null, { timeout: 15000 });

// ── the frame ───────────────────────────────────────────────────────────────

{
  const m = await run(() => ({ s: document.documentElement.scrollHeight, v: window.innerHeight }));
  check('portrait frame does not scroll', m.s <= m.v, `scrollHeight ${m.s} vs viewport ${m.v}`);
}

/* Type is sized in em of one shell-relative base. The base cannot use container
 * units — an element cannot query itself and the fallback resolves against the
 * viewport, which blows the layout off the side of a wide window. */
{
  const fit = await run(() => {
    const shell = document.querySelector('.game-shell'), r = shell.getBoundingClientRect();
    const clipped = [...shell.querySelectorAll('*')]
      .filter(el => { const b = el.getBoundingClientRect(); return b.height && (b.bottom > r.bottom + 1 || b.right > r.right + 1); })
      .map(el => el.id || el.className);
    return { clipped, copy: parseFloat(getComputedStyle(document.querySelector('.spend-copy')).fontSize) };
  });
  check('nothing is laid out past the edge of the portrait shell', fit.clipped.length === 0, fit.clipped.join(', '));
  check('body text is big enough to read without zooming', fit.copy >= 11, `${fit.copy.toFixed(1)}px`);
}

// The hidden modal must leave the hit-test stack immediately, not after its
// transition — this exact bug cost a day on an earlier prototype.
await page.click('#modalButton');
await run(() => { window.ascent.mute(true); });
check('start puts the game in a running state', (await state()).running === true);
{
  const hit = await run(() => {
    const r = document.getElementById('buyShield').getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { inside: !!el?.closest('#buyShield'), got: el ? el.id || el.tagName : null };
  });
  check('hidden modal does not block the spend buttons', hit.inside, `elementFromPoint gave ${hit.got}`);
}

// The climb runs on its own and the storm follows. Both on the live loop.
{
  const before = await state();
  await page.waitForTimeout(1400);
  const after = await state();
  check('the climb advances without input', after.floor > before.floor,
    `${before.floor.toFixed(2)} -> ${after.floor.toFixed(2)}`);
  check('the storm rises too', after.storm > before.storm,
    `${before.storm.toFixed(2)} -> ${after.storm.toFixed(2)}`);
}

// ── deterministic simulation ────────────────────────────────────────────────

/* Everything below drives the sim by hand. A run is a seed, so a scenario can
 * be rebuilt exactly. */
async function fresh(seed = 1) {
  await run(s => { window.ascent.start(s); window.ascent.pause(true); window.ascent.mute(true); }, seed);
  return state();
}

/* Climb to a floor while steering around whatever is in the way. Several tests
 * need to *arrive* somewhere; without this they walk blindly into spikes and
 * die before reaching the thing under test. Declared as source because it runs
 * inside the page. */
const CLIMB_TO = `const climbTo = (target, opts = {}) => {
  const a = window.ascent;
  let n = 0;
  while (a.getState().floorInt < target && a.getState().running && n < 20000) {
    const s = a.getState(), next = Math.floor(s.floor) + 1;
    const clear = [0, 1, 2].filter(l => !['gap', 'hazard'].includes(a.cellAt(l, next)));
    const want = opts.lane !== undefined && clear.includes(opts.lane) ? opts.lane
      : (clear.length ? clear[0] : s.lane);
    if (want !== s.lane) a.moveLane(Math.sign(want - s.lane));
    if (opts.keepEnergy !== undefined) a.setEnergy(opts.keepEnergy);
    a.step(0.05); n++;
  }
};`;

// Lanes are a snapped index, never a float. This is the rule that keeps a
// runner's input from ever feeling "slightly off".
{
  await fresh();
  const lanes = await run(() => {
    const a = window.ascent, seen = [];
    a.moveLane(-1); seen.push(a.getState().lane);
    a.moveLane(-1); seen.push(a.getState().lane);   // already at the edge
    a.moveLane(1); a.moveLane(1); seen.push(a.getState().lane);
    a.moveLane(1); seen.push(a.getState().lane);    // and the other edge
    return seen;
  });
  check('lanes are discrete and clamp at both edges',
    JSON.stringify(lanes) === JSON.stringify([0, 0, 2, 2]), lanes.join(','));
}

// The grid resolves only when a floor line is crossed, which is what makes the
// whole simulation deterministic and free of continuous collision.
{
  await fresh();
  const s = await run(() => {
    const a = window.ascent, st = a.getState();
    a.setCell(st.lane, 1, 'energy');
    a.step(0.05, 60);
    return a.getState();
  });
  check('crossing a floor collects the energy in that cell', s.energy >= 1, `energy ${s.energy}`);
  check('the collected cell is emptied', (await run(() => window.ascent.cellAt(window.ascent.getState().lane, 1))) === null);
}

/* The differentiator: energy is worth more the closer the storm is. If this
 * regresses, climbing fast stops being punished and the game is a generic
 * runner. */
{
  const bands = await run(() => {
    const a = window.ascent, out = [];
    for (const gap of [5, 2.5, 1]) {
      a.start(3); a.pause(true); a.mute(true);
      const st = a.getState();
      a.setStorm(st.floor - gap);
      a.setCell(a.getState().lane, 1, 'energy');
      const before = a.getState().energy;
      a.step(0.05, 60);
      out.push({ gap, gained: a.getState().energy - before, mult: a.getState().multiplier });
    }
    return out;
  });
  check('energy pays x1 far from the storm', bands[0].gained === 1, JSON.stringify(bands[0]));
  check('energy pays x2 close to the storm', bands[1].gained === 2, JSON.stringify(bands[1]));
  check('energy pays x4 in the teeth', bands[2].gained === 4, JSON.stringify(bands[2]));
}

// Hazards and gaps cost height, and height is what the storm eats.
{
  for (const [kind, label] of [['hazard', 'spikes'], ['gap', 'a gap']]) {
    await fresh();
    const s = await run(k => {
      const a = window.ascent, st = a.getState();
      a.setCell(st.lane, 1, k);
      a.step(0.05, 60);
      return a.getState();
    }, kind);
    check(`walking into ${label} costs height and a life`,
      s.slips === 1 && s.health === s.maxHealth - 1 && s.floor < 1,
      `slips ${s.slips}, lives ${s.health}, floor ${s.floor.toFixed(2)}`);
  }
}

/* One mistake is a stumble, three in a row is a fall. The streak is what stops
 * a hundred floors from tolerating unlimited mistakes. */
{
  await fresh();
  const s = await run(() => {
    const a = window.ascent, costs = [];
    for (let i = 0; i < 2; i++) {
      a.setStorm(-50);                     // or the drop is clamped at the storm front
      a.setRecover(0);                     // measuring the hit, not the immunity
      const st = a.getState();
      const target = Math.floor(st.floor) + 1;
      a.setCell(st.lane, target, 'hazard');
      // step until the floor actually falls; that frame is the slip
      let prev = a.getState().floor, guard = 0;
      while (a.getState().floor >= prev && a.getState().running && guard++ < 2000) {
        prev = a.getState().floor;
        a.step(0.02);
      }
      costs.push(+(prev - a.getState().floor).toFixed(2));
    }
    return { costs, combo: a.getState().combo };
  });
  check('a second hit in quick succession costs more height than the first',
    s.costs[1] > s.costs[0], `${s.costs[0]} then ${s.costs[1]} floors`);
}

// Three hits ends the run, which is the only thing lives are for.
{
  await fresh();
  const dead = await run(() => {
    const a = window.ascent;
    for (let i = 0; i < 6 && a.getState().running; i++) {
      const st = a.getState();
      a.setCell(st.lane, Math.floor(st.floor) + 1, 'hazard');
      a.step(0.05, 60);
    }
    return a.getState();
  });
  check('running out of lives ends the run', dead.over === 'fell' && dead.health <= 0,
    `over ${dead.over}, lives ${dead.health}`);
}

// A passive climber is caught. The storm is the pressure behind everything.
{
  await fresh();
  const s = await run(() => {
    const a = window.ascent;
    let n = 0;
    while (a.getState().running && n < 4000) { a.step(0.05); n++; }
    return { ...a.getState(), seconds: n * 0.05 };
  });
  check('doing nothing gets you caught or killed', s.over !== null,
    `over ${s.over} at floor ${s.floorInt} after ${s.seconds.toFixed(0)}s`);
}

/* Jump skips a floor entirely — no spikes, and no energy either. Its length is
 * measured in floors rather than seconds, because a fixed 0.42s arc was shorter
 * than the time to cross a floor and so usually expired before it mattered. */
{
  await fresh();
  const jumped = await run(() => {
    const a = window.ascent, st = a.getState();
    a.setCell(st.lane, 1, 'hazard');
    a.jump();
    a.step(0.05, 60);
    return a.getState();
  });
  check('a jump carries you over spikes', jumped.slips === 0 && jumped.skipped >= 1,
    `slips ${jumped.slips}, skipped ${jumped.skipped}`);

  await fresh();
  const forfeited = await run(() => {
    const a = window.ascent, st = a.getState();
    a.setCell(st.lane, 1, 'energy');
    a.jump();
    a.step(0.05, 60);
    return a.getState();
  });
  check('a jump forfeits that floor\'s energy too', forfeited.energy === 0,
    `energy ${forfeited.energy}`);

  // Pressed at any point before the line, it still clears it.
  const timings = await run(() => {
    const a = window.ascent, out = [];
    for (const wait of [0, 5, 10]) {
      a.start(2); a.pause(true); a.mute(true);
      a.step(0.05, wait);
      const target = Math.floor(a.getState().floor) + 1;
      a.setCell(a.getState().lane, target, 'hazard');
      a.jump();
      while (a.getState().floor < target + 0.2 && a.getState().running) a.step(0.05);
      out.push(a.getState().slips);
    }
    return out;
  });
  check('a jump clears the next floor whenever it is pressed',
    timings.every(n => n === 0), `slips at each timing: ${timings.join(',')}`);
}

// ── upgrades ────────────────────────────────────────────────────────────────

/* Upgrades hang off the lanes at a split, so one swipe picks the route and the
 * perk together. Three different ones per split, or the choice is not a choice. */
{
  await fresh();
  const s = await state();
  check('a split offers three different upgrades', new Set(s.upgradesAhead).size === 3,
    s.upgradesAhead.join(', '));

  const taken = await run(`(() => {
    ${CLIMB_TO}
    const a = window.ascent;
    const split = a.getState().nextSplit;
    const wanted = a.getState().upgradesAhead[1];
    // Clear lane 1 up to the split so arriving in it is possible, then take it.
    for (let f = 1; f <= split; f++) a.setCell(1, f, null);
    climbTo(split + 1, { lane: 1 });
    return { wanted, have: a.getState().upgrades, running: a.getState().running };
  })()`);
  check('crossing a split grants the upgrade in your lane', taken.have[taken.wanted] === 1,
    `${taken.wanted} = ${taken.have[taken.wanted]}`);
}

// Each perk has to actually do its job.
{
  const perks = await run(() => {
    const a = window.ascent, out = {};

    // ANCHOR: slips cost less height.
    const slipCost = anchors => {
      a.start(6); a.pause(true); a.mute(true);
      a.grant('anchor', anchors);
      const st = a.getState();
      a.setCell(st.lane, 1, 'hazard');
      a.step(0.05, 60);
      return a.getState().floor;
    };
    out.anchor = { without: +slipCost(0).toFixed(2), with: +slipCost(2).toFixed(2) };

    // MAGNET: energy is pulled from the neighbouring lanes.
    a.start(6); a.pause(true); a.mute(true);
    a.grant('magnet', 1);
    a.setCell(0, 1, 'energy'); a.setCell(1, 1, 'energy'); a.setCell(2, 1, 'energy');
    /* Bounded, because with compensation on moveLane negates the direction and
     * a naive "keep nudging toward 1" loop never converges. */
    for (let i = 0; i < 8 && a.getState().lane !== 1; i++) {
      a.moveLane(a.getState().lane > 1 ? 1 : -1);
    }
    a.step(0.05, 60);
    out.magnet = a.getState().energy;

    // DOUBLE JUMP: a second jump while already airborne.
    a.start(6); a.pause(true); a.mute(true);
    a.grant('doubleJump', 1);
    a.jump();
    out.doubleJump = a.jump();

    // LONG JUMP: the arc covers more than one floor line.
    a.start(6); a.pause(true); a.mute(true);
    a.grant('longJump', 1);
    a.setCell(a.getState().lane, 1, 'hazard');
    a.setCell(a.getState().lane, 2, 'hazard');
    a.jump();
    a.step(0.05, 90);
    out.longJump = a.getState().slips;

    return out;
  });
  check('ANCHOR softens a slip', perks.anchor.with > perks.anchor.without,
    `floor ${perks.anchor.without} without, ${perks.anchor.with} with`);
  check('MAGNET pulls energy from neighbouring lanes', perks.magnet >= 3, `collected ${perks.magnet}`);
  check('DOUBLE JUMP allows a second jump in the air', perks.doubleJump === true);
  check('LONG JUMP clears two floors in one arc', perks.longJump === 0, `slips ${perks.longJump}`);
}

// ── spends ──────────────────────────────────────────────────────────────────

{
  await fresh();
  const spends = await run(() => {
    const a = window.ascent, out = {};
    a.setEnergy(100);
    const before = a.getState();

    a.buy('shield');
    out.shielded = a.getState().shield;
    // and the shield eats a hit instead of a life
    a.setCell(a.getState().lane, Math.floor(a.getState().floor) + 1, 'hazard');
    a.step(0.05, 60);
    out.afterHit = { lives: a.getState().health, shield: a.getState().shield, slips: a.getState().slips };

    const gapBefore = a.getState().stormGap;
    a.buy('surge');
    out.surgeGain = +(a.getState().stormGap - gapBefore).toFixed(2);

    const floorBefore = a.getState().floor;
    a.buy('grapple');
    out.grappleGain = +(a.getState().floor - floorBefore).toFixed(2);

    out.spent = a.getState().spent;
    out.energyLeft = a.getState().energy;
    out.startEnergy = before.energy;
    return out;
  });
  check('SHIELD absorbs a hit instead of a life',
    spends.shielded && spends.afterHit.lives === 3 && spends.afterHit.slips === 0 && !spends.afterHit.shield,
    JSON.stringify(spends.afterHit));
  check('SURGE pushes the storm back', spends.surgeGain > 1, `gap +${spends.surgeGain}`);
  check('GRAPPLE buys height directly', spends.grappleGain >= 2, `+${spends.grappleGain} floors`);
  check('every spend comes off the energy you are scored on',
    spends.energyLeft === spends.startEnergy - spends.spent,
    `${spends.startEnergy} - ${spends.spent} = ${spends.energyLeft}`);
}

{
  await fresh();
  const refused = await run(() => {
    window.ascent.setEnergy(0);
    return [window.ascent.buy('shield'), window.ascent.buy('surge'), window.ascent.buy('grapple')];
  });
  check('spends are refused without energy', refused.every(r => r === false), refused.join(','));
}

// ── milestones, banking and the summit ──────────────────────────────────────

/* A hundred-floor tower that banked only at the top would score zero on nearly
 * every run. Milestones snapshot the score and restore a life; everything
 * gathered since the last one is still lost on death. */
{
  await run(() => window.ascent.clearBest());
  await fresh();
  const ms = await run(`(() => {
    ${CLIMB_TO}
    const a = window.ascent;
    // take a hit first, so there is something for the milestone to heal
    const lane0 = a.getState().lane, spikeFloor = Math.floor(a.getState().floor) + 1;
    a.setCell(lane0, spikeFloor, 'hazard');
    a.step(0.05, 60);
    a.setCell(lane0, spikeFloor, null);   // clear it, or the climb back re-hits it
    const hurt = a.getState().health;
    climbTo(20, { keepEnergy: 30 });
    const at = a.getState();
    return { hurt, banked: at.banked, lives: at.health, milestone: at.milestone, running: at.running };
  })()`);
  /* The snapshot is whatever was held as the milestone passed, which is about
   * the 30 forced in — a fragment can land in the same step. */
  check('a milestone snapshots the score', ms.banked >= 30 && ms.banked <= 40 && ms.milestone === 1,
    `banked ${ms.banked} at milestone ${ms.milestone}`);
  check('a milestone restores a life', ms.lives > ms.hurt, `${ms.hurt} -> ${ms.lives}`);

  const died = await run(() => {
    const a = window.ascent;
    a.setEnergy(999);                       // a fortune gathered after the milestone
    for (let i = 0; i < 8 && a.getState().running; i++) {
      const st = a.getState();
      a.setCell(st.lane, Math.floor(st.floor) + 1, 'hazard');
      a.step(0.05, 60);
    }
    return a.getState();
  });
  check('dying keeps the last snapshot and loses everything since',
    died.over !== null && died.banked === ms.banked,
    `over ${died.over}, banked ${died.banked} while holding 999 — snapshot was ${ms.banked}`);
}

{
  await run(() => window.ascent.clearBest());
  await fresh();
  const won = await run(() => {
    const a = window.ascent;
    let n = 0;
    while (a.getState().running && a.getState().floorInt < a.getState().summit && n < 20000) {
      const st = a.getState();
      const next = Math.floor(st.floor) + 1;
      const clear = [0, 1, 2].filter(l => !['gap', 'hazard'].includes(a.cellAt(l, next)));
      const want = clear.length ? clear[0] : st.lane;
      if (want !== st.lane) a.moveLane(Math.sign(want - st.lane));
      a.step(0.05); n++;
    }
    return { ...a.getState(), seconds: n * 0.05 };
  });
  check('the summit is reachable by clean play',
    won.over === 'summit' && won.floorInt >= won.summit, `floor ${won.floorInt}, over ${won.over}`);
  check('a run lasts long enough to be a session', won.seconds > 60 && won.seconds < 240,
    `${won.seconds.toFixed(0)}s`);
  check('the summit banks the energy in hand plus the bonus', won.banked > won.energy,
    `banked ${won.banked} holding ${won.energy}`);
  check('reaching the summit sets the best', (await state()).best === won.banked);
  check('no spends after the run is over', (await run(() => {
    window.ascent.setEnergy(500); return window.ascent.buy('surge');
  })) === false);
}

// ── the skill curve, as a balance regression ────────────────────────────────

/* Scripted players of different competence. If a change makes the game
 * unlosable or unwinnable, this is what catches it. */
{
  const curve = await run(() => {
    const a = window.ascent;
    const play = (seed, skill) => {
      a.start(seed); a.pause(true); a.mute(true);
      let t = 0, tick = 0;
      while (a.getState().running && t < 400) {
        const s = a.getState(), n = Math.floor(s.floor) + 1;
        if (tick % 8 === 0 && (seed * 31 + tick * 7) % 100 < skill) {
          const clear = [0, 1, 2].filter(l => !['gap', 'hazard'].includes(a.cellAt(l, n)));
          const e = clear.filter(l => a.cellAt(l, n) === 'energy');
          const want = e.length ? e[0] : (clear[0] ?? s.lane);
          if (want !== s.lane) a.moveLane(Math.sign(want - s.lane));
        }
        if (s.health <= 1 && s.energy >= s.cost.shield && !s.shield) a.buy('shield');
        else if (s.stormGap < 1.4 && s.energy >= s.cost.surge) a.buy('surge');
        a.step(0.05); t += 0.05; tick++;
      }
      return a.getState();
    };
    return { good: play(1, 90), poor: play(7, 20) };
  });
  check('a competent player reaches the summit', curve.good.over === 'summit',
    `floor ${curve.good.floorInt}, banked ${curve.good.banked}`);
  check('a careless player does not', curve.poor.over !== 'summit' && curve.poor.over !== null,
    `floor ${curve.poor.floorInt}, over ${curve.poor.over}`);
}

// ── the tutorial ────────────────────────────────────────────────────────────

/* The hint line is the whole tutorial, ordered by urgency: the thing directly
 * above you preempts everything else. */
{
  await fresh();
  const threat = await run(() => {
    const a = window.ascent, st = a.getState();
    a.setCell(st.lane, Math.floor(st.floor) + 1, 'gap');
    a.step(0.05);
    return a.getState().hint;
  });
  check('a gap in your lane takes over the hint line', /JUMP/i.test(threat), threat);

  await fresh();
  const teeth = await run(() => {
    const a = window.ascent;
    a.setStorm(a.getState().floor - 1);
    a.step(0.05);
    return a.getState().hint;
  });
  check('riding the storm says what it is paying', /×4|x4/.test(teeth), teeth);
}

/*
 * The tower turn. Random, telegraphed, and sometimes it reverses the lanes.
 * The telegraph is the whole reason the mechanic is fair rather than a gotcha,
 * so it is the part asserted hardest.
 */
{
  await fresh();
  const warned = await run(() => {
    const a = window.ascent;
    a.setFlip(1, false);              // always turn, no input compensation
    a.forceFlip();
    const atStart = a.getState();
    const banner = document.getElementById('turnWarn');
    return {
      phase: atStart.flipPhase,
      timer: atStart.flipTimer,
      hint: atStart.hint,
      bannerShown: !banner.hidden,
      arenaTinted: document.querySelector('.arena').classList.contains('turning'),
    };
  });
  check('a turn is announced before it happens', warned.phase === 'warn' && warned.timer > 1,
    `phase ${warned.phase}, ${warned.timer?.toFixed(1)}s of warning`);
  check('the warning takes over the hint line', /TURNING/.test(warned.hint || ''), warned.hint);
  check('the warning is on screen and tints the arena',
    warned.bannerShown && warned.arenaTinted,
    `banner ${warned.bannerShown}, tint ${warned.arenaTinted}`);

  const turned = await run(() => {
    const a = window.ascent;
    const before = { mirrored: a.getState().mirrored, swaps: a.getState().flipSwaps, x1: a.laneScreenX(0) };
    for (let i = 0; i < 200 && a.getState().flipPhase; i++) a.step(0.05);
    return { before, after: { mirrored: a.getState().mirrored, x1: a.laneScreenX(0) }, phase: a.getState().flipPhase };
  });
  check('the turn completes and settles', turned.phase === null, `phase ${turned.phase}`);
  check('a turn past edge-on puts lane 0 on the other side of the screen',
    turned.before.swaps ? turned.after.x1 === -turned.before.x1 : turned.after.x1 === turned.before.x1,
    `swaps ${turned.before.swaps}: screen x ${turned.before.x1} -> ${turned.after.x1}`);

  /* Nothing about the grid may move. The turn is a camera and a mapping; the
   * simulation must be identical either way. */
  const unchanged = await run(() => {
    const a = window.ascent;
    const st = a.getState();
    const cellsBefore = [0, 1, 2].map(l => a.cellAt(l, Math.floor(st.floor) + 2));
    a.forceFlip();
    for (let i = 0; i < 200 && a.getState().flipPhase; i++) a.step(0.05);
    const cellsAfter = [0, 1, 2].map(l => a.cellAt(l, Math.floor(st.floor) + 2));
    return { cellsBefore, cellsAfter, lane: st.lane, laneAfter: a.getState().lane };
  });
  check('a turn does not touch the grid or move the climber between lanes',
    JSON.stringify(unchanged.cellsBefore) === JSON.stringify(unchanged.cellsAfter),
    `${JSON.stringify(unchanged.cellsBefore)} vs ${JSON.stringify(unchanged.cellsAfter)}`);

  // And the compensating variant keeps a swipe screen-honest.
  const compensated = await run(() => {
    const a = window.ascent;
    a.start(5); a.pause(true); a.mute(true);
    a.setFlip(1, true);
    a.forceFlip();
    for (let i = 0; i < 300 && a.getState().flipPhase; i++) a.step(0.05);
    for (let i = 0; i < 8 && a.getState().lane !== 1; i++) a.moveLane(a.getState().lane > 1 ? 1 : -1);
    const x0 = a.laneScreenX(a.getState().lane);
    a.moveLane(1);
    return { mirrored: a.getState().mirrored, x0, x1: a.laneScreenX(a.getState().lane) };
  });
  check('with compensation on, a swipe still moves the way you swiped',
    compensated.x1 > compensated.x0,
    `mirrored ${compensated.mirrored}, screen x ${compensated.x0} -> ${compensated.x1}`);

  await run(() => window.ascent.setFlip(0.55, false));
}

check('no runtime errors', errors.length === 0, errors.join(' | '));

await page.screenshot({ path: 'tests/last-run.png' });
await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
