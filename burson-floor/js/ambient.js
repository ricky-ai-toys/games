/* Ambient speech bubbles + pair banter */

const Ambient = (() => {
  function create() {
    return {
      bubbles: [], // { id, personId, text, x, y, life, maxLife, color }
      timer: 0.8,
      banterCooldown: 0,
      nextId: 1,
    };
  }

  function update(state, dt) {
    if (state.paused || state.mode !== 'play') return;

    const amb = state.ambient;
    amb.timer -= dt;
    amb.banterCooldown = Math.max(0, amb.banterCooldown - dt);

    // Age bubbles
    for (const b of amb.bubbles) {
      b.life -= dt;
      // Follow speaker if moving
      const p = findActor(state, b.personId);
      if (p) {
        b.x = p.x;
        b.y = p.y - 22;
      }
    }
    amb.bubbles = amb.bubbles.filter((b) => b.life > 0);

    const density = state.settings.density || 'normal';
    const base = CONST.AMBIENT_INTERVAL[density] || 2.2;
    const phase = DayTime.phase(state);
    const interval = base / (phase.bubbleMul || 1);

    if (amb.timer <= 0) {
      amb.timer = interval * Utils.rand(0.7, 1.3);
      // Prefer banter sometimes
      if (amb.banterCooldown <= 0 && Math.random() < 0.35) {
        if (tryBanter(state)) {
          amb.banterCooldown = 6;
          return;
        }
      }
      spawnAmbient(state);
    }
  }

  function findActor(state, id) {
    if (state.player && state.player.id === id) return state.player;
    return state.npcs.find((n) => n.id === id);
  }

  function spawnAmbient(state) {
    const candidates = state.npcs.filter((n) => !n.busy);
    if (!candidates.length) return;
    // Prefer on-screen-ish NPCs near player
    candidates.sort((a, b) => {
      const da = Utils.dist(a.x, a.y, state.player.x, state.player.y);
      const db = Utils.dist(b.x, b.y, state.player.x, state.player.y);
      return da - db;
    });
    const pool = candidates.slice(0, Math.min(8, candidates.length));
    const n = Utils.pick(pool);
    if (!n) return;
    // Don't stack too many on same person
    if (state.ambient.bubbles.some((b) => b.personId === n.id)) return;

    const person = n.data;
    const text = Utils.pick(linesForPerson(person));
    pushBubble(state, n.id, text, n.x, n.y - 22, person.color || '#aaa');
    Tasks.progress(state, 'overhear', 1);
    if (state.settings.sfx) OfficeAudio.bubble();
  }

  function tryBanter(state) {
    const free = state.npcs.filter((n) => !n.busy && !n.data.generic);
    if (free.length < 2) return false;

    // Find a nearby pair
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i];
        const b = free[j];
        if (Utils.dist(a.x, a.y, b.x, b.y) < 70) {
          const script = Utils.pick(BANTER);
          pushBubble(state, a.id, script.a, a.x, a.y - 22, a.data.color);
          // Delayed reply
          setTimeout(() => {
            if (state.mode !== 'play') return;
            pushBubble(state, b.id, script.b, b.x, b.y - 22, b.data.color);
            Tasks.progress(state, 'overhear', 1);
          }, 1600);
          // Face each other lightly
          a.facing = b.x >= a.x ? 1 : -1;
          b.facing = a.x >= b.x ? 1 : -1;
          if (state.settings.sfx) OfficeAudio.talk();
          return true;
        }
      }
    }
    return false;
  }

  function pushBubble(state, personId, text, x, y, color) {
    // Cap total bubbles
    if (state.ambient.bubbles.length > 10) {
      state.ambient.bubbles.shift();
    }
    state.ambient.bubbles.push({
      id: state.ambient.nextId++,
      personId,
      text,
      x,
      y,
      life: CONST.BUBBLE_LIFE,
      maxLife: CONST.BUBBLE_LIFE,
      color: color || '#5eb1bf',
    });
    if (!state.stats.overheard) state.stats.overheard = [];
    state.stats.overheard.push(text);
    if (state.stats.overheard.length > 30) state.stats.overheard.shift();
  }

  return { create, update, pushBubble };
})();
