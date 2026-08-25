/* Amber's Boardwalk — pure game-rules engine.
 * No DOM access. Deterministic given a seed. Exposes window.MPRules;
 * module.exports for node tests.
 */
(function (global) {
  'use strict';

  var D = global.MPData;
  var MPRules = {};
  MPRules.VERSION = '1.0.0';

  // ---------- RNG (mulberry32) ----------
  function rand(state) {
    var s = state.rngState | 0;
    state.rngState = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle(state, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand(state) * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function ev(events, type, data) {
    var e = { type: type };
    for (var k in data) if (data.hasOwnProperty(k)) e[k] = data[k];
    events.push(e);
    return e;
  }
  function say(events, msg) { ev(events, 'log', { msg: msg }); }

  function spaceAt(pos) { return D.BOARD[((pos % D.BOARD_SIZE) + D.BOARD_SIZE) % D.BOARD_SIZE]; }

  function alivePlayers(state) {
    var out = [];
    for (var i = 0; i < state.players.length; i++) if (state.players[i].alive) out.push(state.players[i]);
    return out;
  }

  function currentPlayer(state) {
    return state.players[state.order[state.ptr]];
  }

  function findPlayer(state, pid) { return state.players[pid]; }

  // ---------- Money ----------
  // Full-payment-or-you're-out (board rent / fines). Receiver may be null (bank).
  function payFull(state, payerId, amount, receiverId, reason, events) {
    var p = findPlayer(state, payerId);
    if (!p || !p.alive || amount <= 0) return false;
    if (p.cash >= amount) {
      p.cash -= amount;
      if (receiverId != null) findPlayer(state, receiverId).cash += amount;
      ev(events, 'money', { pid: payerId, delta: -amount, reason: reason });
      return true;
    }
    // Can't pay: hand over what's left, go home broke.
    var leftover = p.cash;
    p.cash = 0;
    if (receiverId != null) findPlayer(state, receiverId).cash += leftover;
    p.alive = false;
    for (var pos in state.owned) {
      if (state.owned[pos].owner === payerId) delete state.owned[pos];
    }
    if (state.phase !== 'over' && currentPlayer(state) && currentPlayer(state).id === payerId) {
      state.pending = null;
      state.phase = 'idle';
      state.awaitingExtraRoll = false;
      state.extraRollsUsed = 0;
    }
    say(events, p.name + ' ran out of pocket money and went home! \uD83E\uDD72');
    ev(events, 'eliminated', { pid: payerId, creditor: receiverId });
    checkLastStanding(state, events);
    return false;
  }

  // Gentle penalty: pay what you have, never eliminates.
  function payGentle(state, payerId, amount, receiverId, reason, events) {
    var p = findPlayer(state, payerId);
    if (!p || !p.alive || amount <= 0) return false;
    var amt = Math.min(amount, p.cash);
    if (amt <= 0) return false;
    p.cash -= amt;
    if (receiverId != null) findPlayer(state, receiverId).cash += amt;
    ev(events, 'money', { pid: payerId, delta: -amt, reason: reason });
    return true;
  }

  function giveBank(state, pid, amount, reason, events) {
    var p = findPlayer(state, pid);
    if (!p || amount <= 0) return;
    p.cash += amount;
    ev(events, 'money', { pid: pid, delta: amount, reason: reason });
  }

  function netWorth(state, pid) {
    var p = findPlayer(state, pid);
    if (!p) return 0;
    var total = p.cash;
    for (var pos in state.owned) {
      var o = state.owned[pos];
      if (o.owner !== pid) continue;
      total += spaceAt(+pos).price + o.stars * D.GROUPS[spaceAt(+pos).group].starCost;
    }
    return total;
  }

  // ---------- Ownership helpers ----------
  function groupSpaces(groupId) {
    var out = [];
    for (var i = 0; i < D.BOARD.length; i++) if (D.BOARD[i].type === 'property' && D.BOARD[i].group === groupId) out.push(i);
    return out;
  }
  MPRules.groupSpaces = groupSpaces;

  function ownsFullGroup(state, pid, groupId) {
    var ids = groupSpaces(groupId);
    for (var i = 0; i < ids.length; i++) {
      var o = state.owned[ids[i]];
      if (!o || o.owner !== pid) return false;
    }
    return true;
  }

  function effectiveRent(state, pos) {
    var sp = spaceAt(pos), o = state.owned[pos];
    if (!o) return 0;
    var stars = Math.min(o.stars, D.MAX_STARS);
    var base = sp.rent[stars];
    if (stars === 0 && ownsFullGroup(state, o.owner, sp.group)) base *= 2;
    return base;
  }
  MPRules.effectiveRent = function (state, pos) { return effectiveRent(state, pos); };

  // First buildable spot for pid, or null.
  function starCandidate(state, pid) {
    var groups = D.GROUP_ORDER;
    for (var g = 0; g < groups.length; g++) {
      var gid = groups[g], meta = D.GROUPS[gid];
      if (!ownsFullGroup(state, pid, gid)) continue;
      var ids = groupSpaces(gid);
      for (var i = 0; i < ids.length; i++) {
        var o = state.owned[ids[i]];
        if (o.stars < D.MAX_STARS && findPlayer(state, pid).cash >= meta.starCost) {
          return { pos: ids[i], cost: meta.starCost };
        }
      }
    }
    return null;
  }

  // ---------- Movement ----------
  function walkTo(state, pid, steps, events) {
    var p = findPlayer(state, pid);
    for (var s = 0; s < steps; s++) {
      p.pos = (p.pos + 1) % D.BOARD_SIZE;
      if (p.pos === 0) {
        giveBank(state, pid, D.PASS_START_REWARD, 'pass-start', events);
        ev(events, 'passStart', { pid: pid, amount: D.PASS_START_REWARD });
      }
      ev(events, 'hop', { pid: pid, pos: p.pos });
    }
    ev(events, 'land', { pid: pid, pos: p.pos, name: spaceAt(p.pos).name });
  }

  function teleportForward(state, pid, target, collect, events) {
    var p = findPlayer(state, pid);
    while (p.pos !== target) {
      p.pos = (p.pos + 1) % D.BOARD_SIZE;
      ev(events, 'hop', { pid: pid, pos: p.pos });
      if (p.pos === 0 && collect) {
        giveBank(state, pid, D.PASS_START_REWARD, 'pass-start', events);
        ev(events, 'passStart', { pid: pid, amount: D.PASS_START_REWARD });
      }
    }
    ev(events, 'land', { pid: pid, pos: p.pos, name: spaceAt(p.pos).name });
  }

  function sendToTimeout(state, pid, events, why) {
    var p = findPlayer(state, pid);
    while (p.pos !== D.TIMEOUT_POS) {
      p.pos = (p.pos + 1) % D.BOARD_SIZE;
      ev(events, 'hop', { pid: pid, pos: p.pos });
    }
    p.skipTurns = 1;
    state.awaitingExtraRoll = false;
    say(events, p.name + ' is in Time-out Corner. \u23F0');
    ev(events, 'timeout', { pid: pid, reason: 'sent' });
  }

  // ---------- Cards ----------
  function drawCard(state, events) {
    if (state.deckPtr >= state.deck.length) {
      state.deck = shuffle(state, state.deckIdxs);
      state.deckPtr = 0;
    }
    var card = D.SURPRISE_CARDS[state.deck[state.deckPtr++]];
    ev(events, 'card', { icon: card.icon, text: card.text });
    return card;
  }

  function applyCard(state, pid, card, events) {
    var p = findPlayer(state, pid);
    switch (card.kind) {
      case 'bank':
        if (card.amount >= 0) giveBank(state, pid, card.amount, 'card', events);
        else payGentle(state, pid, -card.amount, null, 'card', events);
        break;
      case 'collectEach':
        var others = alivePlayers(state);
        var got = 0;
        for (var i = 0; i < others.length; i++) {
          var o = others[i];
          if (o.id === pid) continue;
          var gift = Math.min(card.amount, o.cash);
          if (gift > 0) { o.cash -= gift; got += gift; }
        }
        if (got > 0) {
          p.cash += got;
          ev(events, 'money', { pid: pid, delta: got, reason: 'birthday' });
          say(events, p.name + ' collected $' + got + ' from friends!');
        }
        break;
      case 'moveTo':
        teleportForward(state, pid, card.target, !!card.collect, events);
        if (p.alive) {
          resolveLanding(state, pid, p.pos, events, true);
          maybeOfferStar(state);
        }
        break;
      case 'skip':
        p.skipTurns += card.turns;
        say(events, p.name + ' will watch clouds next turn.');
        break;
      case 'gotoTimeout':
        sendToTimeout(state, pid, events);
        break;
      default:
        break; // 'nothing'
    }
  }

  // ---------- Landing ----------
  function resolveLanding(state, pid, pos, events, fromCard) {
    var p = findPlayer(state, pid);
    if (!p.alive) return;
    var sp = spaceAt(pos);
    switch (sp.type) {
      case 'property': {
        var o = state.owned[pos];
        if (!o) {
          if (p.cash >= sp.price) {
            state.pending = { kind: 'buy', pos: pos };
            state.phase = 'choice';
          } else {
            say(events, p.name + ' can\u2019t afford ' + sp.name + ' yet.');
          }
        } else if (o.owner === pid) {
          say(events, p.name + ' visits their own ' + sp.name + '. \u263A');
        } else {
          var rent = effectiveRent(state, pos);
          say(events, p.name + ' pays $' + rent + ' rent at ' + sp.name + '.');
          payFull(state, pid, rent, o.owner, 'rent', events);
          if (o.owner != null && state.owned[pos]) {
            ev(events, 'rentPaid', { from: pid, to: o.owner, amount: rent, pos: pos });
          }
        }
        break;
      }
      case 'surprise':
        applyCard(state, pid, drawCard(state, events), events);
        break;
      case 'oops':
        say(events, sp.msg.replace('You', p.name));
        payFull(state, pid, sp.fine, null, 'oops', events);
        break;
      case 'gotojail':
        sendToTimeout(state, pid, events);
        break;
      case 'start':
        say(events, p.name + ' is back at START! \uD83C\uDF89');
        break;
      case 'parking':
        say(events, p.name + ' enjoys a snack at the Picnic Spot. \uD83E\uDDFA');
        break;
      case 'timeout':
        say(events, p.name + ' is just visiting Time-out Corner.');
        break;
      default:
        break;
    }
    void fromCard;
  }

  // Offer a star build after a resolution (once per turn).
  function maybeOfferStar(state) {
    if (state.phase !== 'idle') return;
    var p = currentPlayer(state);
    if (!p || !p.alive || p.skipTurns > 0) return;
    var c = starCandidate(state, p.id);
    if (c) {
      state.pending = { kind: 'star', pos: c.pos, cost: c.cost };
      state.phase = 'choice';
    }
  }

  function checkLastStanding(state, events) {
    if (state.phase === 'over') return true;
    var alive = alivePlayers(state);
    if (alive.length === 1) {
      state.winner = alive[0].id;
      state.winReason = 'lastStanding';
      state.phase = 'over';
      say(events, alive[0].name + ' wins the Boardwalk! \uD83C\uDF89');
      ev(events, 'winner', { pid: alive[0].id, reason: 'lastStanding' });
      return true;
    }
    return false;
  }

  // ---------- Public API ----------
  MPRules.createGame = function (seats, seed) {
    if (!seats || seats.length < 2 || seats.length > 4) throw new Error('Boardwalk needs 2-4 players');
    var seen = {}, players = [];
    for (var i = 0; i < seats.length; i++) {
      var key = seats[i] && seats[i].key ? seats[i].key : 'amber';
      if (seen[key]) throw new Error('duplicate seat: ' + key);
      seen[key] = true;
      var persona = D.PERSONAS[key] || D.PERSONAS.amber;
      players.push({
        id: i, key: persona.key, name: persona.name, emoji: persona.emoji,
        isBot: !!(seats[i] && seats[i].isBot),
        reserve: persona.reserve || D.BOT_RESERVE,
        lovesSets: !!persona.lovesSets,
        cash: D.START_CASH, pos: 0, skipTurns: 0, alive: true
      });
    }
    var state = {
      players: players,
      order: players.map(function (p) { return p.id; }),
      ptr: 0,
      round: 1,
      phase: 'idle',
      pending: null,
      dice: null,
      awaitingExtraRoll: false,
      extraRollsUsed: 0,
      winner: null,
      winReason: null,
      deckIdxs: D.SURPRISE_CARDS.map(function (_, i) { return i; }),
      deck: [],
      deckPtr: 0,
      owned: {},
      rngState: (typeof seed === 'number' && isFinite(seed)) ? seed | 0 : 12345,
      log: []
    };
    state.deck = shuffle(state, state.deckIdxs);
    return state;
  };

  MPRules.spaceAt = spaceAt;
  MPRules.currentPlayer = currentPlayer;
  MPRules.netWorth = netWorth;
  MPRules.ownsFullGroup = ownsFullGroup;

  // Would buying pos complete its color group for pid?
  MPRules.ownsFullGroupAfterBuy = function (state, pid, pos) {
    var sp = spaceAt(pos);
    var ids = groupSpaces(sp.group);
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === pos) continue;
      var o = state.owned[ids[i]];
      if (!o || o.owner !== pid) return false;
    }
    return true;
  };

  MPRules.roll = function (state) {
    var events = [];
    if (state.phase === 'over' || state.phase === 'choice') return events;
    var p = currentPlayer(state);
    if (!p || !p.alive || p.skipTurns > 0) return events;

    var d1 = 1 + Math.floor(rand(state) * 6);
    var d2 = 1 + Math.floor(rand(state) * 6);
    state.dice = { d1: d1, d2: d2 };
    state.extraRollsUsed++;
    ev(events, 'roll', { pid: p.id, d1: d1, d2: d2, doubles: d1 === d2 });

    walkTo(state, p.id, d1 + d2, events);
    if (state.phase !== 'over') {
      resolveLanding(state, p.id, p.pos, events, false);
      maybeOfferStar(state);
    }

    var sentAway = p.pos === D.TIMEOUT_POS && p.skipTurns > 0;
    if (d1 === d2 && !sentAway && p.alive && state.extraRollsUsed <= D.MAX_EXTRA_ROLLS) {
      state.awaitingExtraRoll = true;
      ev(events, 'extraRoll', { pid: p.id });
      say(events, 'Doubles! ' + p.name + ' rolls again! \u2684');
    }
    return events;
  };

  MPRules.buy = function (state) {
    var events = [];
    if (!state.pending || state.pending.kind !== 'buy') return events;
    var p = currentPlayer(state), pos = state.pending.pos, sp = spaceAt(pos);
    if (!p || !p.alive || p.cash < sp.price) { state.pending = null; state.phase = 'idle'; return events; }
    p.cash -= sp.price;
    state.owned[pos] = { owner: p.id, stars: 0 };
    ev(events, 'money', { pid: p.id, delta: -sp.price, reason: 'buy' });
    ev(events, 'buy', { pid: p.id, pos: pos, price: sp.price });
    say(events, p.name + ' bought ' + sp.name + ' for $' + sp.price + '! \uD83C\uDF81');
    state.pending = null;
    state.phase = 'idle';
    maybeOfferStar(state);
    return events;
  };

  MPRules.pass = function (state) {
    var events = [];
    if (!state.pending || state.pending.kind !== 'buy') return events;
    var sp = spaceAt(state.pending.pos);
    say(events, currentPlayer(state).name + ' skipped buying ' + sp.name + '.');
    state.pending = null;
    state.phase = 'idle';
    maybeOfferStar(state);
    return events;
  };

  MPRules.buildStar = function (state) {
    var events = [];
    if (!state.pending || state.pending.kind !== 'star') return events;
    var p = currentPlayer(state);
    var c = starCandidate(state, p.id);
    if (!c) { state.pending = null; state.phase = 'idle'; return events; }
    p.cash -= c.cost;
    state.owned[c.pos].stars++;
    var stars = state.owned[c.pos].stars;
    ev(events, 'money', { pid: p.id, delta: -c.cost, reason: 'star' });
    ev(events, 'star', { pid: p.id, pos: c.pos, stars: stars });
    say(events, p.name + ' added a star \u2B50 at ' + spaceAt(c.pos).name + '! (' + stars + '/3)');
    state.pending = null;
    state.phase = 'idle';
    return events;
  };

  MPRules.skipStar = function (state) {
    var events = [];
    if (!state.pending || state.pending.kind !== 'star') return events;
    state.pending = null;
    state.phase = 'idle';
    return events;
  };

  MPRules.leaveTimeout = function (state) {
    var events = [];
    var p = currentPlayer(state);
    if (!p || p.skipTurns <= 0) return events;
    if (p.cash >= D.TIMEOUT_LEAVE_COST) {
      p.cash -= D.TIMEOUT_LEAVE_COST;
      p.skipTurns = 0;
      ev(events, 'money', { pid: p.id, delta: -D.TIMEOUT_LEAVE_COST, reason: 'timeout' });
      ev(events, 'timeout', { pid: p.id, reason: 'paid' });
      say(events, p.name + ' paid $1 to hop out of Time-out! \uD83C\uDF89');
    }
    return events;
  };

  MPRules.sitOut = function (state) {
    var events = [];
    var p = currentPlayer(state);
    if (!p || p.skipTurns <= 0) return events;
    p.skipTurns--;
    ev(events, 'timeout', { pid: p.id, reason: 'serve' });
    say(events, p.name + ' thinks about it in Time-out. (' + p.skipTurns + ' left)');
    return events;
  };

  MPRules.endTurn = function (state) {
    var events = [];
    if (state.phase === 'over') return events;
    state.awaitingExtraRoll = false;
    state.extraRollsUsed = 0;
    state.pending = null;
    state.phase = 'idle';
    if (checkLastStanding(state, events)) return events;

    var oldPtr = state.ptr, len = state.order.length;
    for (var i = 1; i <= len; i++) {
      var cand = (oldPtr + i) % len;
      if (cand <= oldPtr && i < len) state.round++;
      var pl = state.players[state.order[cand]];
      if (pl.alive) { state.ptr = cand; break; }
    }
    ev(events, 'turn', { pid: state.order[state.ptr], round: state.round });

    if (state.round > D.ROUND_LIMIT) {
      var best = null, bestPid = -1;
      var alive = alivePlayers(state);
      for (var j = 0; j < alive.length; j++) {
        var w = netWorth(state, alive[j].id);
        if (!best || w > best) { best = w; bestPid = alive[j].id; }
      }
      state.winner = bestPid;
      state.winReason = 'richest';
      state.phase = 'over';
      say(events, findPlayer(state, bestPid).name + ' wins — richest after ' + D.ROUND_LIMIT + ' rounds!');
      ev(events, 'winner', { pid: bestPid, reason: 'richest' });
    }
    return events;
  };

  // What does the driver need to do right now?
  MPRules.needsChoice = function (state) {
    if (state.phase === 'over') return null;
    var p = currentPlayer(state);
    if (p && p.alive && p.skipTurns > 0) return 'timeout';
    if (state.pending) return state.pending.kind;
    return null;
  };

  MPRules.canRoll = function (state) {
    if (state.phase !== 'idle') return false;
    var p = currentPlayer(state);
    return !!(p && p.alive && p.skipTurns === 0 && !state.pending);
  };

  global.MPRules = MPRules;
  if (typeof module !== 'undefined' && module.exports) module.exports = MPRules;
})(typeof window !== 'undefined' ? window : globalThis);
