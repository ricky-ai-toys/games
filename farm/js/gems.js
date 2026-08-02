/* ========================================
   Amber's Farm — Gems, mining & village wishes (v3.0)
   ======================================== */

const Gems = (() => {
  // Gem rarity when chipping a node
  const NODE_CHIP = [
    { id: 'quartz', w: 34 },
    { id: 'amethyst', w: 17 },
    { id: 'emerald', w: 10 },
    { id: 'ruby', w: 5 },
  ];
  const NODE_GEODE_CHANCE = 0.25;
  const NODE_DUD_CHANCE = 0.08;

  const CRYSTAL_CHANCE = 0.5;

  const GEODE_TABLE = [
    { id: 'quartz', w: 38 },
    { id: 'amethyst', w: 24 },
    { id: 'emerald', w: 16 },
    { id: 'ruby', w: 14 },
    { id: 'star_gem', w: 8 },
  ];

  function key(state, tx, ty) {
    return (state.scene || 'outdoor') + ':' + tx + ',' + ty;
  }

  function pickedToday(state, tx, ty) {
    if (!state.forage) state.forage = {};
    return state.forage[key(state, tx, ty)] === state.day;
  }

  function markPicked(state, tx, ty) {
    if (!state.forage) state.forage = {};
    state.forage[key(state, tx, ty)] = state.day;
  }

  function gemCount(state) {
    return (state.inventory.products.star_gem || 0) > 0 ? 5
      : [['quartz', 1], ['amethyst', 2], ['emerald', 3], ['ruby', 4]].reduce(
        (m, [id, v]) => (state.inventory.products[id] || 0) > 0 ? Math.max(m, v) : m, 0);
  }

  function gemCollectAll(state) {
    return ['quartz', 'amethyst', 'emerald', 'ruby', 'star_gem']
      .every(id => (state.inventory.products[id] || 0) > 0);
  }

  function addGem(state, id) {
    if (!state.inventory.products[id]) state.inventory.products[id] = 0;
    state.inventory.products[id]++;
    Game.tryAchieve('gem_finder');
    if (gemCollectAll(state)) {
      Game.tryAchieve('gem_collector');
      if (!state.gemCelebrated) {
        state.gemCelebrated = true;
        UI.toast('You found every gem! Tell Rori! ⭐');
        Particles.confetti(0, 0);
      }
    }
    Shop.rebuildHotbar(state);
  }

  function tryInteract(state, tx, ty) {
    const t = World.getTile(state, tx, ty);
    if (t === TILE.GEM_NODE) return chipNode(state, tx, ty);
    if (t === TILE.CRYSTAL) return pickCrystal(state, tx, ty);
    if (t === TILE.GEODE) return pickGeode(state, tx, ty);
    return false;
  }

  function geodeCount(state) {
    return state.geodes || 0;
  }

  function addGeode(state, n) {
    state.geodes = (state.geodes || 0) + (n || 1);
  }

  function chipNode(state, tx, ty) {
    if (pickedToday(state, tx, ty)) {
      UI.toast('Already chipped this spot today');
      return true;
    }
    if (typeof Game !== 'undefined' && Game.spendEnergy) Game.spendEnergy(2);
    markPicked(state, tx, ty);
    const roll = Math.random();
    if (roll < NODE_DUD_CHANCE) {
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, 'Worn out…', '#9E9E9E');
      FarmAudio.pet();
      UI.toast('The node crumbles — maybe tomorrow!');
      return true;
    }
    if (roll < NODE_DUD_CHANCE + NODE_GEODE_CHANCE) {
      addGeode(state, 1);
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, '+geode', '#8D6E63');
      FarmAudio.harvest();
      UI.toast('A geode rolls out! Crack it at the bench! 🥚');
      return true;
    }
    const gem = Utils.weightedPick(NODE_CHIP);
    addGem(state, gem.id);
    const def = PRODUCT_DEFS[gem.id];
    Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, '+' + def.emoji, CONST.COLORS.amberGold);
    Particles.harvest(tx * CONST.TILE + 20, ty * CONST.TILE + 20);
    FarmAudio.success();
    UI.toast(`Found ${def.name}! ${def.emoji}`);
    advanceTownWelcome(state);
    return true;
  }

  function pickCrystal(state, tx, ty) {
    if (pickedToday(state, tx, ty)) {
      UI.toast('Already picked today');
      return true;
    }
    markPicked(state, tx, ty);
    if (Math.random() < CRYSTAL_CHANCE) {
      const gem = Utils.weightedPick(NODE_CHIP);
      addGem(state, gem.id);
      const def = PRODUCT_DEFS[gem.id];
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, '+' + def.emoji, CONST.COLORS.amberGold);
      FarmAudio.success();
      UI.toast(`${def.name}! Sparkle! ${def.emoji}`);
      advanceTownWelcome(state);
    } else {
      const coins = Utils.randInt(3, 10);
      state.coins += coins;
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, `+${coins}g`, CONST.COLORS.amberGold);
      FarmAudio.coins();
      UI.toast('Just pretty pebbles — +' + coins + 'g ✨');
    }
    return true;
  }

  function pickGeode(state, tx, ty) {
    if (pickedToday(state, tx, ty)) {
      UI.toast('Already picked today');
      return true;
    }
    markPicked(state, tx, ty);
    addGeode(state, 1);
    Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, '+geode', '#8D6E63');
    FarmAudio.harvest();
    UI.toast('A geode! Crack it at Rori\'s bench! 🥚');
    return true;
  }

  /** Open a geode — always yields a gem (kid-safe) */
  function crackGeode(state) {
    if (geodeCount(state) <= 0) return null;
    state.geodes--;
    const gem = Utils.weightedPick(GEODE_TABLE);
    addGem(state, gem.id);
    Game.tryAchieve('geode_hunter');
    return gem;
  }

  function fountainWish(state) {
    const today = 'wish_' + state.day;
    if (state.wishes && state.wishes[today]) {
      UI.toast('The fountain already heard your wish today ✨');
      return true;
    }
    if (state.coins < 5) {
      UI.toast('Need 5 coins to make a wish');
      FarmAudio.error();
      return true;
    }
    state.coins -= 5;
    if (!state.wishes) state.wishes = {};
    state.wishes[today] = true;
    Particles.hearts(14.5 * CONST.TILE, 14.5 * CONST.TILE);
    FarmAudio.success();
    const roll = Math.random();
    if (roll < 0.4) {
      const coins = Utils.randInt(2, 8);
      state.coins += coins;
      Particles.floatText(14.5 * CONST.TILE, 14 * CONST.TILE, `+${coins}g`, CONST.COLORS.amberGold);
      UI.toast('The fountain gives back ' + coins + 'g! 🪙');
    } else if (roll < 0.6) {
      state.inventory.seeds.radish = (state.inventory.seeds.radish || 0) + 1;
      Shop.rebuildHotbar(state);
      UI.toast('A wild radish seed floats up! 🌱');
    } else if (roll < 0.75) {
      state.inventory.feed = (state.inventory.feed || 0) + 2;
      UI.toast('The wish brings feed for the animals! 🌾');
    } else {
      UI.toast('The fountain sparkles — a wish is a wish ✨');
    }
    return true;
  }

  /** Mayor Milo's Town Welcome: 1 flower → 2 crop → 3 gem */
  function advanceTownWelcome(state) {
    if (!state.townWelcome) state.townWelcome = 1;
    if (state.townWelcome >= 4) return;
    const stage = state.townWelcome;
    if (stage === 1 && (state.stats.foraged || 0) >= 1) state.townWelcome = 2;
    if (stage === 2 && (state.stats.harvested || 0) >= 1) state.townWelcome = 3;
    if (stage === 3 && gemCount(state) >= 1) state.townWelcome = 4;
    if (state.townWelcome === 4) {
      UI.toast('Town Welcome complete! Tell Milo! 🎩');
      FarmAudio.success();
    }
  }

  return {
    tryInteract, chipNode, pickCrystal, pickGeode, crackGeode,
    fountainWish, addGem, addGeode, geodeCount, gemCount, gemCollectAll, advanceTownWelcome, GEODE_TABLE,
  };
})();
