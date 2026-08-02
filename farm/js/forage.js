/* ========================================
   Amber's Farm — Wild foraging (Iteration 3)
   ======================================== */

const Forage = (() => {
  function tryPick(state, tx, ty) {
    const t = World.getTile(state, tx, ty);
    if (t !== TILE.FLOWER && t !== TILE.MUSHROOM && t !== TILE.SHELL) return false;
    const key = (state.scene || 'outdoor') + ':' + tx + ',' + ty;
    if (!state.forage) state.forage = {};
    if (state.forage[key] === state.day) {
      UI.toast('Already picked today');
      return true;
    }
    state.forage[key] = state.day;

    if (t === TILE.MUSHROOM) {
      return pickMushroom(state, tx, ty);
    }
    if (t === TILE.SHELL) {
      return pickShell(state, tx, ty);
    }

    const roll = Math.random();
    if (roll < 0.55) {
      const coins = Utils.randInt(3, 8);
      state.coins += coins;
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, `+${coins}g`, CONST.COLORS.amberGold);
      FarmAudio.coins();
      UI.toast(`Picked a flower — +${coins}g! 🌸`);
    } else if (roll < 0.85) {
      state.inventory.seeds.radish = (state.inventory.seeds.radish || 0) + 1;
      Shop.rebuildHotbar(state);
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE + 10, '+🌱', '#7ED957');
      FarmAudio.plant();
      UI.toast('Found a wild seed! 🌱');
    } else {
      Particles.hearts(tx * CONST.TILE + 20, ty * CONST.TILE + 20);
      FarmAudio.pet();
      UI.toast('So pretty! ✨');
    }
    Game.tryAchieve('first_forage');
    state.stats.foraged = (state.stats.foraged || 0) + 1;
    if (typeof Quests !== 'undefined') Quests.progress(state, 'forage', 1);
    return true;
  }

  function pickMushroom(state, tx, ty) {
    // Wren's blessing (heart 2): today mushrooms always yield a real one
    const wrenBless = state.wrenMushroomLuck === state.day;
    const roll = wrenBless ? 0.6 : Math.random();
    if (roll < 0.5) {
      const coins = Utils.randInt(8, 18);
      state.coins += coins;
      FarmAudio.coins();
      UI.toast(`Tasty mushroom! +${coins}g 🍄`);
    } else if (roll < 0.8) {
      if (!state.inventory.products) state.inventory.products = {};
      state.inventory.products.mushroom = (state.inventory.products.mushroom || 0) + 1;
      if (!PRODUCT_DEFS.mushroom) {
        PRODUCT_DEFS.mushroom = { id: 'mushroom', name: 'Mushroom', emoji: '🍄', sell: 30 };
      }
      FarmAudio.harvest();
      UI.toast('Picked a mushroom to ship! 🍄');
    } else {
      state.inventory.fertilizer = (state.inventory.fertilizer || 0) + 1;
      FarmAudio.success();
      UI.toast('Found fertilizer under a log! 🧪');
    }
    Particles.burst(tx * CONST.TILE + 16, ty * CONST.TILE + 16, 10, ['#c0392b', '#8b4513', '#fff'], { speedMax: 50 });
    Game.tryAchieve('first_forage');
    Game.tryAchieve('forest_forage');
    state.stats.foraged = (state.stats.foraged || 0) + 1;
    if (typeof Quests !== 'undefined') Quests.progress(state, 'forage', 1);
    return true;
  }

  function pickShell(state, tx, ty) {
    const roll = Math.random();
    if (roll < 0.45) {
      const coins = Utils.randInt(10, 22);
      state.coins += coins;
      FarmAudio.coins();
      UI.toast(`Pretty shell! +${coins}g 🐚`);
    } else if (roll < 0.85) {
      if (!state.inventory.products) state.inventory.products = {};
      state.inventory.products.shell = (state.inventory.products.shell || 0) + 1;
      if (!PRODUCT_DEFS.shell) {
        PRODUCT_DEFS.shell = { id: 'shell', name: 'Seashell', emoji: '🐚', sell: 35 };
      }
      FarmAudio.harvest();
      UI.toast('Collected a seashell to ship! 🐚');
    } else {
      state.coins += 5;
      state.inventory.seeds.radish = (state.inventory.seeds.radish || 0) + 1;
      Shop.rebuildHotbar(state);
      FarmAudio.success();
      UI.toast('A shell… and a seed stuck inside! 🌱');
    }
    Particles.burst(tx * CONST.TILE + 16, ty * CONST.TILE + 16, 10, ['#fff8e0', '#7ec8e3', '#f0d040'], { speedMax: 50 });
    Game.tryAchieve('first_forage');
    Game.tryAchieve('beach_comber');
    state.stats.foraged = (state.stats.foraged || 0) + 1;
    if (typeof Quests !== 'undefined') Quests.progress(state, 'forage', 1);
    return true;
  }

  function isPicked(state, tx, ty) {
    if (!state.forage) return false;
    const key = (state.scene || 'outdoor') + ':' + tx + ',' + ty;
    return state.forage[key] === state.day;
  }

  return { tryPick, isPicked };
})();
