/* Amber's Candy Castle — static data tables.
 * Pure data, no logic, no DOM. Levels, towers, enemies, waves and tuning.
 *
 * Coordinate convention: grids are COLS x ROWS. Gate sits on the left edge,
 * castle on the right. Cell kinds are declared in grid.js; this file only
 * describes content and numbers.
 */
(function (global) {
  'use strict';

  var COLS = 9;
  var ROWS = 13;

  /* ---------------------------------------------------------------- tuning */

  var TUNE = {
    /* the hard floor: the road may never be shorter than this, which makes
     * sealing the gate impossible. Small on purpose — see grid.js buildOpenBoard
     * for why a pre-built maze could not also serve as the floor. */
    minPathFloor: 6,

    /* economy */
    wallCost: 15,
    sellRefund: 0.7,

    /* castle */
    startLives: 30,
    leakBase: 1,

    /* waves */
    prepTime: 12,          // seconds of build time before wave 1
    betweenWaves: 7,       // seconds of build time between waves
    firstWaveDelay: 0.6,

    /* pacing */
    enemySpeedBase: 2.0,    // CELLS per second. The old 34 crossed the whole board in 0.2s,
                            // which made every tower unable to land a shot.
    speedGrowth: 0.014,    // per-wave multiplier growth
    hpGrowth: 0.12,       // per-wave HP multiplier growth
    waveScale: 1.0,       // master wave-volume multiplier

    /* endless */
    endlessGoldPerWave: 22,
    endlessLifeBonus: 2
  };

  /* ---------------------------------------------------------------- towers */

  /* range/tier are in CELLS. rate is seconds between shots. */
  var TOWERS = {
    arrow: {
      id: 'arrow', name: 'Arrow', crew: 'Amber', glyph: '🏹',
      cost: 90, color: '#ff8a65', accent: '#ffd180',
      blurb: 'Fast single shots. Good early, and the answer to armour.',
      tiers: [
        { damage: 11, range: 2.6, rate: 0.40 },
        { damage: 19, range: 2.9, rate: 0.34 },
        { damage: 30, range: 3.2, rate: 0.28 }
      ],
      upgradeCost: [70, 110]
    },
    frost: {
      id: 'frost', name: 'Frost', crew: 'Maple', glyph: '❄️',
      cost: 110, color: '#8fd3ff', accent: '#d8f2ff',
      blurb: 'Slows what it touches, and chips a little. Slow things stay in your kill zone longer.',
      tiers: [
        { damage: 5, range: 2.2, rate: 0.60, slow: 0.35 },
        { damage: 9, range: 2.5, rate: 0.55, slow: 0.48 },
        { damage: 15, range: 2.8, rate: 0.50, slow: 0.60 }
      ],
      upgradeCost: [85, 130]
    },
    cannon: {
      id: 'cannon', name: 'Cannon', crew: 'Finn', glyph: '💣',
      cost: 140, color: '#c8a2ff', accent: '#efe3ff',
      blurb: 'Slow, splashy. Useless alone, devastating against a swarm.',
      tiers: [
        { damage: 20, range: 2.4, rate: 1.15, splash: 0.9 },
        { damage: 32, range: 2.6, rate: 1.05, splash: 1.1 },
        { damage: 48, range: 2.8, rate: 0.95, splash: 1.35 }
      ],
      upgradeCost: [105, 160]
    },
    arc: {
      id: 'arc', name: 'Arc', crew: 'Pip', glyph: '⚡',
      cost: 130, color: '#ffd700', accent: '#fff3b0',
      blurb: 'Chains between targets. Best value against armoured single enemies.',
      tiers: [
        { damage: 12, range: 2.5, rate: 0.70, chain: 3 },
        { damage: 19, range: 2.7, rate: 0.62, chain: 4 },
        { damage: 29, range: 3.0, rate: 0.55, chain: 5 }
      ],
      upgradeCost: [100, 150]
    },
    longshot: {
      id: 'longshot', name: 'Longshot', crew: 'Amber', glyph: '🎯',
      cost: 160, color: '#5ffbf1', accent: '#dffffb',
      blurb: 'Enormous range and one huge hit. Punishes whatever you stretched the road past.',
      tiers: [
        { damage: 55, range: 5.0, rate: 1.6 },
        { damage: 85, range: 5.6, rate: 1.5 },
        { damage: 130, range: 6.2, rate: 1.4 }
      ],
      upgradeCost: [125, 190]
    }
  };
  var TOWER_IDS = ['arrow', 'frost', 'cannon', 'arc', 'longshot'];

  /* ---------------------------------------------------------------- enemies */

  /* hp and speed are in the same arbitrary scale the towers shoot at.
   * `armor` is a flat damage reduction per hit (0 = none). `slowResist` scales
   * how much Frost's slow is diluted — the stage boss shrugs it off. */
  var ENEMIES = {
    grunt:    { id: 'grunt',    name: 'Grunt',    hp: 37,   speed: 1.00, armor: 0,    slowResist: 0,    bounty: 9,  leak: 1, size: 0.40, body: '#8b5e3c', dark: '#5d3d24', shape: 'grunt' },
    runner:   { id: 'runner',   name: 'Runner',   hp: 23,   speed: 1.70, armor: 0,    slowResist: 0,    bounty: 10, leak: 1, size: 0.30, body: '#ffd166', dark: '#c79a2e', shape: 'runner' },
    armoured: { id: 'armoured', name: 'Armoured', hp: 101,  speed: 0.72, armor: 3,    slowResist: 0.15, bounty: 19, leak: 2, size: 0.48, body: '#7f8c9b', dark: '#54616f', shape: 'armoured' },
    swarm:    { id: 'swarm',    name: 'Swarmling',hp: 13,   speed: 1.28, armor: 0,    slowResist: 0,    bounty: 5,  leak: 1, size: 0.26, body: '#a3e635', dark: '#6b8f1c', shape: 'swarm' },
    honeybug: { id: 'honeybug', name: 'Honeybug', hp: 61,   speed: 0.92, armor: 1,    slowResist: 0,    bounty: 22, leak: 2, size: 0.42, body: '#f59e0b', dark: '#a86f04', shape: 'honeybug', heal: 6, healRange: 1.6 },
    boss:     { id: 'boss',     name: 'Sugarplum',hp: 296,  speed: 0.55, armor: 4,    slowResist: 0.75, bounty: 120, leak: 8, size: 0.85, body: '#e879f9', dark: '#9d2fbe', shape: 'boss', boss: true },
    iceboss:  { id: 'iceboss',  name: 'Ice Baron',hp: 593,  speed: 0.60, armor: 7,   slowResist: 0.80, bounty: 240, leak: 12, size: 0.90, body: '#60a5fa', dark: '#1e40af', shape: 'boss', boss: true },
    queen:    { id: 'queen',    name: 'The Queen',hp: 975, speed: 0.55, armor: 8,   slowResist: 0.85, bounty: 400, leak: 20, size: 1.00, body: '#f472b6', dark: '#9d174d', shape: 'boss', boss: true }
  };

  /* ------------------------------------------------------------------ waves */

  /* A wave is a list of groups. `gap` is seconds between the start of each
   * group. A level's wave count is implied by the array length. */
  function w(groups) { return groups; }

  /* ------------------------------------------------------------------ levels */

  /* `unlock` lists towers available in this level. `minPath` is the anti-cheese
   * floor in cells. `prebuilt` are walls already placed (tutorial scaffolding),
   * as [col,row] pairs. `gates` and `castle` are cell coords. */
  var STAGES = [
    {
      id: 'gate', name: 'Candy Gate', boss: 'boss',
      blurb: 'Learn to bend the road.',
      levels: [
        {
          name: 'First Sugar', minPath: 6, targetPath: 18, gold: 700, unlock: ['arrow'],
          gates: [[0, 6]], castle: [8, 6],
          prebuilt: [],
          teach: 'Drag to place walls. Enemies walk the short way — make the long way.',
          prebuilt: [],
          waves: [
            w([{ e: 'grunt', n: 8, gap: 0.9 }]),
            w([{ e: 'grunt', n: 12, gap: 0.7 }]),
            w([{ e: 'grunt', n: 9, gap: 0.7 }, { e: 'runner', n: 6, gap: 0.5 }]),
            w([{ e: 'grunt', n: 12, gap: 0.6 }, { e: 'runner', n: 8, gap: 0.45 }]),
            w([{ e: 'runner', n: 15, gap: 0.4 }, { e: 'grunt', n: 9, gap: 0.6 }]),
            w([{ e: 'boss', n: 2, gap: 1 }])
          ]
        },
        {
          name: 'Sticky Path', minPath: 6, targetPath: 19, gold: 760, unlock: ['arrow'],
          gates: [[0, 3], [0, 9]], castle: [8, 6],
          prebuilt: [],
          teach: 'Two gates means two roads. One long road is better than two short ones.',
          prebuilt: [],
          waves: [
            w([{ e: 'grunt', n: 12, gap: 0.6 }]),
            w([{ e: 'grunt', n: 15, gap: 0.5 }]),
            w([{ e: 'runner', n: 12, gap: 0.4 }, { e: 'grunt', n: 9, gap: 0.5 }]),
            w([{ e: 'armoured', n: 4, gap: 1.4 }, { e: 'grunt', n: 12, gap: 0.5 }]),
            w([{ e: 'swarm', n: 21, gap: 0.25 }]),
            w([{ e: 'armoured', n: 8, gap: 1.0 }, { e: 'runner', n: 12, gap: 0.4 }]),
            w([{ e: 'boss', n: 2, gap: 1 }])
          ]
        },
        {
          name: 'Full Jar', minPath: 6, targetPath: 20, gold: 820, unlock: ['arrow', 'frost'],
          gates: [[0, 3], [0, 9]], castle: [8, 6],
          prebuilt: [],
          teach: 'Frost never kills. It makes everything else kill better.',
          prebuilt: [],
          waves: [
            w([{ e: 'grunt', n: 15, gap: 0.5 }]),
            w([{ e: 'armoured', n: 6, gap: 1.2 }, { e: 'grunt', n: 12, gap: 0.5 }]),
            w([{ e: 'swarm', n: 27, gap: 0.22 }]),
            w([{ e: 'runner', n: 18, gap: 0.35 }, { e: 'armoured', n: 6, gap: 1.0 }]),
            w([{ e: 'honeybug', n: 4, gap: 1.5 }, { e: 'armoured', n: 9, gap: 0.9 }]),
            w([{ e: 'boss', n: 3, gap: 3 }])
          ]
        }
      ]
    },
    {
      id: 'bazaar', name: 'Frost Bazaar', boss: 'iceboss',
      blurb: 'Slow is a weapon.',
      levels: [
        {
          name: 'Cold Rush', minPath: 6, targetPath: 21, gold: 880, unlock: ['arrow', 'frost', 'cannon'],
          gates: [[0, 3], [0, 9]], castle: [8, 6],
          prebuilt: [],
          teach: 'Cannon splashes. It is wasted on one enemy and perfect on twenty.',
          prebuilt: [],
          waves: [
            w([{ e: 'runner', n: 15, gap: 0.3 }]),
            w([{ e: 'armoured', n: 6, gap: 0.9 }, { e: 'grunt', n: 11, gap: 0.45 }]),
            w([{ e: 'swarm', n: 28, gap: 0.18 }]),
            w([{ e: 'honeybug', n: 4, gap: 1.2 }, { e: 'armoured', n: 9, gap: 0.8 }]),
            w([{ e: 'runner', n: 19, gap: 0.25 }, { e: 'armoured', n: 6, gap: 0.9 }]),
            w([{ e: 'iceboss', n: 1, gap: 1 }])
          ]
        },
        {
          name: 'Split Shift', minPath: 6, targetPath: 22, gold: 940, unlock: ['arrow', 'frost', 'cannon', 'arc'],
          gates: [[0, 2], [0, 6], [0, 10]], castle: [8, 6],
          prebuilt: [],
          teach: 'Three gates. Arc chains, so groups die together.',
          prebuilt: [],
          waves: [
            w([{ e: 'grunt', n: 12, gap: 0.4 }]),
            w([{ e: 'swarm', n: 26, gap: 0.16 }]),
            w([{ e: 'armoured', n: 9, gap: 0.7 }]),
            w([{ e: 'honeybug', n: 5, gap: 1.0 }, { e: 'runner', n: 14, gap: 0.3 }]),
            w([{ e: 'iceboss', n: 1, gap: 1 }, { e: 'armoured', n: 5, gap: 1.2 }]),
            w([{ e: 'iceboss', n: 2, gap: 4 }])
          ]
        },
        {
          name: 'Deep Freeze', minPath: 6, targetPath: 23, gold: 1000, unlock: ['arrow', 'frost', 'cannon', 'arc', 'longshot'],
          gates: [[0, 3], [0, 9]], castle: [8, 6],
          prebuilt: [],
          teach: 'Longshot reaches the whole maze. Put it where the road is longest.',
          prebuilt: [],
          waves: [
            w([{ e: 'armoured', n: 13, gap: 0.6 }]),
            w([{ e: 'swarm', n: 37, gap: 0.14 }]),
            w([{ e: 'honeybug', n: 6, gap: 0.9 }, { e: 'runner', n: 22, gap: 0.28 }]),
            w([{ e: 'iceboss', n: 1, gap: 1 }, { e: 'armoured', n: 11, gap: 0.8 }]),
            w([{ e: 'iceboss', n: 2, gap: 3 }, { e: 'swarm', n: 26, gap: 0.18 }]),
            w([{ e: 'iceboss', n: 3, gap: 3.5 }])
          ]
        }
      ]
    },
    {
      id: 'garden', name: 'Night Garden', boss: 'queen',
      blurb: 'Everything at once.',
      levels: [
        {
          name: 'Moonlit Rows', minPath: 6, targetPath: 24, gold: 1060, unlock: ['arrow', 'frost', 'cannon', 'arc'],
          gates: [[0, 2], [0, 6], [0, 10]], castle: [8, 6],
          teach: 'Honeybugs heal. Kill the healer first or nothing else dies.',
          /* Opened with 8 honeybugs + 14 armoured and measured 20% while every other
           * level in the game sat at 100%: healers before the player has a defence
           * are a wall no amount of mazing gets through. It now opens like its
           * stage-mates and escalates across the level instead. */
          waves: [
            w([{ e: 'armoured', n: 8, gap: 0.7 }]),
            w([{ e: 'runner', n: 18, gap: 0.3 }, { e: 'armoured', n: 8, gap: 0.7 }]),
            w([{ e: 'swarm', n: 40, gap: 0.14 }]),
            w([{ e: 'honeybug', n: 6, gap: 0.9 }, { e: 'armoured', n: 12, gap: 0.6 }]),
            w([{ e: 'iceboss', n: 2, gap: 2.2 }, { e: 'runner', n: 16, gap: 0.3 }]),
            w([{ e: 'queen', n: 1, gap: 1 }, { e: 'honeybug', n: 8, gap: 0.8 }])
          ]
        },
        {
          name: 'Hedge Maze', minPath: 6, targetPath: 25, gold: 1120, unlock: ['arrow', 'frost', 'cannon', 'arc', 'longshot'],
          gates: [[0, 3], [0, 9]], castle: [8, 6],
          prebuilt: [],
          teach: 'Thirty cells of road. Bank it early, then afford the damage.',
          prebuilt: [],
          waves: [
            w([{ e: 'armoured', n: 20, gap: 0.55 }]),
            w([{ e: 'swarm', n: 65, gap: 0.11 }]),
            w([{ e: 'honeybug', n: 11, gap: 0.7 }, { e: 'runner', n: 34, gap: 0.24 }]),
            w([{ e: 'iceboss', n: 2, gap: 2.2 }, { e: 'honeybug', n: 11, gap: 0.8 }]),
            w([{ e: 'queen', n: 2, gap: 1 }, { e: 'armoured', n: 20, gap: 0.6 }]),
            w([{ e: 'queen', n: 2, gap: 4 }])
          ]
        },
        {
          name: 'The Queen', minPath: 6, targetPath: 26, gold: 1200, unlock: ['arrow', 'frost', 'cannon', 'arc', 'longshot'],
          gates: [[0, 2], [0, 6], [0, 10]], castle: [8, 6],
          prebuilt: [],
          teach: 'Everything you have learned, one road at a time.',
          prebuilt: [],
          waves: [
            w([{ e: 'swarm', n: 71, gap: 0.1 }]),
            w([{ e: 'armoured', n: 25, gap: 0.5 }]),
            w([{ e: 'honeybug', n: 14, gap: 0.6 }, { e: 'runner', n: 39, gap: 0.2 }]),
            w([{ e: 'iceboss', n: 4, gap: 2 }, { e: 'armoured', n: 20, gap: 0.6 }]),
            w([{ e: 'queen', n: 2, gap: 1 }, { e: 'honeybug', n: 14, gap: 0.6 }]),
            w([{ e: 'queen', n: 2, gap: 3 }, { e: 'iceboss', n: 2, gap: 3 }]),
            w([{ e: 'queen', n: 4, gap: 4 }])
          ]
        }
      ]
    }
  ];

  /* Flat level list with stable ids, for save keys and portal stats. */
  var LEVELS = [];
  STAGES.forEach(function (st, si) {
    st.index = si;
    st.levels.forEach(function (lv, li) {
      lv.id = st.id + '-' + (li + 1);
      lv.stage = st.id;
      lv.stageName = st.name;
      lv.index = LEVELS.length;
      lv.stageIndex = si;
      lv.levelIndex = li;
      lv.waveCount = lv.waves.length;
      LEVELS.push(lv);
    });
  });

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }

  function levelAt(i) {
    return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))];
  }

  function tower(id) { return TOWERS[id] || null; }
  function enemy(id) { return ENEMIES[id] || null; }

  var CCData = {
    COLS: COLS,
    ROWS: ROWS,
    TUNE: TUNE,
    TOWERS: TOWERS,
    TOWER_IDS: TOWER_IDS,
    ENEMIES: ENEMIES,
    STAGES: STAGES,
    LEVELS: LEVELS,
    levelById: levelById,
    levelAt: levelAt,
    tower: tower,
    enemy: enemy
  };

  global.CCData = CCData;
  if (typeof module !== 'undefined' && module.exports) module.exports = CCData;
})(typeof window !== 'undefined' ? window : globalThis);
