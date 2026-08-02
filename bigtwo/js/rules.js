/* ========================================
   Amber's Big Two — Rules & scoring
   ======================================== */

const Rules = {
  createMatch(difficultyId) {
    return {
      difficulty: difficultyId || 'normal',
      handsPlayed: 0,
      stars: [0, 0, 0, 0], // cumulative stars earned (winner gains)
      wins: [0, 0, 0, 0],
      hand: null,
    };
  },

  /**
   * Start a new hand.
   * mustInclude3D on first trick until someone plays.
   */
  startHand(match) {
    const hands = Cards.deal();
    const starter = Cards.findThreeDiamondsHolder(hands);
    match.hand = {
      hands,
      turn: starter,
      currentPlay: null,
      lastPlayer: null,
      passes: 0,
      mustInclude3D: true,
      finished: false,
      winner: null,
      lastWinningPlay: null,
      trickHistory: [], // long log (AI / debug)
      currentTrick: [], // this trick only — all plays & skips for UI
      passMemory: [], // { player, length } for AI inference
    };
    match.handsPlayed += 1;
    return match.hand;
  },

  handOf(match, seat) {
    return match.hand.hands[seat];
  },

  isHumanTurn(match) {
    return match.hand && !match.hand.finished && match.hand.turn === SEAT.SOUTH;
  },

  canPass(match) {
    const h = match.hand;
    if (!h || h.finished) return false;
    // Cannot pass when leading (no current play)
    if (!h.currentPlay) return false;
    return true;
  },

  /**
   * Validate and apply a play. Returns { ok, error?, won? }
   */
  applyPlay(match, seat, cards) {
    const h = match.hand;
    if (!h || h.finished) return { ok: false, error: 'Hand over' };
    if (h.turn !== seat) return { ok: false, error: 'Not your turn' };

    const play = Combos.analyze(cards);
    if (!play) return { ok: false, error: 'That is not a valid combo' };

    // Cards must be unique and all present in hand (count-safe)
    const hand = h.hands[seat];
    const handIds = hand.map((c) => c.id);
    const playIds = cards.map((c) => c.id);
    if (new Set(playIds).size !== playIds.length) {
      return { ok: false, error: 'Cannot use the same card twice' };
    }
    for (const id of playIds) {
      const hi = handIds.indexOf(id);
      if (hi < 0) return { ok: false, error: 'Cards not in hand' };
      handIds[hi] = null; // consume one copy
    }

    if (h.mustInclude3D && !cards.some(Cards.isThreeDiamonds)) {
      return { ok: false, error: 'First play must include the 3♦' };
    }

    if (h.currentPlay && !Combos.beats(play, h.currentPlay)) {
      return { ok: false, error: 'Must beat the current play with the same kind' };
    }

    // Apply
    h.hands[seat] = Cards.removeFromHand(hand, cards);
    h.currentPlay = play;
    h.lastPlayer = seat;
    h.passes = 0;
    h.mustInclude3D = false;
    h.lastWinningPlay = play;
    const playEntry = { seat, play, pass: false };
    h.trickHistory.push(playEntry);
    if (h.trickHistory.length > 24) h.trickHistory.shift();
    h.currentTrick.push(playEntry);

    if (h.hands[seat].length === 0) {
      h.finished = true;
      h.winner = seat;
      const score = Rules.computeStars(h, seat, play);
      Rules.applyScore(match, score);
      match.wins[seat] += 1;
      return { ok: true, won: true, score };
    }

    h.turn = (seat + 1) % PLAYERS;
    return { ok: true, won: false };
  },

  applyPass(match, seat) {
    const h = match.hand;
    if (!h || h.finished) return { ok: false, error: 'Hand over' };
    if (h.turn !== seat) return { ok: false, error: 'Not your turn' };
    if (!h.currentPlay) return { ok: false, error: 'You lead — play any combo' };

    h.passes += 1;
    h.passMemory.push({ seat, length: h.currentPlay.length, type: h.currentPlay.type });
    if (h.passMemory.length > 24) h.passMemory.shift();
    const passEntry = { seat, play: null, pass: true };
    h.trickHistory.push(passEntry);
    if (h.trickHistory.length > 24) h.trickHistory.shift();
    h.currentTrick.push(passEntry);

    if (h.passes >= 3) {
      // Last player to play leads freely
      h.currentPlay = null;
      h.passes = 0;
      // Guard: lastPlayer must be a real seat (always set after a successful play)
      h.turn = (h.lastPlayer != null && h.lastPlayer >= 0) ? h.lastPlayer : seat;
      h.trickHistory.push({ seat: -1, play: null, pass: false, clear: true });
      h.currentTrick = []; // new free-lead trick
      return { ok: true, trickCleared: true };
    }

    h.turn = (seat + 1) % PLAYERS;
    return { ok: true, trickCleared: false };
  },

  /**
   * Stars scoring (HK-style):
   * Each loser pays winner: cardCount * unit, unit=2 if >=10 cards else 1.
   * Doublers stack as multipliers for that loser:
   * - each leftover 2 doubles
   * - unused four-of-a-kind in hand doubles
   * - unused straight flush in hand doubles
   * Winner going out with 2 / fourKind / SF doubles everyone's payment.
   */
  computeStars(handState, winnerSeat, winningPlay) {
    let globalMult = 1;
    if (winningPlay) {
      if (winningPlay.cards.some((c) => c.rank === '2')) globalMult *= 2;
      if (winningPlay.type === PLAY_TYPES.fourKind || winningPlay.type === PLAY_TYPES.straightFlush) {
        globalMult *= 2;
      }
    }

    const breakdown = [];
    let total = 0;

    for (let s = 0; s < PLAYERS; s++) {
      if (s === winnerSeat) {
        breakdown.push({ seat: s, cards: 0, stars: 0 });
        continue;
      }
      const left = handState.hands[s];
      const n = left.length;
      let unit = n >= 10 ? 2 : 1;
      let pts = n * unit;

      let mult = globalMult;
      // Leftover 2s
      const twos = Cards.countTwos(left);
      for (let i = 0; i < twos; i++) mult *= 2;

      // Unused bombs in hand
      if (Rules._handHasFourKind(left)) mult *= 2;
      if (Rules._handHasStraightFlush(left)) mult *= 2;

      pts *= mult;
      total += pts;
      breakdown.push({ seat: s, cards: n, stars: pts, mult });
    }

    breakdown[winnerSeat] = { seat: winnerSeat, cards: 0, stars: total };
    return { winner: winnerSeat, total, breakdown, globalMult };
  },

  applyScore(match, score) {
    for (const row of score.breakdown) {
      if (row.seat === score.winner) {
        match.stars[row.seat] += row.stars;
      }
      // losers don't go negative — kid friendly: only track stars earned
    }
  },

  _handHasFourKind(hand) {
    const g = Cards.groupByRank(hand);
    return Object.values(g).some((arr) => arr.length >= 4);
  },

  _handHasStraightFlush(hand) {
    if (hand.length < 5) return false;
    for (const suit of SUITS) {
      const suited = hand.filter((c) => c.suit === suit);
      if (suited.length < 5) continue;
      // check any straight within suited
      const vals = [...new Set(suited.map((c) => c.rankValue))].sort((a, b) => a - b);
      for (let i = 0; i <= vals.length - 5; i++) {
        if (
          vals[i + 1] === vals[i] + 1
          && vals[i + 2] === vals[i] + 2
          && vals[i + 3] === vals[i] + 3
          && vals[i + 4] === vals[i] + 4
        ) {
          return true;
        }
      }
    }
    return false;
  },

  statusText(match) {
    const h = match.hand;
    if (!h) return '';
    if (h.finished) {
      const name = BUDDIES[h.winner].name;
      return h.winner === SEAT.SOUTH ? 'You cleared your hand! 🌟' : `${name} cleared first!`;
    }
    const name = BUDDIES[h.turn].name;
    const whose = h.turn === SEAT.SOUTH ? 'Your turn' : `${name}'s turn`;
    if (!h.currentPlay) {
      if (h.mustInclude3D) return `${whose} — open with a combo that includes 3♦`;
      return `${whose} — play any combo!`;
    }
    return `${whose} — beat ${Combos.shortName(h.currentPlay)} (${h.currentPlay.cards.map(Cards.label).join(' ')})`;
  },
};
