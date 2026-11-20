/* ========================================
   Amber's Farm — Animals
   ======================================== */

const Animals = (() => {
  // Per-type wandering pens (tile coords). Barn animals stay in the barn pen.
  const PENS = {
    chicken: { x0: 4.5, x1: 7.5, y0: 18.5, y1: 20 },
    rooster: { x0: 4.5, x1: 7.5, y0: 18.5, y1: 20 },
    cow: { x0: 19.5, x1: 22.5, y0: 18.5, y1: 20 },
    goat: { x0: 19.5, x1: 22.5, y0: 18.5, y1: 20 },
    sheep: { x0: 19.5, x1: 22.5, y0: 18.5, y1: 20 },
    pig: { x0: 19.5, x1: 22.5, y0: 18.5, y1: 20 },
  };

  const NAMES = {
    chicken: ['Pip', 'Sunny', 'Peep', 'Clover', 'Nugget', 'Mabel'],
    rooster: ['Blaze', 'Cockle', 'Rusty', 'Sunrise', 'Comet'],
    cow: ['Buttercup', 'Daisy', 'Moo', 'Coco'],
    goat: ['Nibbles', 'Ginger', 'Willow', 'Hopper'],
    sheep: ['Cloud', 'Marshmallow', 'Woolly', 'Puff'],
    pig: ['Peach', 'Wilbur', 'Miso', 'Rosie'],
  };

  function makeAnimal(id, type, x, y) {
    const pen = PENS[type] || PENS.chicken;
    return {
      id,
      type,
      x: x * CONST.TILE,
      y: y * CONST.TILE,
      pen,
      fed: false,
      petted: false,
      productReady: false,
      happiness: 1,
      hearts: 0, // 0–5 friendship
      wanderT: Math.random() * 3,
      name: Utils.pick(NAMES[type] || ['Friendly']),
    };
  }

  function createChicken(id) {
    return makeAnimal(id, 'chicken', 5 + Math.random() * 2, 19 + Math.random());
  }

  function createRooster(id) {
    return makeAnimal(id, 'rooster', 5 + Math.random() * 2, 19 + Math.random());
  }

  function createCow(id) {
    return makeAnimal(id, 'cow', 20.5, 19.2);
  }

  function createGoat(id) {
    return makeAnimal(id, 'goat', 20 + Math.random(), 19 + Math.random() * 0.8);
  }

  function createSheep(id) {
    return makeAnimal(id, 'sheep', 20 + Math.random(), 19 + Math.random() * 0.8);
  }

  function createPig(id) {
    return makeAnimal(id, 'pig', 20 + Math.random(), 19 + Math.random() * 0.8);
  }

  function update(state, dt) {
    for (const a of state.animals) {
      a.wanderT -= dt;
      if (a.wanderT <= 0) {
        a.wanderT = 1 + Math.random() * 2;
        a.wx = (a.pen.x0 + Math.random() * (a.pen.x1 - a.pen.x0)) * CONST.TILE;
        a.wy = (a.pen.y0 + Math.random() * (a.pen.y1 - a.pen.y0)) * CONST.TILE;
      }
      if (a.wx != null) {
        a.x = Utils.lerp(a.x, a.wx, dt * 1.2);
        a.y = Utils.lerp(a.y, a.wy, dt * 1.2);
      }
    }
  }

  /** Rooster bonus: a happy rooster makes every chicken's heart grow a little faster */
  function roosterBoost(state, happy) {
    if (!happy) return false;
    let boosted = false;
    for (const a of state.animals) {
      if (a.type === 'chicken') {
        a.hearts = Math.min(5, (a.hearts || 0) + 1);
        boosted = true;
      }
    }
    return boosted;
  }

  function overnight(state) {
    // Capture rooster state before flags reset in the loop below
    const roo = state.animals.find(a => a.type === 'rooster');
    const rooHappy = !!(roo && roo.fed && roo.petted);
    for (const a of state.animals) {
      if (a.hearts == null) a.hearts = 0;
      const def = ANIMAL_DEFS[a.type];
      if (a.fed) {
        // Rooster is a companion — no product, just friendship
        if (def.product) {
          a.productReady = true;
          a.happiness = a.petted ? 2 : 1;
        } else {
          a.happiness = a.petted ? 2 : 0;
        }
        // Friendship grows when cared for
        if (a.petted && a.fed) {
          a.hearts = Math.min(5, (a.hearts || 0) + 1);
        }
      } else {
        if (def.product) a.productReady = false;
        a.happiness = 0;
        // Soft: neglect doesn't destroy hearts, only skips product
      }
      // High hearts boost happiness tier
      if (def.product && a.productReady && (a.hearts || 0) >= 4) a.happiness = 2;
      a.fed = false;
      a.petted = false;
    }
    if (rooHappy) roosterBoost(state, true);
  }

  function interactNear(state) {
    const p = state.player;
    let closest = null;
    let best = 48;
    for (const a of state.animals) {
      const d = Utils.dist(p.x, p.y, a.x, a.y);
      if (d < best) { best = d; closest = a; }
    }
    if (!closest) {
      // Near a building without animals — offer buy?
      const { tx, ty } = World.facingTile(state);
      const t = World.getTile(state, tx, ty);
      if (t === TILE.COOP || t === TILE.BARN || t === TILE.FENCE) {
        UI.openAnimalShop();
        return true;
      }
      return false;
    }

    // Collect product
    const def = ANIMAL_DEFS[closest.type];
    if (closest.productReady && def.product) {
      collectProduct(state, closest);
      return true;
    }

    // Feed if holding feed or auto with coins prompt — use inventory feed
    if (!closest.fed && (state.inventory.feed || 0) > 0) {
      state.inventory.feed--;
      closest.fed = true;
      FarmAudio.pet();
      Particles.floatText(closest.x, closest.y - 20, 'nom!', '#FFB347');
      UI.toast(`Fed ${closest.name}!`);
      state.stats.fed = (state.stats.fed || 0) + 1;
      if (typeof Quests !== 'undefined') Quests.progress(state, 'feed', 1);
      return true;
    }

    // Pet
    if (!closest.petted) {
      closest.petted = true;
      FarmAudio.pet();
      Particles.hearts(closest.x, closest.y - 10);
      const h = closest.hearts || 0;
      UI.toast(`${closest.name} ♥${h}/5 — loved the pets!`);
      return true;
    }

    // Already fed + petted today — open the animal card so she can rename it / check friendship
    UI.openAnimalCard(closest);
    return true;
  }

  function collectProduct(state, a) {
    a.productReady = false;
    const def = ANIMAL_DEFS[a.type];
    let item = def.product;
    // Generic star variant for every product type
    if (a.happiness >= 2 && PRODUCT_DEFS[def.product + '_star']) {
      item = def.product + '_star';
    }
    // Store as crop-like products in inventory.products
    if (!state.inventory.products[item]) state.inventory.products[item] = 0;
    state.inventory.products[item]++;
    FarmAudio.harvest();
    Particles.harvest(a.x, a.y);
    const emoji = PRODUCT_DEFS[item] ? PRODUCT_DEFS[item].emoji : def.productEmoji;
    Particles.floatText(a.x, a.y - 16, '+' + emoji, CONST.COLORS.amberGold);
    if (a.type === 'chicken') Game.tryAchieve('first_egg');
    if (a.type === 'cow') Game.tryAchieve('first_milk');
    if (a.type === 'goat') Game.tryAchieve('first_goat');
    if (a.type === 'sheep') Game.tryAchieve('first_wool');
    if (a.type === 'pig') Game.tryAchieve('first_truffle');
    UI.toast(`Collected ${PRODUCT_DEFS[item] ? PRODUCT_DEFS[item].name : item}!`);
  }

  function countType(state, type) {
    return state.animals.filter(a => a.type === type).length;
  }

  function barnCount(state) {
    return state.animals.filter(a => ANIMAL_DEFS[a.type] && ANIMAL_DEFS[a.type].building === 'barn').length;
  }

  function coopCap(state) {
    return state.coopUpgraded ? 6 : 3;
  }

  function barnCap(state) {
    return state.barnUpgraded ? 6 : 2;
  }

  function capacityFor(state, def) {
    if (def.building === 'coop') {
      return def.id === 'rooster' ? def.cap : coopCap(state);
    }
    return barnCap(state); // barn total across cow/goat/sheep/pig
  }

  function lockedHint(state, def) {
    if (def.unlock) return null;
    if (def.unlockNeedChickens && countType(state, 'chicken') < def.unlockNeedChickens && countType(state, def.id) === 0) {
      return `Raise ${def.unlockNeedChickens} chickens first!`;
    }
    if (def.unlockNeedCows && countType(state, 'cow') < def.unlockNeedCows && countType(state, def.id) === 0) {
      return `Raise ${def.unlockNeedCows} cows first!`;
    }
    if (def.unlockNeedGoats && countType(state, 'goat') < def.unlockNeedGoats && countType(state, def.id) === 0) {
      return 'Raise a goat first!';
    }
    return null;
  }

  function buy(state, type) {
    const def = ANIMAL_DEFS[type];
    if (!def) return;

    // Unlock gate (soft — once owned, always purchasable again)
    const hint = lockedHint(state, def);
    if (hint) {
      UI.toast(hint);
      FarmAudio.error();
      return;
    }

    // Capacity
    const cap = capacityFor(state, def);
    const inHouse = def.building === 'coop'
      ? (type === 'rooster' ? countType(state, 'rooster') : countType(state, 'chicken'))
      : barnCount(state);
    if (inHouse >= cap) {
      UI.toast(def.building === 'coop'
        ? (type === 'rooster' ? 'You already have a rooster!' : `Coop is full (${cap} chickens)!`)
        : `Barn is full (${cap} animals)!`);
      return;
    }

    if (state.coins < def.cost) {
      UI.toast('Not enough coins');
      FarmAudio.error();
      return;
    }
    state.coins -= def.cost;
    const id = type + '_' + Date.now();
    const create = {
      chicken: createChicken, rooster: createRooster, cow: createCow,
      goat: createGoat, sheep: createSheep, pig: createPig,
    }[type];
    state.animals.push(create(id));
    if (type === 'rooster') Game.tryAchieve('sunrise_caller');
    if (countType(state, 'chicken') >= 3) Game.tryAchieve('full_coop');
    if (barnCount(state) >= barnCap(state)) Game.tryAchieve('full_barn');
    FarmAudio.success();
    UI.toast(`Welcome, new ${def.name}! ${def.emoji}`);
    UI.closeModals();
  }

  /** Draw one animal (used by y-sort in Render) */
  function drawOne(ctx, a, time, state) {
    const bob = Math.sin(time * 3 + a.x) > 0 ? 0 : 1;
    const x = Math.floor(a.x);
    const y = Math.floor(a.y + bob);
    const wide = a.type === 'cow' || a.type === 'goat' || a.type === 'sheep' || a.type === 'pig';
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - (wide ? 12 : 7), y + 8, wide ? 24 : 14, 4);

    if (a.type === 'chicken') {
      ctx.fillStyle = '#f0f0e8';
      ctx.fillRect(x - 6, y - 4, 12, 10);
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x - 5, y - 2, 10, 6);
      ctx.fillStyle = '#f0f0e8';
      ctx.fillRect(x + 2, y - 10, 8, 8);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(x + 4, y - 13, 2, 3);
      ctx.fillRect(x + 7, y - 12, 2, 2);
      ctx.fillStyle = '#f0a020';
      ctx.fillRect(x + 9, y - 7, 3, 2);
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(x + 5, y - 8, 2, 2);
      ctx.fillStyle = '#f0a020';
      ctx.fillRect(x - 3, y + 6, 3, 3);
      ctx.fillRect(x + 2, y + 6, 3, 3);
    } else if (a.type === 'rooster') {
      // body
      ctx.fillStyle = '#d06030';
      ctx.fillRect(x - 6, y - 4, 12, 10);
      ctx.fillStyle = '#c05028';
      ctx.fillRect(x - 5, y - 2, 10, 6);
      // head
      ctx.fillStyle = '#e87838';
      ctx.fillRect(x + 2, y - 10, 8, 8);
      // comb
      ctx.fillStyle = '#e04040';
      ctx.fillRect(x + 3, y - 13, 2, 3);
      ctx.fillRect(x + 6, y - 13, 2, 4);
      ctx.fillRect(x + 9, y - 12, 2, 3);
      // beak + eye
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(x + 9, y - 7, 3, 2);
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(x + 5, y - 8, 2, 2);
      // tail feathers
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(x - 10, y - 4, 4, 3);
      ctx.fillRect(x - 8, y - 1, 3, 3);
      ctx.fillStyle = '#f0f0e8';
      ctx.fillRect(x - 9, y - 5, 3, 2);
      // legs
      ctx.fillStyle = '#e8a020';
      ctx.fillRect(x - 3, y + 6, 2, 3);
      ctx.fillRect(x + 2, y + 6, 2, 3);
    } else if (a.type === 'cow') {
      ctx.fillStyle = '#f5f0e8';
      ctx.fillRect(x - 12, y - 6, 24, 14);
      ctx.fillStyle = '#2a2818';
      ctx.fillRect(x - 8, y - 2, 6, 5);
      ctx.fillRect(x + 4, y, 5, 4);
      ctx.fillStyle = '#f5f0e8';
      ctx.fillRect(x + 8, y - 10, 10, 10);
      ctx.fillStyle = '#2a2818';
      ctx.fillRect(x + 10, y - 8, 3, 3);
      ctx.fillStyle = '#e8a0b0';
      ctx.fillRect(x + 14, y - 4, 5, 4);
      ctx.fillStyle = '#2a2818';
      ctx.fillRect(x - 10, y + 6, 4, 6);
      ctx.fillRect(x - 2, y + 6, 4, 6);
      ctx.fillRect(x + 4, y + 6, 4, 6);
      ctx.fillRect(x + 10, y + 6, 4, 6);
    } else if (a.type === 'goat') {
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x - 11, y - 6, 22, 14);
      ctx.fillStyle = '#e0d6c0';
      ctx.fillRect(x - 8, y - 2, 6, 5);
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x + 7, y - 10, 9, 10);
      ctx.fillStyle = '#2a2818';
      ctx.fillRect(x + 9, y - 8, 3, 3);
      // horns
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(x + 7, y - 13, 3, 3);
      ctx.fillRect(x + 11, y - 12, 3, 2);
      // beard
      ctx.fillStyle = '#c0b498';
      ctx.fillRect(x - 1, y + 5, 3, 4);
      // legs
      ctx.fillStyle = '#3a3228';
      ctx.fillRect(x - 9, y + 6, 4, 6);
      ctx.fillRect(x - 1, y + 6, 4, 6);
      ctx.fillRect(x + 5, y + 6, 4, 6);
      ctx.fillRect(x + 10, y + 6, 4, 6);
    } else if (a.type === 'sheep') {
      // wool puff
      ctx.fillStyle = '#f8f4ec';
      ctx.fillRect(x - 12, y - 6, 24, 14);
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(x - 9, y - 8, 8, 10);
      ctx.fillRect(x + 2, y - 8, 8, 10);
      ctx.fillRect(x - 4, y - 10, 9, 12);
      // face
      ctx.fillStyle = '#c8bca8';
      ctx.fillRect(x + 7, y - 9, 8, 8);
      ctx.fillStyle = '#2a2818';
      ctx.fillRect(x + 9, y - 7, 2, 2);
      ctx.fillRect(x + 12, y - 7, 2, 2);
      // ears
      ctx.fillStyle = '#c8bca8';
      ctx.fillRect(x + 5, y - 9, 2, 4);
      ctx.fillRect(x + 15, y - 9, 2, 4);
      // legs
      ctx.fillStyle = '#8a8272';
      ctx.fillRect(x - 9, y + 6, 4, 6);
      ctx.fillRect(x - 1, y + 6, 4, 6);
      ctx.fillRect(x + 5, y + 6, 4, 6);
      ctx.fillRect(x + 10, y + 6, 4, 6);
    } else if (a.type === 'pig') {
      ctx.fillStyle = '#f0a8b8';
      ctx.fillRect(x - 11, y - 5, 22, 13);
      ctx.fillStyle = '#e898a8';
      ctx.fillRect(x - 8, y - 1, 6, 4);
      ctx.fillStyle = '#f0a8b8';
      ctx.fillRect(x + 6, y - 9, 9, 9);
      ctx.fillStyle = '#f5b8c4';
      ctx.fillRect(x + 7, y - 4, 7, 3); // snout
      ctx.fillStyle = '#c06070';
      ctx.fillRect(x + 9, y - 3, 1, 1);
      ctx.fillRect(x + 11, y - 3, 1, 1);
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(x + 8, y - 7, 2, 2);
      ctx.fillRect(x + 12, y - 7, 2, 2);
      // ears
      ctx.fillStyle = '#e898a8';
      ctx.fillRect(x + 6, y - 11, 3, 3);
      ctx.fillRect(x + 12, y - 11, 3, 3);
      // legs
      ctx.fillStyle = '#e898a8';
      ctx.fillRect(x - 9, y + 6, 4, 6);
      ctx.fillRect(x - 1, y + 6, 4, 6);
      ctx.fillRect(x + 5, y + 6, 4, 6);
      ctx.fillRect(x + 10, y + 6, 4, 6);
    }
    if (a.productReady) {
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(x + 10, y - 16, 6, 7);
      ctx.fillStyle = '#e0d0a0';
      ctx.fillRect(x + 11, y - 14, 4, 4);
    }
    if (a.fed) {
      ctx.fillStyle = '#6a9a3a';
      ctx.fillRect(x - 12, y - 12, 4, 4);
    }
    // Show the animal's name when the player is close (cozy: names appear as you walk up)
    if (state && state.player && a.name) {
      const d = Utils.dist(state.player.x, state.player.y, a.x, a.y);
      if (d < CONST.TILE * 2.6) {
        ctx.save();
        ctx.font = '9px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const tw = ctx.measureText(a.name).width;
        ctx.fillStyle = 'rgba(20,12,4,0.55)';
        ctx.fillRect(x - tw / 2 - 3, y - 34, tw + 6, 12);
        ctx.fillStyle = '#fff3d6';
        ctx.fillText(a.name, x, y - 23);
        ctx.restore();
      }
    }
  }

  function draw(ctx, state, time) {
    for (const a of state.animals) {
      drawOne(ctx, a, time, state);
    }
  }

  return {
    createChicken, createRooster, createCow, createGoat, createSheep, createPig,
    update, overnight, interactNear, buy, draw, drawOne,
    countType, barnCount, coopCap, barnCap, lockedHint, capacityFor,
  };
})();
