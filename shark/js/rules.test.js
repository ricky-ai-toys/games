/* Amber's Shark Hunt — node smoke harness.
 * Drives full games through the pure engine with a scripted pilot and asserts
 * invariants on every frame. No browser, no canvas, no DOM.
 *
 * Usage: node shark/js/rules.test.js [games] [difficulty]
 *        node shark/js/rules.test.js 2000          # 2000 games, mixed difficulty
 *        node shark/js/rules.test.js 500 hard      # 500 games on hard only
 */
'use strict';

require('./data.js');
require('./rules.js');
require('./ai.js');

const D = globalThis.SHData;
const R = globalThis.SHRules;
const T = D.TUNE;

const WORLD_W = 390;   // iPhone-ish logical viewport
const WORLD_H = 780;
const DT = 1 / 60;
const MAX_SECONDS = 240;   // a run that outlasts this has failed to terminate

/* A scripted pilot. Steers toward prey, away from the closest threat, bites when
 * something edible is in the cone, dashes on the apex predator's telegraph, and
 * takes the tail window during `recover` — i.e. it plays roughly the way a
 * competent 8-12 year old would.
 *
 * `mem` persists across frames to give the pilot target hysteresis. Without it the
 * pilot re-targets every time a magnet-pulled fish drifts closer, thrashes in
 * place, and starves to death while edible fish swim past — which measures the
 * bot, not the game. */
function pilot(state, mem) {
  if (!mem) mem = {};
  const inp = state.input;
  inp.dash = false;
  inp.bite = false;

  const pr = R.playerRadius(state);
  let bestPrey = null, bestPreyD = Infinity, bestPreyWorth = 0;
  let threat = null, threatD = Infinity;
  let relic = null, relicD = Infinity;

  for (const o of state.objs) {
    const d = R.dist(state.x, state.y, o.x, o.y);
    if (R.dangerous(state, o) && d < threatD) { threat = o; threatD = d; }
    if (R.edible(state, o)) {
      /* Prefer value over proximity, the way a player who has learned the game
       * does. Beelining at the nearest fry is what a bad player does, and it
       * makes the harness a useless balance proxy. */
      const worth = o.pts / (d + pr * 2.5);
      if (worth > bestPreyWorth) { bestPrey = o; bestPreyD = d; bestPreyWorth = worth; }
    }
  }

  /* Hysteresis: stay on the current target until it is gone or a clearly better
   * one appears. */
  if (mem.target) {
    if (mem.target.gone) mem.target = null;
    else {
      const td = R.dist(state.x, state.y, mem.target.x, mem.target.y);
      const tw = mem.target.pts / (td + pr * 2.5);
      if (tw >= bestPreyWorth * 0.8) { bestPrey = mem.target; bestPreyD = td; bestPreyWorth = tw; }
    }
  }
  if (bestPrey) mem.target = bestPrey;
  for (const rl of state.relics) {
    const d = R.dist(state.x, state.y, rl.x, rl.y);
    if (d < relicD) { relic = rl; relicD = d; }
  }

  const a = state.apex;
  let ax = a ? a.x : null, ay = a ? a.y : null, ad = a ? R.dist(state.x, state.y, a.x, a.y) : Infinity;

  // Dodge the locked lunge line: move perpendicular to it.
  if (a && (a.phase === 'telegraph' || a.phase === 'lunge') && ad < 420) {
    const lx = a.phase === 'lunge' ? a.lungeX : (a.aimX - a.x);
    const ly = a.phase === 'lunge' ? a.lungeY : (a.aimY - a.y);
    const m = Math.hypot(lx, ly) || 1;
    ax = state.x + (-ly / m) * 300;
    ay = state.y + (lx / m) * 300;
    if (a.phase === 'telegraph' && ad < pr * 6) inp.dash = true;
  }

  // Take the offensive window: close in on the exposed tail during `recover`.
  // A pilot that only ever flees never exercises this path, and the mechanic
  // would silently rot.
  let wantTail = false;
  if (a && a.phase === 'recover' && ad < pr * 5.5) {
    ax = a.x; ay = a.y;
    if (ad < pr + a.r * 1.05) wantTail = true;
  }

  let tx, ty;
  if (ax !== null) { tx = ax; ty = ay; }
  else if (threat && threatD < pr * 4.5) {
    tx = state.x + (state.x - threat.x) * 2;
    ty = state.y + (state.y - threat.y) * 2;
  } else if (relic && relicD < pr * 5) { tx = relic.x; ty = relic.y; }
  else if (bestPrey) { tx = bestPrey.x; ty = bestPrey.y; }
  else { tx = state.x; ty = state.y - 1; }

  const dx = tx - state.x, dy = ty - state.y;
  const m = Math.hypot(dx, dy);
  if (m > 4) { inp.dx = dx / m; inp.dy = dy / m; inp.mag = 1; }
  else { inp.mag = 0.1; }

  // Bite when prey is close and roughly ahead, or when the tail is exposed.
  if (bestPrey && bestPreyD < pr * 2.6) {
    const ang = Math.atan2(bestPrey.y - state.y, bestPrey.x - state.x);
    if (Math.abs(R.angDiff(state.face, ang)) < 0.9) inp.bite = true;
  }
  if (wantTail) inp.bite = true;
  return inp;
}

