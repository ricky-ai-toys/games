/* ========================================
   Amber's Farm — Season-end festivals (BIG-5)
   ======================================== */

const Festival = (() => {
  const DATA = {
    spring: {
      title: '🌸 Spring Egg Festival',
      body: 'The valley paints eggs and dances in the meadow!\n\nMs. Maple crowns you Junior Gardener.',
      seeds: { radish: 5, potato: 3 },
      coins: 40,
      emoji: '🥚',
    },
    summer: {
      title: '🌻 Luau of the Sun',
      body: 'Bonfires, corn, and lemonade!\n\nFinn says the animals danced too.',
      seeds: { corn: 3, tomato: 2, blueberry: 2 },
      coins: 60,
      emoji: '🔥',
    },
    fall: {
      title: '🎃 Harvest Moon Fair',
      body: 'Pumpkins, pies, and golden leaves.\n\nBea stocks extra fertilizer for winners.',
      seeds: { pumpkin: 2, cranberry: 3 },
      fertilizer: 2,
      coins: 80,
      emoji: '🌕',
    },
    winter: {
      title: '❄️ Feast of Lights',
      body: 'Lanterns on the snow. Hot cocoa for everyone!\n\nA quiet, sparkly night on the farm.',
      seeds: { winter_root: 4 },
      coins: 70,
      emoji: '🕯️',
    },
  };

  function run(state) {
    const season = TimeSys.seasonName(state);
    // Festival triggers on last day — call when waking ON festival day
    // or when we just entered festival morning
    const def = DATA[season] || DATA.spring;
    // Apply rewards once per festival day
    if (state.festivalClaimedDay === state.day) return null;

    state.festivalClaimedDay = state.day;
    state.coins += def.coins || 0;
    if (def.seeds) {
      for (const [id, n] of Object.entries(def.seeds)) {
        state.inventory.seeds[id] = (state.inventory.seeds[id] || 0) + n;
      }
    }
    if (def.fertilizer) {
      state.inventory.fertilizer = (state.inventory.fertilizer || 0) + def.fertilizer;
    }
    Shop.rebuildHotbar(state);
    Game.tryAchieve('first_festival');
    if (season === 'spring') Game.tryAchieve('season_spring');
    if (season === 'winter') Game.tryAchieve('season_winter');

    return def;
  }

  function openUI(def) {
    if (!def) return;
    const body = document.getElementById('festival-body');
    const title = document.getElementById('festival-title');
    if (title) title.textContent = def.title;
    if (body) {
      body.innerHTML = `
        <div class="festival-emoji">${def.emoji || '🎉'}</div>
        <p class="festival-text">${(def.body || '').replace(/\n/g, '<br>')}</p>
        <p class="pending">Rewards added to your farm!</p>
      `;
    }
    Particles.confetti(CONST.VIEW_W / 2, CONST.VIEW_H / 3);
    Particles.confetti(CONST.VIEW_W / 3, CONST.VIEW_H / 2);
    FarmAudio.success();
    if (Game.state) Game.state.paused = true;
    UI.show('modal-festival');
  }

  return { run, openUI, DATA };
})();
