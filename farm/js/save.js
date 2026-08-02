/* ========================================
   Amber's Farm — Save / Load
   ======================================== */

const Save = (() => {
  function hasSave() {
    try {
      return !!localStorage.getItem(CONST.SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(CONST.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version == null) return null;
      return migrate(data);
    } catch (e) {
      console.warn('Save load failed', e);
      return null;
    }
  }

  function migrate(data) {
    if (data.version < 2) {
      if (data.energy == null) data.energy = CONST.ENERGY_MAX;
      if (data.inventory && data.inventory.fertilizer == null) {
        data.inventory.fertilizer = 0;
      }
    }
    if (data.version < 3) {
      if (!data.heartEvents) data.heartEvents = {};
      if (data.festivalClaimedDay == null) data.festivalClaimedDay = 0;
      if (data.npcHearts && data.npcHearts.bea == null) data.npcHearts.bea = 0;
      if (data.animals) {
        data.animals.forEach(a => { if (a.hearts == null) a.hearts = 0; });
      }
    }
    if (data.version < 4) {
      if (data.inventory && data.inventory.rod == null) data.inventory.rod = 0;
      if (data.stats && data.stats.fished == null) data.stats.fished = 0;
    }
    if (data.version < 5) {
      // beach map added
    }
    if (data.version < 6) {
      // normalize inventory + savedScene for position snap
      if (!data.inventory) data.inventory = {};
      ['seeds', 'crops', 'products', 'dishes', 'decor'].forEach(k => {
        if (!data.inventory[k] || typeof data.inventory[k] !== 'object') {
          data.inventory[k] = {};
        }
      });
      if (data.inventory.feed == null) data.inventory.feed = 0;
      if (data.inventory.fertilizer == null) data.inventory.fertilizer = 0;
      if (data.inventory.rod == null) data.inventory.rod = 0;
      if (!data.savedScene) data.savedScene = data.scene || 'outdoor';
    }
    if (data.version < 7) {
      // barnyard: building upgrades
      if (data.coopUpgraded == null) data.coopUpgraded = false;
      if (data.barnUpgraded == null) data.barnUpgraded = false;
      // legacy animals may lack pens — healed at boot by update()
      if (data.animals) {
        data.animals.forEach(a => {
          if (a.pen == null) a.pen = (a.type === 'cow') ?
            { x0: 19.5, x1: 22.5, y0: 18.5, y1: 20 } :
            { x0: 4.5, x1: 7.5, y0: 18.5, y1: 20 };
        });
      }
    }
    if (data.version < 9) {
      // v3.0 mountain & village
      if (data.geodes == null) data.geodes = 0;
      if (data.wishes == null) data.wishes = {};
      if (data.townWelcome == null) data.townWelcome = 1;
      if (data.letterSentDay == null) data.letterSentDay = 0;
      if (data.gemCelebrated == null) data.gemCelebrated = false;
      if (data.townWelcomeRewarded == null) data.townWelcomeRewarded = false;
      if (data.wrenMushroomLuck == null) data.wrenMushroomLuck = 0;
    }
    if (data.version < 10) {
      // v4.0 home sweet home
      if (data.homeDecor == null) data.homeDecor = {};
      if (data.stories == null) data.stories = {};
      if (!data.inventory) data.inventory = {};
      if (data.inventory.homedec == null) data.inventory.homedec = { rug: 1 };
    }
    data.version = CONST.SAVE_VERSION;
    return data;
  }

  function write(state) {
    try {
      // Remember where player was so load can snap to a sensible outdoor spawn
      const savedScene = state.scene || 'outdoor';
      // Always persist as outdoor for playability; coords may be remapped on load
      let px = state.player.x;
      let py = state.player.y;
      let dir = state.player.dir || 'down';
      if (savedScene === 'interior') {
        px = 18.5 * CONST.TILE;
        py = 8.5 * CONST.TILE;
        dir = 'down';
      } else if (savedScene === 'forest') {
        px = 14.5 * CONST.TILE;
        py = 1.5 * CONST.TILE;
        dir = 'down';
      } else if (savedScene === 'beach') {
        px = 14.5 * CONST.TILE;
        py = (CONST.MAP_H - 2.5) * CONST.TILE;
        dir = 'up';
      } else if (savedScene === 'mountain') {
        px = (CONST.MAP_W - 2.5) * CONST.TILE;
        py = 14.5 * CONST.TILE;
        dir = 'left';
      } else if (savedScene === 'village') {
        px = 1.5 * CONST.TILE;
        py = 14.5 * CONST.TILE;
        dir = 'right';
      }

      const blob = {
        version: CONST.SAVE_VERSION,
        savedAt: Date.now(),
        farmName: state.farmName,
        day: state.day,
        seasonIndex: state.seasonIndex,
        year: state.year,
        period: state.period,
        periodTimer: state.periodTimer,
        weather: state.weather,
        coins: state.coins,
        energy: state.energy,
        player: {
          x: px,
          y: py,
          outfit: state.player.outfit,
          dir: dir,
        },
        inventory: state.inventory,
        selectedSlot: state.selectedSlot,
        soil: state.soil,
        clearedRocks: state.clearedRocks,
        animals: state.animals,
        npcHearts: state.npcHearts,
        shipping: state.shipping,
        recipesUnlocked: state.recipesUnlocked,
        decor: state.decor,
        homeDecor: state.homeDecor,
        stories: state.stories,
        achievements: state.achievements,
        tutorialStep: state.tutorialStep,
        tutorialDone: state.tutorialDone,
        stats: state.stats,
        cowUnlocked: state.cowUnlocked,
        waterUpgrade: state.waterUpgrade,
        scene: 'outdoor',
        savedScene: savedScene,
        quest: state.quest,
        forage: state.forage,
        heartEvents: state.heartEvents,
        festivalClaimedDay: state.festivalClaimedDay,
        geodes: state.geodes,
        wishes: state.wishes,
        townWelcome: state.townWelcome,
        letterSentDay: state.letterSentDay,
        gemCelebrated: state.gemCelebrated,
        townWelcomeRewarded: state.townWelcomeRewarded,
        wrenMushroomLuck: state.wrenMushroomLuck,
      };
      localStorage.setItem(CONST.SAVE_KEY, JSON.stringify(blob));
      return true;
    } catch (e) {
      console.warn('Save write failed', e);
      return false;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(CONST.SAVE_KEY);
    } catch (e) { /* ignore */ }
  }

  return { hasSave, load, write, clear };
})();
