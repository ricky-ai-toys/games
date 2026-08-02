/* ========================================
   Amber's Farm — Decorations
   ======================================== */

const Decor = (() => {
  const DEFS = {
    flowerpot: { id: 'flowerpot', name: 'Flower Pot', emoji: '🪴', cost: 25 },
    lantern: { id: 'lantern', name: 'Lantern', emoji: '🏮', cost: 40 },
    pathstone: { id: 'pathstone', name: 'Path Stone', emoji: '🪨', cost: 15 },
    sunflower: { id: 'sunflower', name: 'Sunflower', emoji: '🌻', cost: 30 },
    bench: { id: 'bench', name: 'Garden Bench', emoji: '🪑', cost: 60 },
    scarecrow: { id: 'scarecrow', name: 'Scarecrow', emoji: '🎃', cost: 80 },
  };

  function place(state, tx, ty, decorId) {
    if ((state.inventory.decor[decorId] || 0) <= 0) {
      UI.toast('No decor left');
      return false;
    }
    const t = World.getTile(state, tx, ty);
    if (t !== TILE.GRASS && t !== TILE.PATH && t !== TILE.DECOR_SPOT && t !== TILE.FLOWER) {
      UI.toast('Place on open ground near home');
      FarmAudio.error();
      return false;
    }
    const key = tx + ',' + ty;
    if (state.decor[key]) {
      UI.toast('Already decorated here');
      return false;
    }
    state.inventory.decor[decorId]--;
    state.decor[key] = { id: decorId, tx, ty };
    Shop.rebuildHotbar(state);
    FarmAudio.plant();
    Particles.burst(
      tx * CONST.TILE + 20, ty * CONST.TILE + 20,
      10, ['#FFB347', '#FFB7C5', '#7ED957'], { speedMax: 50 }
    );
    UI.toast('Beautiful! ✨');
    Game.tryAchieve('decor_home');
    UI.refreshHUD();
    return true;
  }

  function draw(ctx, state) {
    if (state.scene !== 'outdoor') return;
    for (const key of Object.keys(state.decor)) {
      const d = state.decor[key];
      const def = DEFS[d.id];
      if (!def) continue;
      const x = Math.floor(d.tx * CONST.TILE + CONST.TILE / 2);
      const y = Math.floor(d.ty * CONST.TILE + CONST.TILE / 2);
      // Pixel decor instead of emoji
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x - 6, y + 6, 12, 3);
      if (d.id === 'lantern') {
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x - 2, y - 4, 4, 12);
        ctx.fillStyle = '#ffe566';
        ctx.fillRect(x - 5, y - 10, 10, 8);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(x - 5, y - 12, 10, 2);
      } else if (d.id === 'pathstone') {
        ctx.fillStyle = '#989898';
        ctx.fillRect(x - 8, y, 16, 8);
        ctx.fillStyle = '#b0b0b0';
        ctx.fillRect(x - 6, y + 1, 6, 4);
      } else if (d.id === 'bench') {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x - 12, y, 24, 4);
        ctx.fillRect(x - 10, y + 4, 3, 6);
        ctx.fillRect(x + 7, y + 4, 3, 6);
      } else if (d.id === 'scarecrow') {
        // post
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x - 1, y - 14, 3, 22);
        // body
        ctx.fillStyle = '#c04830';
        ctx.fillRect(x - 8, y - 10, 16, 10);
        // head
        ctx.fillStyle = '#e8d8a0';
        ctx.fillRect(x - 5, y - 18, 10, 8);
        // hat
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x - 6, y - 20, 12, 3);
        ctx.fillRect(x - 3, y - 24, 6, 5);
        // arms
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x - 12, y - 8, 10, 2);
        ctx.fillRect(x + 3, y - 8, 10, 2);
        // face
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(x - 3, y - 16, 2, 2);
        ctx.fillRect(x + 2, y - 16, 2, 2);
      } else if (d.id === 'sunflower') {
        ctx.fillStyle = '#4ea040';
        ctx.fillRect(x - 1, y - 2, 3, 12);
        ctx.fillStyle = '#f0d040';
        ctx.fillRect(x - 6, y - 10, 12, 10);
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x - 2, y - 7, 5, 5);
      } else {
        // flowerpot
        ctx.fillStyle = '#a04830';
        ctx.fillRect(x - 5, y + 2, 10, 8);
        ctx.fillStyle = '#4ea040';
        ctx.fillRect(x - 1, y - 4, 2, 8);
        ctx.fillStyle = '#f070a0';
        ctx.fillRect(x - 4, y - 8, 4, 4);
        ctx.fillRect(x + 1, y - 6, 4, 4);
      }
    }
  }

  return { DEFS, place, draw };
})();