const failures = [];
function fail(msg, ctx) {
  failures.push(msg + (ctx ? '  [' + ctx + ']' : ''));
  if (failures.length > 25) {
    console.error('\nToo many failures, aborting.\n' + failures.join('\n'));
    process.exit(1);
  }
}

function finite(v) { return typeof v === 'number' && isFinite(v); }

function checkInvariants(s, game) {
  const tag = `game ${game.i} seed ${game.seed} ${game.diff} t=${s.t.toFixed(1)}`;
  const nums = {
    score: s.score, combo: s.combo, goal: s.goal, xp: s.xp, life: s.life,
    size: s.size, x: s.x, y: s.y, vx: s.vx, vy: s.vy, frenzy: s.frenzy
  };
  for (const k in nums) {
    if (!finite(nums[k])) { fail(`non-finite ${k}=${nums[k]}`, tag); return false; }
  }
  if (s.score < 0) { fail(`negative score ${s.score}`, tag); return false; }
  if (s.combo < 0) { fail(`negative combo ${s.combo}`, tag); return false; }
  if (s.life < 0) { fail(`negative life ${s.life}`, tag); return false; }
  if (s.size < 1 || s.size > D.MAX_SIZE) { fail(`size out of range ${s.size}`, tag); return false; }
  for (const o of s.objs) {
    if (!finite(o.x) || !finite(o.y) || !finite(o.vx) || !finite(o.vy)) {
      fail(`non-finite fish state n=${o.n}`, tag); return false;
    }
  }
  for (const rl of s.relics) {
    if (!finite(rl.x) || !finite(rl.y)) { fail('non-finite relic', tag); return false; }
  }
  if (s.apex) {
    if (!finite(s.apex.x) || !finite(s.apex.y)) { fail('non-finite apex', tag); return false; }
    if (typeof s.apex.phase !== 'string' || !s.apex.phase) { fail('apex has no phase', tag); return false; }
  }
  return true;
}

function playGame(i, diff, seed) {
  const s = R.createState(diff, seed, WORLD_W, WORLD_H);
  const g = {
    i, diff, seed, frames: 0, apexSpawned: 0, phases: {},
    reachedApex: false, tailHits: 0, ended: null, livesLost: 0, mem: {}
  };
  let steps = 0;
  const maxSteps = Math.ceil(MAX_SECONDS / DT);

  while (!s.over && steps < maxSteps) {
    pilot(s, g.mem);
    const lifeBefore = s.life;
    R.step(s, DT);
    steps++;
    g.frames++;
    if (s.life < lifeBefore) g.livesLost += lifeBefore - s.life;

    for (const e of s.events) {
      if (e.t === 'apex-begin') g.reachedApex = true;
      if (e.t === 'phase') { g.phases[e.phase] = (g.phases[e.phase] || 0) + 1; }
      if (e.t === 'tail') g.tailHits++;
    }
    s.events.length = 0;
    if (s.apex) g.apexSpawned++;

    if (!checkInvariants(s, g)) { g.ended = 'invariant'; break; }
  }

  if (!s.over && steps >= maxSteps) {
    fail(`did not terminate within ${MAX_SECONDS}s`, `game ${i} seed ${seed} ${diff} t=${s.t.toFixed(1)}`);
  }
  if (s.over) {
    g.ended = s.result;
    g.score = s.score;
    g.size = s.size;
    if (!finite(s.score)) fail(`final score not finite`, `game ${i}`);
  }
  return g;
}

