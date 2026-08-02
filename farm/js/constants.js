/* ========================================
   Amber's Farm — Constants & Balance
   ======================================== */

const CONST = {
  SAVE_KEY: 'ambers_farm_save_v1',
  SAVE_VERSION: 10,
  GAME_VERSION: '4.0.1',

  TILE: 32,          // 16×16 atlas × 2 scale (crisp pixel tiles)
  MAP_W: 36,
  MAP_H: 26,
  FOREST_W: 28,
  FOREST_H: 22,
  BEACH_W: 32,
  BEACH_H: 20,
  MOUNTAIN_W: 28,
  MOUNTAIN_H: 22,
  VILLAGE_W: 32,
  VILLAGE_H: 20,
  VIEW_W: 960,
  VIEW_H: 540,

  PLAYER_SPEED: 120,
  ENERGY_MAX: 100,
  ENERGY_TOOL: 2,      // per hoe/water/plant
  ENERGY_HARVEST: 1,
  ENERGY_WALK_SLOW: 25, // below this, walk slower (never KO)
  CAMERA_LERP: 0.12,

  // Time: minutes of in-game time advance per real second while playing
  // Soft day — player sleeps when ready
  DAY_PERIODS: ['morning', 'afternoon', 'evening'],
  PERIOD_MS: 90000, // ~90s real time per period if auto-advance
  DAYS_PER_SEASON: 7,
  SEASONS: ['spring', 'summer', 'fall', 'winter'],

  START_COINS: 100,
  START_SEEDS: { radish: 8, potato: 2 },

  COLORS: {
    amberGold: '#FFB347',
    amberDeep: '#E8941A',
    meadow: '#7BC67E',
    meadowDark: '#5AA65E',
    meadowLight: '#A8E0A4',
    dirt: '#C4A574',
    dirtDark: '#A0845C',
    dirtWet: '#8B6914',
    path: '#D4C4A8',
    wood: '#B8956A',
    woodDark: '#8B6914',
    roof: '#E07A5F',
    water: '#5BA3D9',
    waterDeep: '#3D7EB5',
    skyMorning: '#FFD4A8',
    skyNoon: '#87CEEB',
    skyEvening: '#FF9B6A',
    skyNight: '#2C3E6B',
    cream: '#FFF8F0',
    softPink: '#FFB7C5',
    leaf: '#4CAF50',
    shadow: 'rgba(40,30,20,0.25)',
  },

  // Outfit themes for Amber
  OUTFITS: {
    amber: { scarf: '#FFB347', hat: '#E8941A', shirt: '#FF8C42' },
    pink: { scarf: '#FFB7C5', hat: '#E91E8C', shirt: '#FF80AB' },
    sky: { scarf: '#7EC8E3', hat: '#4A90D9', shirt: '#64B5F6' },
    mint: { scarf: '#98D8C8', hat: '#2E8B6E', shirt: '#66BB6A' },
  },
};

// Tile type IDs
const TILE = {
  GRASS: 0,
  PATH: 1,
  DIRT: 2,       // farmable area base (untilled)
  WATER: 3,
  FENCE: 4,
  HOUSE: 5,      // solid cottage footprint
  DOOR: 6,
  COOP: 7,
  SHOP: 8,
  BIN: 9,
  ROCK: 10,      // clearable for expansion
  FLOWER: 11,
  TREE: 12,
  BED: 13,       // interior
  KITCHEN: 14,
  WARDROBE: 15,
  FLOOR: 16,
  WALL: 17,
  BOARD: 18,     // quest board
  DECOR_SPOT: 19,
  WARP: 20,      // map transition (path to forest / farm / beach)
  MUSHROOM: 21,  // forest forage
  FISH_SPOT: 22, // pond edge fishing cue (walkable)
  SAND: 23,      // beach ground
  SHELL: 24,     // beach forage
  BARN: 25,      // barn building (bigger animal home)
  SELLBOX: 26,   // instant sell box (quick coins)
  GEM_NODE: 27,  // mountain: chip for gems / geodes
  CRYSTAL: 28,   // mountain: pick me — sparkle!
  GEODE: 29,     // mountain: cracked stones (find on ground)
  CRACK_BENCH: 30, // mountain: crack a geode (next to Rori)
  FOUNTAIN: 31,  // village: toss a coin wish
  POSTBOX: 32,   // village: send letters
  STALL: 33,     // village: snack shop
  BENCH: 34,     // village: rest a moment
  LAMP: 35,      // village: glows at night
  CAVE: 36,      // cave floor (walkable, dark)
  WINDOW: 37,    // interior: wall window (sky through it)
};
