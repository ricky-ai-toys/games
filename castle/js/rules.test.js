/* Amber's Candy Castle — node smoke harness.
 *
 * Two jobs:
 *   1. PROVE the anti-cheese rule. `grid.legal` is a pure function over 88
 *      cells, so "every accepted placement keeps the road long enough and every
 *      refusal is refused" is checkable exhaustively rather than sampled. That
 *      invariant is the whole design, so sampling it would be worthless.
 *   2. Simulate full level plays in `sharp` and `sloppy` cohorts to check the
 *      economy actually bites and difficulty is ordered.
 *
 * Usage: node castle/js/rules.test.js [levels] [--trace LEVELID]
 */
'use strict';

require('./data.js');
require('./grid.js');
require('./rules.js');

const D = globalThis.CCData;
const G = globalThis.CCGrid;
const R = globalThis.CCRules;
const T = D.TUNE;

const DT = 1 / 60;
const MAX_SECONDS = 600;

const failures = [];
function fail(msg, ctx) {
  failures.push(msg + (ctx ? '  [' + ctx + ']' : ''));
  if (failures.length > 40) {
    console.error('\nToo many failures, aborting.\n' + failures.join('\n'));
    process.exit(1);
  }
}
function finite(v) { return typeof v === 'number' && isFinite(v); }
function snapshot(g) { return Array.from(g.cells).join(','); }

/* ------------------------------------------------------------------ 1. legality */

function proveLegal(level) {
  const tag = level.id;
  const g = G.fromLevel(level);
  const minPath = level.minPath;

  if (!isFinite(g.routeLength)) fail(`${level.id} starter maze is DISCONNECTED from gate to castle`, tag);

  let accepted = 0, refused = 0;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      for (const kind of [G.WALL, G.TOWER]) {
        const before = snapshot(g);
        const res = G.legal(g, c, r, kind);

        // Purity: legal() must not mutate the board, ever.
        if (snapshot(g) !== before) {
          fail(`legal() mutated the grid at (${c},${r}) kind=${kind}`, tag);
          return;
        }
        if (!res.ok) {
          refused++;
          if (!res.reason) fail(`refusal at (${c},${r}) has no reason string`, tag);
          if (snapshot(g) !== before) fail(`refusal mutated the grid at (${c},${r})`, tag);
          continue;
        }
        // Accepted: applying it MUST keep the road legal.
        accepted++;
        const probe = G.clone(g);
        if (kind === G.WALL) G.place(probe, c, r, G.WALL);
        else { probe.cells[G.idx(probe, c, r)] = G.TOWER; probe.dirty = true; G.ensureField(probe); }
        if (!isFinite(probe.routeLength)) fail(`accepted a placement that disconnects the board at (${c},${r})`, tag);
        else if (probe.routeLength < minPath - 1e-9) {
          fail(`accepted a placement leaving route ${probe.routeLength.toFixed(2)} < minPath ${minPath} at (${c},${r})`, tag);
        }
      }
    }
  }
  return { accepted, refused };
}

/* How far can a player extend the starter road? Not a correctness requirement —
 * the generator already guarantees the level starts legal and the exhaustive
 * proof covers every legal placement — but it is the check that the maze is
 * still improvable, so a level is never just a fixed puzzle. */
function proveExtensible(level, iters) {
  const g = G.fromLevel(level);
  const before = g.routeLength;
  let rng = 0x51ed270b ^ level.index;
  const rand = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return ((rng >>> 0) % 100000) / 100000; };
  let best = before;
  for (let i = 0; i < iters; i++) {
    const c = Math.floor(rand() * g.cols);
    const r = Math.floor(rand() * g.rows);
    const kind = rand() < 0.8 ? G.WALL : G.TOWER;
    const res = G.legal(g, c, r, kind);
    if (!res.ok) continue;
    const probe = G.clone(g);
    if (kind === G.WALL) G.place(probe, c, r, G.WALL);
    else { probe.cells[G.idx(probe, c, r)] = G.TOWER; probe.dirty = true; G.ensureField(probe); }
    if (isFinite(probe.routeLength) && probe.routeLength > best) best = probe.routeLength;
    if (!res.ok) continue;
    if (kind === G.WALL) G.place(g, c, r, G.WALL);
    else { g.cells[G.idx(g, c, r)] = G.TOWER; g.dirty = true; G.ensureField(g); }
  }
  return { start: before, best: best };
}

