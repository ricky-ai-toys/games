/* Amber's Water Works — tile vocabulary.
 *
 * Pure geometry shared by the level generator, the engine, and the node test
 * harness: direction maths, per-tile port masks, and rotation steps. No DOM, no
 * canvas, no game state — so every level invariant can be proved headlessly.
 *
 * A tile is a (kind, rot) pair. Its mask is 4 bits: bit d set means the tile
 * has an opening facing direction d. Water hops between cells, and a hop is
 * legal only when BOTH tiles have a port facing each other. That single rule is
 * the whole game: a filled pipe's every open port must lead somewhere that
 * leads somewhere that reaches the drain, or it sprays.
 */
(function (global) {
  'use strict';

  /* Directions: 0=N 1=E 2=S 3=W. */
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var DIR_NAME = ['N', 'E', 'S', 'W'];

  var EMPTY = 0;
  var STRAIGHT = 1;
  var ELBOW = 2;
  var TEE = 3;
  var CROSS = 4;
  var SOURCE = 5;
  var DRAIN = 6;
  var WALL = 7;
  var ONEWAY = 8;
  var KIND_COUNT = 9;

  /* Authoring legend. The generator speaks in these characters. */
  var FROM_CHAR = {
    '.': EMPTY, ' ': EMPTY,
    '-': STRAIGHT, 'L': ELBOW, 'T': TEE, '+': CROSS,
    'S': SOURCE, 'D': DRAIN, '#': WALL, '>': ONEWAY
  };
  var TO_CHAR = ['.', '-', 'L', 'T', '+', 'S', 'D', '#', '>'];

  /* How many DISTINCT rotations a tap cycles through. A straight pipe has 2
   * (N-S and E-W); an elbow or tee has 4; a cross, wall, one-way, tap and
   * drain have 1 and are never rotatable. */
  var ROT_STEPS = [1, 2, 4, 4, 1, 1, 1, 1, 1];

  /* Port mask at rot 0: straight N|S, elbow N|E, tee N|E|S, cross all four. */
  var BASE_MASK = [0, 0b0101, 0b0011, 0b0111, 0b1111, 0b1111, 0b1111, 0, 0b0101];

  function bit(d) { return 1 << (d & 3); }
  function opposite(d) { return (d + 2) & 3; }
  function sign(d) { return DX[d & 3] + ',' + DY[d & 3]; }

  /* The four ports a tile exposes, as a bit mask.
   * ONEWAY is a straight whose rot is its OUTLET direction, so its ports are
   * the outlet and the tail opposite it. SOURCE and DRAIN are fat bodies that
   * accept from every side, which is what lets a stray loop re-enter the tap
   * harmlessly instead of spraying. */
  function maskOf(kind, rot) {
    if (kind === EMPTY || kind === WALL) return 0;
    if (kind === SOURCE || kind === DRAIN) return 0b1111;
    if (kind === ONEWAY) return bit(rot) | bit(opposite(rot));
    var base = BASE_MASK[kind];
    var m = 0;
    for (var i = 0; i < 4; i++) if (base & (1 << i)) m |= 1 << ((i + rot) & 3);
    return m;
  }

  /* Does this tile have an opening facing the neighbour that lies in direction
   * d FROM it? So d is where the neighbour sits, not the way the water is
   * travelling: at the receiving tile the caller passes the reverse of the hop. */
  function isOpenToward(kind, rot, d) {
    if (kind === EMPTY || kind === WALL) return false;
    if (kind === SOURCE || kind === DRAIN) return true;
    if (kind === ONEWAY) return d === opposite(rot);
    return (maskOf(kind, rot) & bit(d)) !== 0;
  }

  /* The directions a filled tile pushes water toward. A ONEWAY only ever
   * pushes out of its head, so water can never be pushed back down a one-way. */
  function outletDirs(kind, rot) {
    if (kind === EMPTY || kind === WALL) return [];
    if (kind === SOURCE) return [rot & 3];
    if (kind === DRAIN) return [];
    if (kind === ONEWAY) return [rot & 3];
    var m = maskOf(kind, rot);
    var out = [];
    for (var i = 0; i < 4; i++) if (m & (1 << i)) out.push(i);
    return out;
  }

  /* The one direction a tile does NOT open toward, or -1 if that is not a
   * single direction. Every 3-port tile is a tee, so this is the side a tee
   * leaves closed — the one safe direction to face a wall. */
  function closedDir(kind, rot) {
    if (kind !== TEE) return -1;
    return (rot + 3) & 3;
  }

  function isRotatable(kind) { return kind >= 0 && kind < KIND_COUNT && ROT_STEPS[kind] > 1; }
  function rotate(kind, rot) { return (rot + 1) % ROT_STEPS[kind]; }

  /* The rotation index that puts a tile's ports on a given set of directions.
   * Any three distinct directions are a legal tee, which is what lets the
   * generator bolt a branch onto a route cell that was going to be a straight
   * or an elbow. Returns -1 when the set is not representable. */
  function rotForPorts(kind, ports) {
    var m = 0;
    for (var i = 0; i < ports.length; i++) m |= bit(ports[i]);
    for (var r = 0; r < ROT_STEPS[kind]; r++) {
      if (maskOf(kind, r) === m) return r;
    }
    return -1;
  }

  function index(x, y, cols) { return y * cols + x; }
  function xOf(i, cols) { return i % cols; }
  function yOf(i, cols) { return (i / cols) | 0; }
  function inBounds(x, y, cols, rows) { return x >= 0 && y >= 0 && x < cols && y < rows; }

  /* Neighbour index in direction d, or -1 when that step leaves the grid. */
  function neighbor(i, d, cols, rows) {
    var x = xOf(i, cols) + DX[d & 3];
    var y = yOf(i, cols) + DY[d & 3];
    if (!inBounds(x, y, cols, rows)) return -1;
    return index(x, y, cols);
  }

  function dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }

  var WWGrid = {
    DX: DX, DY: DY, DIR_NAME: DIR_NAME, sign: sign,
    EMPTY: EMPTY, STRAIGHT: STRAIGHT, ELBOW: ELBOW, TEE: TEE, CROSS: CROSS,
    SOURCE: SOURCE, DRAIN: DRAIN, WALL: WALL, ONEWAY: ONEWAY, KIND_COUNT: KIND_COUNT,
    FROM_CHAR: FROM_CHAR, TO_CHAR: TO_CHAR, ROT_STEPS: ROT_STEPS,
    bit: bit, opposite: opposite,
    maskOf: maskOf, isOpenToward: isOpenToward, outletDirs: outletDirs, closedDir: closedDir,
    isRotatable: isRotatable, rotate: rotate, rotForPorts: rotForPorts,
    index: index, xOf: xOf, yOf: yOf, inBounds: inBounds, neighbor: neighbor, dist: dist
  };

  global.WWGrid = WWGrid;
})(typeof window !== 'undefined' ? window : globalThis);
