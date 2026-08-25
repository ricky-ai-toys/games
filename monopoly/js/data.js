/* Amber's Boardwalk — board, cards & persona data
 * Plain script (file:// safe). Exposes window.MPData; module.exports for node tests.
 */
(function (global) {
  'use strict';

  var MPData = {};

  // ---------- Tunables ----------
  MPData.START_CASH = 20;
  MPData.PASS_START_REWARD = 2;
  MPData.MAX_STARS = 3;
  MPData.ROUND_LIMIT = 30;
  MPData.TIMEOUT_POS = 6;          // Time-out Corner tile id
  MPData.TIMEOUT_LEAVE_COST = 1;   // pay $1 to skip serving time
  MPData.MAX_EXTRA_ROLLS = 2;      // bonus rolls from doubles
  MPData.BOT_RESERVE = 2;          // bots keep this much cash after purchases

  // ---------- Color groups ----------
  MPData.GROUPS = {
    treats:   { name: 'Treats',   color: '#ff8ab0', starCost: 2 },
    critters: { name: 'Critters', color: '#7cd992', starCost: 3 },
    funzone:  { name: 'Fun Zone', color: '#6fb6ff', starCost: 4 },
    town:     { name: 'Town',     color: '#c79bff', starCost: 5 }
  };
  MPData.GROUP_ORDER = ['treats', 'critters', 'funzone', 'town'];

  // ---------- Board: 24 tiles on a 7x7 grid ----------
  // Grid coords are 0-indexed {r,c}. Loop runs clockwise from bottom-left.
  // rent = [base, star1, star2, star3]
  function prop(id, name, emoji, group, price, rent, r, c) {
    return { type: 'property', id: id, name: name, emoji: emoji, group: group,
             price: price, rent: rent, r: r, c: c };
  }

  var BOARD = [
    { type: 'start',    id: 0,  name: 'START!',            emoji: '\uD83C\uDF89', r: 6, c: 0 },
    prop(1,  'Ice Cream Stand', '\uD83C\uDF66', 'treats',   2, [1, 2, 4, 6],  6, 1),
    prop(2,  'Candy Cart',      '\uD83C\uDF6C', 'treats',   2, [1, 2, 4, 6],  6, 2),
    prop(3,  'Donut Den',       '\uD83C\uDF69', 'treats',   3, [1, 3, 5, 8],  6, 3),
    prop(4,  'Cupcake Caf\u00E9','\uD83E\uDDC1', 'treats',   3, [2, 4, 6, 9],  6, 4),
    { type: 'oops',     id: 5,  name: 'Lost Lunch Money',  emoji: '\uD83D\uDCB8', fine: 1, msg: 'You dropped your lunch money! Pay $1.', r: 6, c: 5 },
    { type: 'timeout',  id: 6,  name: 'Time-out Corner',   emoji: '\u23F0', r: 6, c: 6 },
    prop(7,  'Puppy Park',      '\uD83D\uDC36', 'critters', 3, [1, 3, 6, 10], 5, 6),
    prop(8,  'Kitten Caf\u00E9', '\uD83D\uDC31', 'critters', 3, [2, 4, 7, 11], 4, 6),
    prop(9,  'Bunny Burrow',    '\uD83D\uDC30', 'critters', 4, [2, 4, 8, 12], 3, 6),
    prop(10, 'Pony Paddock',    '\uD83D\uDC34', 'critters', 4, [2, 5, 9, 14], 2, 6),
    { type: 'surprise', id: 11, name: 'Surprise!',         emoji: '\uD83C\uDF81', r: 1, c: 6 },
    { type: 'parking',  id: 12, name: 'Picnic Spot',       emoji: '\uD83E\uDDFA', r: 0, c: 6 },
    prop(13, 'Arcade Alley',    '\uD83D\uDD79\uFE0F', 'funzone', 4, [2, 5, 10, 15], 0, 5),
    prop(14, 'Swimming Pool',   '\uD83C\uDFCA', 'funzone', 4, [2, 5, 10, 16], 0, 4),
    prop(15, 'Movie Matinee',   '\uD83C\uDFAC', 'funzone', 5, [3, 6, 12, 18], 0, 3),
    prop(16, 'Roller Rink',     '\uD83D\uDEFC', 'funzone', 5, [3, 6, 12, 18], 0, 2),
    { type: 'oops',     id: 17, name: 'Book Fair Day',     emoji: '\uD83D\uDCD6', fine: 2, msg: 'Book fair! You just had to buy one. Pay $2.', r: 0, c: 1 },
    { type: 'gotojail', id: 18, name: 'Go To Time-out!',   emoji: '\uD83D\uDEA8', r: 0, c: 0 },
    prop(19, 'School House',    '\uD83C\uDFEB', 'town',    5, [3, 7, 13, 20], 1, 0),
    prop(20, 'Library Corner',  '\uD83D\uDCDA', 'town',    6, [4, 8, 15, 22], 2, 0),
    prop(21, 'Bakery Bench',    '\uD83E\uDD50', 'town',    6, [4, 8, 16, 24], 3, 0),
    prop(22, 'Fountain Square', '\u26F2',      'town',    7, [4, 9, 18, 27], 4, 0),
    { type: 'surprise', id: 23, name: 'Surprise!',         emoji: '\uD83C\uDF81', r: 5, c: 0 }
  ];
  MPData.BOARD = BOARD;
  MPData.BOARD_SIZE = BOARD.length; // 24
  MPData.GRID = 7;

  // ---------- Surprise cards ----------
  MPData.SURPRISE_CARDS = [
    { id: 'birthday',  icon: '\uD83C\uDF82', text: "It's your birthday! Collect $1 from every player.", kind: 'collectEach', amount: 1 },
    { id: 'coin',      icon: '\uD83E\uDE99', text: 'Found a shiny coin on the path! Collect $2.',        kind: 'bank', amount: 2 },
    { id: 'garden',    icon: '\uD83C\uDF31', text: 'You watered the school garden. Collect $1.',          kind: 'bank', amount: 1 },
    { id: 'truck',     icon: '\uD83D\uDEF5', text: 'Ice cream truck ride! Move to START and collect $2.', kind: 'moveTo', target: 0, collect: true },
    { id: 'shortcut',  icon: '\uD83C\uDF3C', text: 'Shortcut through the flowers! Go to Puppy Park.',     kind: 'moveTo', target: 7, collect: true },
    { id: 'castle',    icon: '\uD83C\uDFF0', text: 'Sandcastle contest winner! Collect $3.',              kind: 'bank', amount: 3 },
    { id: 'clouds',    icon: '\u2601\uFE0F', text: 'Cloud-watching day. You lose your next turn.',        kind: 'skip', turns: 1 },
    { id: 'snackline', icon: '\u23F0',       text: 'Cutting the snack line! Go straight to Time-out Corner.', kind: 'gotoTimeout' },
    { id: 'mitten',    icon: '\uD83E\uDDE4', text: 'Oh no, you lost your mitten. Pay $1.',                kind: 'bank', amount: -1 },
    { id: 'storytime', icon: '\uD83D\uDCDA', text: 'Story time! Move to Library Corner.',                 kind: 'moveTo', target: 20, collect: true },
    { id: 'bakesale',  icon: '\uD83E\uDD50', text: 'Bake sale helper! Collect $1.',                       kind: 'bank', amount: 1 },
    { id: 'hug',       icon: '\uD83E\uDD17', text: 'Free hug coupon! Everyone smiles. Nothing happens!',  kind: 'nothing' }
  ];

  // ---------- Players ----------
  MPData.PERSONAS = {
    amber: { key: 'amber', name: 'Amber', emoji: '\uD83E\uDD8A' },
    maple: { key: 'maple', name: 'Maple', emoji: '\uD83E\uDD89', reserve: 3 },
    finn:  { key: 'finn',  name: 'Finn',  emoji: '\uD83D\uDC26', reserve: 2 },
    pip:   { key: 'pip',   name: 'Pip',   emoji: '\uD83D\uDC30', reserve: 1, lovesSets: true }
  };

  global.MPData = MPData;
  if (typeof module !== 'undefined' && module.exports) module.exports = MPData;
})(typeof window !== 'undefined' ? window : globalThis);