/* Fuzz: many random legal placements, invariant re-checked after each. */
function fuzzLegal(level, iters) {
  const g = G.fromLevel(level);
  let rng = 0x2545f491 ^ level.index;
  const rand = () => {
    rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
    return ((rng >>> 0) % 100000) / 100000;
  };
  for (let i = 0; i < iters; i++) {
    const c = Math.floor(rand() * g.cols);
    const r = Math.floor(rand() * g.rows);
    const kind = rand() < 0.6 ? G.WALL : G.TOWER;
    const res = G.legal(g, c, r, kind);
    if (res.ok) {
      if (kind === G.WALL) G.place(g, c, r, G.WALL);
      else { g.cells[G.idx(g, c, r)] = G.TOWER; g.dirty = true; G.ensureField(g); }
    }
    if (!isFinite(g.routeLength)) { fail(`fuzz disconnected the board on ${level.id} iter ${i}`, level.id); return; }
    if (g.routeLength < level.minPath - 1e-9) {
      fail(`fuzz left route ${g.routeLength.toFixed(2)} < minPath ${level.minPath} on ${level.id} iter ${i}`, level.id);
      return;
    }
  }
}

/* Corners: an enemy must not be able to squeeze diagonally between two walls. */
function proveNoCornerCut() {
  const g = G.createGrid(D.COLS, D.ROWS);
  g.minPath = 0;
  G.addGate(g, 0, 5);
  G.setCastle(g, D.COLS - 1, 5);
  // Wall off the straight row except one diagonal pinch point at (3,4)/(4,5).
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    if (r !== 4 && r !== 5) G.place(g, c, r, G.WALL);
  }
  G.place(g, 4, 5, G.EMPTY);   // only one opening, flanked by walls above-left
  G.place(g, 3, 5, G.EMPTY);
  G.place(g, 3, 4, G.WALL);
  G.ensureField(g);
  const f = G.idx(g, 3, 5);
  if (g.dirX[f] === -1 && g.dirY[f] === -1) {
    fail('pinch point has no descent direction — route may be severed', 'corner-cut');
  }
}

/* ------------------------------------------------------------- 2. data validity */

function proveData() {
  const seen = new Set();
  for (const lv of D.LEVELS) {
    if (seen.has(lv.id)) fail(`duplicate level id ${lv.id}`, 'data');
    seen.add(lv.id);
    if (!isFinite(lv.minPath) || lv.minPath <= 0) fail(`${lv.id} has a bad minPath`, 'data');
    if (!isFinite(lv.gold) || lv.gold <= 0) fail(`${lv.id} has a bad gold budget`, 'data');
    if (!lv.gates || !lv.gates.length) fail(`${lv.id} has no gate`, 'data');
    if (!lv.castle) fail(`${lv.id} has no castle`, 'data');
    for (const t of lv.unlock) if (!D.tower(t)) fail(`${lv.id} unlocks unknown tower "${t}"`, 'data');
    if (!lv.waves || !lv.waves.length) fail(`${lv.id} has no waves`, 'data');
    for (let w = 0; w < lv.waves.length; w++) {
      for (const grp of lv.waves[w]) {
        if (!D.enemy(grp.e)) fail(`${lv.id} wave ${w} references unknown enemy "${grp.e}"`, 'data');
        if (!(grp.n > 0)) fail(`${lv.id} wave ${w} has a non-positive count`, 'data');
      }
    }
  }
  // Unlock progression: stage 1 never offers a stage-3-only toy for free.
  const first = D.LEVELS[0];
  if (first.unlock.length !== 1) fail('first level should teach exactly one tower', 'data');
  for (const t of first.unlock) if (t !== 'arrow') fail(`first level should teach arrow, got ${t}`, 'data');
  // Towers must have strictly improving tiers, or upgrading is a trap.
  for (const id of D.TOWER_IDS) {
    const spec = D.tower(id);
    if (spec.tiers.length !== 3) fail(`${id} should have 3 tiers, has ${spec.tiers.length}`, 'data');
    if (spec.upgradeCost.length !== spec.tiers.length - 1) fail(`${id} upgradeCost does not match tiers`, 'data');
    for (let i = 1; i < spec.tiers.length; i++) {
      const a = spec.tiers[i - 1], b = spec.tiers[i];
      if (b.damage <= a.damage) fail(`${id} tier ${i} damage does not improve`, 'data');
      if (b.range < a.range) fail(`${id} tier ${i} range regressed`, 'data');
      if (b.rate > a.rate) fail(`${id} tier ${i} fire rate regressed`, 'data');
    }
  }
  // The central trade: walls must be meaningfully cheaper than towers.
  const cheapestTower = Math.min(...D.TOWER_IDS.map(id => D.tower(id).cost));
  if (cheapestTower < T.wallCost * 3) {
    fail(`walls (${T.wallCost}) are not cheap relative to the cheapest tower (${cheapestTower}) — the maze/tower trade collapses`, 'economy');
  }
}

