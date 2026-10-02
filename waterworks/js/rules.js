/* Amber's Water Works — the flow engine.
 *
 * Pure. No DOM, no canvas, no audio, no timers: give it a level and a dt and
 * it moves the water one deterministic step. Everything the browser does is
 * presentation reading this state, and everything the node harness checks is a
 * claim about this state, so the two can never disagree about the rules.
 *
 * The whole game is one rule, applied twice:
 *   A pipe fills, then pushes water out of EVERY port it has, except the one it
 *   came in through. If any of those pushes has nowhere legal to go, that is a
 *   burst. There is no way to cap a branch — a fork is only safe when both of
 *   its halves find the drain.
 *
 * Three beats keep it fair for a child:
 *   - Nothing moves until the first tap, so nobody loses to a clock they have
 *     not started yet.
 *   - A burst does not end the pass. The tap re-sends after a beat and the
 *     water walks whatever is already full, so progress banks and one mistake
 *     never wipes the board.
 *   - Holding the valve stops the step entirely, so thinking is free.
 */
(function (global) {
  'use strict';

  var G = global.WWGrid;
  var D = global.WWData;
  var TUNE = D.TUNE;

  function createState(level) {
    var n = level.n;
    return {
      level: level,
      cols: level.cols,
      rows: level.rows,
      n: n,
      kind: level.kind.slice(),
      cur: level.cur.slice(),
      sol: level.sol.slice(),
      full: new Uint8Array(n),
      visited: new Uint8Array(n),        /* cycle guard, one stamp per pass */
      fill: new Float32Array(n),
      front: [],                    /* {i, d, j, t} water crossing one gap */
      fx: [],                       /* bursts and stalls, for the renderer */
      alert: null,                  /* {i, kind, t} what the HUD is shouting about */
      blocked: false,               /* the tap is pressurising against a closed pipe */
      phase: 'idle',                /* idle|flowing|waiting|won|lost */
      resend: 0,
      strikes: 0,
      bursts: 0,
      stalls: 0,
      armed: false,
      time: 0,
      live: 0,
      speed: TUNE.baseSpeed,
      pressure: 1,
      moves: 0,
      frozen: false,
      passFilled: 0,
      passBurst: false,
      reason: ''
    };
  }

  /* ------------------------------------------------------------- mechanics */

  /* A tap that would immediately spray is not a tap, it is a wall: return -1
   * and the caller treats the whole pipe as unusable. */
  function canReceive(state, from, d) {
    var j = G.neighbor(from, d, state.cols, state.rows);
    if (j < 0) return -1;
    if (!G.isOpenToward(state.kind[j], state.cur[j], G.opposite(d))) return -1;
    return j;
  }

  /* Once the level is decided it stays decided. Every mutator below is
   * terminal-monotone, so a burst landing in the same step as the winning
   * arrival can never resurrect a finished board. */
  function over(state) { return state.phase === 'won' || state.phase === 'lost'; }

  /* The tap pushes the next front out. If its outlet is blocked the level just
   * waits — no strike, because a blocked tap is the most visible problem on
   * the board and the child can see it. */
  function emit(state) {
    var s = state.level.src;
    var d = state.level.outDir;
    var j = canReceive(state, s, d);
    if (j < 0) {
      /* A blocked tap costs nothing and shouts about itself. It retries on the
       * same clock as any other pause, so joining the route anywhere on the
       * board is enough to set it off. */
      state.blocked = true;
      state.phase = 'waiting';
      state.resend = TUNE.cleanResend;
      return false;
    }
    state.blocked = false;
    if (state.kind[j] === G.DRAIN) { win(state); return true; }
    state.phase = 'flowing';
    state.passFilled = 0;
    state.passBurst = false;
    state.armed = true;
    newPass(state);
    push(state, s, d, j);
    return true;
  }

  function push(state, i, d, j) {
    if (state.front.length > 4 * state.n) return;   /* never build a queue */
    state.front.push({ i: i, d: d, j: j, t: 0 });
  }

  /* Water has finished crossing one gap. */
  function arrive(state, f) {
    if (over(state)) return;
    var j = f.j;
    if (j < 0) { burst(state, f.i, f.d, 'off-board'); return; }
    if (!G.isOpenToward(state.kind[j], state.cur[j], G.opposite(f.d))) { burst(state, f.i, f.d, 'no-port'); return; }
    if (state.kind[j] === G.DRAIN) { win(state); return; }
    if (state.full[j]) { spread(state, j, G.opposite(f.d)); return; }
    fillCell(state, j, G.opposite(f.d));
  }

  /* A pipe just became wet. */
  function fillCell(state, j, inD) {
    if (over(state)) return;
    state.full[j] = 1;
    state.fill[j] = 0;
    state.passFilled++;
    spread(state, j, inD);
  }

  /* Water standing in a pipe pushes out of every other port it has. A port
   * whose neighbour is already wet is a conduit, not a dead end, so the spread
   * walks straight through it INSTEAD OF queueing a timed event — that is what
   * makes re-crossing a finished pipe instant, which is the promise the whole
   * forgiving loop rests on. Empty neighbours get a real front they can be seen
   * travelling down.
   *
   * The wet-pipe graph is CYCLIC — every level that has a fork, plus every
   * level whose route doubles back, closes a loop of already-wet pipes — so the
   * walk needs a real cycle guard, not a depth budget. A depth budget was the
   * wrong shape: on a long loop the walk runs out of budget mid-flow, settle()
   * fires while water is still legitimately spreading, and the level charges
   * the child a stall strike for a board it could not possibly have solved.
   *
   * The guard is stamped on the (cell, incoming direction) PAIR, not the cell.
   * Walking the same cell twice from two different sides is not a cycle: the
   * port skipped depends on which side the water came from, so the second visit
   * still has ports to push that the first visit could not. Bit (inD + 1) of a
   * per-cell mask is that pair, and inD of -1 (a re-push after a rotation,
   * which pushes every port) gets its own bit. */
  function spread(state, i, inD) {
    if (over(state)) return;
    var bit = 1 << (inD + 1);
    if (state.visited[i] & bit) return;
    state.visited[i] |= bit;
    var outs = G.outletDirs(state.kind[i], state.cur[i]);
    for (var o = 0; o < outs.length; o++) {
      if (over(state)) return;
      var d = outs[o];
      if (d === inD) continue;
      var nb = canReceive(state, i, d);
      if (nb < 0) { burst(state, i, d, 'no-port'); continue; }
      if (state.kind[nb] === G.DRAIN) { win(state); return; }
      if (state.full[nb]) spread(state, nb, G.opposite(d));
      else push(state, i, d, nb);
    }
  }

  /* A pass is one tap's worth of spreading. The guard is stamped for the whole
   * pass, including re-spreads caused by rotating a wet pipe, so one turn can
   * never make a previously-walked pipe walk again inside the same pass. */
  function newPass(state) { state.visited = new Uint8Array(state.n); }

  /* A pipe that is already wet still has to feed whatever is downstream of it
   * right now, including after a rotation — inD is unknown then, so every port
   * is pushed. */
  function rePush(state, i) {
    spread(state, i, -1);
  }

  /* The front has nothing left to push: the water has found the end of
   * whatever the child has built. */
  function settle(state) {
    if (over(state) || state.phase !== 'flowing') return;
    if (state.front.length) return;
    if (state.passBurst) {
      state.phase = 'waiting';
      state.resend = TUNE.leakResend;
      return;
    }
    if (state.passFilled > 0) {
      state.phase = 'waiting';
      state.resend = TUNE.cleanResend;
      return;
    }
    /* No burst, and nothing new got wet: the tap is pushing into a dead end
     * the child has not noticed. That is a stall, and it costs a strike. */
    state.stalls++;
    state.strikes++;
    state.fx.push({ kind: 'stall', i: lastFull(state), t: 0 });
    alert(state, lastFull(state), 'stall');
    if (state.strikes >= TUNE.maxStrikes) { lose(state, 'stall'); return; }
    state.phase = 'waiting';
    state.resend = TUNE.stallResend;
  }

  function lastFull(state) {
    for (var i = state.n - 1; i >= 0; i--) if (state.full[i]) return i;
    return state.level.src;
  }

  function burst(state, i, d, why) {
    if (over(state)) return;
    state.bursts++;
    if (!state.passBurst) {
      state.passBurst = true;
      state.strikes++;
      state.fx.push({ kind: 'burst', i: i, d: d, why: why, t: 0 });
      alert(state, i, 'burst');
      if (state.strikes >= TUNE.maxStrikes) { lose(state, 'burst'); return; }
    }
    state.phase = 'waiting';
    state.resend = TUNE.leakResend;
    state.front.length = 0;
  }

  function win(state) {
    if (over(state)) return;
    state.phase = 'won';
    state.front.length = 0;
    state.reason = 'drain';
  }
  function lose(state, why) {
    if (over(state)) return;
    state.phase = 'lost';
    state.front.length = 0;
    state.reason = why;
  }
  function alert(state, i, kind) { state.alert = { i: i, kind: kind, t: 0 }; }

  /* ------------------------------------------------------------------ step */

  function step(state, dt) {
    if (state.phase === 'won' || state.phase === 'lost') { tickFx(state, dt); return; }

    var nf = 1 / TUNE.fillTime;
    for (var i = 0; i < state.n; i++) {
      if (state.full[i] && state.fill[i] < 1) {
        state.fill[i] = Math.min(1, state.fill[i] + dt * nf);
      }
    }
    tickFx(state, dt);
    if (state.frozen || !state.armed) return;

    state.live += dt;
    var target = TUNE.baseSpeed + TUNE.rampPerSecond * state.live;
    state.speed = Math.min(target, TUNE.baseSpeed * TUNE.rampCapMul);
    state.pressure = state.speed / TUNE.baseSpeed;

    if (state.phase === 'waiting') {
      state.resend -= dt;
      if (state.resend <= 0) {
        state.front.length = 0;
        emit(state);
      }
      return;
    }
    if (state.phase === 'idle') { if (state.armed) emit(state); return; }

    var list = state.front;
    state.front = [];
    var stepTiles = dt * state.speed;
    for (var f = 0; f < list.length; f++) {
      if (state.phase !== 'flowing') break;
      list[f].t += stepTiles;
      if (list[f].t >= 1) arrive(state, list[f]);
      else state.front.push(list[f]);
    }
    if (state.phase === 'flowing' && !state.front.length) settle(state);
  }

  function tickFx(state, dt) {
    var f, k;
    for (k = state.fx.length - 1; k >= 0; k--) {
      f = state.fx[k];
      f.t += dt;
      if (f.t > TUNE.splashTime) state.fx.splice(k, 1);
    }
    if (state.alert) {
      state.alert.t += dt;
      if (state.alert.t > TUNE.alertTime) state.alert = null;
    }
  }

  /* ------------------------------------------------------------------ taps */

  /* Turn one cell. Returns 'turn' when something moved, 'static' for a tile
   * that cannot turn, 'empty' for bare floor, and 'done' once the level is
   * over. */
  function rotateAt(state, idx) {
    if (state.phase === 'won' || state.phase === 'lost') return 'done';
    if (idx < 0 || idx >= state.n) return 'empty';
    var k = state.kind[idx];
    if (k === G.EMPTY) return 'empty';
    if (!G.isRotatable(k)) return 'static';
    state.cur[idx] = G.rotate(k, state.cur[idx]);
    state.moves++;
    state.armed = true;

    if (state.full[idx]) {
      /* A full pipe that turns sends its water somewhere new immediately. */
      var keep = [];
      for (var f = 0; f < state.front.length; f++) if (state.front[f].i !== idx) keep.push(state.front[f]);
      state.front = keep;
      if (state.phase === 'flowing') rePush(state, idx);
    } else if (state.blocked) {
      emit(state);
    } else if (state.phase === 'waiting' && state.resend > 0) {
      /* Turning a pipe mid-flow must not cancel the penalty clock. */
      state.phase = 'waiting';
    }
    return 'turn';
  }

  function setFrozen(state, on) {
    if (state.frozen === !!on) return;
    state.frozen = !!on;
  }

  /* Three bursts is a loss, not a one-star finish. */
  function starsFor(strikes) {
    if (strikes >= TUNE.maxStrikes) return 0;
    if (strikes <= 0) return 3;
    if (strikes === 1) return 2;
    return 1;
  }

  /* Which cell would help most right now. Engine-derived, so it never leaks
   * the level's stored answer. */
  function hint(state) {
    var i, d;
    if (state.alert && state.alert.kind === 'burst') {
      for (d = 0; d < 4; d++) {
        var nb = G.neighbor(state.alert.i, d, state.cols, state.rows);
        if (nb >= 0 && G.isRotatable(state.kind[nb])) return nb;
      }
      return state.alert.i;
    }
    if (state.blocked) {
      var s = state.level.src;
      for (d = 0; d < 4; d++) {
        var j = G.neighbor(s, d, state.cols, state.rows);
        if (j >= 0 && G.isRotatable(state.kind[j])) return j;
      }
      return -1;
    }
    for (i = 0; i < state.n; i++) {
      if (!state.full[i] || !G.isRotatable(state.kind[i])) continue;
      if (state.cur[i] !== state.sol[i]) return i;
    }
    for (i = 0; i < state.n; i++) if (G.isRotatable(state.kind[i])) return i;
    return -1;
  }

  /* Cells the tap can actually reach right now, ignoring full pipes. Used by
   * the harness to measure how much of a level a single mistake can spoil. */
  function reachable(state) {
    var seen = new Uint8Array(state.n);
    var stack = [state.level.src];
    seen[state.level.src] = 1;
    var n = 0;
    while (stack.length) {
      var i = stack.pop();
      n++;
      var outs = G.outletDirs(state.kind[i], state.cur[i]);
      for (var o = 0; o < outs.length; o++) {
        var d = outs[o];
        var nb = canReceive(state, i, d);
        if (nb < 0) continue;
        if (seen[nb]) continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    return { seen: seen, count: n };
  }

  global.WWRules = {
    createState: createState,
    step: step,
    rotateAt: rotateAt,
    setFrozen: setFrozen,
    starsFor: starsFor,
    hint: hint,
    reachable: reachable
  };
})(typeof window !== 'undefined' ? window : globalThis);
