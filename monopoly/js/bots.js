/* Amber's Boardwalk — bot brains.
 * Tiny heuristics with a pinch of personality. Exposes window.MPBots.
 */
(function (global) {
  'use strict';

  var D = global.MPData;

  var MPBots = {};

  // Should the bot pay $1 to hop out of Time-out?
  MPBots.decideTimeout = function (state, pid) {
    var p = state.players[pid];
    if (!p || p.skipTurns <= 0) return 'sit';
    return p.cash >= D.TIMEOUT_LEAVE_COST + p.reserve ? 'leave' : 'sit';
  };

  // Buy an unowned property?
  MPBots.wantsBuy = function (state, pid) {
    var p = state.players[pid];
    if (!state.pending || state.pending.kind !== 'buy') return false;
    var sp = global.MPRules.spaceAt(state.pending.pos);
    if (p.cash < sp.price) return false;
    if (p.lovesSets && global.MPRules.ownsFullGroupAfterBuy(state, pid, state.pending.pos)) return true;
    return (p.cash - sp.price) >= (p.reserve != null ? p.reserve : D.BOT_RESERVE);
  };

  // Add a star at the offered spot?
  MPBots.wantsStar = function (state, pid) {
    var p = state.players[pid];
    if (!state.pending || state.pending.kind !== 'star') return false;
    return (p.cash - state.pending.cost) >= (p.reserve != null ? p.reserve : D.BOT_RESERVE);
  };

  global.MPBots = MPBots;
  if (typeof module !== 'undefined' && module.exports) module.exports = MPBots;
})(typeof window !== 'undefined' ? window : globalThis);
