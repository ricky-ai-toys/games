/* ========================================
   Amber's Farm — Home Furniture & Stories
   ======================================== */

const Home = (() => {
  const DEFS = {
    rug: { id: 'rug', name: 'Cozy Rug', emoji: '🟫', cost: 10 },
    table: { id: 'table', name: 'Table', emoji: '🪵', cost: 20 },
    chair: { id: 'chair', name: 'Chair', emoji: '🪑', cost: 12 },
    bookshelf: { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', cost: 25 },
    sofa: { id: 'sofa', name: 'Sofa', emoji: '🛋️', cost: 40 },
    fireplace: { id: 'fireplace', name: 'Fireplace', emoji: '🔥', cost: 60 },
    toybox: { id: 'toybox', name: 'Toy Box', emoji: '🧸', cost: 30 },
    petbed: { id: 'petbed', name: 'Pet Bed', emoji: '🐾', cost: 35 },
    walllamp: { id: 'walllamp', name: 'Wall Lamp', emoji: '💡', cost: 25 },
    picture: { id: 'picture', name: 'Picture Frame', emoji: '🖼️', cost: 22 },
  };

  // Tall / wall pieces drawn after the player so they overlap nicely
  const TALL = { bookshelf: 1, fireplace: 1, walllamp: 1, picture: 1 };

  const STORIES = {
    fireside: {
      title: 'The Fireside Tale',
      text: 'Once, on a quiet evening, Amber built a fire in her cottage. The flames danced, the kettle sang, and every star in the valley seemed to lean in to listen. Some nights, the best adventure is just being home.',
    },
    garden: {
      title: 'The Seed That Waited',
      text: 'Amber planted a tiny seed and watered it every single day. One morning it opened its petals to the sun — and whispered, "Thank you for believing in me." Small hands can grow big gardens.',
    },
    ocean: {
      title: 'The Shell’s Secret',
      text: 'At the beach, Amber held a seashell to her ear. It did not roar with the sea — it hummed with a song only she could hear. She put it in her pocket and smiled all the way home.',
    },
    gem: {
      title: 'The Gem in the Mountain',
      text: 'Deep in the mountain, a light blinked like a tiny star. Amber chipped the stone away and found a crystal that shimmered in seven colors. Some treasures hide on purpose, waiting for patient hands.',
      unlock: 'gem_finder',
    },
    gold: {
      title: 'The Golden Catch',
      text: 'Amber cast her line into the shimmering water and out came a fish of pure gold! She laughed so hard the ducks joined in. Lucky days come to those who try once more.',
      unlock: 'golden_fish',
    },
  };

  function place(state, tx, ty, id) {
    if (!state.inventory.homedec) state.inventory.homedec = {};
    if ((state.inventory.homedec[id] || 0) <= 0) {
      UI.toast('No furniture left');
      return false;
    }
    if (state.scene !== 'interior') {
      UI.toast('Furniture goes inside the cottage');
      FarmAudio.error();
      return false;
    }
    const t = World.getTile(state, tx, ty);
    if (t !== TILE.FLOOR) {
      UI.toast('Place furniture on the floor');
      FarmAudio.error();
      return false;
    }
    const key = tx + ',' + ty;
    if (state.homeDecor[key]) {
      UI.toast('Something is already there');
      FarmAudio.error();
      return false;
    }
    state.inventory.homedec[id]--;
    state.homeDecor[key] = { id, tx, ty };
    Shop.rebuildHotbar(state);
    FarmAudio.plant();
    Particles.burst(
      tx * CONST.TILE + 20, ty * CONST.TILE + 20,
      10, ['#FFB347', '#FFB7C5', '#7ED957'], { speedMax: 50 }
    );
    UI.toast(`Nice! ${DEFS[id].name} placed ✨`);
    Game.tryAchieve('decor_home');
    UI.refreshHUD();
    return true;
  }

  function pickup(state, tx, ty) {
    const key = tx + ',' + ty;
    const h = state.homeDecor[key];
    if (!h || !DEFS[h.id]) return false;
    if (!state.inventory.homedec) state.inventory.homedec = {};
    state.inventory.homedec[h.id] = (state.inventory.homedec[h.id] || 0) + 1;
    delete state.homeDecor[key];
    Shop.rebuildHotbar(state);
    FarmAudio.click();
    UI.toast(`${DEFS[h.id].name} back to the box 🧺`);
    UI.refreshHUD();
    return true;
  }

  function at(state, tx, ty) {
    const key = tx + ',' + ty;
    const h = state.homeDecor[key];
    return (h && DEFS[h.id]) ? h : null;
  }

  function interact(state, tx, ty) {
    const h = at(state, tx, ty);
    if (!h) return false;
    if (h.id === 'bookshelf') { UI.openStory(); return true; }
    if (h.id === 'fireplace') {
      UI.toast(state.period === 'evening' ? 'The fire glows warm. 🔥' : 'A cozy fireplace for cold nights. 🔥');
      if (state.period === 'evening') {
        Particles.burst(h.tx * CONST.TILE + 16, h.ty * CONST.TILE + 6, 6,
          ['#FFB347', '#FF8C42', '#FFD970'], { speedMax: 25, gravity: -20, up: 40 });
      }
      FarmAudio.click();
      return true;
    }
    if (h.id === 'petbed') { UI.toast('A soft spot — a pet would love it 🐾'); FarmAudio.click(); return true; }
    if (h.id === 'picture') { UI.toast('A pretty picture of the valley 🖼️'); FarmAudio.click(); return true; }
    if (h.id === 'walllamp') {
      UI.toast(state.period === 'evening' ? 'Warm light spills across the room 💡' : 'A lamp for the long evenings 💡');
      FarmAudio.click();
      return true;
    }
    if (h.id === 'toybox') { UI.toast('So many toys! 🧸'); FarmAudio.click(); return true; }
    UI.toast(`${DEFS[h.id].name} — cozy! ✨`);
    FarmAudio.click();
    return true;
  }

  function draw(ctx, state, tallOnly) {
    if (state.scene !== 'interior') return;
    for (const key of Object.keys(state.homeDecor || {})) {
      const h = state.homeDecor[key];
      if (!DEFS[h.id]) continue;
      if (tallOnly ? !TALL[h.id] : TALL[h.id]) continue;
      const x = h.tx * CONST.TILE;
      const y = h.ty * CONST.TILE;
      if (typeof Atlas !== 'undefined' && Atlas.ready()) {
        const idMap = {
          rug: Atlas.ID.RUG, table: Atlas.ID.TABLE, chair: Atlas.ID.CHAIR,
          bookshelf: Atlas.ID.BOOKSHELF, sofa: Atlas.ID.SOFA, fireplace: Atlas.ID.FIREPLACE,
          toybox: Atlas.ID.TOYBOX, petbed: Atlas.ID.PETBED, walllamp: Atlas.ID.WALLLAMP,
          picture: Atlas.ID.PICTURE,
        };
        const id = idMap[h.id];
        if (id != null) {
          Atlas.blit(ctx, id, x, y);
          continue;
        }
      }
      // Fallback pixel shapes
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + 4, y + 22, 24, 4);
      ctx.fillStyle = '#9a6432';
      ctx.fillRect(x + 4, y + 8, 24, 14);
      ctx.fillStyle = '#b87a3a';
      ctx.fillRect(x + 4, y + 8, 24, 4);
    }
  }

  /** Fireplace glow + embers each frame (called from game loop) */
  function update(state, dt) {
    if (state.scene !== 'interior' || state.period !== 'evening') return;
    if (Math.random() > 0.03) return;
    for (const key of Object.keys(state.homeDecor || {})) {
      const h = state.homeDecor[key];
      if (h.id !== 'fireplace') continue;
      Particles.emit({
        x: h.tx * CONST.TILE + 14 + Utils.rand(-2, 2),
        y: h.ty * CONST.TILE + 4,
        vx: Utils.rand(-4, 4),
        vy: Utils.rand(-22, -10),
        life: Utils.rand(0.6, 1.1),
        size: Utils.rand(1, 2.5),
        color: Utils.pick(['#FFB347', '#FF8C42', '#FFD970']),
        gravity: -6,
        drag: 0.97,
      });
      break;
    }
  }

  return { DEFS, STORIES, place, pickup, at, interact, draw, update };
})();