/* ------------------------------------------------------------- 3. simulation */

/* A scripted defender. `care` controls how well it plays:
 *   sharp  — mazes within a sensible budget, then buys damage, then upgrades
 *   sloppy — mazes far too much, arrives broke, and never upgrades.
 * The gap between them is the measure of whether skill matters, and whether the
 * maze-vs-tower trade is a real decision. */
function pilotPlace(s, care) {
  /* --- phase 1: build barrier lines until the road reaches the level goal.
   * A greedy that only accepts an immediate route increase stalls on an open
   * board, because a lone wall never lengthens the direct line — measured: 55
   * greedy walls moved the road from 8 to 8. Players draw coherent lines, so
   * the pilot extends alternating vertical barriers, which do force a detour. */
  const goal = s.level.targetPath || 0;
  let top = true, col = 2, guard = 0;
  while (s.grid.routeLength < goal && guard++ < 8 && col < s.grid.cols - 1) {
    let progressed = false;
    for (let r = 0; r < s.grid.rows; r++) {
      if (top ? r >= s.grid.rows - 1 : r <= 0) continue;
      if (R.tryPlace(s, col, r, 'wall')) progressed = true;
    }
    if (progressed) { top = !top; col += 2; } else { col += 1; }
  }

  /* --- phase 2: buy damage with whatever is left. */
  const order = s.level.unlock.slice();
  let placedAny = true, pg = 0;
  while (placedAny && pg++ < 40) {
    placedAny = false;
    for (const id of order) {
      if (!R.canAfford(s, id)) continue;
      let best = null, bestScore = -1;
      for (let r = 0; r < s.grid.rows; r++) {
        for (let c = 0; c < s.grid.cols; c++) {
          if (!G.legal(s.grid, c, r, G.TOWER).ok) continue;
          let cover = 0;
          for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
            const nc = c + dc, nr = r + dr;
            if (!G.inBounds(s.grid, nc, nr)) continue;
            if (G.walkable(s.grid, nc, nr) && isFinite(s.grid.field[G.idx(s.grid, nc, nr)])) cover++;
          }
          if (cover < 3) continue;
          const st = D.tower(id).tiers[0];
          const dps = st.damage / st.rate;
          const score = dps * cover + (st.splash ? 8 : 0) + (st.slow ? 6 : 0) + (st.chain ? 6 : 0);
          if (score > bestScore) { bestScore = score; best = [c, r]; }
        }
      }
      if (best && R.tryPlace(s, best[0], best[1], id)) placedAny = true;
    }
  }

  /* --- phase 3: pour spare gold into upgrades. A sloppy player skips this. */
  if (care !== 'sloppy') {
    for (const tw of s.towers.slice()) {
      let g2 = 0;
      while (g2++ < 6) if (!R.tryUpgrade(s, tw.c, tw.r)) break;
    }
  } else if (s.gold > 300) {
    const w = findAnyWall(s);
    R.tryPlace(s, w[0], w[1], 'wall');
  }
}

/* The constructive road a competent player would build: alternating vertical
 * barrier lines. Used to check the per-level road goal is actually reachable —
 * random legal placement cannot answer that, because scattered walls barely
 * lengthen an open board. */
