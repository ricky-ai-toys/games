/* Amber's Water Works — node smoke harness.
 *
 *   node waterworks/js/rules.test.js [levels] [--trace LEVELID]
 *
 * The design's whole claim is that the tap is a fair clock: it waits for the
 * first tap, every burst costs exactly one of three strikes, and holding the
 * valve freezes the board. None of that can be checked by looking at a screen,
 * so it is checked here instead:
 *
 *   1. Every one of the 24 levels has a ZERO-strike solution. The engine is
 *      given the stored answer and must win with all three strikes intact.
 *   2. No level starts solved, and every level's first two route pipes are
 *      already correct, so a child's first tap always joins something real.
 *   3. The tap waits. Arming without turning anything cannot move water.
 *   4. Strikes are capped: a fourth burst is impossible and three always lose.
 *   5. The valve is a real pause — no clock, no leak, no win while held.
 *   6. Rotating cycles through distinct states and can always reach the answer.
 *   7. Every level TERMINATES. A bot that spins pipes at random must reach a
 *      win or a loss inside the time cap, or the level can hang a real child.
 */
'use strict';

require('./grid.js');
require('./data.js');
require('./rules.js');

const G = globalThis.WWGrid;
const D = globalThis.WWData;
const R = globalThis.WWRules;
const T = D.TUNE;

