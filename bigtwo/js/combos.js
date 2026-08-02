/* ========================================
   Amber's Big Two — Combo detection & compare
   ======================================== */

const Combos = {
  /**
   * Analyze a selection of cards into a Play object, or null if illegal.
   * Play: { type, cards, length, catRank, powerCard, key }
   */
  analyze(cards) {
    if (!cards || !cards.length) return null;
    // Each physical card may appear only once (duplicate ids are illegal)
    const ids = cards.map((c) => c.id);
    if (new Set(ids).size !== ids.length) return null;

    const sorted = Cards.sortByRankThenSuit(cards);
    const n = sorted.length;

    if (n === 1) {
      return Combos._play(PLAY_TYPES.single, sorted, sorted[0]);
    }
    if (n === 2) {
      if (sorted[0].rank === sorted[1].rank && sorted[0].id !== sorted[1].id) {
        return Combos._play(PLAY_TYPES.pair, sorted, Cards.highest(sorted));
      }
      return null;
    }
    if (n === 3) {
      if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
        return Combos._play(PLAY_TYPES.triple, sorted, Cards.highest(sorted));
      }
      return null;
    }
    if (n === 5) {
      return Combos._analyzeFive(sorted);
    }
    // 4 cards alone not legal in HK Big Two
    return null;
  },

  _play(type, cards, powerCard) {
    return {
      type,
      cards,
      length: cards.length,
      catRank: FIVE_CAT_RANK[type] || 0,
      powerCard,
      key: cards.map((c) => c.id).sort().join(','),
    };
  },

  _analyzeFive(sorted) {
    const ranks = sorted.map((c) => c.rank);
    const suits = sorted.map((c) => c.suit);
    const byRank = {};
    for (const c of sorted) {
      byRank[c.rank] = (byRank[c.rank] || 0) + 1;
    }
    const counts = Object.values(byRank).sort((a, b) => b - a);
    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = Combos._isStraight(sorted);

    // Four of a kind + kicker
    if (counts[0] === 4) {
      const quadRank = Object.keys(byRank).find((r) => byRank[r] === 4);
      const power = Cards.highest(sorted.filter((c) => c.rank === quadRank));
      return Combos._play(PLAY_TYPES.fourKind, sorted, power);
    }

    // Full house
    if (counts[0] === 3 && counts[1] === 2) {
      const tripRank = Object.keys(byRank).find((r) => byRank[r] === 3);
      const power = Cards.highest(sorted.filter((c) => c.rank === tripRank));
      return Combos._play(PLAY_TYPES.fullHouse, sorted, power);
    }

    // Straight flush
    if (isStraight && isFlush) {
      return Combos._play(PLAY_TYPES.straightFlush, sorted, Cards.highest(sorted));
    }

    // Flush
    if (isFlush) {
      return Combos._play(PLAY_TYPES.flush, sorted, Cards.highest(sorted));
    }

    // Straight
    if (isStraight) {
      return Combos._play(PLAY_TYPES.straight, sorted, Cards.highest(sorted));
    }

    return null;
  },

  /**
   * Straight under order 3<4<…<K<A<2 — five consecutive rank values, all distinct.
   * J-Q-K-A-2 is valid; Q-K-A-2-3 is not (not consecutive).
   */
  _isStraight(sorted) {
    const vals = sorted.map((c) => c.rankValue).sort((a, b) => a - b);
    // Must be 5 unique ranks
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] === vals[i - 1]) return false;
    }
    return vals[4] - vals[0] === 4
      && vals[1] === vals[0] + 1
      && vals[2] === vals[0] + 2
      && vals[3] === vals[0] + 3;
  },

  /**
   * Does playA beat playB?
   * - Must same length
   * - For 1–3 cards: same type, higher power card
   * - For 5 cards: higher category, or same category with higher power (flush special)
   */
  beats(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    if (a.length < 5) {
      if (a.type !== b.type) return false;
      return Cards.compare(a.powerCard, b.powerCard) > 0;
    }

    // Five-card
    if (a.catRank !== b.catRank) return a.catRank > b.catRank;

    // Same category
    if (a.type === PLAY_TYPES.flush) {
      return Combos._compareFlush(a.cards, b.cards) > 0;
    }
    if (a.type === PLAY_TYPES.straight || a.type === PLAY_TYPES.straightFlush) {
      return Cards.compare(a.powerCard, b.powerCard) > 0;
    }
    // full house / four kind: power is the set
    return Cards.compare(a.powerCard, b.powerCard) > 0;
  },

  /** Compare flushes: highest card, then next, etc. */
  _compareFlush(cardsA, cardsB) {
    const a = Cards.sortByRankThenSuit(cardsA).reverse();
    const b = Cards.sortByRankThenSuit(cardsB).reverse();
    for (let i = 0; i < 5; i++) {
      const cmp = Cards.compare(a[i], b[i]);
      if (cmp !== 0) return cmp;
    }
    return 0;
  },

  /** Same family for following: length + type group for 5-card is "any 5 that beats" */
  canFollow(play, current) {
    if (!current) return !!play;
    if (!play) return false;
    return Combos.beats(play, current);
  },

  /**
   * Enumerate all legal plays from hand that beat current (or any lead if current null).
   * If requireThreeD, play must include 3♦.
   */
  findAllLegalPlays(hand, current, requireThreeD = false) {
    const plays = [];
    const add = (cards) => {
      const p = Combos.analyze(cards);
      if (!p) return;
      if (requireThreeD && !cards.some(Cards.isThreeDiamonds)) return;
      if (current && !Combos.beats(p, current)) return;
      plays.push(p);
    };

    if (!current) {
      Combos._enumerateLeads(hand, add);
    } else if (current.length === 1) {
      Combos._enumerateSingles(hand, add);
    } else if (current.length === 2) {
      Combos._enumeratePairs(hand, add);
    } else if (current.length === 3) {
      Combos._enumerateTriples(hand, add);
    } else if (current.length === 5) {
      Combos._enumerateFives(hand, add);
    }

    // Deduplicate by key
    const seen = new Set();
    return plays.filter((p) => {
      if (seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    });
  },

  _enumerateLeads(hand, add) {
    Combos._enumerateSingles(hand, add);
    Combos._enumeratePairs(hand, add);
    Combos._enumerateTriples(hand, add);
    Combos._enumerateFives(hand, add);
  },

  _enumerateSingles(hand, add) {
    for (const c of hand) add([c]);
  },

  _enumeratePairs(hand, add) {
    const g = Cards.groupByRank(hand);
    for (const rank of Object.keys(g)) {
      const cards = g[rank];
      if (cards.length < 2) continue;
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          add([cards[i], cards[j]]);
        }
      }
    }
  },

  _enumerateTriples(hand, add) {
    const g = Cards.groupByRank(hand);
    for (const rank of Object.keys(g)) {
      const cards = g[rank];
      if (cards.length < 3) continue;
      // all combos of 3
      Combos._combinations(cards, 3).forEach(add);
    }
  },

  _enumerateFives(hand, add) {
    if (hand.length < 5) return;
    // Straights & straight flushes: consecutive ranks
    Combos._enumStraights(hand, add);
    // Flushes
    Combos._enumFlushes(hand, add);
    // Full houses
    Combos._enumFullHouses(hand, add);
    // Four + kicker
    Combos._enumFourKind(hand, add);
  },

  _enumStraights(hand, add) {
    const byVal = {};
    for (const c of hand) {
      if (!byVal[c.rankValue]) byVal[c.rankValue] = [];
      byVal[c.rankValue].push(c);
    }
    // Windows of 5 consecutive rank values 0..12
    for (let start = 0; start <= 8; start++) {
      const vals = [start, start + 1, start + 2, start + 3, start + 4];
      if (vals.some((v) => !byVal[v] || !byVal[v].length)) continue;
      // Cartesian product of choices (one card per rank)
      Combos._product(vals.map((v) => byVal[v])).forEach(add);
    }
  },

  _enumFlushes(hand, add) {
    for (const suit of SUITS) {
      const suited = hand.filter((c) => c.suit === suit);
      if (suited.length < 5) continue;
      Combos._combinations(suited, 5).forEach((combo) => {
        // Skip pure straights here? analyze will tag SF or flush; both fine
        add(combo);
      });
    }
  },

  _enumFullHouses(hand, add) {
    const g = Cards.groupByRank(hand);
    const ranks = Object.keys(g);
    for (const t of ranks) {
      if (g[t].length < 3) continue;
      for (const p of ranks) {
        if (p === t || g[p].length < 2) continue;
        const trips = Combos._combinations(g[t], 3);
        const pairs = Combos._combinations(g[p], 2);
        for (const trip of trips) {
          for (const pair of pairs) {
            add(trip.concat(pair));
          }
        }
      }
    }
  },

  _enumFourKind(hand, add) {
    const g = Cards.groupByRank(hand);
    for (const r of Object.keys(g)) {
      if (g[r].length < 4) continue;
      const quads = Combos._combinations(g[r], 4);
      const kickers = hand.filter((c) => c.rank !== r);
      for (const q of quads) {
        for (const k of kickers) {
          add(q.concat([k]));
        }
      }
    }
  },

  _combinations(arr, k) {
    const out = [];
    const n = arr.length;
    if (k > n || k <= 0) return out;
    const idx = Array.from({ length: k }, (_, i) => i);
    const push = () => out.push(idx.map((i) => arr[i]));
    push();
    while (true) {
      let i = k - 1;
      while (i >= 0 && idx[i] === n - k + i) i--;
      if (i < 0) break;
      idx[i]++;
      for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
      push();
    }
    return out;
  },

  _product(arrays) {
    return arrays.reduce(
      (acc, curr) => {
        const next = [];
        for (const a of acc) {
          for (const c of curr) next.push(a.concat([c]));
        }
        return next;
      },
      [[]]
    );
  },

  lowestBeatingPlay(hand, current, requireThreeD = false) {
    const plays = Combos.findAllLegalPlays(hand, current, requireThreeD);
    if (!plays.length) return null;
    plays.sort((a, b) => Combos._strengthCmp(a, b));
    return plays[0];
  },

  /** Weaker first */
  _strengthCmp(a, b) {
    if (a.length !== b.length) return a.length - b.length;
    if (a.catRank !== b.catRank) return a.catRank - b.catRank;
    if (a.type === PLAY_TYPES.flush) {
      return Combos._compareFlush(a.cards, b.cards);
    }
    return Cards.compare(a.powerCard, b.powerCard);
  },

  describe(play) {
    if (!play) return '';
    const labels = play.cards.map(Cards.label).join(' ');
    const names = {
      single: 'single',
      pair: 'pair',
      triple: 'triple',
      straight: 'straight',
      flush: 'flush',
      fullHouse: 'full house',
      fourKind: 'four of a kind',
      straightFlush: 'straight flush',
    };
    return `${names[play.type] || play.type}: ${labels}`;
  },

  /** Kid-friendly short label */
  shortName(play) {
    if (!play) return '';
    const map = {
      single: 'a single',
      pair: 'a pair',
      triple: 'three of a kind',
      straight: 'a straight',
      flush: 'a flush',
      fullHouse: 'a full house',
      fourKind: 'four of a kind',
      straightFlush: 'a straight flush',
    };
    return map[play.type] || play.type;
  },
};