/* A run that ends at zero points means the player died before finding the
 * controls. Worth surfacing even when it is only a handful of games. */
function scoreSanity(games) {
  const dead = games.filter(g => g.ended === 'lose' && g.score === 0);
  if (dead.length) {
    const byDiff = {};
    dead.forEach(g => { byDiff[g.diff] = (byDiff[g.diff] || 0) + 1; });
    console.log(`\nWARNING: ${dead.length} run(s) died at 0 points (found the controls too late): ${JSON.stringify(byDiff)}`);
    dead.slice(0, 3).forEach(g => console.log(`   ${g.diff} seed=${g.seed} died at size ${g.size}`));
  }
}

function playDeterminism(diff, seed) {
  const a = R.createState(diff, seed, WORLD_W, WORLD_H);
  const b = R.createState(diff, seed, WORLD_W, WORLD_H);
  for (let k = 0; k < 60 * 90; k++) {
    pilot(a); R.step(a, DT); a.events.length = 0;
    pilot(b); R.step(b, DT); b.events.length = 0;
    if (a.over && b.over) break;
  }
  if (a.score !== b.score || a.size !== b.size || a.life !== b.life) {
    fail(`determinism violated: ${a.score}/${a.size}/${a.life} vs ${b.score}/${b.size}/${b.life}`,
         `seed ${seed} ${diff}`);
  }
}

/* ------------------------------------------------------------------ main */

/* Single-game timeline trace, for diagnosing a specific seed:
 *   node shark/js/rules.test.js --trace 3668340011 hard
 */
if (process.argv[2] === '--trace') {
  const seed = parseInt(process.argv[3] || '1', 10);
  const diff = process.argv[4] || 'med';
  const s = R.createState(diff, seed, WORLD_W, WORLD_H);
  console.log(`trace ${diff} seed=${seed} lives=${s.life} grace=${s.graceT}s\n`);
  let steps = 0, lastLog = -1;
  while (!s.over && steps < 60 * 120) {
    pilot(s, {});
    R.step(s, DT);
    steps++;
    const evs = s.events.map(e => e.t);
    s.events.length = 0;
    if (s.t - lastLog >= 0.5 || evs.includes('hit') || evs.includes('eat') || evs.includes('grow')) {
      const edible = s.objs.filter(o => R.edible(s, o)).length;
      const danger = s.objs.filter(o => R.dangerous(s, o)).length;
      console.log(`t=${s.t.toFixed(1).padStart(5)} score=${String(s.score).padStart(6)} size=${s.size} life=${s.life} grace=${s.graceT.toFixed(1)} ` +
        `pos=(${s.x.toFixed(0).padStart(3)},${s.y.toFixed(0).padStart(3)}) vel=(${s.vx.toFixed(0).padStart(4)},${s.vy.toFixed(0).padStart(4)}) ` +
        `fish=${String(s.objs.length).padStart(2)} edible=${String(edible).padStart(2)} danger=${danger} apex=${s.apex ? s.apex.phase : '-'} [${evs.join(',')}]`);
      lastLog = s.t;
    }
  }
  console.log(`\nEND result=${s.result} score=${s.score} t=${s.t.toFixed(1)}s size=${s.size}`);
  process.exit(0);
}

const games = parseInt(process.argv[2] || '200', 10) || 200;
const onlyDiff = process.argv[3] || null;
const diffs = onlyDiff ? [onlyDiff] : D.DIFF_KEYS;

