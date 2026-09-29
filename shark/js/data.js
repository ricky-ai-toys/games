/* Amber's Shark Hunt — static data tables.
 * Pure data. No logic, no DOM. Read by rules.js, ai.js, render.js, ui.js.
 */
(function (global) {
  'use strict';

  /* Difficulty presets.
   * `spd`     — master world-speed multiplier (fish speed, spawn rate, chase, danger odds)
   * `tele`    — apex predator telegraph window, seconds. The player's cue to dash.
   * `lunge`   — apex predator lunge-speed multiplier
   * `menace`  — apex predator aggression: scales how close it stalks and how often
   *              it commits. Without this, Easy's slower lunge kept the predator
   *              parked on top of the player and it out-damaged Hard.
   * `lives`   — starting lives
   * `magnet`  — edible-fish attraction strength. Higher is more forgiving.
   * `chase`   — how hard bigger fish pursue the player
   */
  var DIFF = {
    easy: { key: 'easy', label: 'Easy', blurb: 'Room to learn the ocean', life: 5, spd: 0.82, magnet: 1.35, chase: 0.35, tele: 1.15, lunge: 0.90, menace: 0.60, tip: 'Dash when it growls' },
    med:  { key: 'med',  label: 'Medium', blurb: 'A real shark fight', life: 3, spd: 1.00, magnet: 1.00, chase: 0.55, tele: 0.85, lunge: 1.10, menace: 0.85, tip: 'Save your dash for the telegraph' },
    hard: { key: 'hard', label: 'Hard', blurb: 'Apex waits for nobody', life: 2, spd: 1.25, magnet: 0.70, chase: 0.85, tele: 0.70, lunge: 1.35, menace: 1.15, tip: 'Chain combos, strike the tail' }
  };
  var DIFF_KEYS = ['easy', 'med', 'hard'];

  /* Prey tiers 0-5. `n` is the tier used for every size comparison.
   * A fish is edible when n <= player size, dangerous when n > player size.
   * Tier 5 is the largest prey; tier 6 is the apex predator, which is not spawned
   * as ordinary fish — see APEX below.
   */
  var TIERS = [
    { n: 0, name: 'fry',    r: 14, spd: 46, pts: 12,  xp: 1, body: '#7fe7c4', fin: '#4fc9a4', belly: '#dffaf1' },
    { n: 1, name: 'dart',   r: 18, spd: 40, pts: 22,  xp: 2, body: '#5ffbf1', fin: '#2ec5c0', belly: '#e6ffff' },
    { n: 2, name: 'tropic', r: 24, spd: 34, pts: 38,  xp: 3, body: '#ffb347', fin: '#f28c28', belly: '#fff0d6' },
    { n: 3, name: 'puffer', r: 30, spd: 28, pts: 58,  xp: 4, body: '#c8a2ff', fin: '#9b6fe0', belly: '#efe3ff' },
    { n: 4, name: 'squid',  r: 36, spd: 24, pts: 85,  xp: 5, body: '#ff8a65', fin: '#e05a3c', belly: '#ffd9cd' },
    { n: 5, name: 'whale',  r: 46, spd: 20, pts: 120, xp: 6, body: '#6aa6ff', fin: '#3f78d6', belly: '#cfe2ff' }
  ];

  /* The tier-6 apex predator. Dangerous at every player size — it is the reason the
   * APEX finale has teeth. Body art lives in sprites.js.
   *
   * Geometry contract: the lunge must always be able to reach the distance at
   * which the telegraph fired, on every difficulty. A fixed-duration lunge could
   * not — on Easy it covered 93px from a 570px telegraph distance, so it could
   * never connect and "Easy" ended up out-damaging Hard through body contact.
   * So the lunge runs until it reaches the locked aim point, and difficulty
   * scales how fast it covers that ground plus how long the player gets to react.
   */
  var APEX = {
    n: 6, name: 'greatwhite', r: 62, spd: 96,
    body: '#8fa6bd', fin: '#5d7086', belly: '#e8f0f7',
    eye: '#ff4d4d', mouth: '#3a1f2a',
    stalkR: 300,          // telegraph distance. Also the orbit radius.
    lungeSpeed: 420,      // px/s before the difficulty multiplier
    lungeMax: 0.9,        // hard cap on a lunge, seconds
    tailPts: 250,         // points for striking the exposed tail during `recover`
    tailCombo: 15
  };

  /* Player size thresholds and their display names. Size 1 is the start. */
  var SIZE_NAMES = ['', 'Pup', 'Hunter', 'Glider', 'Reef King', 'Apex', 'Legend'];
  var MAX_SIZE = 6;
  var WIN_SIZE = 5;       // reaching this size starts the hold
  var HOLD_TIME = 8;      // seconds to survive once APEX is reached

  /* Biomes, selected by player size. */
  var BIOMES = [
    {
      id: 'reef', label: 'Coral Reef', prop: 'coral',
      stops: ['#0a3f5c', '#072a44', '#041a2e'],
      ray: 'rgba(255,255,255,0.07)', rayCount: 10, raySpeed: 22,
      prop1: '#2a7d6f', prop2: '#c4557a', propCount: 7
    },
    {
      id: 'open', label: 'Open Sea', prop: 'none',
      stops: ['#0a2c52', '#071c38', '#030f22'],
      ray: 'rgba(190,225,255,0.06)', rayCount: 8, raySpeed: 16,
      prop1: '#0f3a63', prop2: '#123f6d', propCount: 4
    },
    {
      id: 'abyss', label: 'Abyss Kelp', prop: 'kelp',
      stops: ['#04121f', '#020a14', '#01050c'],
      ray: 'rgba(120,255,220,0.035)', rayCount: 5, raySpeed: 10,
      prop1: '#0d3b34', prop2: '#12524a', propCount: 9
    }
  ];
  function biomeForSize(size) {
    if (size <= 2) return BIOMES[0];
    if (size <= 4) return BIOMES[1];
    return BIOMES[2];
  }

  /* Relic pickups. `life` values are durations in seconds; 0 means instant. */
  var RELICS = [
    { id: 'heart', label: 'Heart', glyph: '❤️', dur: 0, tip: '+1 heart' },
    { id: 'ward',  label: 'Ward',  glyph: '⭐', dur: 5, tip: 'Shield for 5s' },
    { id: 'swirl', label: 'Swirl', glyph: '🌰', dur: 0, tip: 'Swirl prey toward you' },
    { id: 'pearl', label: 'Pearl', glyph: '🦎', dur: 0, tip: '+320 points' },
    { id: 'drift', label: 'Drift', glyph: '⏳', dur: 3, tip: 'Time slows to 45%' },
    { id: 'gills', label: 'Gills', glyph: '💨', dur: 8, tip: 'Dash cooldown halved' }
  ];

  /* Tuning constants. Everything the old file scattered as inline magic numbers. */
  var TUNE = {
    /* player */
    baseRadius: 28,        // player radius = baseRadius + size * sizeRadiusPer
    sizeRadiusPer: 7,      // size 1 -> 35, size 5 -> 63
    baseSpeed: 168,        // px/s at rest
    accel: 14,             // steering approach rate
    inertia: 6.2,          // velocity decay
    frenzySpeed: 1.12,     // speed bonus at full frenzy

    /* actions */
    biteWindow: 0.34,      // chomp active time
    biteCooldown: 0.48,
    biteCone: 0.95,        // half-angle, radians
    biteReach: 2.4,        // x player radius
    biteMult: 1.4,         // score multiplier for a chomp
    dashTime: 0.5,
    dashCooldown: 2.7,
    dashIFrames: 0.8,
    dashSpeed: 3.1,        // x baseSpeed

    /* damage */
    iframes: 1.4,
    hitKnockback: 260,
    predatorKnockback: 520,

    /* scoring */
    comboWindow: 1.8,
    comboTiers: [1, 2, 3, 4],  // index by floor(combo/3) clamp
    nearMiss: 40,
    nearMissStep: 12,
    goldChance: 0.05,
    goldMult: 1.6,
    winFlat: 200,
    winPerLife: 0,         // deliberately 0: lives must not pay out, or Easy banks more than Hard
    winPerChain: 15,
    winPerNear: 25,

    /* growth */
    xpPerSize: 4,          // level cost = size * xpPerSize, remainder carries

    /* spawning */
    startSchool: 9,
    spawnInterval: 0.42,   // base seconds between spawns, divided by spd
    dangerChance: 0.22,    // chance a spawn is forced to a dangerous tier
    relicIntervalMin: 5.8,
    relicIntervalMax: 9.2,
    relicMagnet: 1.1,
    maxFish: 30,            // scaled by viewport area

    /* AI radii (x player radius) */
    magnetR: 3.2,
    fleeR: 5.4,            // prey start fleeing once the player is this close
    chaseR: 6.0,
    predatorSpawnDelay: 0.55,

    /* frenzy */
    frenzyPerEat: 0.08,
    frenzyDecay: 0.035,
    frenzySpawnBoost: 1.5,
    frenzySpeedBoost: 1.12,

    /* powerups */
    wardDur: 5,           // star shield, seconds
    driftScale: 0.45,      // time multiplier while Drift is active
    driftDur: 3,           // seconds
    driftHitbox: 0.85,     // player hitbox multiplier while Drift is active
    gillsMult: 0.5,        // dash cooldown multiplier
    gillsDur: 8,           // seconds
    swirlRadius: 340,
    swirlPull: 0.58,

    /* growth feel */
    growSlowMo: 0.45,      // seconds of time dilation on level-up
    growSlowScale: 0.35
  };

  var SHData = {
    DIFF: DIFF,
    DIFF_KEYS: DIFF_KEYS,
    TIERS: TIERS,
    APEX: APEX,
    SIZE_NAMES: SIZE_NAMES,
    MAX_SIZE: MAX_SIZE,
    WIN_SIZE: WIN_SIZE,
    HOLD_TIME: HOLD_TIME,
    BIOMES: BIOMES,
    biomeForSize: biomeForSize,
    RELICS: RELICS,
    TUNE: TUNE,
    tier: function (n) { return TIERS[n] || TIERS[TIERS.length - 1]; }
  };

  global.SHData = SHData;
  if (typeof module !== 'undefined' && module.exports) module.exports = SHData;
})(typeof window !== 'undefined' ? window : globalThis);
