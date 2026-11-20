/* ========================================
   Amber's Farm — Soil & Crops
   ======================================== */

const Farming = (() => {
  function soilKey(tx, ty) {
    return tx + ',' + ty;
  }

  function getSoil(state, tx, ty) {
    return state.soil[soilKey(tx, ty)] || null;
  }

  function ensureSoil(state, tx, ty) {
    const k = soilKey(tx, ty);
    if (!state.soil[k]) {
      state.soil[k] = {
        tx, ty,
        tilled: false,
        watered: false,
        cropId: null,
        stage: 0,          // 0..stages
        growProgress: 0,   // days of watered growth
        wateredStreak: 0,
        quality: 0,
        mature: false,
      };
    }
    return state.soil[k];
  }

  function canFarm(state, tx, ty) {
    if (state.scene !== 'outdoor') return false;
    const t = World.getTile(state, tx, ty);
    if (t === TILE.DIRT) return true;
    // Cleared rocks become dirt
    if (state.clearedRocks[soilKey(tx, ty)]) return true;
    return false;
  }

  function hoe(state, tx, ty) {
    if (!canFarm(state, tx, ty)) return false;
    const s = ensureSoil(state, tx, ty);
    if (s.cropId) return false;
    if (s.tilled) return false; // already tilled — no energy waste
    s.tilled = true;
    FarmAudio.hoe();
    if (typeof Game !== 'undefined' && Game.spendEnergy) Game.spendEnergy(CONST.ENERGY_TOOL);
    const px = tx * CONST.TILE + CONST.TILE / 2;
    const py = ty * CONST.TILE + CONST.TILE / 2;
    Particles.burst(px, py, 6, ['#C4A574', '#8B6914'], { speedMax: 40, gravity: 30 });
    return true;
  }

  function plant(state, tx, ty, cropId) {
    if (!canFarm(state, tx, ty)) return false;
    const crop = CROPS[cropId];
    if (!crop) return false;
    const season = TimeSys.seasonName(state);
    if (!crop.seasons.includes(season)) {
      UI.toast(`Plant ${crop.name} in ${crop.seasons.join('/')}`);
      FarmAudio.error();
      return false;
    }
    const inv = state.inventory.seeds[cropId] || 0;
    if (inv <= 0) {
      UI.toast('No seeds!');
      FarmAudio.error();
      return false;
    }
    const s = ensureSoil(state, tx, ty);
    if (!s.tilled) {
      UI.toast('Hoe the soil first!');
      FarmAudio.error();
      return false;
    }
    if (s.cropId) return false;

    state.inventory.seeds[cropId]--;
    s.cropId = cropId;
    s.stage = 0;
    s.growProgress = 0;
    s.wateredStreak = 0;
    s.quality = 0;
    s.mature = false;
    s.watered = false;
    FarmAudio.plant();
    if (typeof Game !== 'undefined' && Game.spendEnergy) Game.spendEnergy(CONST.ENERGY_TOOL);
    // Optional fertilizer boost if available
    if ((state.inventory.fertilizer || 0) > 0 && Math.random() < 0.35) {
      s.quality = Math.max(s.quality, 1);
      state.inventory.fertilizer--;
      Particles.floatText(tx * CONST.TILE + 20, ty * CONST.TILE, 'Fertilized!', '#7ED957');
    }
    Shop.rebuildHotbar(state);
    Game.tryAchieve('first_plant');
    if (cropId === 'winter_root') Game.tryAchieve('winter_grow');
    const px = tx * CONST.TILE + CONST.TILE / 2;
    const py = ty * CONST.TILE + CONST.TILE / 2;
    Particles.burst(px, py, 8, [crop.color, crop.leaf, '#FFF8F0'], { speedMax: 50 });
    Particles.floatText(px, py - 10, crop.emoji, crop.color);
    return true;
  }

  function waterAt(state, tx, ty) {
    if (!canFarm(state, tx, ty)) return false;
    const s = getSoil(state, tx, ty);
    if (!s || !s.tilled) return false;
    if (s.watered) return false;
    s.watered = true;
    if (typeof Quests !== 'undefined') Quests.progress(state, 'water', 1);
    const px = tx * CONST.TILE + CONST.TILE / 2;
    const py = ty * CONST.TILE + CONST.TILE / 2;
    Particles.water(px, py);
    return true;
  }

  function waterTool(state, tx, ty) {
    // 1x1 or 3x3 if upgraded — energy once per swing
    const r = state.waterUpgrade ? 1 : 0;
    let any = false;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (waterAt(state, tx + dx, ty + dy)) any = true;
      }
    }
    if (!any) {
      FarmAudio.error();
      return false;
    }
    FarmAudio.water();
    if (typeof Game !== 'undefined' && Game.spendEnergy) Game.spendEnergy(CONST.ENERGY_TOOL);
    return true;
  }

  function harvest(state, tx, ty) {
    const s = getSoil(state, tx, ty);
    if (!s || !s.cropId || !s.mature) return false;
    const crop = CROPS[s.cropId];
    const quality = s.quality;
    const id = s.cropId;

    // Add to inventory crops
    if (!state.inventory.crops[id]) state.inventory.crops[id] = [];
    state.inventory.crops[id].push(quality);

    FarmAudio.harvest();
    if (typeof Game !== 'undefined' && Game.spendEnergy) Game.spendEnergy(CONST.ENERGY_HARVEST);
    Game.tryAchieve('first_harvest');
    if (id === 'blueberry') Game.tryAchieve('first_blueberry');
    if (id === 'melon') Game.tryAchieve('melon_king');
    if (id === 'pumpkin') Game.tryAchieve('fall_harvest');
    state.stats.harvested = (state.stats.harvested || 0) + 1;
    if (state.stats.harvested >= 25 && window.AmberTrophies) window.AmberTrophies.award('farm_harvest');
    if (typeof Quests !== 'undefined') Quests.progress(state, 'harvest', 1);

    const px = tx * CONST.TILE + CONST.TILE / 2;
    const py = ty * CONST.TILE + CONST.TILE / 2;
    Particles.harvest(px, py);
    const q = Utils.qualityStars(quality);
    Particles.floatText(px, py - 16, `+${crop.emoji}${q}`, CONST.COLORS.amberGold);

    if (crop.regrow) {
      s.mature = false;
      s.growProgress = crop.growDays - (crop.regrowDays || 2);
      s.stage = Math.max(1, crop.stages - 2);
      s.watered = false;
    } else {
      s.cropId = null;
      s.stage = 0;
      s.growProgress = 0;
      s.mature = false;
      s.watered = false;
      s.quality = 0;
      s.wateredStreak = 0;
      // keep tilled
    }
    return true;
  }

  /**
   * Process end-of-day crop growth using current watered flags (before day rolls).
   * Call BEFORE TimeSys.sleep. Does not apply next-day weather.
   * @param {object} state
   * @param {string} endingWeather weather of the day that just ended
   */
  function overnightGrowth(state, endingWeather) {
    // Ending-day rain/snow counts as watered
    if (endingWeather === 'rain' || endingWeather === 'snow') {
      for (const k of Object.keys(state.soil)) {
        const s = state.soil[k];
        if (s.tilled) s.watered = true;
      }
    }

    const season = TimeSys.seasonName(state);

    for (const k of Object.keys(state.soil)) {
      const s = state.soil[k];
      if (!s.cropId || s.mature) {
        s.watered = false;
        continue;
      }
      const crop = CROPS[s.cropId];
      if (!crop) {
        s.watered = false;
        continue;
      }

      // Off-season: growth pauses (still need re-water next day)
      const inSeason = crop.seasons && crop.seasons.includes(season);
      if (s.watered && inSeason) {
        s.growProgress += 1;
        s.wateredStreak += 1;
        if (s.wateredStreak >= crop.growDays) s.quality = Math.max(s.quality, 1);
        if (s.wateredStreak >= crop.growDays + 1) s.quality = 2;

        const ratio = s.growProgress / crop.growDays;
        s.stage = Math.min(crop.stages - 1, Math.floor(ratio * crop.stages));
        if (s.growProgress >= crop.growDays) {
          s.mature = true;
          s.stage = crop.stages;
        }
      } else if (s.watered && !inSeason) {
        // Watered off-season: no growth, streak preserved soft (no penalty)
      }
      s.watered = false;
    }
  }

  /** After TimeSys.sleep — auto-water for new morning weather */
  function applyMorningWeather(state) {
    if (state.weather === 'rain' || state.weather === 'snow') {
      for (const k of Object.keys(state.soil)) {
        if (state.soil[k].tilled) state.soil[k].watered = true;
      }
    }
  }

  function clearRock(state, tx, ty) {
    const t = World.getTile(state, tx, ty);
    if (t !== TILE.ROCK) return false;
    if (state.coins < 40) {
      UI.toast('Need 40 coins to clear rocks');
      FarmAudio.error();
      return false;
    }
    state.coins -= 40;
    state.clearedRocks[soilKey(tx, ty)] = true;
    FarmAudio.success();
    UI.toast('New farm plot unlocked! 🌍');
    Particles.burst(
      tx * CONST.TILE + 20, ty * CONST.TILE + 20,
      12, ['#888', '#C4A574', '#FFB347'], { speedMax: 70 }
    );
    return true;
  }

  function sellPrice(cropId, quality) {
    const c = CROPS[cropId];
    if (!c) return 0;
    const mult = quality >= 2 ? 1.5 : quality >= 1 ? 1.25 : 1;
    return Math.floor(c.sell * mult);
  }

  return {
    soilKey, getSoil, ensureSoil, canFarm, hoe, plant, waterTool, harvest,
    overnightGrowth, applyMorningWeather, clearRock, sellPrice,
  };
})();
