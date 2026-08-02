/* ========================================
   Amber's Farm — World / Collision / Interact
   Iteration 1: smarter targets, underfoot, prompts
   ======================================== */

const World = (() => {
  function initStateMaps(state) {
    state.outdoorTiles = MapData.createOutdoor();
    state.interior = MapData.createInterior();
    state.forest = MapData.createForest();
    state.beach = MapData.createBeach();
    state.mountain = MapData.createMountain();
    state.village = MapData.createVillage();
  }

  function mapDims(state) {
    if (state.scene === 'interior') {
      return { w: state.interior.w, h: state.interior.h };
    }
    if (state.scene === 'forest') {
      return { w: state.forest.w, h: state.forest.h };
    }
    if (state.scene === 'beach') {
      return { w: state.beach.w, h: state.beach.h };
    }
    if (state.scene === 'mountain') {
      return { w: state.mountain.w, h: state.mountain.h };
    }
    if (state.scene === 'village') {
      return { w: state.village.w, h: state.village.h };
    }
    return { w: CONST.MAP_W, h: CONST.MAP_H };
  }

  function locationName(state) {
    return {
      outdoor: 'The Farm',
      interior: 'Cottage',
      forest: 'Whispering Forest',
      beach: 'Sunny Beach',
      mountain: 'Mountain Pass',
      village: 'Village Market',
      title: 'Title',
    }[state.scene] || 'Valley';
  }

  function getTile(state, tx, ty) {
    if (state.scene === 'interior') {
      if (ty < 0 || tx < 0 || ty >= state.interior.h || tx >= state.interior.w) return TILE.WALL;
      return state.interior.tiles[ty][tx];
    }
    if (state.scene === 'forest') {
      if (ty < 0 || tx < 0 || ty >= state.forest.h || tx >= state.forest.w) return TILE.TREE;
      return state.forest.tiles[ty][tx];
    }
    if (state.scene === 'beach') {
      if (ty < 0 || tx < 0 || ty >= state.beach.h || tx >= state.beach.w) return TILE.WATER;
      return state.beach.tiles[ty][tx];
    }
    if (state.scene === 'mountain') {
      if (ty < 0 || tx < 0 || ty >= state.mountain.h || tx >= state.mountain.w) return TILE.ROCK;
      return state.mountain.tiles[ty][tx];
    }
    if (state.scene === 'village') {
      if (ty < 0 || tx < 0 || ty >= state.village.h || tx >= state.village.w) return TILE.TREE;
      return state.village.tiles[ty][tx];
    }
    if (ty < 0 || tx < 0 || ty >= CONST.MAP_H || tx >= CONST.MAP_W) return TILE.TREE;
    if (state.outdoorTiles[ty][tx] === TILE.ROCK && state.clearedRocks[tx + ',' + ty]) {
      return TILE.DIRT;
    }
    return state.outdoorTiles[ty][tx];
  }

  function isSolid(state, tx, ty) {
    const t = getTile(state, tx, ty);
    return (
      t === TILE.WATER ||
      t === TILE.FENCE ||
      t === TILE.HOUSE ||
      t === TILE.COOP ||
      t === TILE.BARN ||
      t === TILE.SHOP ||
      t === TILE.TREE ||
      t === TILE.WALL ||
      t === TILE.ROCK ||
      t === TILE.BIN ||
      t === TILE.SELLBOX ||
      t === TILE.BOARD ||
      t === TILE.BED ||
      t === TILE.KITCHEN ||
      t === TILE.WARDROBE ||
      t === TILE.WINDOW ||
      t === TILE.FOUNTAIN ||
      t === TILE.CRACK_BENCH ||
      t === TILE.POSTBOX ||
      t === TILE.STALL ||
      t === TILE.LAMP
    );
  }

  function blocks(state, tx, ty) {
    const t = getTile(state, tx, ty);
    // Coop south gate is walkable path painted as fence in map — allow center gate
    if (t === TILE.FENCE && ty === 20 && tx === 6) return false;
    if (t === TILE.DOOR || t === TILE.WARP || t === TILE.FISH_SPOT) return false;
    if (
      t === TILE.DECOR_SPOT || t === TILE.FLOWER || t === TILE.PATH ||
      t === TILE.GRASS || t === TILE.DIRT || t === TILE.FLOOR || t === TILE.MUSHROOM ||
      t === TILE.SAND || t === TILE.SHELL || t === TILE.CAVE ||
      t === TILE.GEM_NODE || t === TILE.CRYSTAL || t === TILE.GEODE || t === TILE.BENCH
    ) return false;
    // Beach rocks are solid (driftwood) but farm rocks too — keep solid
    return isSolid(state, tx, ty);
  }

  function resolveMove(state, x, y, hw, hh) {
    let nx = x;
    let ny = y;
    {
      let blocked = false;
      for (const [px, py] of [
        [x - hw, state.player.y - hh], [x + hw, state.player.y - hh],
        [x - hw, state.player.y + hh], [x + hw, state.player.y + hh],
      ]) {
        const { tx, ty } = Utils.tileAt(px, py);
        if (blocks(state, tx, ty)) { blocked = true; break; }
      }
      nx = blocked ? state.player.x : x;
    }
    {
      let blocked = false;
      for (const [px, py] of [
        [nx - hw, y - hh], [nx + hw, y - hh],
        [nx - hw, y + hh], [nx + hw, y + hh],
      ]) {
        const { tx, ty } = Utils.tileAt(px, py);
        if (blocks(state, tx, ty)) { blocked = true; break; }
      }
      ny = blocked ? state.player.y : y;
    }
    return { x: nx, y: ny };
  }

  function facingTile(state) {
    const p = state.player;
    let dx = 0, dy = 0;
    if (p.dir === 'up') dy = -1;
    if (p.dir === 'down') dy = 1;
    if (p.dir === 'left') dx = -1;
    if (p.dir === 'right') dx = 1;
    const { tx, ty } = Utils.tileAt(p.x, p.y);
    return { tx: tx + dx, ty: ty + dy };
  }

  function underfoot(state) {
    return Utils.tileAt(state.player.x, state.player.y);
  }

  /** Prefer facing tile; fall back to underfoot for furniture/doors */
  function targetTiles(state) {
    const face = facingTile(state);
    const under = underfoot(state);
    return [face, under];
  }

  function trySpecial(state, tx, ty) {
    const t = getTile(state, tx, ty);

    if (state.scene === 'interior') {
      // Furniture slot active → pick up placed pieces first
      const tool = state.hotbar[state.selectedSlot];
      if (tool && tool.type === 'homedec' && typeof Home !== 'undefined') {
        if (Home.pickup(state, tx, ty)) return true;
      }
      if (typeof Home !== 'undefined' && Home.interact(state, tx, ty)) return true;
      if (t === TILE.BED) { Game.requestSleep(); return true; }
      if (t === TILE.KITCHEN) { UI.openKitchen(); return true; }
      if (t === TILE.WARDROBE) { UI.openWardrobe(); return true; }
      if (t === TILE.DOOR) { enterOutdoor(state); return true; }
      return false;
    }

    if (t === TILE.WARP) {
      if (state.scene === 'forest') enterOutdoorFromForest(state);
      else if (state.scene === 'beach') enterOutdoorFromBeach(state);
      else if (state.scene === 'mountain') enterOutdoorFromMountain(state);
      else if (state.scene === 'village') enterOutdoorFromVillage(state);
      else if (state.scene === 'outdoor') {
        // Warp cells: north (14–15, 0) → forest; south (14–15, MAP_H-1) → beach;
        // east (W-1, 14–15) → mountain; west (0, 14–15) → village
        const toForest = (ty === 0 && (tx === 14 || tx === 15));
        const toBeach = (ty === CONST.MAP_H - 1 && (tx === 14 || tx === 15));
        const toMountain = (tx === CONST.MAP_W - 1 && (ty === 14 || ty === 15));
        const toVillage = (tx === 0 && (ty === 14 || ty === 15));
        if (toForest) enterForest(state);
        else if (toBeach) enterBeach(state);
        else if (toMountain) enterMountain(state);
        else if (toVillage) enterVillage(state);
        else if (ty <= 1) enterForest(state); // fallback
        else if (ty >= CONST.MAP_H - 1) enterBeach(state);
        else if (tx >= CONST.MAP_W - 1) enterMountain(state);
        else enterVillage(state);
      }
      return true;
    }
    if (t === TILE.DOOR && state.scene === 'outdoor') { enterInterior(state); return true; }
    if (t === TILE.BIN) { UI.openShipping(); return true; }
    if (t === TILE.SELLBOX) { UI.openSellBox(); return true; }
    if (t === TILE.SHOP) { UI.openShop(); return true; }
    if (t === TILE.BOARD) { UI.openQuestBoard(); return true; }
    if (t === TILE.CRACK_BENCH) { UI.openGeodeCracker(); return true; }
    if (t === TILE.POSTBOX) { UI.openPostbox(); return true; }
    if (t === TILE.STALL) { UI.openStall(); return true; }
    if (t === TILE.FOUNTAIN) { Gems.fountainWish(state); return true; }
    if (t === TILE.BENCH) { UI.toast('A nice spot to rest. 🪑'); FarmAudio.click(); return true; }
    if (t === TILE.LAMP) {
      UI.toast(state.period === 'evening' ? 'The lamp glows warm. 🏮' : 'A little lamp for the evening. 🏮');
      FarmAudio.click();
      return true;
    }
    if (t === TILE.GEM_NODE || t === TILE.CRYSTAL || t === TILE.GEODE) {
      return Gems.tryInteract(state, tx, ty);
    }
    if (t === TILE.COOP || t === TILE.BARN || t === TILE.FENCE) {
      if (Animals.interactNear(state)) return true;
      UI.openAnimalShop();
      return true;
    }
    if (t === TILE.ROCK) {
      if (state.scene !== 'outdoor') {
        UI.toast('Just driftwood — leave it be');
        return true;
      }
      Farming.clearRock(state, tx, ty);
      return true;
    }
    if (t === TILE.FLOWER || t === TILE.MUSHROOM || t === TILE.SHELL) {
      return Forage.tryPick(state, tx, ty);
    }
    if (t === TILE.FISH_SPOT || t === TILE.WATER) {
      // Fish from shore / facing water
      if (t === TILE.WATER || t === TILE.FISH_SPOT) {
        if (typeof Fishing !== 'undefined') return Fishing.tryStart(state);
      }
    }
    return false;
  }

  function useToolAt(state, tx, ty, tool) {
    if (!tool) return false;

    if (tool.type === 'decor') {
      return Decor.place(state, tx, ty, tool.id);
    }
    if (tool.type === 'homedec' && typeof Home !== 'undefined') {
      if (Home.pickup(state, tx, ty)) return true;
      return Home.place(state, tx, ty, tool.id);
    }
    if (tool.type === 'hoe') {
      const ok = Farming.hoe(state, tx, ty);
      if (ok) advanceTutorial(state, 'hoe');
      return ok;
    }
    if (tool.type === 'water') {
      const ok = Farming.waterTool(state, tx, ty);
      if (ok) advanceTutorial(state, 'water');
      return ok;
    }
    if (tool.type === 'seed') {
      const ok = Farming.plant(state, tx, ty, tool.id);
      if (ok) advanceTutorial(state, 'plant');
      return ok;
    }
    if (tool.type === 'hand' || tool.type === 'basket') {
      // Smart hand: contextual farm action
      if (Farming.harvest(state, tx, ty)) {
        advanceTutorial(state, 'harvest');
        return true;
      }
      // Auto-water if crop unwatered and not mature
      const s = Farming.getSoil(state, tx, ty);
      if (s && s.tilled && s.cropId && !s.watered && !s.mature) {
        if (Farming.waterTool(state, tx, ty)) {
          advanceTutorial(state, 'water');
          return true;
        }
      }
      // Auto-hoe empty dirt
      if (Farming.canFarm(state, tx, ty)) {
        const soil = Farming.getSoil(state, tx, ty);
        if (!soil || !soil.tilled) {
          if (Farming.hoe(state, tx, ty)) {
            advanceTutorial(state, 'hoe');
            return true;
          }
        }
        // Auto-plant first available seed if tilled empty
        if (soil && soil.tilled && !soil.cropId) {
          const seedId = firstSeed(state);
          if (seedId) {
            if (Farming.plant(state, tx, ty, seedId)) {
              advanceTutorial(state, 'plant');
              return true;
            }
          }
        }
      }
      return false;
    }
    return false;
  }

  function firstSeed(state) {
    for (const id of CROP_LIST) {
      if ((state.inventory.seeds[id] || 0) > 0) {
        const c = CROPS[id];
        if (c.seasons.includes(TimeSys.seasonName(state))) return id;
      }
    }
    for (const id of CROP_LIST) {
      if ((state.inventory.seeds[id] || 0) > 0) return id;
    }
    return null;
  }

  function interact(state) {
    const tool = state.hotbar[state.selectedSlot];
    const targets = targetTiles(state);

    // 1) Specials on facing then underfoot
    for (const { tx, ty } of targets) {
      if (trySpecial(state, tx, ty)) return;
    }

    // 2) NPCs (any scene; farm keeps animals nearby)
    {
      const face = facingTile(state);
      if (NPC.tryInteract(state, face.tx, face.ty)) return;
      if (state.scene === 'outdoor' && Animals.interactNear(state)) return;
    }

    // 4) Tools on facing then underfoot (underfoot helps when standing on dirt)
    for (const { tx, ty } of targets) {
      if (useToolAt(state, tx, ty, tool)) return;
    }

    // Soft miss feedback — don't repeat the same line as the on-screen prompt
    if (!state._lastMiss || performance.now() - state._lastMiss > 1600) {
      state._lastMiss = performance.now();
      const tip = promptFor(state);
      if (!tip) UI.toast('Face a crop, door, or friend, then press E');
    }
  }

  /** Click world tile (from canvas) — face toward it and interact */
  function interactAt(state, worldX, worldY) {
    const tx = Math.floor(worldX / CONST.TILE);
    const ty = Math.floor(worldY / CONST.TILE);
    const p = state.player;
    const dx = (tx + 0.5) * CONST.TILE - p.x;
    const dy = (ty + 0.5) * CONST.TILE - p.y;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
    else p.dir = dy > 0 ? 'down' : 'up';

    // If far, only face; if adjacent or on tile, interact
    const pt = Utils.tileAt(p.x, p.y);
    const dist = Math.abs(pt.tx - tx) + Math.abs(pt.ty - ty);
    if (dist > 1) {
      UI.toast('Move closer!');
      return;
    }
    // Temporarily treat this tile as facing target via tool use
    const tool = state.hotbar[state.selectedSlot];
    if (trySpecial(state, tx, ty)) return;
    if (NPC.tryInteract(state, tx, ty)) return;
    if (useToolAt(state, tx, ty, tool)) return;
    if (state.scene === 'outdoor' && Animals.interactNear(state)) return;
  }

  function promptFor(state) {
    if (state.scene === 'interior') {
      const { tx, ty } = facingTile(state);
      const under = underfoot(state);
      const tool = state.hotbar[state.selectedSlot];
      if (tool && tool.type === 'homedec') return 'E · Place / pick up furniture';
      for (const t of [getTile(state, tx, ty), getTile(state, under.tx, under.ty)]) {
        if (t === TILE.BED) return 'E · Sleep until morning';
        if (t === TILE.KITCHEN) return 'E · Open kitchen';
        if (t === TILE.WARDROBE) return 'E · Change clothes';
        if (t === TILE.DOOR) return 'E · Go outside';
      }
      if (typeof Home !== 'undefined') {
        for (const p of [{ tx, ty }, { tx: under.tx, ty: under.ty }]) {
          const h = Home.at(state, p.tx, p.ty);
          if (h) return `E · ${Home.DEFS[h.id].name}`;
        }
      }
      return '';
    }
    const { tx, ty } = facingTile(state);
    const t = getTile(state, tx, ty);
    const soil = Farming.getSoil(state, tx, ty);
    if (t === TILE.WARP) {
      if (state.scene === 'forest') return 'E · Return to farm';
      if (state.scene === 'beach') return 'E · Return to farm';
      if (state.scene === 'mountain') return 'E · Return to farm';
      if (state.scene === 'village') return 'E · Return to farm';
      if (ty <= 1) return 'E · Enter forest';
      if (ty >= CONST.MAP_H - 1) return 'E · Walk to the beach';
      if (tx >= CONST.MAP_W - 1) return 'E · Hike to the mountain';
      return 'E · Walk to the village';
    }
    if (t === TILE.DOOR) return 'E · Enter house';
    if (t === TILE.BIN) return 'E · Shipping bin';
    if (t === TILE.SELLBOX) return 'E · Sell things (quick coins)';
    if (t === TILE.SHOP) return 'E · Open shop';
    if (t === TILE.BOARD) return 'E · Help wanted';
    if (t === TILE.CRACK_BENCH) return 'E · Crack a geode';
    if (t === TILE.POSTBOX) return 'E · Postbox — send a letter';
    if (t === TILE.STALL) return 'E · Browse the market stall';
    if (t === TILE.FOUNTAIN) return 'E · Make a wish (5g)';
    if (t === TILE.BENCH) return 'E · Sit a moment';
    if (t === TILE.LAMP) return 'E · Look at the lamp';
    if (t === TILE.GEM_NODE) return 'E · Chip the gem node';
    if (t === TILE.CRYSTAL) return 'E · Pick crystal';
    if (t === TILE.GEODE) return 'E · Pick up geode';
    if (t === TILE.COOP || t === TILE.BARN || t === TILE.FENCE) return 'E · Check animals';
    if (t === TILE.ROCK && state.scene === 'outdoor') return 'E · Clear rocks (40g)';
    if (t === TILE.FLOWER) return 'E · Pick flower';
    if (t === TILE.MUSHROOM) return 'E · Pick mushroom';
    if (t === TILE.SHELL) return 'E · Collect shell';
    if (t === TILE.FISH_SPOT || t === TILE.WATER) return 'E · Cast fishing line';
    {
      if (soil && soil.mature) return 'E · Harvest crop';
      if (soil && soil.tilled && soil.cropId && !soil.watered) return 'E · Water crop';
      if (soil && soil.tilled && !soil.cropId) return 'E · Plant seeds';
      if (Farming.canFarm(state, tx, ty) && (!soil || !soil.tilled)) return 'E · Till soil';
      for (const id of Object.keys(NPCS)) {
        const n = NPCS[id];
        if (n.scene && n.scene !== state.scene) continue;
        const nx = (n.tx + 0.5) * CONST.TILE;
        const ny = (n.ty + 0.5) * CONST.TILE;
        if (Utils.dist(state.player.x, state.player.y, nx, ny) < 55) {
          return `E · Talk to ${n.name}`;
        }
      }
    }
    return '';
  }

  function advanceTutorial(state, action) {
    if (state.tutorialDone) return;
    if (action === 'hoe' && state.tutorialStep === 1) state.tutorialStep = 2;
    if (action === 'plant' && state.tutorialStep === 2) state.tutorialStep = 3;
    if (action === 'water' && state.tutorialStep === 3) state.tutorialStep = 4;
    UI.updateTutorial();
  }

  function enterInterior(state) {
    state.scene = 'interior';
    state.player.x = 6 * CONST.TILE;
    state.player.y = 6 * CONST.TILE;
    state.player.dir = 'up';
    if (FarmAudio.door) FarmAudio.door(); else FarmAudio.click();
    UI.toast('Welcome home, Amber 🏠');
  }

  function enterOutdoor(state) {
    state.scene = 'outdoor';
    state.player.x = 18.5 * CONST.TILE;
    state.player.y = 8.5 * CONST.TILE;
    state.player.dir = 'down';
    if (FarmAudio.door) FarmAudio.door(); else FarmAudio.click();
  }

  function enterOutdoorFromForest(state) {
    state.scene = 'outdoor';
    state.player.x = 14.5 * CONST.TILE;
    state.player.y = 1.5 * CONST.TILE;
    state.player.dir = 'down';
    FarmAudio.click();
    UI.toast('Back on the farm 🌻');
    if (UI.showLocationBanner) UI.showLocationBanner('The Farm', 'Home sweet home');
  }

  function enterForest(state) {
    if (!state.forest) state.forest = MapData.createForest();
    state.scene = 'forest';
    state.player.x = 13.5 * CONST.TILE;
    state.player.y = (state.forest.h - 2.5) * CONST.TILE;
    state.player.dir = 'up';
    FarmAudio.success();
    UI.toast('Whispering Forest — mushrooms & a quiet pond 🌲');
    UI.showLocationBanner('Whispering Forest', 'Pick mushrooms · Fish the pond · South exits');
    Game.tryAchieve('visit_forest');
  }

  function enterBeach(state) {
    if (!state.beach) state.beach = MapData.createBeach();
    state.scene = 'beach';
    state.player.x = 14.5 * CONST.TILE;
    state.player.y = 2.5 * CONST.TILE;
    state.player.dir = 'down';
    FarmAudio.success();
    UI.toast('Sunny Beach — shells, surf, and fishing 🏖️');
    UI.showLocationBanner('Sunny Beach', 'Collect shells · Fish the shore · North returns home');
    Game.tryAchieve('visit_beach');
  }

  function enterOutdoorFromBeach(state) {
    state.scene = 'outdoor';
    state.player.x = 14.5 * CONST.TILE;
    state.player.y = (CONST.MAP_H - 2.5) * CONST.TILE;
    state.player.dir = 'up';
    FarmAudio.click();
    UI.toast('Back on the farm 🌻');
    UI.showLocationBanner('The Farm', 'Home sweet home');
  }

  function enterMountain(state) {
    if (!state.mountain) state.mountain = MapData.createMountain();
    state.scene = 'mountain';
    state.player.x = 25.5 * CONST.TILE;
    state.player.y = 10.5 * CONST.TILE;
    state.player.dir = 'left';
    FarmAudio.success();
    UI.toast('Mountain Pass — gems in the cave! 💎');
    UI.showLocationBanner('Mountain Pass', 'Chip gem nodes · Crack geodes · West returns home');
    Game.tryAchieve('visit_mountain');
  }

  function enterOutdoorFromMountain(state) {
    state.scene = 'outdoor';
    state.player.x = (CONST.MAP_W - 2.5) * CONST.TILE;
    state.player.y = 14.5 * CONST.TILE;
    state.player.dir = 'left';
    FarmAudio.click();
    UI.toast('Back on the farm 🌻');
    UI.showLocationBanner('The Farm', 'Home sweet home');
  }

  function enterVillage(state) {
    if (!state.village) state.village = MapData.createVillage();
    state.scene = 'village';
    state.player.x = 1.5 * CONST.TILE;
    state.player.y = 10.5 * CONST.TILE;
    state.player.dir = 'right';
    FarmAudio.success();
    UI.toast('Village Market — a friendly street! 🏘️');
    UI.showLocationBanner('Village Market', 'Make a wish · Send letters · Snacks · East returns home');
    Game.tryAchieve('visit_village');
  }

  function enterOutdoorFromVillage(state) {
    state.scene = 'outdoor';
    state.player.x = 1.5 * CONST.TILE;
    state.player.y = 14.5 * CONST.TILE;
    state.player.dir = 'right';
    FarmAudio.click();
    UI.toast('Back on the farm 🌻');
    UI.showLocationBanner('The Farm', 'Home sweet home');
  }

  function mapPixelSize(state) {
    const d = mapDims(state);
    return { w: d.w * CONST.TILE, h: d.h * CONST.TILE };
  }

  return {
    initStateMaps, getTile, isSolid, blocks, resolveMove, facingTile, underfoot,
    interact, interactAt, promptFor, enterInterior, enterOutdoor, enterForest, enterBeach,
    enterMountain, enterVillage, enterOutdoorFromForest, enterOutdoorFromBeach,
    enterOutdoorFromMountain, enterOutdoorFromVillage, mapPixelSize, mapDims, locationName,
  };
})();
