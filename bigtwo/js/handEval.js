/* ========================================
   Amber's Big Two — Hand shape evaluation
   ======================================== */

const HandEval = {
  /**
   * Analyze hand structure for AI scoring.
   */
  analyze(hand) {
    const g = Cards.groupByRank(hand);
    const ranks = Object.keys(g);
    let pairs = 0;
    let triples = 0;
    let quads = 0;
    let singles = 0;
    const singleCards = [];
    const pairRanks = [];
    const tripRanks = [];

    for (const r of ranks) {
      const n = g[r].length;
      if (n === 1) {
        singles++;
        singleCards.push(g[r][0]);
      } else if (n === 2) {
        pairs++;
        pairRanks.push(r);
      } else if (n === 3) {
        triples++;
        tripRanks.push(r);
      } else if (n >= 4) {
        quads++;
      }
    }

    const twos = hand.filter((c) => c.rank === '2');
    const highSingles = singleCards.filter((c) => c.rankValue >= RANK_VALUE.A);

    // Count natural 5-card leads available (cheap estimate)
    const fiveLeads = Combos.findAllLegalPlays(hand, null, false).filter((p) => p.length === 5);

    // Orphans: low singles (rank <= 7) with no matching pair potential
    const orphans = singleCards.filter((c) => c.rankValue <= RANK_VALUE['7']);

    return {
      size: hand.length,
      pairs,
      triples,
      quads,
      singles,
      singleCards,
      pairRanks,
      tripRanks,
      twos: twos.length,
      highTwos: twos.filter((c) => c.suit === 'S' || c.suit === 'H').length,
      highSingles: highSingles.length,
      fiveCount: fiveLeads.length,
      bombs: quads + fiveLeads.filter((p) => p.type === 'straightFlush' || p.type === 'fourKind').length,
      orphans: orphans.length,
      lowestOrphan: orphans.length
        ? orphans.reduce((a, b) => (Cards.compare(a, b) < 0 ? a : b))
        : null,
    };
  },

  /**
   * Cost of *breaking* sets (higher = hurts more).
   * Playing a full pair/triple cleanly is NOT a split.
   * Split = using only some cards of a rank and leaving stragglers.
   */
  splitCost(hand, playCards) {
    let cost = 0;
    const handG = Cards.groupByRank(hand);
    const playG = Cards.groupByRank(playCards);

    for (const rank of Object.keys(playG)) {
      const used = playG[rank].length;
      const had = (handG[rank] || []).length;
      const left = had - used;
      if (used > 0 && left > 0) {
        // Broke a set: e.g. had 3, played 1 → left 2 orphans from a triple
        cost += 4 + left * 3;
      }
    }

    // Spending 2s is expensive mid-game (separate from splits)
    const twosSpent = playCards.filter((c) => c.rank === '2').length;
    cost += twosSpent * 5;

    // Soft penalty if play leaves many new low orphans overall
    const before = HandEval.analyze(hand);
    const after = HandEval.analyze(Cards.removeFromHand(hand, playCards));
    cost += Math.max(0, after.orphans - before.orphans) * 1.5;

    return cost;
  },

  /** Relative strength 0..1 of a play's power card among all ranks */
  powerNorm(play) {
    if (!play || !play.powerCard) return 0;
    let v = play.powerCard.rankValue / 12;
    v += play.powerCard.suitRank * 0.02;
    if (play.catRank) v += play.catRank * 0.05;
    return Utils.clamp(v, 0, 1.5);
  },

  /** How many cards this play dumps */
  dumpValue(play) {
    return play ? play.length : 0;
  },

  /**
   * Public threat: min cards among opponents.
   */
  minOpponentCards(hands, selfSeat) {
    let min = 13;
    for (let i = 0; i < PLAYERS; i++) {
      if (i === selfSeat) continue;
      min = Math.min(min, hands[i].length);
    }
    return min;
  },

  countPassedOnLength(passMemory, length) {
    return passMemory.filter((p) => p.length === length).length;
  },
};
