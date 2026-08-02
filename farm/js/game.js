/* ========================================
   Amber's Farm — Core Game State Machine
   ======================================== */

const Game = (() => {
  let state = null;
  let lastT = 0;
  let canvas = null;
  let input = {
    up: false, down: false, left: false, right: false,
    interact: false, interactPressed: false,
  };

  function createNewState(farmName) {
    const st = {
      scene: 'outdoor',
      farmName: farmName || "Amber's Sunny Acres",
      day: 1,
      seasonIndex: 0,
      year: 1,
      period: 'morning',
      periodTimer: 0,
      weather: 'sun',
      coins: CONST.START_COINS,
      energy: CONST.ENERGY_MAX,
      player: Player.create(18.5 * CONST.TILE, 9.5 * CONST.TILE),
      camera: { x: 0, y: 0 },
      inventory: {
        seeds: { ...CONST.START_SEEDS },
        crops: {},
        products: {},
        dishes: {},
        feed: 3,
        decor: {},
        homedec: { rug: 1 },
        fertilizer: 0,
        rod: 0,
      },
      hotbar: [],
      selectedSlot: 0,
      soil: {},
      clearedRocks: {},
      animals: [],
      npcHearts: { maple: 0, finn: 0, bea: 0, milo: 0, rori: 0, wren: 0 },
      shipping: [],
      recipesUnlocked: { omelette: true },
      decor: {},
      homeDecor: {},
      stories: {},
      achievements: {},
      tutorialStep: 0,
      tutorialDone: false,
      stats: { harvested: 0, shipped: 0, fed: 0, cooked: 0, foraged: 0, fished: 0 },
      cowUnlocked: false,
      waterUpgrade: false,
      coopUpgraded: false,
      barnUpgraded: false,
      letters: [],
      quest: null,
      forage: {},
      heartEvents: {},
      festivalClaimedDay: 0,
      // v3.0 mountain & village
      geodes: 0,
      wishes: {},
      townWelcome: 1,
      letterSentDay: 0,
      gemCelebrated: false,
      townWelcomeRewarded: false,
      wrenMushroomLuck: 0,
      paused: false,
      sleepFlash: 0,
      festivalShown: false,
      footTimer: 0,
      lowEnergyTip: false,
    };
    World.initStateMaps(st);
    Shop.rebuildHotbar(st);
    Quests.ensure(st);
    return st;
  }

  function normalizeInventory(inv) {
    const base = {
      seeds: {},
      crops: {},
      products: {},
      dishes: {},
      feed: 0,
      decor: {},
      homedec: {},
      fertilizer: 0,
      rod: 0,
    };
    if (!inv || typeof inv !== 'object') return base;
    return {
      seeds: inv.seeds && typeof inv.seeds === 'object' ? inv.seeds : {},
      crops: inv.crops && typeof inv.crops === 'object' ? inv.crops : {},
      products: inv.products && typeof inv.products === 'object' ? inv.products : {},
      dishes: inv.dishes && typeof inv.dishes === 'object' ? inv.dishes : {},
      feed: inv.feed != null ? inv.feed : 0,
      decor: inv.decor && typeof inv.decor === 'object' ? inv.decor : {},
      homedec: inv.homedec && typeof inv.homedec === 'object' ? inv.homedec : {},
      fertilizer: inv.fertilizer != null ? inv.fertilizer : 0,
      rod: inv.rod != null ? inv.rod : 0,
    };
  }

  function applySave(data) {
    const st = createNewState(data.farmName);
    Object.assign(st, {
      day: data.day,
      seasonIndex: data.seasonIndex,
      year: data.year || 1,
      period: data.period || 'morning',
      periodTimer: data.periodTimer || 0,
      weather: data.weather || 'sun',
      coins: data.coins,
      energy: data.energy != null ? data.energy : CONST.ENERGY_MAX,
      inventory: normalizeInventory(data.inventory),
      selectedSlot: data.selectedSlot || 0,
      soil: data.soil || {},
      clearedRocks: data.clearedRocks || {},
      animals: data.animals || [],
      npcHearts: Object.assign({ maple: 0, finn: 0, bea: 0 }, data.npcHearts || {}),
      shipping: data.shipping || [],
      recipesUnlocked: data.recipesUnlocked || { omelette: true },
      decor: data.decor || {},
      homeDecor: data.homeDecor || {},
      stories: data.stories || {},
      achievements: data.achievements || {},
      tutorialStep: data.tutorialStep || 0,
      tutorialDone: !!data.tutorialDone,
      stats: Object.assign(
        { harvested: 0, shipped: 0, fed: 0, cooked: 0, foraged: 0, fished: 0 },
        data.stats || {}
      ),
      cowUnlocked: !!data.cowUnlocked,
      waterUpgrade: !!data.waterUpgrade,
      coopUpgraded: !!data.coopUpgraded,
      barnUpgraded: !!data.barnUpgraded,
      quest: data.quest || null,
      forage: data.forage || {},
      heartEvents: data.heartEvents || {},
      festivalClaimedDay: data.festivalClaimedDay || 0,
      geodes: data.geodes || 0,
      wishes: data.wishes || {},
      townWelcome: data.townWelcome || 1,
      letterSentDay: data.letterSentDay || 0,
      gemCelebrated: !!data.gemCelebrated,
      townWelcomeRewarded: !!data.townWelcomeRewarded,
      wrenMushroomLuck: data.wrenMushroomLuck || 0,
      scene: 'outdoor',
    });
    Quests.ensure(st);
    World.initStateMaps(st);

    // Always wake on farm at a known-good outdoor spawn (save may have been
    // written from interior/forest/beach with foreign coordinates).
    const savedScene = data.savedScene || data.scene || 'outdoor';
    if (data.player) {
      let px = data.player.x;
      let py = data.player.y;
      const maxX = CONST.MAP_W * CONST.TILE;
      const maxY = CONST.MAP_H * CONST.TILE;
      if (px > maxX + 8 || py > maxY + 8) {
        px = px * (32 / 40);
        py = py * (32 / 40);
      }
      st.player.outfit = data.player.outfit || 'amber';
      st.player.dir = data.player.dir || 'down';

      // Snap if saved off-farm scene or coords outside farm bounds
      const offFarm = savedScene === 'interior' || savedScene === 'forest' ||
        savedScene === 'beach' || savedScene === 'title' ||
        savedScene === 'mountain' || savedScene === 'village';
      const oob = px < 8 || py < 8 || px > maxX - 8 || py > maxY - 8;
      if (offFarm || oob) {
        if (savedScene === 'forest') {
          st.player.x = 14.5 * CONST.TILE;
          st.player.y = 1.5 * CONST.TILE;
          st.player.dir = 'down';
        } else if (savedScene === 'beach') {
          st.player.x = 14.5 * CONST.TILE;
          st.player.y = (CONST.MAP_H - 2.5) * CONST.TILE;
          st.player.dir = 'up';
        } else if (savedScene === 'mountain') {
          st.player.x = (CONST.MAP_W - 2.5) * CONST.TILE;
          st.player.y = 14.5 * CONST.TILE;
          st.player.dir = 'left';
        } else if (savedScene === 'village') {
          st.player.x = 1.5 * CONST.TILE;
          st.player.y = 14.5 * CONST.TILE;
          st.player.dir = 'right';
        } else {
          // interior / title / oob → house door
          st.player.x = 18.5 * CONST.TILE;
          st.player.y = 8.5 * CONST.TILE;
          st.player.dir = 'down';
        }
      } else {
        st.player.x = px;
        st.player.y = py;
      }
    }
    Shop.rebuildHotbar(st);
    return st;
  }

  function init(c) {
    canvas = c;
    Render.init(c);
    Particles.init();
    state = { scene: 'title', camera: { x: 0, y: 0 }, player: Player.create(0, 0), weather: 'sun', period: 'morning', paused: false, sleepFlash: 0 };
    UI.showTitle();
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function newGame(farmName) {
    state = createNewState(farmName);
    UI.hideTitle();
    UI.refreshHUD();
    UI.toast('Welcome to your farm, Amber! 🌻');
    if (FarmAudio.setSeason) FarmAudio.setSeason(TimeSys.seasonName(state));
    FarmAudio.startMusic();
    // Snap camera
    state.camera.x = state.player.x - CONST.VIEW_W / 2;
    state.camera.y = state.player.y - CONST.VIEW_H / 2;
  }

  function continueGame() {
    const data = Save.load();
    if (!data) {
      UI.toast('No save found');
      return;
    }
    state = applySave(data);
    UI.hideTitle();
    UI.refreshHUD();
    UI.toast('Welcome back, Amber! ☀️');
    if (FarmAudio.setSeason) FarmAudio.setSeason(TimeSys.seasonName(state));
    FarmAudio.startMusic();
    state.camera.x = state.player.x - CONST.VIEW_W / 2;
    state.camera.y = state.player.y - CONST.VIEW_H / 2;
  }

  function toTitle() {
    FarmAudio.stopMusic();
    state = { scene: 'title', camera: { x: 0, y: 0 }, player: Player.create(0, 0), weather: 'sun', period: 'morning', paused: false, sleepFlash: 0 };
    UI.closeModals();
    UI.showTitle();
  }

  function requestSleep() {
    if (state.tutorialStep >= 4 && !state.tutorialDone) {
      state.tutorialDone = true;
      UI.updateTutorial();
    }
    UI.showSleepConfirm();
  }

  function doSleep() {
    UI.closeModals();
    FarmAudio.sleep();
    state.sleepFlash = 1;
    // World-space Zzz over the bed
    if (state.scene === 'interior') {
      Particles.sleepStars(
        state.player.x - state.camera.x,
        state.player.y - state.camera.y - 30
      );
    } else {
      Particles.sleepStars(CONST.VIEW_W / 2, CONST.VIEW_H / 2);
    }

    // Growth uses today's watered flags first
    // Snapshot weather for growth: rain of the day that is ending
    const endWeather = state.weather;
    // Process crop growth based on water during the day
    // Farming.overnightGrowth expects to reset water and apply NEW weather rain after
    // We'll temporarily keep end weather, grow, then roll new day weather

    // Animals overnight before weather change
    const rooBefore = state.animals.find(a => a.type === 'rooster');
    const roosterCrowed = !!(rooBefore && rooBefore.fed && rooBefore.petted);
    const rooName = rooBefore ? rooBefore.name : 'Rooster';
    Animals.overnight(state);

    if ((state.energy || 0) <= 0) Game.tryAchieve('full_energy');
    restoreEnergy();

    // Crow visit (soft) before growth
    const crowMsg = (typeof Crow !== 'undefined') ? Crow.overnight(state) : null;

    // Rooster crow — happy roosters greet the dawn
    const roosterMsg = roosterCrowed
      ? `🐓 ${rooName} crows: "Cock-a-doodle-doo!" (Fed chickens grew extra hearts!)`
      : null;

    // End-of-day growth (single source of truth)
    const endingWeather = state.weather;
    Farming.overnightGrowth(state, endingWeather);

    const earnings = Shop.resolveShipping(state);
    if (earnings > 0) FarmAudio.coins();

    TimeSys.sleep(state);
    if (FarmAudio.setSeason) FarmAudio.setSeason(TimeSys.seasonName(state));

    Farming.applyMorningWeather(state);

    state.scene = 'outdoor';
    state.player.x = 18.5 * CONST.TILE;
    state.player.y = 8.8 * CONST.TILE;
    state.player.dir = 'down';

    // Mail gifts + Farmer's Day
    const giftLine = (typeof Mail !== 'undefined') ? Mail.maybeMailGift(state) : null;
    if (typeof Mail !== 'undefined') Mail.applyAmberDayGifts(state);

    let ready = 0;
    for (const k of Object.keys(state.soil)) {
      if (state.soil[k].mature) ready++;
    }

    Save.write(state);
    Shop.rebuildHotbar(state);
    UI.refreshHUD();
    Particles.sleepStars(CONST.VIEW_W / 2, CONST.VIEW_H / 2);

    if (state.day >= 8) Game.tryAchieve('week_farmer');
    if (state.coins >= 500) Game.tryAchieve('wealthy');

    const letter = (typeof Mail !== 'undefined')
      ? Mail.buildMorningLetter(state, { earnings, ready, crowMsg, roosterMsg, giftLine })
      : `Good morning! Day ${state.day}`;

    setTimeout(() => {
      UI.showLetter('Morning Mail', letter);
      // Festival on last day of season
      if (TimeSys.isFestivalDay(state) && typeof Festival !== 'undefined') {
        setTimeout(() => {
          const def = Festival.run(state);
          if (def) {
            Shop.rebuildHotbar(state);
            UI.refreshHUD();
            Festival.openUI(def);
          }
        }, 700);
      }
    }, 600);
  }

  /** Soft energy spend — never blocks action, only slows when low */
  function spendEnergy(n) {
    if (!state || state.energy == null) return true;
    state.energy = Math.max(0, state.energy - (n || 1));
    if (state.energy < CONST.ENERGY_WALK_SLOW && !state.lowEnergyTip) {
      state.lowEnergyTip = true;
      UI.toast('Getting sleepy… bed restores energy 💤');
    }
    return true;
  }

  function restoreEnergy() {
    if (!state) return;
    state.energy = CONST.ENERGY_MAX;
    state.lowEnergyTip = false;
  }

  function tryAchieve(id) {
    if (!state || state.achievements[id]) return;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    state.achievements[id] = true;
    FarmAudio.success();
    Particles.confetti(CONST.VIEW_W / 2, 100);
    UI.toast(`⭐ ${def.name}! +${def.stars} stars`);
    Kitchen.unlockFromStars(state);
  }

  function totalStars(st) {
    let n = 0;
    for (const a of ACHIEVEMENTS) {
      if (st.achievements[a.id]) n += a.stars;
    }
    return n;
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    update(dt);
    Render.draw(state, t / 1000);
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (!state) return;

    if (state.sleepFlash > 0) {
      state.sleepFlash = Math.max(0, state.sleepFlash - dt * 0.7);
    }

    if (state.scene === 'title') {
      Particles.update(dt);
      // ambient fireflies on title
      if (Math.random() < 0.05) {
        Particles.emit({
          x: Math.random() * CONST.VIEW_W,
          y: 200 + Math.random() * 200,
          vx: Utils.rand(-10, 10),
          vy: Utils.rand(-15, -5),
          life: 2,
          size: 3,
          color: '#FFE082',
          world: false,
          gravity: 0,
        });
      }
      return;
    }

    if (state.paused) {
      Particles.update(dt);
      return;
    }

    // Input interact edge
    if (input.interactPressed) {
      input.interactPressed = false;
      if (!state.paused && state.scene !== 'title') {
        World.interact(state);
        UI.refreshHUD();
      }
    }

    Player.update(state, dt, input);
    Animals.update(state, dt);
    TimeSys.update(state, dt);
    Render.updateCamera(state);
    Weather.update(state, dt, CONST.VIEW_W, CONST.VIEW_H);
    Weather.ambient(state, dt);
    if (typeof Home !== 'undefined') Home.update(state, dt);
    Particles.update(dt);
    updateAmbient(state);

    // Footstep dust + soft SFX
    if (state.player.moving) {
      state.footTimer = (state.footTimer || 0) + dt;
      if (state.footTimer > 0.28) {
        state.footTimer = 0;
        Particles.emit({
          x: state.player.x + Utils.rand(-4, 4),
          y: state.player.y + 12,
          vx: Utils.rand(-8, 8),
          vy: Utils.rand(-5, -1),
          life: 0.35,
          size: 3,
          sizeEnd: 0,
          color: 'rgba(180,160,120,0.45)',
          gravity: 20,
          world: true,
        });
        if (typeof FarmAudio.footstep === 'function') FarmAudio.footstep();
      }
    }

    // Interact prompt throttle
    state._promptTick = (state._promptTick || 0) + dt;
    if (state._promptTick > 0.25) {
      state._promptTick = 0;
      UI.updatePrompt();
    }

    // Evening tip once
    if (state.period === 'evening' && !state._eveTip) {
      state._eveTip = true;
      UI.toast("Evening is falling… the bed looks cozy 😴");
    }
    if (state.period === 'morning') state._eveTip = false;
  }

  /** Ambient life: butterflies, fireflies, falling leaves, snow sparkle */
  function updateAmbient(state) {
    const outdoor = state.scene === 'outdoor' || state.scene === 'forest' ||
      state.scene === 'beach' || state.scene === 'mountain' || state.scene === 'village';
    if (!outdoor || state.weather === 'rain') return;
    const x = state.player.x + Utils.rand(-CONST.VIEW_W / 2, CONST.VIEW_W / 2);
    const y = state.player.y + Utils.rand(-CONST.VIEW_H / 2, CONST.VIEW_H / 2);
    if (state.period === 'morning' && Math.random() < 0.02) {
      Particles.butterfly(x, y);
    } else if (state.period === 'evening' && Math.random() < 0.04) {
      Particles.firefly(x, y);
    } else if (TimeSys.seasonName(state) === 'fall' && Math.random() < 0.025) {
      Particles.leaf(x, y - 20);
    } else if (TimeSys.seasonName(state) === 'winter' && state.weather === 'sun' && Math.random() < 0.02) {
      Particles.snowSparkle(x, y);
    }
  }

  function cycleSlot(dir) {
    if (!state || !state.hotbar || !state.hotbar.length) return;
    const n = state.hotbar.length;
    state.selectedSlot = (state.selectedSlot + dir + n) % n;
    FarmAudio.click();
    UI.refreshHUD();
  }

  function clickWorld(screenX, screenY, canvas) {
    if (!state || state.scene === 'title' || state.paused) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (screenX - rect.left) * (CONST.VIEW_W / rect.width);
    const sy = (screenY - rect.top) * (CONST.VIEW_H / rect.height);
    const worldX = sx + state.camera.x;
    const worldY = sy + state.camera.y;
    World.interactAt(state, worldX, worldY);
    UI.refreshHUD();
  }

  function setInput(key, val) {
    if (key in input) input[key] = val;
  }

  function pressInteract() {
    // Ignore while paused so closing a modal cannot sticky-fire interact
    if (state && state.paused) return;
    if (typeof Fishing !== 'undefined' && Fishing.isActive()) return;
    input.interactPressed = true;
  }

  function clearInteract() {
    input.interactPressed = false;
  }

  function selectSlot(i) {
    if (!state || !state.hotbar) return;
    if (i >= 0 && i < state.hotbar.length) {
      state.selectedSlot = i;
      FarmAudio.click();
      UI.refreshHUD();
    }
  }

  return {
    get state() { return state; },
    init, newGame, continueGame, toTitle, requestSleep, doSleep,
    tryAchieve, totalStars, spendEnergy, restoreEnergy,
    setInput, pressInteract, clearInteract, selectSlot, cycleSlot, clickWorld,
  };
})();