function constructiveRoad(level, maxLines) {
  const g = G.fromLevel(level);
  let top = true, col = 2, lines = 0;
  while (lines < maxLines && col < g.cols - 1) {
    /* Must go through legal(), exactly as a player's taps do. Placing the whole
     * column unconditionally walls off the board on the first line, and the
     * earlier version of this check silently measured that sealed board. */
    let placed = 0;
    for (let r = 0; r < g.rows; r++) {
      if (top ? r >= g.rows - 1 : r <= 0) continue;
      if (!G.legal(g, col, r, G.WALL).ok) continue;
      G.place(g, col, r, G.WALL);
      placed++;
    }
    if (!placed) break;
    lines++; top = !top; col += 2;
  }
  return { route: g.routeLength, lines: lines };
}

function findAnyWall(s) {
  for (let r = 0; r < s.grid.rows; r++) for (let c = 0; c < s.grid.cols; c++) {
    if (G.legal(s.grid, c, r, G.WALL).ok) return [c, r];
  }
  return [0, 0];
}

function playLevel(level, seed, care) {
  /* The seed must reach the engine or every rep is the same coin flip. */
  const s = R.createState(level.id, { seed: seed >>> 0 });

  const out = {
    id: level.id, care, result: null, wavesCleared: 0, leaked: 0, kills: 0,
    livesLeft: s.lives, goldLeft: s.gold, broke: false, score: 0, seconds: 0
  };

  // Build phase: a couple of build rounds, then commit to waves.
  pilotPlace(s, care);
  out.mazeRoute = G.routeCells(s.grid);
  out.wallsBought = s.grid.cells.reduce((n, k) => n + (k === G.WALL ? 1 : 0), 0);
  out.towersBuilt = s.towers.length;
  out.goldAtWave1 = s.gold;
  out.broke = s.gold < D.tower('arrow').cost;
  out.roadBuilt = isFinite(G.routeCells(s.grid)) ? G.routeCells(s.grid) : 0;

  let steps = 0;
  const maxSteps = Math.ceil(MAX_SECONDS / DT);
  let lastPhase = '';
  while (!s.over && steps < maxSteps) {
    // Re-buy between waves, and keep upgrading as income arrives.
    if (s.wavePhase !== lastPhase) {
      lastPhase = s.wavePhase;
      if (s.wavePhase === 'between' || s.wavePhase === 'prep') {
        pilotPlace(s, care);
      }
    }
    R.step(s, DT);
    steps++;
    s.events.length = 0;

    if (!finite(s.gold) || s.gold < 0) { fail(`gold went negative (${s.gold}) on ${level.id}/${care}`, level.id); break; }
    if (!finite(s.lives) || s.lives < 0) { fail(`lives went negative (${s.lives}) on ${level.id}/${care}`, level.id); break; }
    if (!finite(s.grid.routeLength)) { fail('route became infinite mid-play on ' + level.id, level.id); break; }
    if (s.grid.routeLength < level.minPath - 1e-9) {
      fail(`route fell below minPath mid-play on ${level.id} (${s.grid.routeLength.toFixed(2)} < ${level.minPath})`, level.id);
      break;
    }
  }
  if (!s.over && steps >= maxSteps) fail(`${level.id}/${care} did not terminate in ${MAX_SECONDS}s`, level.id);

  out.result = s.result || 'timeout';
  out.wavesCleared = s.waveIdx + 1;
  out.leaked = s.leaks;
  out.kills = s.kills;
  out.livesLeft = s.lives;
  out.goldLeft = s.gold;
  out.score = s.score;
  out.seconds = steps * DT;
  return out;
}

/* ------------------------------------------------------------------ main */

if (process.argv[2] === '--trace') {
  const id = process.argv[3] || D.LEVELS[0].id;
  const level = D.levelById(id);
  const care = process.argv[4] || 'sharp';
  const s = R.createState(id);
  console.log(`trace ${id} (${level.name}) care=${care} minPath=${level.minPath} waves=${level.waveCount}\n`);
  pilotPlace(s, care);
  console.log(`after build: route ${s.grid.routeLength.toFixed(1)} cells, ${s.towers.length} towers, ${s.gold} gold left`);
  let steps = 0, lastPhase = '';
  while (!s.over && steps < 60 * 300) {
    if (s.wavePhase !== lastPhase) {
      lastPhase = s.wavePhase;
      console.log(`  -> phase=${s.wavePhase} wave=${s.waveIdx + 1} lives=${s.lives} gold=${s.gold} enemies=${s.enemies.length}`);
      if (s.wavePhase === 'between' || s.wavePhase === 'prep') pilotPlace(s, care);
    }
    R.step(s, DT); steps++;
    s.events.length = 0;
  }
  console.log(`\nEND result=${s.result} waves=${s.waveIdx + 1}/${level.waveCount} lives=${s.lives}/${s.maxLives} score=${s.score} t=${s.t.toFixed(1)}s`);
  process.exit(0);
}

