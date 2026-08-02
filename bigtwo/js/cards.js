/* ========================================
   Amber's Big Two — Cards & Deck
   ======================================== */

const Cards = {
  /** Create a card object */
  make(rank, suit) {
    return {
      id: `${rank}${suit}`,
      rank,
      suit,
      rankValue: RANK_VALUE[rank],
      suitRank: SUIT_RANK[suit],
    };
  },

  createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(Cards.make(rank, suit));
      }
    }
    return deck;
  },

  shuffleDeck() {
    return Utils.shuffle(Cards.createDeck());
  },

  /** Deal 13 cards to 4 players */
  deal() {
    const deck = Cards.shuffleDeck();
    const hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      hands[i % 4].push(deck[i]);
    }
    hands.forEach((h) => Cards.sortHand(h));
    return hands;
  },

  /** Compare two cards: positive if a > b */
  compare(a, b) {
    if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
    return a.suitRank - b.suitRank;
  },

  /** Highest card in list */
  highest(cards) {
    return cards.reduce((best, c) => (Cards.compare(c, best) > 0 ? c : best));
  },

  sortHand(hand) {
    hand.sort((a, b) => Cards.compare(a, b));
    return hand;
  },

  sortByRankThenSuit(cards) {
    return cards.slice().sort((a, b) => Cards.compare(a, b));
  },

  label(card) {
    return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
  },

  isThreeDiamonds(card) {
    return card.rank === '3' && card.suit === 'D';
  },

  findThreeDiamondsHolder(hands) {
    for (let i = 0; i < hands.length; i++) {
      if (hands[i].some(Cards.isThreeDiamonds)) return i;
    }
    return 0;
  },

  removeFromHand(hand, cards) {
    const ids = new Set(cards.map((c) => c.id));
    return hand.filter((c) => !ids.has(c.id));
  },

  /** Group hand by rank → { '3': [cards], ... } */
  groupByRank(hand) {
    const map = {};
    for (const c of hand) {
      if (!map[c.rank]) map[c.rank] = [];
      map[c.rank].push(c);
    }
    return map;
  },

  /** Count leftover 2s in hand */
  countTwos(hand) {
    return hand.filter((c) => c.rank === '2').length;
  },
};