/* ---------- Self-tests ---------- */
function runComboSelfTests() {
  const results = [];
  const ok = (name, cond) => {
    results.push({ name, pass: !!cond });
    if (!cond) console.error('FAIL', name);
  };

  const c = (rank, suit) => Cards.make(rank, suit);

  // Singles
  const s1 = Combos.analyze([c('3', 'D')]);
  const s2 = Combos.analyze([c('2', 'S')]);
  ok('single 3D', s1 && s1.type === 'single');
  ok('2S beats 3D', Combos.beats(s2, s1));
  ok('3D does not beat 2S', !Combos.beats(s1, s2));

  // Pairs
  const p3 = Combos.analyze([c('3', 'D'), c('3', 'C')]);
  const p4 = Combos.analyze([c('4', 'H'), c('4', 'S')]);
  ok('pair analyze', p3 && p3.type === 'pair');
  ok('pair 4 beats pair 3', Combos.beats(p4, p3));
  ok('pair vs single no', !Combos.beats(p4, s1));

  // Straight JQKA2
  const st = Combos.analyze([
    c('J', 'D'), c('Q', 'C'), c('K', 'H'), c('A', 'S'), c('2', 'D'),
  ]);
  ok('straight JQKA2', st && st.type === 'straight');

  // Invalid wrap QKA23
  const bad = Combos.analyze([
    c('Q', 'D'), c('K', 'C'), c('A', 'H'), c('2', 'S'), c('3', 'D'),
  ]);
  ok('no wrap straight', !bad);

  // Flush beats straight
  const fl = Combos.analyze([
    c('3', 'H'), c('5', 'H'), c('7', 'H'), c('9', 'H'), c('J', 'H'),
  ]);
  const st2 = Combos.analyze([
    c('3', 'D'), c('4', 'C'), c('5', 'H'), c('6', 'S'), c('7', 'D'),
  ]);
  ok('flush', fl && fl.type === 'flush');
  ok('straight low', st2 && st2.type === 'straight');
  ok('flush beats straight', Combos.beats(fl, st2));

  // Full house
  const fh = Combos.analyze([
    c('9', 'D'), c('9', 'C'), c('9', 'H'), c('5', 'S'), c('5', 'D'),
  ]);
  ok('full house', fh && fh.type === 'fullHouse');
  ok('FH beats flush', Combos.beats(fh, fl));

  // Four kind
  const fk = Combos.analyze([
    c('8', 'D'), c('8', 'C'), c('8', 'H'), c('8', 'S'), c('3', 'D'),
  ]);
  ok('four kind', fk && fk.type === 'fourKind');
  ok('4K beats FH', Combos.beats(fk, fh));

  // SF
  const sf = Combos.analyze([
    c('3', 'S'), c('4', 'S'), c('5', 'S'), c('6', 'S'), c('7', 'S'),
  ]);
  ok('straight flush', sf && sf.type === 'straightFlush');
  ok('SF beats 4K', Combos.beats(sf, fk));

  // Enumerate from hand
  const hand = [
    c('3', 'D'), c('3', 'C'), c('4', 'H'), c('5', 'S'), c('6', 'D'),
    c('7', 'C'), c('9', 'H'), c('9', 'S'), c('J', 'D'), c('Q', 'C'),
    c('K', 'H'), c('A', 'S'), c('2', 'D'),
  ];
  const leads = Combos.findAllLegalPlays(hand, null, true);
  ok('3D required in first lead options', leads.length > 0 && leads.every((p) => p.cards.some(Cards.isThreeDiamonds)));

  const followPairs = Combos.findAllLegalPlays(hand, p3, false);
  ok('can follow pair 3 with pair 9', followPairs.some((p) => p.type === 'pair' && p.powerCard.rank === '9'));

  // Duplicate ids must never form a legal pair
  const dup = Combos.analyze([c('5', 'H'), c('5', 'H')]);
  ok('reject duplicate card ids', dup === null);

  // Four cards alone illegal
  ok(
    'four cards illegal',
    Combos.analyze([c('8', 'D'), c('8', 'C'), c('8', 'H'), c('8', 'S')]) === null
  );

  // Equal strength does not beat
  const pA = Combos.analyze([c('9', 'H'), c('9', 'D')]);
  const pB = Combos.analyze([c('9', 'H'), c('9', 'D')]);
  ok('equal pair does not beat self', !Combos.beats(pA, pB));

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`Combo self-tests: ${passed}/${total} passed`);
  return { passed, total, results };
}

if (typeof window !== 'undefined') {
  window.runComboSelfTests = runComboSelfTests;
}
