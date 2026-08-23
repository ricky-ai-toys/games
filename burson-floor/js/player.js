/* Player movement + interact */

const Player = (() => {
  function create(person) {
    const spawn = OfficeMap.spawnFor(person);
    return {
      id: person.id,
      data: person,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facing: 1,
      sitting: false,
      bob: 0,
      focus: CONST.FOCUS_MAX,
      deskTimer: 0,
    };
  }

  function update(state, dt, keys) {
    const p = state.player;
    if (!p || state.dialogue || state.paused) return;

    p.bob += dt * 5;
    let mx = 0;
    let my = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) mx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) mx += 1;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) my -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) my += 1;

    if (state.clickTarget) {
      const dx = state.clickTarget.x - p.x;
      const dy = state.clickTarget.y - p.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        mx = dx / len;
        my = dy / len;
      } else {
        state.clickTarget = null;
      }
    }

    if (mx !== 0 || my !== 0) {
      p.sitting = false;
      p.deskTimer = 0;
      const len = Math.sqrt(mx * mx + my * my) || 1;
      mx /= len;
      my /= len;
      const speed = CONST.PLAYER_SPEED * (p.focus < 25 ? 0.85 : 1);
      const nx = p.x + mx * speed * dt;
      const ny = p.y + my * speed * dt;
      if (OfficeMap.walkableAt(nx, p.y, 8)) p.x = nx;
      if (OfficeMap.walkableAt(p.x, ny, 8)) p.y = ny;
      if (mx !== 0) p.facing = mx >= 0 ? 1 : -1;
    }

    const gameMin = dt / CONST.SEC_PER_GAME_MIN;
    if (p.sitting) {
      p.focus = Utils.clamp(p.focus + gameMin * 0.5, 0, CONST.FOCUS_MAX);
      p.deskTimer += dt;
      if (p.deskTimer > 4) {
        Tasks.progress(state, 'desk', 1);
      }
    } else if (mx !== 0 || my !== 0) {
      p.focus = Utils.clamp(p.focus - gameMin * CONST.FOCUS_DECAY_PER_MIN, 0, CONST.FOCUS_MAX);
    }

    p.x = Utils.clamp(p.x, CONST.TILE, (CONST.MAP_W - 1) * CONST.TILE);
    p.y = Utils.clamp(p.y, CONST.TILE, (CONST.MAP_H - 1) * CONST.TILE);
  }

  function tryInteract(state) {
    if (state.dialogue) {
      Dialogue.close(state);
      return;
    }
    const p = state.player;
    const npc = NPC.nearest(state, p.x, p.y, CONST.TALK_RANGE);
    if (npc) {
      Dialogue.open(state, npc);
      return;
    }

    const home = OfficeMap.spawnFor(p.data);
    if (Utils.dist(p.x, p.y, home.x, home.y) < CONST.SIT_RANGE + 10) {
      p.sitting = !p.sitting;
      if (p.sitting) {
        p.x = home.x;
        p.y = home.y;
        const dutyHint = p.data.duties
          ? Utils.pick(LINES.deskWork) + ' · ' + p.data.title
          : Utils.pick(LINES.deskWork);
        UI.toast(dutyHint);
      }
      return;
    }

    const prop = OfficeMap.propNear(p.x, p.y, CONST.PROP_RANGE);
    if (prop) {
      useProp(state, prop);
    }
  }

  function useProp(state, prop) {
    const p = state.player;
    if (prop.kind === 'coffee') {
      p.focus = Utils.clamp(p.focus + CONST.COFFEE_FOCUS, 0, CONST.FOCUS_MAX);
      Tasks.progress(state, 'coffee', 1);
      OfficeAudio.coffee();
      UI.toast(Utils.pick(LINES.coffeeLines));
    } else if (prop.kind === 'water') {
      p.focus = Utils.clamp(p.focus + CONST.COFFEE_FOCUS * 0.6, 0, CONST.FOCUS_MAX);
      Tasks.progress(state, 'coffee', 1);
      OfficeAudio.coffee();
      UI.toast(Utils.pick(LINES.waterLines));
    } else if (prop.kind === 'printer') {
      OfficeAudio.click();
      Tasks.progress(state, 'props', 1);
      UI.toast(Utils.pick(LINES.printerLines));
      // Ambient reaction chance
      if (Math.random() < 0.4 && state.npcs.length) {
        const n = Utils.pick(state.npcs.filter((x) => !x.data.generic));
        if (n) {
          Ambient.pushBubble(state, n.id, Utils.pick([
            "Printer drama again?",
            "Print one for me if it lives!",
            "That machine fears important decks.",
          ]), n.x, n.y - 22, n.data.color);
        }
      }
    } else if (prop.kind === 'bloomberg') {
      p.focus = Utils.clamp(p.focus + (CONST.BLOOMBERG_FOCUS || 12), 0, CONST.FOCUS_MAX);
      OfficeAudio.talk();
      Tasks.progress(state, 'props', 1);
      Tasks.progress(state, 'bloomberg', 1);
      UI.toast(Utils.pick(LINES.bloombergLines));
    } else if (prop.kind === 'booth1') {
      OfficeAudio.click();
      Tasks.progress(state, 'props', 1);
      Tasks.progress(state, 'booth', 1);
      p.focus = Utils.clamp(p.focus + 8, 0, CONST.FOCUS_MAX);
      UI.toast(Utils.pick(LINES.booth1Lines));
      // Soft privacy moment
      Ambient.pushBubble(
        state,
        p.id,
        Utils.pick(["…on the call.", "Taking this offline.", "Client line — one sec."]),
        p.x,
        p.y - 22,
        p.data.color
      );
    } else if (prop.kind === 'booth4') {
      OfficeAudio.success();
      Tasks.progress(state, 'props', 1);
      Tasks.progress(state, 'booth', 1);
      UI.toast(Utils.pick(LINES.booth4Lines));
      // Pull nearby NPCs into banter vibe
      const near = state.npcs
        .filter((n) => !n.data.generic && Utils.dist(n.x, n.y, p.x, p.y) < 120)
        .slice(0, 3);
      near.forEach((n, i) => {
        setTimeout(() => {
          if (state.mode !== 'play') return;
          Ambient.pushBubble(
            state,
            n.id,
            Utils.pick([
              "Huddle energy!",
              "War room. Let's go.",
              "Four brains > one hero.",
              "Okay who owns the action?",
            ]),
            n.x,
            n.y - 22,
            n.data.color
          );
        }, 400 * i);
      });
    }
  }

  return { create, update, tryInteract };
})();