console.log(`Shark Hunt engine smoke — ${games} games, difficulty: ${diffs.join(', ')}`);
console.log(`world ${WORLD_W}x${WORLD_H} @ ${DT.toFixed(4)}s steps\n`);

const t0 = Date.now();
const results = [];
let wins = 0, losses = 0, unreached = 0;
const phaseTotals = {};
const byDiff = {};

for (let i = 0; i < games; i++) {
  const diff = diffs[i % diffs.length];
  const seed = (0x9e3779b9 * (i + 1)) >>> 0;
  const g = playGame(i, diff, seed);
  results.push(g);
  const b = byDiff[diff] || (byDiff[diff] = { n: 0, win: 0, lose: 0, apex: 0, apexWin: 0, apexLose: 0, early: 0, sizeSum: 0, livesLost: 0 });
  b.n++;
  if (g.ended === 'win') { wins++; b.win++; }
  else if (g.ended === 'lose') { losses++; b.lose++; }
  if (g.reachedApex) { b.apex++; if (g.ended === 'win') b.apexWin++; else b.apexLose++; }
  else { b.early++; b.sizeSum += g.size; }
  if (typeof g.livesLost === 'number') b.livesLost += g.livesLost;
  for (const p in g.phases) phaseTotals[p] = (phaseTotals[p] || 0) + g.phases[p];
}

const elapsed = Date.now() - t0;

/* Assertions on the design's own promises. */
if (wins === 0) fail('no game was ever won — the game may be unwinnable');
if (losses === 0) fail('no game was ever lost — the game may be trivially safe');
for (const d of diffs) {
  if (!byDiff[d]) continue;
  if (byDiff[d].apex > 0 && byDiff[d].wins === 0) {
    fail(`on ${d} the APEX finale was reached ${byDiff[d].apex} times but never survived — the finale is too punishing`);
  }
}
for (const p of ['stalk', 'telegraph', 'lunge', 'recover']) {
  if (!phaseTotals[p]) fail(`apex phase "${p}" never occurred`);
}
if (!phaseTotals.telegraph) fail('the dash cue never fired — the finale is unreadable');

for (let k = 0; k < 6; k++) playDeterminism(diffs[k % diffs.length], 12345 + k * 7919);

/* ---------------------------------------------------------------- report */

const finished = results.filter(g => g.ended === 'win' || g.ended === 'lose');
const scores = finished.map(g => g.score).sort((a, b) => a - b);
const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;
const maxFrames = Math.max(...results.map(g => g.frames));

console.log(`\nwins ${wins}  losses ${losses}  never reached APEX ${unreached}`);
console.log(`score  median ${median}  min ${scores[0]}  max ${scores[scores.length - 1]}`);
console.log(`\nper difficulty:`);
for (const d of diffs) {
  const b = byDiff[d];
  if (!b) continue;
  const reachPct = Math.round((b.apex / b.n) * 100);
  const avgEarlySize = b.early ? (b.sizeSum / b.early).toFixed(1) : '-';
  console.log(`  ${d.padEnd(5)} n=${String(b.n).padStart(4)}  win ${String(b.win).padStart(3)}  lose ${String(b.lose).padStart(3)}  reached APEX ${String(b.apex).padStart(3)} (${reachPct}%)  died in finale ${b.apexLose}  died early ${String(b.early).padStart(3)} (avg size ${avgEarlySize})`);
}
console.log(`apex phase counts: ${Object.entries(phaseTotals).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`longest run ${(maxFrames * DT).toFixed(1)}s   total ${elapsed}ms   (${(elapsed / games).toFixed(2)}ms/game)`);

const apexGames = results.filter(g => g.reachedApex);
if (apexGames.length) {
  const tailTotal = apexGames.reduce((n, g) => n + g.tailHits, 0);
  console.log(`tail strikes landed: ${tailTotal} across ${apexGames.length} APEX runs`);
}
scoreSanity(results);

if (failures.length) {
  console.error(`\n=== ${failures.length} FAILURE(S) ===\n` + failures.join('\n'));
  process.exit(1);
}
console.log(`\n=== engine smoke: ${games} games OK ===`);
