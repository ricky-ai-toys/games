/* ========================================
   Amber's Farm — NPCs
   ======================================== */

const NPC = (() => {
  function tryInteract(state, tx, ty) {
    for (const id of Object.keys(NPCS)) {
      const n = NPCS[id];
      if ((n.scene || 'outdoor') !== state.scene) continue;
      if (Math.abs(n.tx - tx) <= 1 && Math.abs(n.ty - ty) <= 1) {
        openDialogue(state, id);
        return true;
      }
      // Also if player standing next to NPC tile
      const p = Utils.tileAt(state.player.x, state.player.y);
      if (Math.abs(n.tx - p.tx) <= 1 && Math.abs(n.ty - p.ty) <= 1) {
        // check facing near
        if (Math.abs(n.tx - tx) <= 1 && Math.abs(n.ty - ty) <= 1) {
          openDialogue(state, id);
          return true;
        }
      }
    }
    // Proximity based
    for (const id of Object.keys(NPCS)) {
      const n = NPCS[id];
      if ((n.scene || 'outdoor') !== state.scene) continue;
      const nx = (n.tx + 0.5) * CONST.TILE;
      const ny = (n.ty + 0.5) * CONST.TILE;
      if (Utils.dist(state.player.x, state.player.y, nx, ny) < 50) {
        openDialogue(state, id);
        return true;
      }
    }
    return false;
  }

  function openDialogue(state, id) {
    const n = NPCS[id];
    const hearts = state.npcHearts[id] || 0;
    let line = n.lines[Math.min(hearts, n.lines.length - 1)];
    if (id === 'milo') {
      const stage = state.townWelcome || 1;
      if (stage >= 4) {
        line = "Town Welcome complete, Amber! The valley glows with you. 🎉 Here's a coin for your collection! (+20g)";
        if (!state.townWelcomeRewarded) {
          state.townWelcomeRewarded = true;
          state.coins += 20;
          FarmAudio.coins();
        }
      } else if (stage === 3) {
        line = "One more thing for the Town Welcome — find a gem on the mountain! 💎";
      } else if (stage === 2) {
        line = "Wonderful! Next for the Town Welcome: harvest a crop from your field! 🌾";
      } else if (hearts >= 2) {
        line = "The Town Welcome: pick a wildflower first, then a crop, then a gem! 🌸";
      }
    }
    FarmAudio.talk();
    if (typeof Quests !== 'undefined') Quests.progress(state, 'talk', 1);
    UI.openDialogue(n, line, id);
  }

  function gift(state, npcId) {
    const n = NPCS[npcId];
    // Prefer gifting selected crop/product/dish
    const giftItem = findGiftable(state);
    if (!giftItem) {
      UI.toast('Nothing to gift! Harvest or cook something first.');
      FarmAudio.error();
      return;
    }
    consumeGift(state, giftItem);
    let bonus = 1;
    if (n.lovedCrops.includes(giftItem.id)) bonus = 2;
    if (giftItem.kind === 'dish') {
      const r = RECIPES[giftItem.id];
      if (r) bonus += r.giftBonus || 0;
    }
    const prev = state.npcHearts[npcId] || 0;
    state.npcHearts[npcId] = Math.min(10, prev + bonus);
    const now = state.npcHearts[npcId];
    FarmAudio.success();
    Particles.hearts((n.tx + 0.5) * CONST.TILE, (n.ty + 0.5) * CONST.TILE);
    const gl = Utils.pick(n.giftLines);
    UI.openDialogue(n, gl, npcId);
    Game.tryAchieve('first_gift');
    if (typeof Quests !== 'undefined') Quests.progress(state, 'gift', 1);

    // Heart events (fire once when crossing threshold)
    if (!state.heartEvents) state.heartEvents = {};
    if (n.heartEvents) {
      for (const thr of Object.keys(n.heartEvents)) {
        const t = parseInt(thr, 10);
        const key = npcId + '_' + t;
        if (prev < t && now >= t && !state.heartEvents[key]) {
          state.heartEvents[key] = true;
          applyHeartEvent(state, npcId, t, n.heartEvents[thr]);
        }
      }
    }

    if (npcId === 'maple' && now >= 2) {
      state.recipesUnlocked.omelette = true;
      state.recipesUnlocked.blueberry_pie = true;
    }
    if (npcId === 'finn' && now >= 2) {
      state.recipesUnlocked.corn_soup = true;
    }
    if (npcId === 'finn' && now >= 3) {
      state.cowUnlocked = true;
      UI.toast('Finn: You can buy a cow at the coop now! 🐄');
    }
    if (npcId === 'bea' && now >= 2) {
      state.recipesUnlocked.pumpkin_pie = true;
    }
  }

  function applyHeartEvent(state, npcId, thr, text) {
    FarmAudio.success();
    Particles.confetti(CONST.VIEW_W / 2, 120);
    UI.toast(text);
    if (npcId === 'maple' && thr === 2) {
      state.inventory.fertilizer = (state.inventory.fertilizer || 0) + 1;
    }
    if (npcId === 'finn' && thr === 2) {
      state.inventory.feed = (state.inventory.feed || 0) + 2;
    }
    if (npcId === 'bea' && thr === 3) {
      state.inventory.decor = state.inventory.decor || {};
      state.inventory.decor.scarecrow = (state.inventory.decor.scarecrow || 0) + 1;
      Shop.rebuildHotbar(state);
    }
    if (npcId === 'bea' && thr === 5) {
      state.coins += 30;
    }
    if (npcId === 'milo' && thr === 2) {
      if (!state.townWelcome) state.townWelcome = 1;
      UI.toast('Town Welcome started — flower, crop, gem!');
    }
    if (npcId === 'milo' && thr === 5) {
      state.coins += 50;
    }
    if (npcId === 'rori' && thr === 2) {
      Gems.addGeode(state, 1);
    }
    if (npcId === 'rori' && thr === 5) {
      Gems.addGem(state, 'star_gem');
    }
    if (npcId === 'wren' && thr === 2) {
      state.wrenMushroomLuck = state.day; // mushroom luck for today
    }
    if (npcId === 'wren' && thr === 3) {
      state.inventory.seeds.winter_root = (state.inventory.seeds.winter_root || 0) + 2;
      Shop.rebuildHotbar(state);
    }
    if (npcId === 'wren' && thr === 5) {
      state.inventory.products.mushroom = (state.inventory.products.mushroom || 0) + 1;
    }
    Game.tryAchieve('heart_event');
  }

  function findGiftable(state) {
    // Dishes first
    for (const id of Object.keys(state.inventory.dishes || {})) {
      if (state.inventory.dishes[id] > 0) return { kind: 'dish', id };
    }
    for (const id of Object.keys(state.inventory.crops || {})) {
      const arr = state.inventory.crops[id];
      if (arr && arr.length) return { kind: 'crop', id };
    }
    for (const id of Object.keys(state.inventory.products || {})) {
      if (state.inventory.products[id] > 0) return { kind: 'product', id };
    }
    return null;
  }

  function consumeGift(state, g) {
    if (g.kind === 'dish') state.inventory.dishes[g.id]--;
    if (g.kind === 'crop') state.inventory.crops[g.id].pop();
    if (g.kind === 'product') state.inventory.products[g.id]--;
  }

  /** Draw a single NPC (used by y-sort in Render) */
  function drawOne(ctx, state, id, time) {
    const n = NPCS[id];
    if (!n) return;
    const x = Math.floor((n.tx + 0.5) * CONST.TILE);
    const bob = Math.sin(time * 2 + n.tx) > 0 ? 0 : 1;
    const iy = Math.floor((n.ty + 0.5) * CONST.TILE + bob);
    const ix = x;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ix - 8, iy + 12, 16, 5);
    ctx.fillStyle = '#3d2818';
    ctx.fillRect(ix - 5, iy + 6, 4, 8);
    ctx.fillRect(ix + 1, iy + 6, 4, 8);
    ctx.fillStyle = n.color;
    ctx.fillRect(ix - 6, iy - 4, 12, 12);
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(ix - 5, iy - 14, 10, 10);
    ctx.fillStyle = id === 'maple' ? '#8b3a1e' : id === 'bea' ? '#6b4423' :
      id === 'milo' ? '#5a6670' : id === 'rori' ? '#8a5ae0' : id === 'wren' ? '#4a7a4a' : '#3a4a6a';
    ctx.fillRect(ix - 5, iy - 16, 10, 4);
    ctx.fillRect(ix - 6, iy - 14, 2, 5);
    ctx.fillRect(ix + 4, iy - 14, 2, 5);
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(ix - 2, iy - 11, 2, 2);
    ctx.fillRect(ix + 2, iy - 11, 2, 2);
    if (id === 'maple') {
      ctx.fillStyle = '#e8d8a0';
      ctx.fillRect(ix - 7, iy - 18, 14, 3);
      ctx.fillRect(ix - 4, iy - 22, 8, 5);
    } else if (id === 'bea') {
      ctx.fillStyle = '#c48a4a';
      ctx.fillRect(ix - 6, iy - 18, 12, 4);
      ctx.fillStyle = '#ffe566';
      ctx.fillRect(ix - 2, iy - 16, 4, 2);
    } else if (id === 'milo') {
      ctx.fillStyle = '#3a4450';
      ctx.fillRect(ix - 7, iy - 22, 14, 6);
      ctx.fillStyle = '#ffd970';
      ctx.fillRect(ix - 7, iy - 20, 14, 2);
      ctx.fillRect(ix - 9, iy - 23, 18, 2);
    } else if (id === 'rori') {
      ctx.fillStyle = '#7a4ac0';
      ctx.fillRect(ix - 4, iy - 21, 8, 4);
      ctx.fillStyle = '#c4a8f8';
      ctx.fillRect(ix - 2, iy - 23, 4, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(ix, iy - 22, 2, 1);
    } else if (id === 'wren') {
      ctx.fillStyle = '#4a8a4a';
      ctx.fillRect(ix - 5, iy - 21, 5, 3);
      ctx.fillRect(ix - 1, iy - 24, 5, 2);
      ctx.fillStyle = '#6aaa5a';
      ctx.fillRect(ix - 3, iy - 21, 2, 6);
    } else {
      ctx.fillStyle = '#5a7a3a';
      ctx.fillRect(ix - 6, iy - 18, 12, 3);
    }
    ctx.fillStyle = 'rgba(30,18,10,0.75)';
    ctx.fillRect(ix - 26, iy + 16, 52, 11);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 9px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, ix, iy + 24);
    const hearts = state.npcHearts[id] || 0;
    if (hearts > 0) {
      ctx.fillStyle = '#e05070';
      for (let i = 0; i < Math.min(5, hearts); i++) {
        ctx.fillRect(ix - 12 + i * 5, iy - 22, 3, 3);
      }
    }
  }

  function draw(ctx, state, time) {
    for (const id of Object.keys(NPCS)) {
      const n = NPCS[id];
      if ((n.scene || 'outdoor') !== state.scene) continue;
      drawOne(ctx, state, id, time);
    }
  }

  return { tryInteract, gift, draw, drawOne, applyHeartEvent };
})();
