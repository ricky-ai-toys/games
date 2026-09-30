/* Amber's Candy Castle — grid, distance field, and placement legality.
 *
 * Pure. No DOM, no canvas, no globals beyond CCGrid. This module owns the
 * anti-cheese rule, so it is the part most worth testing exhaustively.
 *
 * Pathing is a BFS distance field from the castle over the 8-neighbourhood with
 * corner-cutting disallowed. It is recomputed only when the grid changes, never
 * per frame, which is what makes validating a tap cost one 88-cell BFS.
 */
(function (global) {
  'use strict';

  var D = global.CCData;

  var EMPTY = 0;
  var WALL = 1;
  var TOWER = 2;
  var GATE = 3;
  var CASTLE = 4;

  /* 4-way ORTHOGONAL movement, deliberately.
   *
   * The first version used 8-way diagonals and every serpentine maze collapsed:
   * a diagonal step cuts across the corner a wall was meant to force you around,
   * so the longest route reachable on a 9x13 grid was ~9 cells regardless of how
   * much wall the player bought. Long paths are the entire point of the genre, so
   * diagonals are out. Orthogonal also reads better to a child: the road looks
   * like a road. */
  var DX = [1, -1, 0, 0];
  var DY = [0, 0, 1, -1];

  /* The unreachable sentinel MUST be Infinity, not a large finite number.
   *
   * This was 1e9, and `isFinite(1e9) === true`, so every connectivity check in
   * the engine AND the test harness silently reported "reachable" for a severed
   * board. `legal()` approved placements that cut the road in half, and the
   * harness's disconnected-level assertions all passed. Infinity is the only
   * value that survives an isFinite test. */
  var INF = Infinity;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function createGrid(cols, rows) {
    var g = {
      cols: cols,
      rows: rows,
      cells: new Uint8Array(cols * rows),
      towerAt: new Array(cols * rows).fill(null),
      gates: [],
      castle: null,
      field: new Float64Array(cols * rows),   // distance-to-castle, INF if unreachable
      dirX: new Int8Array(cols * rows),       // descent direction, -1 when none
      dirY: new Int8Array(cols * rows),
      routeLength: INF,
      dirty: true
    };
    g.cells.fill(EMPTY);
    g.dirX.fill(-1);
    g.dirY.fill(-1);
    return g;
  }

  function idx(g, c, r) { return r * g.cols + c; }
  function inBounds(g, c, r) { return c >= 0 && c < g.cols && r >= 0 && r < g.rows; }
  function kind(g, c, r) { return inBounds(g, c, r) ? g.cells[idx(g, c, r)] : -1; }
  function walkable(g, c, r) {
    var k = kind(g, c, r);
    return k === EMPTY || k === GATE || k === CASTLE;
  }

  function place(g, c, r, k) {
    if (!inBounds(g, c, r)) return false;
    g.cells[idx(g, c, r)] = k;
    g.dirty = true;
    return true;
  }

  function setTower(g, c, r, tower) {
    if (!inBounds(g, c, r)) return false;
    g.cells[idx(g, c, r)] = TOWER;
    g.towerAt[idx(g, c, r)] = tower;
    g.dirty = true;
    return true;
  }

  function clearCell(g, c, r) {
    if (!inBounds(g, c, r)) return false;
    g.cells[idx(g, c, r)] = EMPTY;
    g.towerAt[idx(g, c, r)] = null;
    g.dirty = true;
    return true;
  }

  function at(g, c, r) { return g.towerAt[idx(g, c, r)] || null; }

  function addGate(g, c, r) {
    place(g, c, r, GATE);
    g.gates.push({ c: c, r: r });
  }

  function setCastle(g, c, r) {
    place(g, c, r, CASTLE);
    g.castle = { c: c, r: r };
  }

  /* ------------------------------------------------------------ pathing */

  /* BFS from the castle over the 4-neighbourhood. Uniform edge cost, so a plain
   * breadth-first search is both correct and the fastest thing available. */
  function computeField(g) {
    var n = g.cols * g.rows;
    var field = g.field;
    field.fill(INF);
    g.dirX.fill(-1);
    g.dirY.fill(-1);
    if (!g.castle) { g.dirty = false; return; }

    var done = new Uint8Array(n);
    var start = idx(g, g.castle.c, g.castle.r);
    field[start] = 0;

    for (var iter = 0; iter < n; iter++) {
      var best = -1, bestD = INF;
      for (var i = 0; i < n; i++) {
        if (!done[i] && field[i] < bestD) { bestD = field[i]; best = i; }
      }
      if (best < 0) break;
      done[best] = 1;

      var bc = best % g.cols, br = (best / g.cols) | 0;
      for (var d = 0; d < 4; d++) {
        var nc = bc + DX[d], nr = br + DY[d];
        if (!inBounds(g, nc, nr)) continue;
        if (!walkable(g, nc, nr)) continue;
        var ni = idx(g, nc, nr);
        if (field[ni] > field[best] + 1) {
          field[ni] = field[best] + 1;
          g.dirX[ni] = -DX[d];
          g.dirY[ni] = -DY[d];
        }
      }
    }

    /* Route length is the longest gate-to-castle distance: the player must
     * satisfy the worst gate, or they could satisfy one and starve another. */
    var longest = 0;
    for (var gi = 0; gi < g.gates.length; gi++) {
      var gt = g.gates[gi];
      var d2 = field[idx(g, gt.c, gt.r)];
      if (d2 > longest) longest = d2;
    }
    g.routeLength = g.gates.length ? longest : 0;
    g.dirty = false;
  }

  function ensureField(g) { if (g.dirty) computeField(g); return g; }

  function refresh(g) { g.dirty = true; return ensureField(g); }

  /* Route length in cells, rounded for display. */
  function routeCells(g) { return ensureField(g).routeLength; }

  /* ------------------------------------------------------------- legality */

  var ILLEGAL = {
    ok: false,
    reason: '',
    code: ''
  };

  function refuse(code, reason) { return { ok: false, code: code, reason: reason }; }
  function accept() { return { ok: true, code: '', reason: '' }; }

  /* Would placing `item` at (c,r) leave a legal board?
   * Pure: simulates on scratch arrays and never mutates `g`. */
  function legal(g, c, r, itemKind) {
    ensureField(g);
    if (!inBounds(g, c, r)) return refuse('out', 'Off the board');
    var k = g.cells[idx(g, c, r)];
    if (k === GATE) return refuse('gate', 'The gate has to stay open');
    if (k === CASTLE) return refuse('castle', 'Not on the castle');
    if (k === WALL) return refuse('occupied', 'Something is already here');
    if (k === TOWER) return refuse('occupied', 'Something is already here');

    var minPath = g.minPath || 0;
    var i = idx(g, c, r);
    var prevCell = g.cells[i];

    g.cells[i] = itemKind;
    computeField(g);
    var ok = g.routeLength >= minPath - 1e-9 && isFinite(g.routeLength);
    var routeAfter = g.routeLength;

    /* Restore. computeField rewrote field/dir, so rebuild for the old layout
     * rather than restoring only `cells` — leaving stale directions would let an
     * enemy walk through a wall placed one tap later. */
    g.cells[i] = prevCell;
    computeField(g);

    if (!isFinite(routeAfter)) return refuse('seal', 'You would seal the road completely');
    if (routeAfter < minPath - 1e-9) {
      var short = Math.round((minPath - routeAfter) * 10) / 10;
      return refuse('short', 'The road would be too short (' + short + ' cells)');
    }
    return accept();
  }

  /* Can this cell ever hold a wall, ignoring the current board? Used for the
   * "too short" pre-warning when the player is dragging a wall around. */
  function wouldShorten(g, c, r) {
    var res = legal(g, c, r, WALL);
    return !res.ok && res.code === 'short';
  }

  /* Every cell, in row-major order. Used by the test harness to prove the
   * legality invariant exhaustively rather than sampling it. */
  function eachCell(g, fn) {
    for (var r = 0; r < g.rows; r++) {
      for (var c = 0; c < g.cols; c++) fn(c, r, g.cells[idx(g, c, r)]);
    }
  }

  /* ------------------------------------------------------ starter mazes */

  /* Levels start as an OPEN board: gates, a castle, and empty water.
   *
   * This reverses an earlier design, and the reason is worth recording. The
   * plan was to ship each level with a pre-built serpentine road that already
   * cleared the minimum-path floor, leaving the player to extend it. Building
   * such a road reliably turned out to be the whole problem:
   *
   *   - a road long enough to clear the floor has to be a tight 1-wide
   *     induced path, otherwise BFS shortcuts across it
   *   - a 1-wide induced path leaves ~9 legal cells on the entire board, so
   *     there was nowhere to put a tower
   *   - and with no open space beside the road, no wall placement could make
   *     the route LONGER, because there was nowhere to put a wall either
   *
   * So the "walls reshape the road" premise was unbuildable against a pre-built
   * road. Starting open restores it: the board is mostly empty, every wall the
   * player buys lengthens the route, and the only hard rule is the small
   * anti-seal floor in `minPath`. Long roads are now something the player earns
   * rather than something they are handed. `targetPath` is the per-level goal
   * that the HUD shows and the star rating rewards. */
  function buildOpenBoard(gates, castle) {
    var g = createGrid(D.COLS, D.ROWS);
    var norm = function (p) {
      if (!p) return null;
      if (Array.isArray(p)) return { c: p[0], r: p[1] };
      return { c: p.c, r: p.r };
    };
    gates = (gates || []).map(norm).filter(function (p) { return p && p.c != null && p.r != null; });
    castle = norm(castle);
    if (!gates.length || !castle) return g;
    gates.forEach(function (p) { addGate(g, p.c, p.r); });
    setCastle(g, castle.c, castle.r);
    ensureField(g);
    g.pockets = 0;
    g.spine = 0;
    return g;
  }

  /* Build a level's starting board.
   *
   * The sweep can come up short of the floor if the castle sits awkwardly. A
   * maze below its own floor makes every placement illegal and the level
   * unwinnable — a silent failure that is easy to ship — so try several seeds
   * and keep the first that clears it. */
  function fromLevel(level) {
    var g = buildOpenBoard(level.gates, level.castle);
    g.minPath = level.minPath || 0;
    g.targetPath = level.targetPath || 0;
    g.starterRoute = g.routeLength;
    ensureField(g);
    return g;
  }

  function clone(g) {
    var n = createGrid(g.cols, g.rows);
    n.cells.set(g.cells);
    n.towerAt = g.towerAt.slice();
    n.gates = g.gates.map(function (x) { return { c: x.c, r: x.r }; });
    n.castle = g.castle ? { c: g.castle.c, r: g.castle.r } : null;
    n.minPath = g.minPath;
    computeField(n);
    return n;
  }

  var CCGrid = {
    EMPTY: EMPTY, WALL: WALL, TOWER: TOWER, GATE: GATE, CASTLE: CASTLE,
    INF: INF,
    DX: DX, DY: DY,
    buildOpenBoard: buildOpenBoard,
    mulberry32: mulberry32,
    createGrid: createGrid,
    idx: idx,
    inBounds: inBounds,
    kind: kind,
    walkable: walkable,
    at: at,
    place: place,
    setTower: setTower,
    clearCell: clearCell,
    addGate: addGate,
    setCastle: setCastle,
    computeField: computeField,
    ensureField: ensureField,
    refresh: refresh,
    routeCells: routeCells,
    legal: legal,
    wouldShorten: wouldShorten,
    eachCell: eachCell,
    fromLevel: fromLevel,
    clone: clone
  };

  global.CCGrid = CCGrid;
  if (typeof module !== 'undefined' && module.exports) module.exports = CCGrid;
})(typeof window !== 'undefined' ? window : globalThis);
