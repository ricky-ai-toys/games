/* ========================================
   Amber's Farm — Gentle fishing (BIG-7)
   ======================================== */

const Fishing = (() => {
  const FISH = [
    { id: 'carp', name: 'Carp', emoji: '🐟', sell: 25, difficulty: 0.35 },
    { id: 'shrimp', name: 'Shrimp', emoji: '🦐', sell: 20, difficulty: 0.3 },
    { id: 'bass', name: 'Bass', emoji: '🐠', sell: 40, difficulty: 0.45 },
    { id: 'crab', name: 'Crab', emoji: '🦀', sell: 55, difficulty: 0.5 },
    { id: 'trout', name: 'Trout', emoji: '🐡', sell: 55, difficulty: 0.55 },
    { id: 'catfish', name: 'Catfish', emoji: '🐈‍⬛', sell: 70, difficulty: 0.6 },
    { id: 'squid', name: 'Squid', emoji: '🦑', sell: 75, difficulty: 0.58 },
    { id: 'octopus', name: 'Octopus', emoji: '🐙', sell: 85, difficulty: 0.68 },
    { id: 'rainbow', name: 'Rainbow Fish', emoji: '🌈', sell: 120, difficulty: 0.72, rare: true },
    { id: 'golden', name: 'Golden Fish', emoji: '✨', sell: 150, difficulty: 0.75, rare: true },
  ];

  let active = false;
  let barPos = 0.5;
  let barVel = 0;
  let target = 0.5;
  let progress = 0;
  let fish = null;
  let rodLevel = 1; // 1 normal, 2 wide bar
  let raf = null;
  let lastT = 0;

  function hasRod(state) {
    return !!(state.inventory && state.inventory.rod);
  }

  function rodWidth(state) {
    const lvl = state.inventory.rod || 0;
    return lvl >= 2 ? 0.28 : 0.18; // green zone size
  }

  function tryStart(state) {
    if (!hasRod(state)) {
      UI.toast('Buy a fishing rod at the shop first!');
      FarmAudio.error();
      return false;
    }
    if (active) return true;

    // Pick fish
    let pool = FISH.filter(f => !f.rare);
    if (Math.random() < 0.08) pool = FISH;
    fish = Utils.pick(pool);
    // Kid-friendly: easier always
    barPos = 0.5;
    barVel = 0;
    target = 0.3 + Math.random() * 0.4;
    progress = 0.15;
    active = true;
    state.paused = true;
    UI.showFishing(fish);
    lastT = performance.now();
    loop();
    FarmAudio.click();
    UI.toast('Hold Space (or touch A) in the green zone!');
    return true;
  }

  function loop() {
    if (!active) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    update(dt);
    UI.updateFishingUI(barPos, target, progress, rodWidth(Game.state));
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const state = Game.state;
    // Fish target wanders
    target += (Math.random() - 0.5) * dt * (0.8 + (fish?.difficulty || 0.4));
    target = Utils.clamp(target, 0.08, 0.92);

    // Player control: hold space / interact boosts bar toward middle of input
    // Actually: green bar follows player; fish is target marker
    // Player holds to raise bar, release to fall
    if (state && state._fishHold) {
      barVel += dt * 2.2;
    } else {
      barVel -= dt * 1.8;
    }
    barVel = Utils.clamp(barVel, -1.2, 1.4);
    barPos += barVel * dt * 0.55;
    barPos = Utils.clamp(barPos, 0, 1);
    if (barPos <= 0 || barPos >= 1) barVel *= -0.3;

    const half = rodWidth(state) / 2;
    const inZone = Math.abs(barPos - target) < half;
    if (inZone) {
      progress += dt * 0.35;
    } else {
      progress -= dt * 0.22;
    }
    progress = Utils.clamp(progress, 0, 1);

    if (progress >= 1) win();
    else if (progress <= 0) lose();
  }

  function setHold(v) {
    if (Game.state) Game.state._fishHold = !!v;
  }

  function win() {
    const state = Game.state;
    const f = fish;
    end();
    if (!state || !f) return;
    if (!state.inventory.products) state.inventory.products = {};
    const pid = 'fish_' + f.id;
    // PRODUCT_DEFS must already list fish_* statically (see data/animals.js)
    state.inventory.products[pid] = (state.inventory.products[pid] || 0) + 1;
    state.stats.fished = (state.stats.fished || 0) + 1;
    FarmAudio.success();
    Particles.confetti(CONST.VIEW_W / 2, CONST.VIEW_H / 2);
    UI.toast(`Caught ${f.emoji} ${f.name}! (+${f.sell}g if shipped)`);
    Game.tryAchieve('first_fish');
    if (f.rare) Game.tryAchieve('golden_fish');
    if (f.id === 'rainbow') Game.tryAchieve('rainbow_fish');
    if (typeof Game.spendEnergy === 'function') Game.spendEnergy(3);
    UI.refreshHUD();
  }

  function lose() {
    end();
    FarmAudio.error();
    UI.toast('It got away… try again!');
  }

  function cancel() {
    if (!active) return;
    end();
    UI.toast('Stopped fishing.');
  }

  function end() {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (Game.state) {
      Game.state._fishHold = false;
      Game.state.paused = false;
    }
    UI.hideFishing();
  }

  function isActive() { return active; }

  return {
    FISH, tryStart, setHold, cancel, isActive, hasRod, win, lose,
  };
})();
