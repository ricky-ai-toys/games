/* Amber's Boardwalk — node smoke harness.
 * Drives full random games through the pure engine and asserts invariants.
 * Usage: node monopoly/js/rules.test.js [games]
 */
'use strict';

var D = require('./data.js');
var R = require('./rules.js');
var B = require('./bots.js');

var SEATS = ['amber', 'maple', 'finn', 'pip'];
var GAMES = parseInt(process.argv[2], 10) || 1000;
var MAX_STEPS = 4000;

function mulberry32(seed) {
  var s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assert(cond, msg, ctx) {
  if (!cond) {
    console.error('FAIL: ' + msg + '\n  context: ' + JSON.stringify(ctx));
    process.exit(1);
  }
}

// Random "human" decisions to exercise both branches of every choice.
function humanBuy(rng) { return rng() < 0.55; }
function humanStar(rng) { return rng() < 0.5; }
function humanTimeout(rng) { return rng() < 0.4; }

function validate(state, step, rnd) {
  for (var i = 0; i < state.players.length; i++) {
    var p = state.players[i];
    assert(typeof p.cash === 'number' && isFinite(p.cash) && p.cash >= 0,
      'negative/NaN cash', { game: rnd, step: step, p: p.name, cash: p.cash });
    assert(p.pos >= 0 && p.pos < D.BOARD_SIZE, 'pos out of range',
      { game: rnd, pos: p.pos });
    if (!p.alive) assert(p.cash === 0, 'dead player kept cash', { game: rnd, name: p.name });
  }
  for (var pos in state.owned) {
    var o = state.owned[pos];
    assert(o.stars >= 0 && o.stars <= D.MAX_STARS, 'bad stars', { game: rnd, pos: pos, stars: o.stars });
    assert(state.players[o.owner] && state.players[o.owner].alive,
      'owner dead but property held', { game: rnd, pos: pos });
    var sp = D.BOARD[+pos];
    assert(sp.type === 'property', 'non-property owned', { game: rnd, pos: pos });
  }
}

function playOne(rnd, seatCount, verbose) {
  var seats = [{ key: 'amber', isBot: false }];
  for (var s = 1; s < seatCount; s++) seats.push({ key: SEATS[s], isBot: true });
  var state = R.createGame(seats, Math.floor(rnd() * 2147483647));
  var steps = 0, buys = 0, stars = 0, timeouts = 0, cards = 0;

  while (state.phase !== 'over') {
    steps++;
    assert(steps < MAX_STEPS, 'game did not terminate', { game: rnd ? -1 : -1, steps: steps });

    var need = R.needsChoice(state);
    if (need === 'timeout') {
      timeouts++;
      var cur = R.currentPlayer(state);
      var act = cur.isBot ? B.decideTimeout(state, cur.id)
        : (humanTimeout(rnd) ? 'leave' : 'sit');
      if (act === 'leave') {
        var evL = R.leaveTimeout(state);
        if (cur.skipTurns > 0) { /* couldn't afford */ R.sitOut(state); R.endTurn(state); }
        else validate(state, steps, seatCount), void evL;
      } else {
        R.sitOut(state);
        R.endTurn(state);
      }
      continue;
    }

    if (need === 'buy') {
      buys++;
      var cp = R.currentPlayer(state);
      var want = cp.isBot ? B.wantsBuy(state, cp.id) : humanBuy(rnd);
      if (want) R.buy(state); else R.pass(state);
      continue;
    }

    if (need === 'star') {
      stars++;
      var cs = R.currentPlayer(state);
      var wantS = cs.isBot ? B.wantsStar(state, cs.id) : humanStar(rnd);
      if (wantS) R.buildStar(state); else R.skipStar(state);
      continue;
    }

    // roll
    var events = R.roll(state);
    for (var e = 0; e < events.length; e++) {
      if (events[e].type === 'card') cards++;
    }
    validate(state, steps, seatCount);

    if (state.phase === 'over') break;

    // resolve any pending choice from this landing before deciding turn end
    var needNow = R.needsChoice(state);
    if (needNow === 'buy') {
      var cb = R.currentPlayer(state);
      if (cb.isBot ? B.wantsBuy(state, cb.id) : humanBuy(rnd)) R.buy(state); else R.pass(state);
    } else if (needNow === 'star') {
      var cst = R.currentPlayer(state);
      if (cst.isBot ? B.wantsStar(state, cst.id) : humanStar(rnd)) R.buildStar(state); else R.skipStar(state);
    }

    if (state.phase === 'over') break;
    // Roll again on doubles, otherwise pass the dice.
    if (!state.awaitingExtraRoll && !R.needsChoice(state)) R.endTurn(state);
  }

  validate(state, steps, seatCount);
  assert(state.players.filter(function (p) { return p.alive; }).length >= 1, 'no winner?', {});
  assert(state.winner != null, 'phase over but no winner', {});

  if (verbose) {
    console.log('  rounds=' + state.round + ' winner=' + state.players[state.winner].name +
      ' (' + state.winReason + ') buys=' + buys + ' stars=' + stars +
      ' cards=' + cards + ' timeouts=' + timeouts + ' steps=' + steps);
  }
  var wins = {};
  wins[state.players[state.winner].key] = 1;
  wins._meta = { rounds: state.round, reason: state.winReason, steps: steps };
  return wins;
}

// ---------- run ----------
var rng = mulberry32(20260826);
var tally = {}, totalRounds = 0, maxSteps = 0, reasons = {};

for (var g = 0; g < GAMES; g++) {
  var seatCount = 2 + Math.floor(rng() * 3); // 2..4
  var res = playOne(rng, seatCount, g === 0);
  for (var k in res) {
    if (k === '_meta') continue;
    tally[k] = (tally[k] || 0) + 1;
  }
  totalRounds += res._meta.rounds;
  maxSteps = Math.max(maxSteps, res._meta.steps);
  reasons[res._meta.reason] = (reasons[res._meta.reason] || 0) + 1;
}

console.log('\n=== Amber\u2019s Boardwalk smoke: ' + GAMES + ' games OK ===');
console.log('wins by player:', JSON.stringify(tally));
console.log('win reasons:', JSON.stringify(reasons));
console.log('avg rounds:', (totalRounds / GAMES).toFixed(1), '| max steps in a game:', maxSteps);
