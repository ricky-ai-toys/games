/* NPCs: sit at desks, wander, coffee path */

const NPC = (() => {
  function spawnAll(playerId) {
    const list = [];
    for (const p of allPeople()) {
      if (p.id === playerId) continue;
      const spawn = OfficeMap.spawnFor(p);
      list.push({
        id: p.id,
        data: p,
        x: spawn.x + Utils.rand(-4, 4),
        y: spawn.y + Utils.rand(-2, 2),
        vx: 0,
        vy: 0,
        facing: 1,
        sitting: true,
        busy: false,
        state: 'desk', // desk | walk | coffee | chat
        timer: Utils.rand(2, 8),
        target: null,
        bob: Math.random() * Math.PI * 2,
      });
    }
    return list;
  }

  function update(state, dt) {
    for (const n of state.npcs) {
      n.bob += dt * 4;
      if (n.busy) continue;

      n.timer -= dt;
      if (n.timer <= 0) {
        pickBehavior(state, n);
      }

      if (n.state === 'walk' || n.state === 'coffee') {
        moveToward(state, n, dt);
      } else if (n.sitting) {
        n.vx = 0;
        n.vy = 0;
        // Micro fidget
        if (Math.random() < 0.002) {
          n.facing *= -1;
        }
      }
    }
  }

  function pickBehavior(state, n) {
    if (n.data.generic) {
      // Generics mostly stay put
      n.state = 'desk';
      n.sitting = true;
      n.timer = Utils.rand(10, 25);
      return;
    }

    const roll = Math.random();
    const phase = DayTime.phase(state).id;

    if (roll < 0.45 || phase === 'late') {
      // Stay / return to desk
      goDesk(n);
      n.timer = Utils.rand(6, 16);
    } else if (roll < 0.7) {
      // Wander aisle
      n.sitting = false;
      n.state = 'walk';
      n.target = {
        x: Utils.rand(2, CONST.MAP_W - 2) * CONST.TILE,
        y: Utils.pick([3, 6, 9]) * CONST.TILE + Utils.rand(-6, 6),
      };
      n.timer = Utils.rand(4, 10);
    } else {
      // Coffee / water
      n.sitting = false;
      n.state = 'coffee';
      const prop = Utils.pick(
        OfficeMap.getProps().filter((p) => p.kind === 'coffee' || p.kind === 'water')
      );
      const c = Utils.worldCenter(prop.tx, prop.ty);
      n.target = { x: c.x, y: c.y + 12 };
      n.timer = Utils.rand(8, 14);
    }
  }

  function goDesk(n) {
    n.sitting = false;
    n.state = 'walk';
    const s = OfficeMap.spawnFor(n.data);
    n.target = { x: s.x, y: s.y };
  }

  function moveToward(state, n, dt) {
    if (!n.target) {
      n.state = 'desk';
      n.sitting = true;
      return;
    }
    const dx = n.target.x - n.x;
    const dy = n.target.y - n.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 6) {
      if (n.state === 'coffee') {
        n.timer = Utils.rand(2, 4);
        n.state = 'desk';
        n.target = null;
        // Return soon
        setTimeout(() => {
          if (n.busy) return;
          goDesk(n);
          n.timer = Utils.rand(3, 6);
        }, 2000);
        return;
      }
      // Arrived desk
      const home = OfficeMap.spawnFor(n.data);
      if (Utils.dist(n.x, n.y, home.x, home.y) < 12) {
        n.sitting = true;
        n.state = 'desk';
        n.x = home.x;
        n.y = home.y;
        n.target = null;
        n.timer = Utils.rand(8, 18);
      } else {
        n.target = null;
        n.timer = 1;
      }
      return;
    }

    const sp = CONST.NPC_SPEED * dt;
    const nx = n.x + (dx / d) * sp;
    const ny = n.y + (dy / d) * sp;
    if (OfficeMap.walkableAt(nx, n.y, 6)) n.x = nx;
    if (OfficeMap.walkableAt(n.x, ny, 6)) n.y = ny;
    n.facing = dx >= 0 ? 1 : -1;
    n.sitting = false;
  }

  function nearest(state, px, py, range) {
    let best = null;
    let bestD = range || CONST.TALK_RANGE;
    for (const n of state.npcs) {
      const d = Utils.dist(px, py, n.x, n.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  return { spawnAll, update, nearest };
})();
