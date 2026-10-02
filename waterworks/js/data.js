/* Amber's Water Works — tuning, rooms, and the level generator.
 *
 * Levels are GENERATED, not hand-typed, from a fixed seed: carve a route from
 * the tap to the drain, bolt on forks that rejoin, drop in one-way arrows,
 * walls and decoy pipe, then scramble the rotations. The generator is pure and
 * deterministic, so the board Amber plays is byte-identical to the one the node
 * harness proves, and every level is built to have a zero-strike solution.
 *
 * The generator speaks the vocabulary in grid.js and never calls the engine in
 * rules.js. The engine independently re-proves all 24 levels by simulating them,
 * so a generator bug cannot quietly ship a broken board.
 */
(function (global) {
  'use strict';

  var G = global.WWGrid;

  /* ---------------------------------------------------------------- tuning
   * "Pressure" is deliberately NOT a fluid sim. It is one number: the flow
   * front's speed, which ramps while the tap runs and stops when the valve is
   * held. Every knob the balance depends on lives here.
   */
  var TUNE = {
    baseSpeed: 0.9,        /* tiles per second when the level starts */
    rampPerSecond: 0.035,  /* added tiles/sec for every second of live flow */
    rampCapMul: 2.4,       /* never more than this many times baseSpeed */
    leakResend: 1.0,       /* seconds of calm after a pipe bursts */
    stallResend: 1.3,      /* seconds of calm after the water goes nowhere */
    cleanResend: 0.45,     /* seconds before the tap tries again after progress */
    maxStrikes: 3,         /* bursts AND stalls each cost one; three ends the run */
    fillTime: 0.16,        /* seconds for water to visibly fill one pipe */
    splashTime: 0.55,      /* seconds a burst spray is drawn */
    alertTime: 1.8,        /* seconds the HUD keeps complaining about a problem */
    stepHz: 60
  };

  var ROOMS = [
    {
      id: 'bath', name: 'The Bathroom',
      blurb: 'Bends and straights only. Get the water down the drain.',
      cols: 5, rows: 5, minSep: 4,
      floor: '#d3dce6', floorEdge: '#aab7c9', grout: '#eaf0f7', wallPaint: '#cfe0ef',
      water: '#2f9fe0', waterDeep: '#1668ad', accent: '#7fd8e8', metal: '#cfe3ef',
      tapArt: 'chrome', drainArt: 'grate', decor: 'duck', ambient: '#f4f9ff',
      pathLen: [4, 4, 5, 5, 6, 6, 7, 7],
      changes: [2, 2, 3, 3, 4, 4, 5, 5],
      forks: [0, 0, 0, 0, 0, 0, 0, 0],
      oneways: [0, 0, 0, 0, 0, 0, 0, 0],
      decoys: [1, 1, 2, 2, 2, 3, 3, 4],
      walls: [2, 2, 3, 3, 4, 4, 5, 6],
      names: ['First Drip', 'The Bend', 'Round the Sink', 'Plug Hole', 'Tight Squeeze',
              'Sink Spiral', 'The Long Hose', 'Bathroom Grand']
    },
    {
      id: 'base', name: 'The Basement',
      blurb: 'A fork splits the water in two. Both halves must reach the drain.',
      cols: 6, rows: 6, minSep: 5,
      floor: '#5c5f68', floorEdge: '#41444c', grout: '#6d717b', wallPaint: '#4a4d55',
      water: '#3fb6c8', waterDeep: '#12707f', accent: '#e0a15a', metal: '#b98a5a',
      tapArt: 'rusted', drainArt: 'sump', decor: 'crate', ambient: '#23252b',
      pathLen: [6, 6, 7, 7, 8, 8, 9, 9],
      changes: [3, 4, 4, 5, 5, 6, 6, 7],
      forks: [0, 1, 1, 1, 2, 2, 2, 3],
      oneways: [0, 0, 0, 0, 0, 0, 0, 0],
      decoys: [2, 2, 3, 3, 4, 4, 4, 5],
      walls: [3, 4, 5, 6, 7, 8, 9, 10],
      names: ['Cold Cellar', 'Split Decision', 'Two Ways Down', 'The Copper Fork',
              'Deeper Down', 'Around the Boiler', 'Pipes and Puddles', 'The Cellar Grand']
    },
    {
      id: 'garden', name: 'The Garden',
      blurb: 'One-way arrows only drink from their tail. Go the long way round.',
      cols: 6, rows: 7, minSep: 6,
      floor: '#8fc98a', floorEdge: '#6ba766', grout: '#a9dda3', wallPaint: '#7fbc7a',
      water: '#3aa0e0', waterDeep: '#145f96', accent: '#f2a0c0', metal: '#d8c08a',
      tapArt: 'sprinkler', drainArt: 'soakaway', decor: 'flowers', ambient: '#eaf7e4',
      pathLen: [7, 8, 8, 9, 9, 10, 10, 11],
      changes: [4, 5, 5, 6, 6, 6, 6, 6],
      /* The Garden cannot hold a fork and an arrow in the same level, and that is a
       * fact about the rules rather than about the seeds. A fork's tee fires water
       * backwards the moment its detour wins the race, and no cell on that
       * backwards walk may be an arrow — so as soon as a fork exists, the arrow
       * count collapses to zero. Measured across 300 seeds per level, this room's
       * reachable set is strictly "forks OR arrows", never both, at every index.
       * The original spec asked the finale for three forks AND three arrows, which
       * no board can satisfy.
       *
       * So the Garden teaches its own idea and the arc moves the forks OUT of the
       * room instead of pretending they coexist: the Basement already teaches
       * forks properly, and by the time the Garden arrives the child knows them.
       * Every Garden level asks for arrows only, climbing to three. */
      forks: [0, 0, 0, 0, 0, 0, 0, 0],
      oneways: [0, 1, 1, 2, 2, 3, 3, 3],
      decoys: [3, 3, 4, 4, 5, 5, 5, 6],
      walls: [3, 4, 5, 6, 7, 8, 9, 10],
      names: ['First Sprinkler', 'One Way Only', 'The Hedge Maze', 'Arrows Everywhere',
              'Long Way Round', 'The Pond Path', 'Over the Beds', 'Garden Grand']
    }
  ];

  /* --------------------------------------------------------------- random */

  /* mulberry32: tiny, seeded, identical in every engine. */
  function rng(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(r, list) { return list[Math.min(list.length - 1, Math.floor(r() * list.length))]; }

  function shuffled(r, list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.min(i, Math.floor(r() * (i + 1)));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* Which of the four directions leads from cell a to cell b? */
  function stepDir(a, b, cols) {
    var dx = G.xOf(b, cols) - G.xOf(a, cols);
    var dy = G.yOf(b, cols) - G.yOf(a, cols);
    for (var d = 0; d < 4; d++) if (G.DX[d] === dx && G.DY[d] === dy) return d;
    return -1;
  }

  function manhattan(a, b, cols) {
    return Math.abs(G.xOf(a, cols) - G.xOf(b, cols)) + Math.abs(G.yOf(a, cols) - G.yOf(b, cols));
  }

  /* A room's pathLen is a WISH, not a promise: the tap and the drain can end up
   * further apart than the level asked for, and a route can never be shorter
   * than the distance between them. The request is therefore raised to the
   * geometry, which keeps every level carveable while leaving the scramble
   * count as the real difficulty dial. */
  function shortestRoute(start, drain, cols, rows) {
    var best = Infinity;
    for (var d = 0; d < 4; d++) {
      var nb = G.neighbor(drain, d, cols, rows);
      if (nb < 0 || nb === start) continue;
      best = Math.min(best, manhattan(start, nb, cols));
    }
    return best === Infinity ? 3 : best + 1;
  }

  /* A straight accepts two opposite ports; anything else non-repeating is an
   * elbow. Returns the tile kind, or -1 if the pair is nonsense. */
  function kindForPorts(a, b) {
    if (a === b) return G.STRAIGHT;
    if (G.opposite(a) === b) return G.STRAIGHT;
    if (G.opposite(a) === a || G.opposite(b) === b) return -1;
    return G.ELBOW;
  }

  /* ------------------------------------------------------------ generator */

  /* Pick the tap, the drain and the tap's outlet. The tap prefers the top or
   * left wall so it reads as plumbing coming out of the wall; the drain wants
   * to be far away so the route has to actually travel. */
  function chooseEnds(r, cols, rows, room) {
    var wall = [], all = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = G.index(x, y, cols);
        all.push(i);
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) wall.push(i);
      }
    }
    var tapPool = wall.filter(function (i) { return G.yOf(i, cols) === 0 || G.xOf(i, cols) === 0; });
    for (var t = 0; t < 60; t++) {
      var src = pick(r, tapPool);
      var far = all.filter(function (i) {
        if (i === src) return false;
        var onWall = G.xOf(i, cols) === 0 || G.yOf(i, cols) === 0 ||
                     G.xOf(i, cols) === cols - 1 || G.yOf(i, cols) === rows - 1;
        if (!onWall) return false;
        return G.dist(G.xOf(i, cols), G.yOf(i, cols), G.xOf(src, cols), G.yOf(src, cols)) >= room.minSep;
      });
      if (!far.length) continue;
      var drain = pick(r, far);
      var outs = shuffled(r, [0, 1, 2, 3]).filter(function (d) {
        var nb = G.neighbor(src, d, cols, rows);
        return nb >= 0 && nb !== drain;
      });
      if (!outs.length) continue;
      return { src: src, drain: drain, outDir: outs[0], alt: outs };
    }
    return null;
  }

  /* A self-avoiding walk of minLen..maxLen cells from `start` to a cell beside
   * the drain, returned as a plain array of cell indices, or null. The exact
   * length is a range on purpose: the route must merely be long enough to hold
   * the level's scramble count, and a range is far easier to satisfy than an
   * exact length, so the generator never has to fall back. */
  function carveRoute(r, cols, rows, start, drain, minLen, maxLen, taken) {
    var n = cols * rows;
    var parent = new Int32Array(n).fill(-1);
    var onPath = new Uint8Array(n);
    var order = [0, 1, 2, 3];
    var nodes = 0;
    var end = -1;

    function besideDrain(i) {
      for (var d = 0; d < 4; d++) if (G.neighbor(i, d, cols, rows) === drain) return true;
      return false;
    }

    function dfs(i, from, dep) {
      if (end >= 0 || ++nodes > 60000) return;
      onPath[i] = 1; parent[i] = from;
      if (dep >= minLen && besideDrain(i)) { end = i; return; }
      if (dep < maxLen) {
        var dirs = shuffled(r, order);
        for (var k = 0; k < 4; k++) {
          if (end >= 0) return;
          var d = dirs[k];
          var nb = G.neighbor(i, d, cols, rows);
          if (nb < 0 || onPath[nb] || taken[nb]) continue;
          dfs(nb, i, dep + 1);
        }
      }
      onPath[i] = 0;
    }

    dfs(start, -1, 1);
    if (end < 0) return null;
    var chain = [];
    for (var i = end; i >= 0; i = parent[i]) chain.unshift(i);
    return chain;
  }

  /* Build one level. Everything below is a deterministic function of `seed`. */
  function buildLevel(seed, room, ri) {
    var r = rng(seed);
    var cols = room.cols, rows = room.rows, n = cols * rows;
    var kinds = new Array(n).fill(G.EMPTY);
    var sols = new Array(n).fill(0);
    var taken = new Uint8Array(n);
    var free = new Uint8Array(n).fill(1);
    var i, k;

    var ends = chooseEnds(r, cols, rows, room);
    if (!ends) throw new Error('Water Works: no tap/drain placement for ' + room.id + ' level ' + ri);
    var src = ends.src, drain = ends.drain, outDir = ends.outDir;

    kinds[src] = G.SOURCE; sols[src] = outDir; taken[src] = 1; free[src] = 0;
    kinds[drain] = G.DRAIN; taken[drain] = 1; free[drain] = 0;

    /* 2. Carve the route. The length asked for by the room is raised to what
     *    the geometry actually allows, so a far-flung drain can never make a
     *    level uncarvable. */
    var want = room.pathLen[ri];
    var chain = null;
    for (var attempt = 0; attempt < ends.alt.length && !chain; attempt++) {
      outDir = ends.alt[attempt];
      sols[src] = outDir;
      var start = G.neighbor(src, outDir, cols, rows);
      if (start < 0 || taken[start]) continue;
      var minLen = Math.max(want, shortestRoute(start, drain, cols, rows));
      chain = carveRoute(r, cols, rows, start, drain, minLen, minLen + 2, taken);
    }
    if (!chain) throw new Error('Water Works: no route for ' + room.id + ' level ' + ri);

    var route = [];
    for (k = 0; k < chain.length; k++) {
      var cell = chain[k];
      var prev = k === 0 ? src : chain[k - 1];
      var next = k === chain.length - 1 ? drain : chain[k + 1];
      var inD = stepDir(cell, prev, cols);
      var outD = stepDir(cell, next, cols);
      route.push({ i: cell, in: inD, out: outD });
      taken[cell] = 1; free[cell] = 0;
      var kk = kindForPorts(inD, outD);
      kinds[cell] = kk;
      sols[cell] = G.rotForPorts(kk, [inD, outD]);
    }

    /* 3. Forks first, so the arrows can be kept out of their spans. A tee pushes
     *    water out of all three ports, so a fork is only safe when the third
     *    port rejoins the route further on: there is no such thing as a
     *    usefully capped branch in this game, and that is exactly what the
     *    Basement is here to teach. */
    var forks = 0;
    var forked = new Uint8Array(n);
    var spans = [];
    var candidates = [];
    for (k = 1; k <= route.length - 4; k++) candidates.push(k);
    var forkOrder = shuffled(r, candidates);
    for (var fi = 0; fi < forkOrder.length && forks < room.forks[ri]; fi++) {
      if (placeFork(r, cols, rows, route, forkOrder[fi], kinds, sols, taken, free, forked, spans)) forks++;
    }

    /* Every tee a fork created can fire water backwards the moment its detour
     * gets there first. */
    /* 4. One-way arrows take over a straight run. Their outlet is the way the
     *    water must travel, so arriving at the head sprays.
     *
     *    Arrows are kept OUTSIDE every fork span, and that is not cosmetic. A
     *    fork's two branches race to rejoin, and if the detour arrives first the
     *    tee pushes water backwards up its own route branch — harmless into
     *    ordinary pipe, but a backwards push into an arrow's head is a burst
     *    the child could not see coming. */
    var oneways = 0;
    var arrowSpots = [];
    for (k = 1; k < route.length - 1; k++) {
      if (kinds[route[k].i] !== G.STRAIGHT) continue;
      var inSpan = false;
      for (var s2 = 0; s2 < spans.length; s2++) {
        if (k >= spans[s2][0] && k <= spans[s2][1]) { inSpan = true; break; }
      }
      if (!inSpan) arrowSpots.push(k);
    }

    /* Not just the span. A fork's upstream tee pushes out of all three ports
     * when the detour arrives first, which fires water BACKWARDS up the
     * route — and an arrow anywhere on that backwards walk faces the tee with
     * its head and sprays. garden5 put an arrow one cell before the tee; the
     * seed search found garden4 and garden6 bursting with arrows two and three
     * cells before theirs. The distance is set by the route's own geometry, so
     * the safe set has to be computed, not guessed at with a fixed offset.
     *
     * This has to run AFTER the arrows exist: the flood asks "will this cell
     * take water arriving head-on", and a straight pipe answers yes while an
     * arrow at the same cell answers no. Computing it before the arrows are
     * placed walks straight through them and protects nothing. So arrows are
     * laid down first and then audited, and any that are unsafe are reverted. */
    var arrowOrder = shuffled(r, arrowSpots);
    for (var oi = 0; oi < arrowOrder.length && oneways < room.oneways[ri]; oi++) {
      var q = arrowOrder[oi];
      if (kinds[route[q].i] !== G.STRAIGHT) continue;
      kinds[route[q].i] = G.ONEWAY;
      sols[route[q].i] = route[q].out;
      oneways++;
    }

    /* Audit against the finished board and undo anything unsafe. A straight keeps
     * its connection to the route; only the one-way behaviour is removed, so the
     * route stays solvable and the level simply has one fewer arrow.
     *
     * This has to run to a FIXED POINT, not once. The audit asks each cell
     * "will the backwards push arrive here head-on?", and that answer depends
     * on which neighbours are arrows — so removing one unsafe arrow can make a
     * previously-safe arrow unsafe, and vice versa. A single pass leaves
     * garden4 with an arrow at index 2 that a second arrow at index 3 had
     * quietly exposed. Each pass strictly removes an arrow and never adds one,
     * so this terminates, and the bound is just a guard against a future change
     * that breaks that property.
     *
     * The builder's `route` holds {i, in, out} records; the audit wants the flat
     * cell list the level itself carries, so project it first. */
    var routeCells = [];
    for (k = 0; k < route.length; k++) routeCells.push(route[k].i);
    for (var pass = 0; pass < room.oneways[ri] + 1; pass++) {
      var backPush = markBackPush(routeCells, kinds, sols, cols, rows);
      var reverted = false;
      for (k = 0; k < route.length; k++) {
        if (!backPush[k]) continue;
        if (kinds[route[k].i] !== G.ONEWAY) continue;
        kinds[route[k].i] = G.STRAIGHT;
        sols[route[k].i] = G.rotForPorts(G.STRAIGHT, [route[k].in, route[k].out]);
        oneways--;
        reverted = true;
      }
      if (!reverted) break;
    }

  /* 5. Walls, then decoy pipe. Both only ever land on cells no water uses. */
    var open = [];
    for (i = 0; i < n; i++) if (free[i] && !taken[i]) open.push(i);
    var wallCells = shuffled(r, open).slice(0, room.walls[ri]);
    wallCells.forEach(function (c) { kinds[c] = G.WALL; taken[c] = 1; free[c] = 0; });

    var leftovers = [];
    for (i = 0; i < n; i++) {
      if (!free[i] || taken[i]) continue;
      for (var d = 0; d < 4; d++) {
        var nb = G.neighbor(i, d, cols, rows);
        if (nb >= 0 && taken[nb]) { leftovers.push(i); break; }
      }
    }
    shuffled(r, leftovers).slice(0, room.decoys[ri]).forEach(function (c) {
      var kd = r() < 0.6 ? G.ELBOW : G.STRAIGHT;
      kinds[c] = kd;
      sols[c] = Math.min(G.ROT_STEPS[kd] - 1, Math.floor(r() * G.ROT_STEPS[kd]));
      taken[c] = 1; free[c] = 0;
    });

    /* 6. Scramble. The first two route cells stay correct, so a child's first
     *    tap always joins something real, and the number of wrong rotations is
     *    the difficulty dial: it climbs with the level index. */
    var cur = sols.slice();
    var wrong = [];
    for (k = 2; k < route.length; k++) {
      if (G.isRotatable(kinds[route[k].i])) wrong.push(route[k].i);
    }
    var scramble = shuffled(r, wrong).slice(0, Math.min(room.changes[ri], wrong.length));
    scramble.forEach(function (c) {
      var steps = G.ROT_STEPS[kinds[c]];
      cur[c] = (sols[c] + 1 + Math.floor(r() * (steps - 1))) % steps;
    });

    return {
      id: room.id + (ri + 1),
      room: room.id,
      roomIndex: ROOMS.indexOf(room),
      index: ri,
      name: room.names[ri],
      cols: cols, rows: rows, n: n,
      kind: kinds,
      cur: cur,
      sol: sols,
      src: src,
      drain: drain,
      outDir: outDir,
      route: route.map(function (p) { return p.i; }),
      changes: scramble.length,
      forks: forks,
      oneways: oneways,
      parSec: Math.round(4 + route.length * 1.1 + forks * 2.4 + oneways * 1.2)
    };
  }

  /* A fork is a detour out of route[i] and back into route[j]. The preferred
   * shape is two cells, because it reads as a proper loop of pipe; a one-cell
   * detour is the fallback, and it only exists where the route doubles back past
   * an empty corner. Either way every port is accounted for, which is what makes
   * a fork safe: there is no way to cap a branch in this game, so both halves
   * have to find the drain. */
    /* A tee pushes out of every port except the one the water arrived through.
   * So when the fork's detour reaches the tee first, the tee pushes out of the
   * fork port, the ROUTE port going forwards, and the route port going
   * BACKWARDS. That backwards push walks up the route exactly the way the
   * forwards flow does — through every pipe that is open toward it — and an
   * arrow on that walk is hit head-on.
   *
   * This walks that reach: start one cell upstream of the tee, and keep going
   * backwards while the current cell both receives the push and re-emits it
   * onwards. Cells are marked in `backPush` so the caller can ask about any
   * route index in O(1). */
  /* A burst is not "the cell in front of the tee" — it is wherever the backwards
   push eventually lands on something that will not take water. And the push does
   not travel in a straight line: it turns at every bend and spreads out of all
   of a pipe's ports except the one the water came in through, which is the same
   rule the engine applies forwards.
   *
   * So this mirrors that rule exactly, seeded from each fork tee as though the
   * detour had arrived first. Visited state is the (cell, incoming port) PAIR,
   * because the port skipped depends on which side the water arrived from.
   * Every cell this flood reaches is marked, including the ones that REFUSE —
   * those are precisely the cells where a burst happens, and they are the ones
   * an arrow must never be allowed to occupy. */
  function floodPush(kinds, sols, cols, rows, startCell, inD, backPush, at) {
    var stack = [[startCell, inD]];
    var seen = {};
    while (stack.length) {
      var top = stack.pop();
      var cell = top[0], from = top[1];
      var key = cell * 8 + from;
      if (seen[key]) continue;
      seen[key] = 1;
      var outs = G.outletDirs(kinds[cell], sols[cell]);
      for (var o = 0; o < outs.length; o++) {
        var d = outs[o];
        if (d === from) continue;
        var nb = G.neighbor(cell, d, cols, rows);
        if (nb < 0) continue;
        if (!G.isOpenToward(kinds[nb], sols[nb], G.opposite(d))) {
          /* This cell is hit head-on. That is a burst, so it is forbidden. */
          markAt(at, nb, backPush);
          continue;
        }
        markAt(at, nb, backPush);
        stack.push([nb, G.opposite(d)]);
      }
    }
  }

  /* Which route index is each cell, so the flood can mark route slots directly.
   * -1 for anything that is not on the route. `route` is the flat array of cell
   * indices that a level carries — not the richer {i, in, out} records the
   * builder threads around, which is why this indexes `route[i]` directly. */
  function routeSlots(route) {
    var at = {};
    for (var i = 0; i < route.length; i++) at[route[i]] = i;
    return function (cell) { return at[cell] === undefined ? -1 : at[cell]; };
  }

  /* Marks every route cell the backwards push can reach, including the cells it
   * reaches head-on. `at` is the lookup from routeSlots — call it, do not index
   * it. */
  function markAt(at, cell, backPush) {
    var idx = at(cell);
    if (idx >= 0) backPush[idx] = 1;
  }

  /* For every tee, ask "if the detour won the race, what would this push hit?"
   * and forbid all of it. Each tee is tried from all three of its outlets as the
   * presumed arrival side, so the result is a superset of any single ordering —
   * the levels are deterministic, so being conservative here costs nothing. */
  function markBackPush(route, kinds, sols, cols, rows) {
    var backPush = new Uint8Array(route.length);
    var at = routeSlots(route);
    for (var i = 0; i < route.length; i++) {
      var cell = route[i];
      if (kinds[cell] !== G.TEE) continue;
      var outs = G.outletDirs(kinds[cell], sols[cell]);
      for (var o = 0; o < outs.length; o++) {
        floodPush(kinds, sols, cols, rows, cell, G.opposite(outs[o]), backPush, at);
      }
    }
    return backPush;
  }

  function placeFork(r, cols, rows, route, i, kinds, sols, taken, free, forked, spans) {
    var A = route[i].i;
    if (forked[A] || kinds[A] === G.TEE || kinds[A] === G.ONEWAY) return false;
    return detour(r, cols, rows, route, i, kinds, sols, taken, free, forked, spans, 2) ||
           detour(r, cols, rows, route, i, kinds, sols, taken, free, forked, spans, 1);
  }

  function detour(r, cols, rows, route, i, kinds, sols, taken, free, forked, spans, span) {
    var A = route[i].i;
    var jump = span === 2 ? 3 : 2;
    for (var j = i + jump; j <= i + jump + 1 && j <= route.length - 1; j++) {
      var B = route[j].i;
      if (forked[B] || kinds[B] === G.TEE || kinds[B] === G.ONEWAY) continue;
      for (var d = 0; d < 4; d++) {
        if (d === route[i].in || d === route[i].out) continue;
        var b1 = G.neighbor(A, d, cols, rows);
        if (b1 < 0 || !free[b1] || taken[b1]) continue;
        if (span === 1) {
          /* One cell touching both ends: only possible when the route doubles
           * back, so B has to sit two steps along. */
          if (j !== i + 2) continue;
          var bDir = stepDir(b1, B, cols);
          if (bDir < 0) continue;
          var teeA1 = G.rotForPorts(G.TEE, [route[i].in, route[i].out, d]);
          var teeB1 = G.rotForPorts(G.TEE, [route[j].in, route[j].out, G.opposite(bDir)]);
          var km = kindForPorts(G.opposite(d), bDir);
          if (teeA1 < 0 || teeB1 < 0 || km < 0) continue;
          kinds[A] = G.TEE; sols[A] = teeA1;
          kinds[B] = G.TEE; sols[B] = teeB1;
          kinds[b1] = km; sols[b1] = G.rotForPorts(km, [G.opposite(d), bDir]);
          taken[b1] = 1; free[b1] = 0;
          forked[A] = 1; forked[B] = 1; forked[b1] = 1;
          spans.push([i, j]);
          return true;
        }
        for (var e = 0; e < 4; e++) {
          if (e === route[j].in || e === route[j].out) continue;
          /* e is the direction FROM B TO b2, which is the port B exposes to it. */
          var b2 = G.neighbor(B, e, cols, rows);
          if (b2 < 0 || !free[b2] || taken[b2] || b2 === A || b2 === b1) continue;
          var g = stepDir(b1, b2, cols);
          if (g < 0 || g === G.opposite(d)) continue;
          var teeA = G.rotForPorts(G.TEE, [route[i].in, route[i].out, d]);
          var teeB = G.rotForPorts(G.TEE, [route[j].in, route[j].out, e]);
          if (teeA < 0 || teeB < 0) continue;
          var k1 = kindForPorts(G.opposite(d), g);
          var k2 = kindForPorts(G.opposite(g), G.opposite(e));
          if (k1 < 0 || k2 < 0) continue;
          kinds[A] = G.TEE; sols[A] = teeA;
          kinds[B] = G.TEE; sols[B] = teeB;
          kinds[b1] = k1; sols[b1] = G.rotForPorts(k1, [G.opposite(d), g]);
          kinds[b2] = k2; sols[b2] = G.rotForPorts(k2, [G.opposite(g), G.opposite(e)]);
          taken[b1] = 1; taken[b2] = 1; free[b1] = 0; free[b2] = 0;
          forked[A] = 1; forked[B] = 1; forked[b1] = 1; forked[b2] = 1;
          spans.push([i, j]);
          return true;
        }
      }
    }
    return false;
  }

  /* All 24 levels, built once at load from fixed seeds.
   * Rooms promise a difficulty arc — "the Basement's last level has three
   * forks", "the Garden's last level has three arrows" — and those promises are
   * only claims about what the level IS. A fork needs two free cells beside a
   * corner plus a matching free cell further along the route, and a given
   * carved route often has nowhere to put them, so a fixed seed silently
   * under-delivers: garden8 asked for three forks and got none, which left the
   * Garden's climax teaching nothing it had not already taught.
   *
   * So the seed is a starting point, not the answer. Walk a deterministic
   * family of seeds per level and keep the one that gets closest to the room's
   * promised fork and arrow counts. Still fully deterministic — the same
   * levels come out on every machine, in node and in the browser — but the arc
   * is now guaranteed rather than hoped for.
   *
   * "Closest" rather than "first that matches", because the promise is not
   * always reachable. The Garden's last level asks for three forks AND three
   * arrows; across four hundred seeds the best any route manages is three forks
   * and two arrows, since a fork and an arrow both need free cells beside the
   * same short route. Falling back to the first seed handed back a level with
   * NO forks at all, so the finale taught nothing. Scoring every candidate and
   * keeping the best turns an unreachable promise into a graceful one. */
  var SEED_BASE = 0x5A17C0DE;
  var SEED_STRIDE = 7919;
  var SEED_ATTEMPTS = 64;

  /* How well a candidate serves the room's promise. Meeting both counts is the
   * goal; short of that, every fork and every arrow is worth the same, so the
   * best candidate is the one that lost least. */
  function seedScore(level, wantForks, wantOneways) {
    if (level.forks >= wantForks && level.oneways >= wantOneways) return 1e9;
    return Math.min(level.forks, wantForks) + Math.min(level.oneways, wantOneways);
  }

  function buildRoomLevel(room, ri, li) {
    var base = SEED_BASE + ri * 977 + li * 31;
    var wantForks = room.forks[li];
    var wantOneways = room.oneways[li];
    var best = null;
    var bestScore = -1;
    for (var attempt = 0; attempt < SEED_ATTEMPTS; attempt++) {
      var level;
      try { level = buildLevel(base + attempt * SEED_STRIDE, room, li); }
      catch (e) { continue; }
      var score = seedScore(level, wantForks, wantOneways);
      if (score > bestScore) { bestScore = score; best = level; }
      if (score >= 1e9) return level;
    }
    return best;
  }

  var LEVELS = [];
  for (var ri = 0; ri < ROOMS.length; ri++) {
    for (var li = 0; li < 8; li++) {
      LEVELS.push(buildRoomLevel(ROOMS[ri], ri, li));
    }
  }

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }
  function levelIndex(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i;
    return -1;
  }
  function levelsOfRoom(roomId) {
    return LEVELS.filter(function (l) { return l.room === roomId; });
  }

  global.WWData = {
    TUNE: TUNE,
    ROOMS: ROOMS,
    LEVELS: LEVELS,
    levelById: levelById,
    levelIndex: levelIndex,
    levelsOfRoom: levelsOfRoom,
    rng: rng
  };
})(typeof window !== 'undefined' ? window : globalThis);