const REPS = parseInt(process.argv[2] || '3', 10) || 3;

console.log(`Candy Castle engine smoke`);
console.log(`${D.LEVELS.length} levels, ${D.COLS}x${D.ROWS} grid (${D.COLS * D.ROWS} cells)\n`);

console.log('— data validity —');
proveData();
proveNoCornerCut();
console.log('  data + corner-cut: ok');

console.log('\n— exhaustive legality proof (every cell x every item kind) —');
const legalTotals = { accepted: 0, refused: 0 };
for (const lv of D.LEVELS) {
  const t0 = Date.now();
  const res = proveLegal(lv);
  legalTotals.accepted += res.accepted;
  legalTotals.refused += res.refused;
  fuzzLegal(lv, 400);
  /* The starter must be a legal board: connected, and already at or above the
   * floor. A level starting below its own floor makes every placement illegal,
   * so the level cannot be played at all. */
  const start = G.fromLevel(lv);
  if (!isFinite(start.routeLength)) fail(`${lv.id} starter is disconnected`, lv.id);
  if (start.routeLength < lv.minPath - 1e-9) {
    fail(`${lv.id} STARTS at route ${start.routeLength.toFixed(1)}, below its own floor ${lv.minPath} — level is unplayable`, lv.id);
  }
  /* Levels start open, so the starter route is simply the direct line. The
   * per-level road goal must be a real stretch above it, or there is no reason
   * for the player to build a maze at all. */
  if (start.routeLength >= lv.targetPath) {
    fail(`${lv.id} road goal ${lv.targetPath} is already met on an empty board (route ${start.routeLength.toFixed(1)}) — nothing to build`, lv.id);
  }
  if (lv.targetPath < lv.minPath) fail(`${lv.id} road goal is below the hard floor`, lv.id);
  /* The per-level road goal has to be REACHABLE, or the HUD is lying to the
   * player. Check it against a constructive barrier-line build, which is how a
   * player actually makes a road long. */
  const ext = constructiveRoad(lv, 6);
  if (ext.route < lv.targetPath - 1e-9) {
    fail(`${lv.id} road goal ${lv.targetPath} is unreachable — best barrier build reached only ${ext.route.toFixed(0)}`, lv.id);
  }
  if (lv.targetPath > 6 && lv.gold < lv.targetPath * 12) {
    fail(`${lv.id} gives ${lv.gold}g but a ${lv.targetPath}-cell road costs about ${Math.round(lv.targetPath * 12)}g, leaving no defence`, lv.id);
  }
  console.log(`  ${lv.id.padEnd(11)} open ${start.routeLength.toFixed(0).padStart(2)}  goal ${String(lv.targetPath).padStart(2)}  buildable ${ext.route.toFixed(0).padStart(3)} (${ext.lines}L)  accepted ${String(res.accepted).padStart(3)}  refused ${String(res.refused).padStart(3)}  ${Date.now() - t0}ms`);
}
console.log(`  total placements proven: ${legalTotals.accepted} accepted, ${legalTotals.refused} refused`);

console.log('\n— simulation —');
const results = [];
for (const lv of D.LEVELS) {
  for (const care of ['sharp', 'sloppy']) {
    for (let i = 0; i < REPS; i++) {
      results.push(playLevel(lv, 0x9e3779b9 * (lv.index * 31 + i + 1), care));
    }
  }
}
const byLevel = {};
for (const r of results) {
  const k = r.id + '/' + r.care;
  const b = byLevel[k] || (byLevel[k] = { n: 0, won: 0, lost: 0, timeout: 0, route: 0, towers: 0, broke: 0, lives: 0 });
  b.n++;
  if (r.result === 'won') b.won++;
  else if (r.result === 'lost') b.lost++;
  else b.timeout++;
  b.route += r.roadBuilt; b.towers += r.towersBuilt; b.lives += r.livesLeft;
  if (r.broke) b.broke++;
}
for (const lv of D.LEVELS) {
  const sh = byLevel[lv.id + '/sharp'], sl = byLevel[lv.id + '/sloppy'];
  if (!sh || !sl) continue;
  console.log(`  ${lv.id.padEnd(11)} sharp ${String(Math.round(sh.won / sh.n * 100)).padStart(3)}%  sloppy ${String(Math.round(sl.won / sl.n * 100)).padStart(3)}%   route ${(sh.route / sh.n).toFixed(1).padStart(5)}  towers ${(sh.towers / sh.n).toFixed(1).padStart(4)}  sharp-broke ${sh.broke}/${sh.n}`);
}