const DT = 1 / 120;
const MAX_SECONDS = 240;
const argOf = process.argv.slice(2).filter((a) => a !== '--trace');
const traceId = (() => {
  const i = process.argv.indexOf('--trace');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const only = argOf.length ? parseInt(argOf[0], 10) : 0;

const failures = [];
function fail(msg, ctx) {
  failures.push(msg + (ctx ? '  [' + ctx + ']' : ''));
  if (failures.length > 60) {
    console.error('too many failures, stopping');
    console.error(failures.join('\n'));
    process.exit(1);
  }
}

function ok(cond, msg, ctx) {
  if (!cond) fail(msg, ctx);
  return cond;
}

/* ------------------------------------------------------------- utilities */

function firstRotatable(level) {
  for (let i = 0; i < level.n; i++) if (G.isRotatable(level.kind[i])) return i;
  return -1;
}

/* Arm the tap the way a child does: by turning a real pipe. Callers that want
 * a specific board put it back afterwards, which is what a real player does by
 * turning the same pipe again. */
function arm(state) {
  const i = firstRotatable(state.level);
  if (i < 0) return false;
  R.rotateAt(state, i);
  return true;
}

function play(level, board, cap) {
  const state = R.createState(level);
  if (board) state.cur = board.slice();
  arm(state);
  if (board) state.cur = board.slice();
  const limit = cap || MAX_SECONDS;
  let t = 0;
  while (t < limit && state.phase !== 'won' && state.phase !== 'lost') {
    R.step(state, DT);
    t += DT;
  }
  state.seconds = t;
  return state;
}

function applySolution(state, level) {
  state.cur = level.sol.slice();
}

/* -------------------------------------------------------------- 1. solvable */

function testSolvable() {
  let worst = null;
  for (const level of D.LEVELS) {
    const state = play(level, level.sol);
    if (state.phase !== 'won') {
      fail(`solution does not win: phase=${state.phase} strikes=${state.strikes} bursts=${state.bursts} stalls=${state.stalls} t=${state.seconds.toFixed(1)}`, level.id);
    } else if (state.strikes !== 0) {
      fail(`solution is not clean: ${state.strikes} strikes (${state.bursts} bursts, ${state.stalls} stalls)`, level.id);
    } else if (state.seconds > level.parSec) {
      fail(`solution is slower than par: ${state.seconds.toFixed(1)}s > ${level.parSec}s`, level.id);
    } else {
      const slack = level.parSec - state.seconds;
      if (!worst || slack < worst.slack) worst = { id: level.id, slack };
    }
  }
  if (worst) console.log(`  tightest par slack: ${worst.id} has ${worst.slack.toFixed(1)}s spare`);
}

/* ------------------------------------- 2. not pre-solved, first tap is real */

function testNotPresolved() {
  for (const level of D.LEVELS) {
    const state = play(level, null);
    ok(state.phase !== 'won', `level is already solved at load (no puzzle)`, level.id);
    ok(state.live > 0, 'the tap never ran on its own', level.id);
    if (level.route.length >= 2) {
      const a = level.route[0], b = level.route[1];
      ok(level.cur[a] === level.sol[a], 'first route pipe is not already correct', level.id);
      ok(level.cur[b] === level.sol[b], 'second route pipe is not already correct', level.id);
    }
  }
}

/* The tap's outlet must already be joined at load, or the "yes!" moment the
 * first two pre-solved pipes exist to create never arrives. */
function testTapStartsConnected() {
  for (const level of D.LEVELS) {
    const d = level.outDir;
    const j = G.neighbor(level.src, d, level.cols, level.rows);
    ok(j >= 0, 'tap outlet points off the board', level.id);
    if (j < 0) continue;
    ok(G.isOpenToward(level.kind[j], level.cur[j], G.opposite(d)),
      'tap outlet is blocked at load', level.id);
    ok(j !== level.drain, 'tap points straight into the drain at load', level.id);
  }
}

/* --------------------------------------------------------- 3. the tap waits */

function testTapWaits() {
  for (const level of D.LEVELS) {
    const state = R.createState(level);

    /* Tapping furniture must not start the clock either. */
    for (let i = 0; i < state.n; i++) {
      if (state.kind[i] === G.WALL || state.kind[i] === G.DRAIN) {
        ok(R.rotateAt(state, i) !== 'turn', 'a wall turned', level.id);
        break;
      }
    }
    for (let i = 0; i < 3000; i++) R.step(state, DT);
    ok(state.live === 0, 'clock ran before the first turn', level.id);
    ok(state.strikes === 0, 'struck the child before the first turn', level.id);
    ok(state.phase === 'idle', `water moved unbidden: ${state.phase}`, level.id);
    ok(countFull(state) === 0, 'water was on the board before the first turn', level.id);

    /* One real turn of a pipe that is NOT on the route — turning a route pipe
     * would break the join the level opens with, and prove nothing. */
    const route = new Set(level.route);
    let first = -1;
    for (let i = 0; i < level.n; i++) {
      if (G.isRotatable(level.kind[i]) && !route.has(i)) { first = i; break; }
    }
    if (first < 0) continue;
    ok(R.rotateAt(state, first) === 'turn', 'a rotatable pipe refused to turn', level.id);
    let moved = false;
    for (let i = 0; i < 2000 && !moved; i++) {
      R.step(state, DT);
      moved = state.phase === 'won' || state.phase === 'lost' || state.strikes > 0 || countFull(state) > 0;
    }
    ok(moved, 'a turn did not start the water', level.id);
  }
}

/* ------------------------------------------------------- 4. the strike cap */

function testStrikeCap() {
  const level = D.LEVELS[0];
  let sawLoss = false;
  for (let trial = 0; trial < 40; trial++) {
    const state = R.createState(level);
    arm(state);
    let guard = 0;
    while (state.phase !== 'won' && state.phase !== 'lost' && guard++ < 20000) {
      /* spin every pipe we can find */
      for (let i = 0; i < state.n; i++) {
        if (G.isRotatable(state.kind[i])) R.rotateAt(state, i);
      }
      R.step(state, DT);
    }
    ok(state.phase === 'won' || state.phase === 'lost', 'run never ended', level.id);
    ok(state.strikes <= T.maxStrikes, `strikes ran past the cap: ${state.strikes}`, level.id);
    if (state.phase === 'won') {
      const stars = R.starsFor(state.strikes);
      ok(stars >= 1 && stars <= 3, `a win scored ${stars} stars`, level.id);
    } else {
      ok(R.starsFor(state.strikes) === 0, 'a loss scored stars', level.id);
    }
    if (state.phase === 'lost') {
      sawLoss = true;
      ok(state.strikes === T.maxStrikes, `lost on ${state.strikes} strikes, not ${T.maxStrikes}`, level.id);
    }
  }
  ok(sawLoss, 'forty rounds of pure chaos never lost once — the cap is not biting');
}

function testStarScale() {
  ok(R.starsFor(0) === 3, 'no strikes should be three stars');
  ok(R.starsFor(1) === 2, 'one strike should be two stars');
  ok(R.starsFor(2) === 1, 'two strikes should be one star');
  ok(R.starsFor(3) === 0, 'three strikes is a loss, not a star');
}

/* --------------------------------------------------------- 5. the valve */

function testValveFreezes() {
  for (const level of D.LEVELS.slice(0, 8)) {
    const state = R.createState(level);
    arm(state);
    /* Put the finished answer on the board so this suite measures the valve and
     * nothing else. */
    state.cur = level.sol.slice();
    R.setFrozen(state, true);
    const live = state.live, strikes = state.strikes, full = countFull(state), phase = state.phase;
    for (let i = 0; i < 2000; i++) R.step(state, DT);
    ok(state.live === live, 'pressure ramped while the valve was held', level.id);
    ok(state.strikes === strikes, 'child was charged for thinking', level.id);
    ok(countFull(state) === full, 'water moved while the valve was held', level.id);
    ok(state.phase === phase, `phase changed while held: ${phase} -> ${state.phase}`, level.id);
    R.setFrozen(state, false);
    let moved = false;
    for (let i = 0; i < 2000 && !moved; i++) { R.step(state, DT); moved = countFull(state) > full || state.phase === 'won' || state.phase === 'lost'; }
    ok(moved, 'unfreezing the valve did not restart the water', level.id);
  }
}

function countFull(state) {
  let n = 0;
  for (let i = 0; i < state.n; i++) if (state.full[i]) n++;
  return n;
}

/* ------------------------------------------- 6. rotation is sound and complete */

function testRotationCycle() {
  for (let k = 0; k < G.KIND_COUNT; k++) {
    const steps = G.ROT_STEPS[k];
    const seen = new Set();
    for (let r = 0; r < steps; r++) {
      ok(steps < 1 || G.rotate(k, r) === (r + 1) % steps, `rotate(${k},${r}) is not +1 mod ${steps}`);
      seen.add(G.maskOf(k, r));
    }
    ok(seen.size === steps, `kind ${k} has ${steps} rotations but only ${seen.size} distinct shapes`);
  }
}

function testSolutionIsReachable() {
  for (const level of D.LEVELS) {
    for (let i = 0; i < level.n; i++) {
      const k = level.kind[i];
      if (!G.isRotatable(k)) continue;
      const steps = G.ROT_STEPS[k];
      if (level.cur[i] === level.sol[i]) continue;   /* decoys: nothing to do */
      let taps = 0;
      for (let t = 1; t < steps; t++) {
        if ((level.cur[i] + t) % steps === level.sol[i]) { taps = t; break; }
      }
      ok(taps > 0, `cell ${i} (${G.TO_CHAR[k]}) cannot be turned from ${level.cur[i]} to ${level.sol[i]}`, level.id);
    }
  }
}

function testOneWayRefusesItsHead() {
  for (let r = 0; r < 4; r++) {
    for (let d = 0; d < 4; d++) {
      const open = G.isOpenToward(G.ONEWAY, r, d);
      ok(open === (G.opposite(r) === d), `one-way r=${r} ${open ? 'drank from' : 'refused'} d=${d}`);
    }
  }
}

/* ------------------------------------------------- 7. difficulty and ordering */

function testDifficulty() {
  /* Inside a room the honest dial is how many pipes start in the wrong place:
   * that is exactly the number of taps a child has to get right. Forks and
   * arrows are the teaching, and they are introduced per room, so they are
   * checked as a room-level arc instead (see testRoomArc). */
  for (const room of D.ROOMS) {
    let prev = 0;
    D.levelsOfRoom(room.id).forEach((level, i) => {
      ok(level.changes >= 2, `only ${level.changes} pipes to turn`, level.id);
      ok(level.changes <= room.changes[i], `asked for ${room.changes[i]}, made ${level.changes}`, level.id);
      ok(level.changes <= level.route.length - 2, 'more wrong pipes than the route holds', level.id);
      ok(level.route.length >= room.pathLen[i],
        `route of ${level.route.length} cannot hold a ${room.pathLen[i]}-cell level`, level.id);
      ok(level.changes >= prev, `difficulty dipped: ${level.changes} wrong pipes after ${prev}`, level.id);
      prev = level.changes;
    });
  }
}

/* The arc across the whole arcade: each room must actually contain the idea it
 * exists to teach, and its last level must contain more of it than its first. */
function testRoomArc() {
  const bath = D.levelsOfRoom('bath');
  ok(bath.every((l) => l.forks === 0 && l.oneways === 0),
    'the Bathroom should teach bends and nothing else');
  const base = D.levelsOfRoom('base');
  ok(base[0].forks === 0, 'the Basement should open without a fork');
  ok(base[7].forks >= 2, `the Basement's last level has ${base[7].forks} forks, not 2+`);
  ok(base[7].forks > base[0].forks, 'the Basement teaches no more forks than it starts with');
  const garden = D.levelsOfRoom('garden');
  ok(garden[0].oneways === 0, 'the Garden should open without an arrow');
  ok(garden[7].oneways >= 2, `the Garden's last level has ${garden[7].oneways} arrows, not 2+`);
  /* The Garden deliberately carries NO forks. A fork's tee pushes water
   * backwards the moment its detour arrives first, and every cell on that
   * backwards walk is then forbidden from holding an arrow — so a fork and an
   * arrow cannot share a level. The Basement already teaches forks, so the
   * Garden spends its whole arc on its own idea instead. This assertion exists
   * to keep the Garden from quietly drifting back into forks if someone widens a
   * room spec later; it is a statement about the design, not a guess. */
  ok(garden.every((l) => l.forks === 0),
    `the Garden should teach arrows only, found a level with ${Math.max(...garden.map((l) => l.forks))} forks`);
  ok(garden[7].changes > bath[7].changes, 'the Garden is no harder than the Bathroom');
  ok(base[7].changes >= bath[7].changes, 'the Basement is easier than the Bathroom');
}

function testForkAndArrowCounts() {
  for (const level of D.LEVELS) {
    const room = D.ROOMS[level.roomIndex];
    ok(level.forks <= room.forks[level.index], `too many forks: ${level.forks}`, level.id);
    ok(level.oneways <= room.oneways[level.index], `too many one-ways: ${level.oneways}`, level.id);
    let tees = 0, arrows = 0;
    for (let i = 0; i < level.n; i++) {
      if (level.kind[i] === G.TEE) tees++;
      if (level.kind[i] === G.ONEWAY) arrows++;
    }
    ok(tees >= level.forks * 2, `a fork needs two tees, found ${tees} for ${level.forks} forks`, level.id);
    ok(arrows === level.oneways, `claimed ${level.oneways} arrows, board has ${arrows}`, level.id);
  }
}

/* Every fork must genuinely rejoin. If one of a tee's halves dead-ended, the
 * zero-strike check would already have failed; this proves the intent by
 * counting the tees the generator claims against the tees on the board. */
function testRoomUnlocks() {
  const byRoom = D.ROOMS.map((room) => D.levelsOfRoom(room.id));
  ok(byRoom[0].every((l) => l.forks === 0), 'the Bathroom should teach bends only');
  ok(byRoom[1].some((l) => l.forks > 0), 'the Basement should teach forks');
  ok(byRoom[2].some((l) => l.oneways > 0), 'the Garden should teach one-ways');
  ok(byRoom[2].every((l) => l.cols <= 6), 'boards must stay 6 wide for 44px touch targets');
  for (const room of D.ROOMS) {
    ok(room.names.length === 8, `${room.id} has ${room.names.length} names, not 8`);
  }
  ok(D.LEVELS.length === 24, `${D.LEVELS.length} levels built, not 24`);
  const ids = new Set(D.LEVELS.map((l) => l.id));
  ok(ids.size === 24, 'level ids are not unique');
}

/* ------------------------------------------------------------ 8. cohorts */

function testTermination() {
  let wins = 0, losses = 0, threeStar = 0, runs = 0;
  for (const level of D.LEVELS) {
    for (let seed = 1; seed <= 12; seed++) {
      const state = R.createState(level);
      let r = D.rng(seed * 7919 + level.n);
      arm(state);
      let t = 0, next = 0;
      while (t < MAX_SECONDS && state.phase !== 'won' && state.phase !== 'lost') {
        if (t >= next) {
          const pool = [];
          for (let i = 0; i < state.n; i++) if (G.isRotatable(state.kind[i])) pool.push(i);
          R.rotateAt(state, pool[Math.floor(r() * pool.length) % pool.length]);
          next = t + 0.35;
        }
        R.step(state, DT);
        t += DT;
      }
      runs++;
      ok(state.phase === 'won' || state.phase === 'lost',
        `a spinning bot never finished inside ${MAX_SECONDS}s (phase=${state.phase})`, level.id);
      if (state.phase === 'won') { wins++; if (state.strikes === 0) threeStar++; }
      else losses++;
    }
  }
  ok(threeStar === 0, `${threeStar} three-star wins from pure random spinning — the levels are noise`);
  console.log(`  random cohort: ${runs} runs, ${wins} wins (${threeStar} perfect), ${losses} losses`);
}

/* A bot that knows the answer must always get three stars — that is the level
 * proving it is finishable by taps alone, at the speed the room claims. */
function testSolutionCohort() {
  for (const level of D.LEVELS) {
    for (const held of [0, 1]) {
      const state = R.createState(level);
      arm(state);
      applySolution(state, level);
      R.setFrozen(state, !!held);
      let t = 0, frozenFor = 0;
      while (t < MAX_SECONDS && state.phase !== 'won' && state.phase !== 'lost') {
        if (held && frozenFor < 2.5) { frozenFor += DT; R.setFrozen(state, true); }
        else R.setFrozen(state, false);
        R.step(state, DT);
        t += DT;
      }
      ok(state.phase === 'won', `a frozen-then-played solution did not win: ${state.phase}`, level.id);
      ok(state.strikes === 0, `frozen play cost ${state.strikes} strikes`, level.id);
    }
  }
}

/* The forgiveness property, stated properly: start from the answer, break ONE
 * pipe, let the water find the break, then fix it. The run must still be
 * winnable, and the mistake must cost a single strike. A child who taps the
 * wrong pipe once has to be able to see that, pay for it, and carry on. */
function testOneMistakeIsSurvivable() {
  for (const level of D.LEVELS) {
    /* Break a pipe in the middle of the route, where the mistake is invisible
     * until the water arrives. */
    let target = -1;
    for (let k = 3; k < level.route.length - 1; k++) {
      const i = level.route[k];
      if (G.isRotatable(level.kind[i]) && level.kind[i] !== G.ONEWAY) { target = i; break; }
    }
    if (target < 0) continue;

    const state = R.createState(level);
    arm(state);
    state.cur = level.sol.slice();
    const steps = G.ROT_STEPS[level.kind[target]];
    state.cur[target] = (level.sol[target] + 1) % steps;
    ok(state.cur[target] !== level.sol[target], 'the mistake pipe was already correct', level.id);

    /* Run until it bursts, then let the child notice and fix it. */
    let t = 0, fixed = false;
    while (t < MAX_SECONDS && state.phase !== 'won' && state.phase !== 'lost') {
      if (!fixed && state.strikes >= 1) {
        const need = (level.sol[target] - state.cur[target] + steps) % steps;
        for (let q = 0; q < need; q++) R.rotateAt(state, target);
        ok(state.cur[target] === level.sol[target], 'the child could not repair the pipe', level.id);
        fixed = true;
      }
      R.step(state, DT);
      t += DT;
    }
    ok(fixed, 'the broken pipe never burst, so nothing was learned', level.id);
    ok(state.phase === 'won',
      `one repaired mistake still lost the run: ${state.phase} after ${state.strikes} strikes`, level.id);
    ok(state.strikes === 1, `one mistake cost ${state.strikes} strikes`, level.id);
  }
}

function testHintIsLegal() {
  for (const level of D.LEVELS) {
    const state = R.createState(level);
    arm(state);
    for (let i = 0; i < 3000; i++) {
      R.step(state, DT);
      const h = R.hint(state);
      if (h >= 0) {
        ok(h < state.n, `hint pointed off the board: ${h}`, level.id);
        ok(state.kind[h] !== undefined, 'hint pointed at nothing', level.id);
        if (h >= 0 && G.isRotatable(state.kind[h])) break;
      }
      if (state.phase === 'won' || state.phase === 'lost') break;
    }
  }
}

/* ------------------------------------------------------------- 9. report */

function printBoard(level) {
  const chars = ['N', 'E', 'S', 'W'];
  const map = { [G.EMPTY]: ' .', [G.STRAIGHT]: '-|', [G.ELBOW]: 'L ', [G.TEE]: 'T ',
                [G.CROSS]: '+ ', [G.SOURCE]: 'S ', [G.DRAIN]: 'D ', [G.WALL]: '# ', [G.ONEWAY]: '> ' };
  console.log(`\n  ${level.id} "${level.name}"  ${level.cols}x${level.rows}  ` +
    `route=${level.route.length} changes=${level.changes} forks=${level.forks} ` +
    `arrows=${level.oneways} par=${level.parSec}s\n`);
  for (let y = 0; y < level.rows; y++) {
    let row = '  ';
    for (let x = 0; x < level.cols; x++) {
      const i = G.index(x, y, level.cols);
      const k = level.kind[i];
      const tag = map[k] || '? ';
      const rot = chars[(level.sol[i] + 4) % 4];
      const wet = i === level.src ? 'T' : i === level.drain ? 'D' : (k === G.EMPTY ? '.' : rot);
      row += tag[0] + wet + ' ';
    }
    console.log(row);
  }
  const state = play(level, level.sol);
  console.log(`  solution: ${state.phase} in ${state.seconds.toFixed(1)}s, ` +
    `${state.strikes} strikes, ${state.bursts} bursts, ${state.stalls} stalls\n`);
}

console.log("Amber's Water Works — rules harness\n");
console.log(`  levels: ${D.LEVELS.length} across ${D.ROOMS.length} rooms`);

const suites = [
  ['every level has a zero-strike solution', testSolvable],
  ['no level starts solved, first tap is real', testNotPresolved],
  ['the tap is connected at load', testTapStartsConnected],
  ['the tap waits for the first turn', testTapWaits],
  ['strikes are capped at three', testStrikeCap],
  ['the star scale is 3/2/1', testStarScale],
  ['the valve really freezes the board', testValveFreezes],
  ['rotation cycles through distinct shapes', testRotationCycle],
  ['the answer is reachable by tapping', testSolutionIsReachable],
  ['one-ways drink from their tail only', testOneWayRefusesItsHead],
  ['difficulty climbs inside each room', testDifficulty],
  ['each room teaches the idea it exists for', testRoomArc],
  ['forks and arrows match what was promised', testForkAndArrowCounts],
  ['rooms and unlocks are shaped for teaching', testRoomUnlocks],
  ['every level terminates under random play', testTermination],
  ['the solution wins even with the valve held', testSolutionCohort],
  ['one honest mistake costs one strike, not the run', testOneMistakeIsSurvivable],
  ['the hint always points at a real pipe', testHintIsLegal]
];

let ran = 0;
for (const [name, fn] of suites) {
  const before = failures.length;
  try { fn(); } catch (e) { fail(`${name} threw: ${e && e.stack ? e.stack.split('\n')[0] : e}`); }
  ran++;
  const bad = failures.length - before;
  console.log(`  ${bad ? 'FAIL' : ' ok '}  ${name}${bad ? ` (${bad})` : ''}`);
}

if (only) {
  const level = D.LEVELS[Math.min(D.LEVELS.length - 1, Math.max(0, only - 1))];
  printBoard(level);
}
if (traceId) {
  const level = D.levelById(traceId);
  if (!level) fail(`no such level: ${traceId}`);
  else printBoard(level);
}

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`\n${ran} suites green — ${D.LEVELS.length} levels proved, no hangs.\n`);
