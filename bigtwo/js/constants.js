/* ========================================
   Amber's Big Two — Constants
   ======================================== */

const SUITS = ['D', 'C', 'H', 'S']; // diamonds < clubs < hearts < spades
const SUIT_SYMBOL = { D: '♦', C: '♣', H: '♥', S: '♠' };
const SUIT_NAME = { D: 'Diamonds', C: 'Clubs', H: 'Hearts', S: 'Spades' };
const SUIT_COLOR = { D: 'red', C: 'black', H: 'red', S: 'black' };
// Suit rank high→low: S > H > C > D  → index higher = stronger
const SUIT_RANK = { D: 0, C: 1, H: 2, S: 3 };

// Rank values high→low: 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
// Stored as face strings; rankValue higher = stronger
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i]));

const PLAY_TYPES = {
  single: 'single',
  pair: 'pair',
  triple: 'triple',
  straight: 'straight',
  flush: 'flush',
  fullHouse: 'fullHouse',
  fourKind: 'fourKind',
  straightFlush: 'straightFlush',
};

// 5-card category strength (higher beats lower). Non-5-card use length family.
const FIVE_CAT_RANK = {
  straight: 1,
  flush: 2,
  fullHouse: 3,
  fourKind: 4,
  straightFlush: 5,
};

const PLAYERS = 4;
const CARDS_PER_PLAYER = 13;

// Seats: 0 = human (South / Amber), 1 = East (Finn), 2 = North (Maple), 3 = West (Pip)
const SEAT = {
  SOUTH: 0,
  EAST: 1,
  NORTH: 2,
  WEST: 3,
};

const BUDDIES = [
  { id: 'amber', name: 'Amber', emoji: '🦊', seat: 0, isHuman: true },
  {
    id: 'finn', name: 'Finn', emoji: '🐦', seat: 1, isHuman: false, personality: 'aggressive',
    playLines: ['Zoom!', 'Big move!', 'Here I go!', 'Watch this!'],
    skipLines: ['Hmm, not yet!', 'Saving juice!', 'Pass for now!'],
    styleNote: 'loves dumping long combos',
  },
  {
    id: 'maple', name: 'Maple', emoji: '🦉', seat: 2, isHuman: false, personality: 'patient',
    playLines: ['Careful now…', 'Wise play!', 'Steady…', 'Hoot!'],
    skipLines: ['Holding a secret…', 'Not this time.', 'Patience!'],
    styleNote: 'saves big cards longer',
  },
  {
    id: 'pip', name: 'Pip', emoji: '🐰', seat: 3, isHuman: false, personality: 'conservative',
    playLines: ['Soft hop!', 'Tiny step!', 'Safe play!', 'Boing!'],
    skipLines: ['Keeping pairs!', 'No splitting!', 'Hop skip!'],
    styleNote: 'hates breaking pairs',
  },
];

const DIFFICULTY = {
  easy: {
    id: 'easy',
    label: 'Easy',
    desc: 'Gentle buddies — great for learning!',
    icon: '🌸',
    noise: 0.65,
    overkillPenalty: 0.4,
    bombSave: 0.3,
    endgameAware: 0.3,
    stopThreat: 0.35,
    // Slower so kids can read each buddy play
    thinkMs: [900, 1400],
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    desc: 'A fun challenge with friends!',
    icon: '🌻',
    noise: 0.25,
    overkillPenalty: 1.0,
    bombSave: 1.0,
    endgameAware: 1.0,
    stopThreat: 1.0,
    thinkMs: [1100, 1700],
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    desc: 'Smart play — hold onto your 2s!',
    icon: '⚡',
    noise: 0.08,
    overkillPenalty: 1.4,
    bombSave: 1.5,
    endgameAware: 1.5,
    stopThreat: 1.6,
    thinkMs: [1300, 1900],
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    desc: 'Only the bravest foxes!',
    icon: '💎',
    noise: 0.02,
    overkillPenalty: 1.7,
    bombSave: 1.8,
    endgameAware: 2.0,
    stopThreat: 2.0,
    thinkMs: [1500, 2200],
    onePly: true,
  },
};

/** Fun reaction lines for buddies (kid-friendly) */
const BUDDY_PLAY_LINES = [
  'Boop!', 'Wow!', 'Ta-da!', 'Hehe!', 'Nice!', 'Whoosh!', 'Yay!', 'Peek!',
];
const BUDDY_SKIP_LINES = [
  'Skip!', 'Pass~', 'Hmm…', 'Nope!', 'Later!', 'Not me!',
];
const KID_STICKERS = ['⭐', '🌈', '🎈', '🍭', '🦋', '🌸', '✨', '🍀', '🍓', '🎵'];

const STORAGE_KEYS = {
  settings: 'ambersBigTwo_settings',
  bests: 'ambersBigTwo_bests',
  lastDifficulty: 'ambersBigTwo_lastDifficulty',
};

const ENCOURAGE_WIN = [
  'Amazing clear, Amber! 🌟',
  'You emptied your hand first — superstar!',
  'Fox-tastic finish! 🦊✨',
  'What a clever play!',
  'Victory dance time! 🎉',
];

const ENCOURAGE_LOSE = [
  'Great try! Another hand?',
  'So close — you played really well!',
  'Buddies got lucky. You’ve got this!',
  'Learning every hand makes you stronger!',
  'Skip is smart sometimes. Ready again?',
];
