/* ========================================
   Amber's Farm — Cooking
   ======================================== */

const Kitchen = (() => {
  function canCook(state, recipeId) {
    const r = RECIPES[recipeId];
    if (!r) return false;
    if (!r.unlock && !state.recipesUnlocked[recipeId]) return false;
    for (const [item, need] of Object.entries(r.needs)) {
      if (countItem(state, item) < need) return false;
    }
    return true;
  }

  function countItem(state, item) {
    if (state.inventory.crops[item] && state.inventory.crops[item].length) {
      return state.inventory.crops[item].length;
    }
    if (state.inventory.products[item]) return state.inventory.products[item];
    // star variants for egg/milk
    if (item === 'egg') {
      return (state.inventory.products.egg || 0) + (state.inventory.products.egg_star || 0);
    }
    if (item === 'milk') {
      return (state.inventory.products.milk || 0) + (state.inventory.products.milk_star || 0);
    }
    if (item === 'goat_milk') {
      return (state.inventory.products.goat_milk || 0) + (state.inventory.products.goat_milk_star || 0);
    }
    return 0;
  }

  function consume(state, item, n) {
    for (let i = 0; i < n; i++) {
      if (state.inventory.crops[item] && state.inventory.crops[item].length) {
        state.inventory.crops[item].pop();
        continue;
      }
      if (item === 'egg') {
        if (state.inventory.products.egg) { state.inventory.products.egg--; continue; }
        if (state.inventory.products.egg_star) { state.inventory.products.egg_star--; continue; }
      }
      if (item === 'milk') {
        if (state.inventory.products.milk) { state.inventory.products.milk--; continue; }
        if (state.inventory.products.milk_star) { state.inventory.products.milk_star--; continue; }
      }
      if (item === 'goat_milk') {
        if (state.inventory.products.goat_milk) { state.inventory.products.goat_milk--; continue; }
        if (state.inventory.products.goat_milk_star) { state.inventory.products.goat_milk_star--; continue; }
      }
      if (state.inventory.products[item]) state.inventory.products[item]--;
    }
  }

  function cook(state, recipeId) {
    const r = RECIPES[recipeId];
    if (!r) return;
    if (!canCook(state, recipeId)) {
      UI.toast('Missing ingredients or recipe locked');
      FarmAudio.error();
      return;
    }
    for (const [item, need] of Object.entries(r.needs)) {
      consume(state, item, need);
    }
    state.inventory.dishes[recipeId] = (state.inventory.dishes[recipeId] || 0) + 1;
    FarmAudio.success();
    Particles.confetti(CONST.VIEW_W / 2, CONST.VIEW_H / 2);
    UI.toast(`Cooked ${r.emoji} ${r.name}!`);
    Game.tryAchieve('first_cook');
    state.stats.cooked = (state.stats.cooked || 0) + 1;
    if (typeof Quests !== 'undefined') Quests.progress(state, 'cook', 1);
    UI.refreshKitchen();
    UI.refreshHUD();
  }

  function unlockFromStars(state) {
    for (const r of Object.values(RECIPES)) {
      if (r.unlockStar && state.achievements[r.unlockStar]) {
        state.recipesUnlocked[r.id] = true;
      }
    }
    if (Game.totalStars(state) >= 8) {
      state.recipesUnlocked.amber_stew = true;
      if (!state.achievements.farm_rank_3) {
        Game.tryAchieve('farm_rank_3');
      }
    }
  }

  return { canCook, cook, countItem, unlockFromStars };
})();
