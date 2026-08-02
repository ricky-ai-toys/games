/* ========================================
   Amber's Farm — Shop / Shipping
   ======================================== */

const Shop = (() => {
  function seedCatalog(state) {
    const season = TimeSys.seasonName(state);
    return CROP_LIST.map(id => {
      const c = CROPS[id];
      return {
        id,
        name: c.name + ' Seeds',
        emoji: c.emoji,
        cost: c.seedCost,
        inSeason: c.seasons.includes(season),
        seasons: c.seasons,
      };
    });
  }

  function buySeed(state, cropId) {
    const c = CROPS[cropId];
    if (!c) return;
    if (!c.seasons.includes(TimeSys.seasonName(state))) {
      UI.toast(`These grow in ${c.seasons.join('/')}`);
      FarmAudio.error();
      return;
    }
    if (state.coins < c.seedCost) {
      UI.toast('Not enough coins');
      FarmAudio.error();
      return;
    }
    state.coins -= c.seedCost;
    state.inventory.seeds[cropId] = (state.inventory.seeds[cropId] || 0) + 1;
    rebuildHotbar(state);
    FarmAudio.coins();
    UI.toast(`Bought ${c.emoji} ${c.name} seeds!`);
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyFeed(state) {
    if (state.coins < 5) {
      UI.toast('Need 5 coins');
      FarmAudio.error();
      return;
    }
    state.coins -= 5;
    state.inventory.feed = (state.inventory.feed || 0) + 1;
    FarmAudio.coins();
    UI.toast('Bought animal feed 🌾');
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyFertilizer(state) {
    if (state.coins < 20) {
      UI.toast('Need 20g');
      FarmAudio.error();
      return;
    }
    state.coins -= 20;
    state.inventory.fertilizer = (state.inventory.fertilizer || 0) + 1;
    FarmAudio.coins();
    UI.toast('Bought fertilizer — chance of ★ crops!');
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyRod(state) {
    const cur = state.inventory.rod || 0;
    if (cur >= 2) {
      UI.toast('Best rod already owned!');
      return;
    }
    const cost = cur === 0 ? 100 : 200;
    const next = cur + 1;
    if (state.coins < cost) {
      UI.toast('Need ' + cost + 'g');
      FarmAudio.error();
      return;
    }
    state.coins -= cost;
    state.inventory.rod = next;
    FarmAudio.success();
    UI.toast(next === 1 ? 'Fishing rod bought! Try the pond 🎣' : 'Fiberglass rod! Wider catch zone 🎣');
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyWaterUpgrade(state) {
    if (state.waterUpgrade) {
      UI.toast('Already upgraded!');
      return;
    }
    if (state.coins < 150) {
      UI.toast('Need 150 coins');
      FarmAudio.error();
      return;
    }
    state.coins -= 150;
    state.waterUpgrade = true;
    FarmAudio.success();
    UI.toast('Copper Watering Can! Waters 3×3 💧');
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyDecor(state, decorId) {
    const d = Decor.DEFS[decorId];
    if (!d) return;
    if (state.coins < d.cost) {
      UI.toast('Not enough coins');
      FarmAudio.error();
      return;
    }
    state.coins -= d.cost;
    state.inventory.decor[decorId] = (state.inventory.decor[decorId] || 0) + 1;
    rebuildHotbar(state);
    FarmAudio.coins();
    UI.toast(`Bought ${d.emoji} ${d.name}!`);
    UI.refreshShop();
    UI.refreshHUD();
  }

  function buyHomeFurniture(state, homeId) {
    const d = (typeof Home !== 'undefined') ? Home.DEFS[homeId] : null;
    if (!d) return;
    if (state.coins < d.cost) {
      UI.toast('Not enough coins');
      FarmAudio.error();
      return;
    }
    state.coins -= d.cost;
    state.inventory.homedec[homeId] = (state.inventory.homedec[homeId] || 0) + 1;
    rebuildHotbar(state);
    FarmAudio.coins();
    UI.toast(`Bought ${d.emoji} ${d.name}!`);
    UI.refreshShop();
    UI.refreshHUD();
  }

  /** Buy a snack at the village market stall */
  function buySnack(state, snackId) {
    const def = PRODUCT_DEFS[snackId];
    const SNACKS = { snack_cookie: 15, snack_cocoa: 20, snack_bouquet: 25 };
    if (!def || !SNACKS[snackId]) return;
    const cost = SNACKS[snackId];
    if (state.coins < cost) {
      UI.toast('Not enough coins');
      FarmAudio.error();
      return;
    }
    state.coins -= cost;
    state.inventory.products[snackId] = (state.inventory.products[snackId] || 0) + 1;
    rebuildHotbar(state);
    FarmAudio.coins();
    UI.toast(`Bought ${def.emoji} ${def.name}!`);
    UI.refreshStall();
    UI.refreshHUD();
  }

  /** Sell one item instantly for coins (Sell Box — for unwanted extras) */
  function sellItemNow(state, kind, id) {
    let price = 0;
    if (kind === 'crop') {
      const arr = state.inventory.crops[id];
      if (!arr || !arr.length) return;
      const q = arr.pop();
      price = Farming.sellPrice(id, q);
    } else if (kind === 'product') {
      if (!state.inventory.products[id]) return;
      state.inventory.products[id]--;
      const def = PRODUCT_DEFS[id];
      if (!def) {
        UI.toast('Unknown item — sold for 10g');
      }
      price = def ? def.sell : 10;
    } else if (kind === 'dish') {
      if (!state.inventory.dishes[id]) return;
      state.inventory.dishes[id]--;
      const r = RECIPES[id];
      price = r ? r.sell : 20;
    }
    if (!price) return;
    state.coins += price;
    state.stats.shipped = (state.stats.shipped || 0) + 1;
    FarmAudio.coins();
    Particles.floatText(state.player.x, state.player.y - 24, '+' + price + '🪙', CONST.COLORS.amberGold);
    UI.toast(`Sold for ${price}🪙!`);
    if (state.coins >= 500) Game.tryAchieve('wealthy');
    UI.refreshSellBox();
    UI.refreshHUD();
  }

  /** One-time building upgrades: bigger coop / bigger barn */
  function buyUpgrade(state, which) {
    if (which === 'coop') {
      if (state.coopUpgraded) {
        UI.toast('Bigger coop already built!');
        return;
      }
      if (state.coins < 200) {
        UI.toast('Need 200 coins');
        FarmAudio.error();
        return;
      }
      state.coins -= 200;
      state.coopUpgraded = true;
      FarmAudio.success();
      UI.toast('Bigger Coop! Now holds 6 chickens 🐔');
    } else if (which === 'barn') {
      if (state.barnUpgraded) {
        UI.toast('Bigger barn already built!');
        return;
      }
      if (state.coins < 300) {
        UI.toast('Need 300 coins');
        FarmAudio.error();
        return;
      }
      state.coins -= 300;
      state.barnUpgraded = true;
      FarmAudio.success();
      UI.toast('Bigger Barn! Now holds 6 animals 🐄');
    } else {
      return;
    }
    UI.refreshShop();
    UI.refreshHUD();
  }

  function shipItem(state, kind, id) {
    // kind: crop | product | dish
    let shipped = false;
    if (kind === 'crop') {
      const arr = state.inventory.crops[id];
      if (!arr || !arr.length) return;
      const q = arr.pop();
      state.shipping.push({ kind, id, quality: q, price: Farming.sellPrice(id, q) });
      shipped = true;
    } else if (kind === 'product') {
      if (!state.inventory.products[id]) return;
      state.inventory.products[id]--;
      const def = PRODUCT_DEFS[id];
      if (!def) {
        UI.toast('Unknown item — sold for 10g');
      }
      state.shipping.push({ kind, id, price: def ? def.sell : 10 });
      shipped = true;
    } else if (kind === 'dish') {
      if (!state.inventory.dishes[id]) return;
      state.inventory.dishes[id]--;
      const r = RECIPES[id];
      state.shipping.push({ kind, id, price: r ? r.sell : 20 });
      shipped = true;
    }
    if (!shipped) return;
    FarmAudio.click();
    Game.tryAchieve('first_ship');
    if (typeof Quests !== 'undefined') Quests.progress(state, 'ship', 1);
    UI.refreshShipping();
    UI.refreshHUD();
  }

  function shipAll(state) {
    let n = 0;
    for (const id of Object.keys(state.inventory.crops || {})) {
      const arr = state.inventory.crops[id] || [];
      while (arr.length) {
        const q = arr.pop();
        state.shipping.push({ kind: 'crop', id, quality: q, price: Farming.sellPrice(id, q) });
        n++;
      }
    }
    for (const id of Object.keys(state.inventory.products || {})) {
      while (state.inventory.products[id] > 0) {
        state.inventory.products[id]--;
        const def = PRODUCT_DEFS[id];
        state.shipping.push({ kind: 'product', id, price: def ? def.sell : 10 });
        n++;
      }
    }
    for (const id of Object.keys(state.inventory.dishes || {})) {
      while (state.inventory.dishes[id] > 0) {
        state.inventory.dishes[id]--;
        const r = RECIPES[id];
        state.shipping.push({ kind: 'dish', id, price: r ? r.sell : 20 });
        n++;
      }
    }
    if (n > 0) {
      FarmAudio.success();
      Game.tryAchieve('first_ship');
      if (typeof Quests !== 'undefined') Quests.progress(state, 'ship', n);
      UI.toast(`Shipped ${n} items! 📦`);
      UI.refreshShipping();
      UI.refreshHUD();
    } else {
      UI.toast('Nothing to ship yet');
      FarmAudio.error();
    }
  }

  function resolveShipping(state) {
    let total = 0;
    for (const item of state.shipping) {
      total += item.price || 0;
    }
    const count = state.shipping.length;
    state.shipping = [];
    state.coins += total;
    if (total > 0) {
      state.stats.shipped = (state.stats.shipped || 0) + count;
      if (state.coins >= 500) Game.tryAchieve('wealthy');
    }
    return total;
  }

  function rebuildHotbar(state) {
    const bar = [];
    bar.push({ type: 'hand', name: 'Hand (auto)', emoji: '✋' });
    bar.push({ type: 'hoe', name: 'Hoe', emoji: '' });
    bar.push({ type: 'water', name: 'Watering Can', emoji: '💧' });
    bar.push({ type: 'basket', name: 'Harvest', emoji: '🧺' });
    // Seeds with count
    for (const id of CROP_LIST) {
      const n = state.inventory.seeds[id] || 0;
      if (n > 0) bar.push({ type: 'seed', id, name: CROPS[id].name, emoji: CROPS[id].emoji, count: n });
    }
    for (const id of Object.keys(state.inventory.decor || {})) {
      const n = state.inventory.decor[id];
      if (n > 0 && Decor.DEFS[id]) {
        bar.push({ type: 'decor', id, name: Decor.DEFS[id].name, emoji: Decor.DEFS[id].emoji, count: n });
      }
    }
    if (typeof Home !== 'undefined') {
      for (const id of Object.keys(state.inventory.homedec || {})) {
        const n = state.inventory.homedec[id];
        if (n > 0 && Home.DEFS[id]) {
          bar.push({ type: 'homedec', id, name: Home.DEFS[id].name, emoji: Home.DEFS[id].emoji, count: n });
        }
      }
    }
    state.hotbar = bar;
    if (state.selectedSlot >= bar.length) state.selectedSlot = 0;
    state._hotbarSig = ''; // force HUD slot refresh
  }

  return {
    seedCatalog, buySeed, buyFeed, buyFertilizer, buyRod, buyWaterUpgrade, buyDecor,
    buyHomeFurniture,
    shipItem, shipAll, resolveShipping, sellItemNow, buyUpgrade, buySnack, rebuildHotbar,
  };
})();