const timeouts = results.filter(r => r.result === 'timeout');
if (timeouts.length) fail(`${timeouts.length} level runs did not terminate`, 'sim');

/* Design assertions, not just crash checks. */
const firstLevel = D.LEVELS[0];
const firstSharp = byLevel[firstLevel.id + '/sharp'];
const firstSloppy = byLevel[firstLevel.id + '/sloppy'];

/* Determinism: the same seed must give the same outcome twice. The design claimed
 * this and it was false — spawn offsets used Math.random(), so every "rep" was a
 * different game and the harness could not compare anything. */
for (const d of ['sharp', 'sloppy']) {
  const a = playLevel(D.LEVELS[0], 4242, d);
  const b = playLevel(D.LEVELS[0], 4242, d);
  if (a.result !== b.result || a.score !== b.score || a.livesLeft !== b.livesLeft) {
    fail(`determinism violated for ${d}: ${a.result}/${a.score}/${a.livesLeft} vs ${b.result}/${b.score}/${b.livesLeft}`, 'seed 4242');
  }
}

if (process.env.CC_DEBUG) {
  console.log('\n  raw results:');
  results.forEach(r => console.log(`    ${r.id.padEnd(11)} ${r.care.padEnd(7)} -> ${String(r.result).padEnd(8)} waves ${r.wavesCleared}  lives ${String(r.livesLeft).padStart(2)}  leaks ${r.leaked}  kills ${String(r.kills).padStart(3)}  t ${r.seconds.toFixed(0)}s  road ${r.roadBuilt}  towers ${r.towersBuilt}`));
}
if (firstSharp && firstSharp.won === 0) fail(`${firstLevel.id} is unwinnable for a competent player`, 'sim');
if (firstSloppy && firstSloppy.won === 0) fail(`${firstLevel.id} has no beginner floor at all — a sloppy player never wins`, 'sim');

const allSharp = Object.keys(byLevel).filter(k => k.endsWith('/sharp'));
const avg = k => byLevel[k].won / byLevel[k].n;
const stageWins = [0, 1, 2].map(si => {
  const ks = allSharp.filter(k => D.levelById(k.split('/')[0]).stageIndex === si);
  return ks.length ? ks.reduce((a, k) => a + avg(k), 0) / ks.length : null;
});
for (let i = 1; i < stageWins.length; i++) {
  if (stageWins[i - 1] != null && stageWins[i] != null && stageWins[i] > stageWins[i - 1] + 0.12) {
    fail(`stage ${i + 1} is easier than stage ${i} (${(stageWins[i] * 100).toFixed(0)}% vs ${(stageWins[i - 1] * 100).toFixed(0)}%) — difficulty is not ordered`, 'balance');
  }
}

/* The central trade must exist: a maze-heavy player should run short on gold. */
const brokeCount = results.filter(r => r.care === 'sharp' && r.broke).length;
const sharpCount = results.filter(r => r.care === 'sharp').length;
if (brokeCount === 0) {
  fail('no sharp run ever went broke after building — the maze/tower trade has no tension', 'economy');
}

console.log(`\n  runs: ${results.length}  (${brokeCount}/${sharpCount} sharp runs went broke after building)`);
console.log(`  stage win rates: ${stageWins.map(v => v == null ? '-' : (v * 100).toFixed(0) + '%').join('  ')}`);

if (failures.length) {
  console.error(`\n=== ${failures.length} FAILURE(S) ===\n` + failures.join('\n'));
  process.exit(1);
}
console.log(`\n=== engine smoke: OK (${legalTotals.accepted + legalTotals.refused} placements proven) ===`);
