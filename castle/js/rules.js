/* Amber's Candy Castle — game rules engine.
 * Pure: no DOM, no canvas, no audio. Owns simulation state and mutates it in
 * step(). Presentation is driven entirely by state.events, which main.js drains.
 */
(function (global) {
  'use strict';

  var D = global.CCData;
  var G = global.CCGrid;
  var T = D.TUNE;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  /* ---------------------------------------------------------------- state */

  function createState(levelId, opts) {
    opts = opts || {};
    var level = D.levelById(levelId) || D.LEVELS[0];
    var grid = G.fromLevel(level);
    var seed = (opts.seed == null ? ((Math.random() * 0xffffffff) >>> 0) : (opts.seed >>> 0));
    var rand = G.mulberry32(seed);
    /* The viewport must be part of the state. Without it every cell in the
     * renderer computed NaN, which surfaced as a per-frame
     * createLinearGradient throw and made the board untappable. The node harness
     * could not have caught this: it never rendered anything. */
    var vw = (opts.w > 0 ? opts.w : 390);
    var vh = (opts.h > 0 ? opts.h : 780);

    var s = {
      level: level,
      levelId: level.id,
      endless: !!opts.endless,
      seed: seed,
      rand: rand,
      w: vw,
      h: vh,

      t: 0,
      gold: level.gold,
      lives: T.startLives,
      maxLives: T.startLives,

      grid: grid,
      towers: [],
      enemies: [],
      parts: [],
      floats: [],

      waveIdx: -1,           // -1 = still in pre-wave prep
      wavePhase: 'prep',     // prep | running | between | won | lost
      waveT: 0,
      spawnQueue: [],
      waveHpScale: 1,
      waveSpeedScale: 1,

      over: false,
      result: null,
      stars: 0,
      leaks: 0,
      kills: 0,
      score: 0,

      selected: null,        // 'wall' or a tower id
      events: [],
      hint: level.teach || ''
    };

    /* Every level opens with build time, endless or not. Without it stepWaves()
     * saw waveT === 0 and started wave 1 on the first frame, so the player never
     * got to build anything at all. */
    s.waveIdx = -1;
    s.wavePhase = 'prep';
    s.waveT = T.prepTime;
    return s;
  }

  function emit(s, type, data) {
    var e = data || {};
    e.t = type;
    s.events.push(e);
  }

  /* ---------------------------------------------------------------- waves */

  function waveList(s) {
    if (s.endless) {
      /* Endless is generated from the same tables so it needs no extra content.
       * Counts and mix scale with depth; the boss shows up every 10th wave. */
      var n = s.waveIdx + 1;
      var out = [{ e: 'grunt', n: 8 + Math.floor(n * 1.4), gap: 0.5 }];
      if (n >= 3) out.push({ e: 'runner', n: 4 + Math.floor(n * 0.9), gap: 0.35 });
      if (n >= 5) out.push({ e: 'swarm', n: 10 + Math.floor(n * 2.2), gap: 0.16 });
      if (n >= 7) out.push({ e: 'armoured', n: 2 + Math.floor(n * 0.35), gap: 0.9 });
      if (n >= 9) out.push({ e: 'honeybug', n: 1 + Math.floor(n * 0.2), gap: 1.0 });
      if (n % 10 === 0) out.push({ e: ['boss', 'iceboss', 'queen'][Math.min(2, Math.floor(n / 10) - 1)], n: Math.ceil(n / 10), gap: 3 });
      return [out];
    }
    return [s.level.waves[s.waveIdx] || []];
  }

  function startWave(s) {
    s.waveIdx++;
    s.wavePhase = 'running';
    s.waveT = 0;
    s.spawnQueue = [];

    var groups = waveList(s)[0];
    /* Health and speed scale with wave depth so a long level stays tense. */
    var depth = Math.max(0, s.waveIdx);
    s.waveHpScale = 1 + depth * T.hpGrowth;
    s.waveSpeedScale = 1 + depth * T.speedGrowth;

    var t = T.firstWaveDelay;
    for (var gi = 0; gi < groups.length; gi++) {
      var grp = groups[gi];
      for (var i = 0; i < grp.n; i++) {
        s.spawnQueue.push({ t: t, id: grp.e });
        t += grp.gap;
      }
      t += 0.6;
    }
    s.spawnQueue.sort(function (a, b) { return a.t - b.t; });
    s.spawnCursor = 0;
    emit(s, 'wave-start', { index: s.waveIdx, total: waveTotal(s) });
  }

  function waveTotal(s) {
    if (s.endless) return Infinity;
    return s.level.waveCount;
  }

  function waveLabel(s) {
    if (s.endless) return 'Wave ' + (s.waveIdx + 1);
    return 'Wave ' + Math.max(1, s.waveIdx + 1) + ' / ' + s.level.waveCount;
  }

  /* -------------------------------------------------------------- spawning */

  function spawnEnemy(s, id) {
    var spec = D.enemy(id);
    if (!spec || !s.grid.gates.length) return null;
    var gate = s.grid.gates[(s.spawnGateCursor = ((s.spawnGateCursor || 0) + 1) % s.grid.gates.length)];
    var e = {
      id: id,
      spec: spec,
      hp: spec.hp * s.waveHpScale,
      maxHp: spec.hp * s.waveHpScale,
      speed: spec.speed * s.waveSpeedScale,
      c: gate.c, r: gate.r,
      p: 0,
      ox: (s.rand() - 0.5) * 0.55,
      oy: (s.rand() - 0.5) * 0.55,
      dc: 0, dr: 0,
      slowT: 0, slowAmt: 0,
      progress: 0,
      dead: false,
      leak: false,
      hurtT: 0,
      chainT: 0
    };
    s.enemies.push(e);
    return e;
  }

  function enemyXY(s, e) {
    return { x: e.c + e.dc * e.p + e.ox, y: e.r + e.dr * e.p + e.oy };
  }

  /* ------------------------------------------------------------- economy */

  function itemCost(s, item) {
    if (item === 'wall') return T.wallCost;
    var spec = D.tower(item);
    return spec ? spec.cost : 0;
  }

  function canAfford(s, item) { return s.gold >= itemCost(s, item); }

  /* The one place placement is allowed. Grid.legal is pure, so a refusal leaves
   * the board untouched by construction. */
  function tryPlace(s, c, r, item) {
    /* Reject an unknown item up front. Without this, a caller passing a bad id
     * got a tower whose `id` is undefined, which detonated later in towerStat()
     * as a null deref — a crash a long way from the mistake. */
    if (item !== 'wall' && !D.tower(item)) {
      emit(s, 'refuse', { c: c, r: r, code: 'item', reason: 'Unknown item' });
      return false;
    }
    var cost = itemCost(s, item);
    var check = G.legal(s.grid, c, r, item === 'wall' ? G.WALL : G.TOWER);
    if (!check.ok) {
      emit(s, 'refuse', { c: c, r: r, code: check.code, reason: check.reason });
      return false;
    }
    if (s.gold < cost) {
      emit(s, 'refuse', { c: c, r: r, code: 'gold', reason: 'Not enough gold' });
      return false;
    }
    s.gold -= cost;
    if (item === 'wall') {
      G.place(s.grid, c, r, G.WALL);
    } else {
      var spec = D.tower(item);
      var tw = {
        id: item, c: c, r: r, tier: 0, cd: 0, angle: 0, target: null, pulse: 0, spent: cost
      };
      s.grid.towerAt[G.idx(s.grid, c, r)] = tw;
      s.grid.cells[G.idx(s.grid, c, r)] = G.TOWER;
      s.grid.dirty = true;
      G.ensureField(s.grid);
      s.towers.push(tw);
    }
    emit(s, 'place', { c: c, r: r, item: item });
    return true;
  }

  function towerAtCell(s, c, r) {
    return s.grid.towerAt[G.idx(s.grid, c, r)] || null;
  }

  function upgradeCost(spec, tier) {
    return spec.upgradeCost[tier] || 0;
  }

  function tryUpgrade(s, c, r) {
    var tw = towerAtCell(s, c, r);
    if (!tw) return false;
    var spec = D.tower(tw.id);
    if (tw.tier >= spec.tiers.length - 1) {
      emit(s, 'refuse', { c: c, r: r, code: 'maxed', reason: spec.name + ' is fully upgraded' });
      return false;
    }
    var cost = upgradeCost(spec, tw.tier);
    if (s.gold < cost) {
      emit(s, 'refuse', { c: c, r: r, code: 'gold', reason: 'Not enough gold' });
      return false;
    }
    s.gold -= cost;
    tw.spent += cost;
    tw.tier++;
    tw.pulse = 1;
    emit(s, 'upgrade', { c: c, r: r, item: tw.id, tier: tw.tier });
    return true;
  }

  function trySell(s, c, r) {
    var tw = towerAtCell(s, c, r);
    if (!tw) return false;
    var refund = Math.floor(tw.spent * T.sellRefund);
    s.gold += refund;
    s.towers = s.towers.filter(function (x) { return x !== tw; });
    s.grid.towerAt[G.idx(s.grid, c, r)] = null;
    s.grid.cells[G.idx(s.grid, c, r)] = G.EMPTY;
    s.grid.dirty = true;
    G.ensureField(s.grid);
    emit(s, 'sell', { c: c, r: r, refund: refund });
    return true;
  }

  function isWall(s, c, r) { return G.kind(s.grid, c, r) === G.WALL; }

  /* Remove a wall back to the player. */
  function tryRemoveWall(s, c, r) {
    if (!isWall(s, c, r)) return false;
    s.gold += Math.floor(T.wallCost * T.sellRefund);
    G.clearCell(s.grid, c, r);
    G.ensureField(s.grid);
    emit(s, 'remove-wall', { c: c, r: r });
    return true;
  }

  /* ------------------------------------------------------------- combat */

  function towerStat(tw) {
    return D.tower(tw.id).tiers[tw.tier];
  }

  /* "First" targeting: the enemy furthest along its route, i.e. nearest the
   * castle. Standard tower-defence convention and the least surprising. */
  function pickTarget(s, tw, st, exclude) {
    var best = null, bestProg = -1;
    var r2 = st.range * st.range;
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (e.dead || (exclude && exclude.indexOf(e) >= 0)) continue;
      var p = enemyXY(s, e);
      if (dist2(p.x, p.y, tw.c, tw.r) > r2) continue;
      if (e.progress > bestProg) { bestProg = e.progress; best = e; }
    }
    return best;
  }

  function damage(s, e, amount, src) {
    if (e.dead) return;
    var dealt = Math.max(1, amount - (e.spec.armor || 0));
    e.hp -= dealt;
    e.hurtT = 0.14;
    if (e.hp <= 0) {
      e.dead = true;
      s.gold += e.spec.bounty;
      s.kills++;
      s.score += e.spec.bounty * 2;
      var at = enemyXY(s, e);
      emit(s, 'kill', { c: e.c, r: e.r, id: e.id, x: at.x, y: at.y });
    }
  }

  function fire(s, tw) {
    var st = towerStat(tw);
    var target = pickTarget(s, tw, st);
    if (!target) return;
    tw.target = target;
    var tp = enemyXY(s, tw);
    tw.angle = Math.atan2(tp.y - tw.r, tp.x - tw.c);

    if (st.chain) {
      /* Arc: walk the chain, each link at reduced damage, never revisiting. */
      var hit = [];
      var cur = target;
      var dmg = st.damage;
      for (var i = 0; i < st.chain && cur; i++) {
        hit.push(cur);
        damage(s, cur, dmg, 'arc');
        emit(s, 'bolt', { c: cur.c, r: cur.r, item: tw.id });
        dmg *= 0.72;
        cur = pickTarget(s, tw, st, hit);
      }
      return;
    }

    damage(s, target, st.damage, tw.id);
    emit(s, 'bolt', { c: target.c, r: target.r, item: tw.id });

    if (st.splash) {
      var tp2 = enemyXY(s, tw);
      var cp = enemyXY(s, target);
      for (var j = 0; j < s.enemies.length; j++) {
        var o = s.enemies[j];
        if (o.dead || o === target) continue;
        var op = enemyXY(s, o);
        if (dist2(op.x, op.y, cp.x, cp.y) <= st.splash * st.splash) {
          damage(s, o, st.damage * 0.55, 'splash');
        }
      }
      emit(s, 'boom', { x: cp.x, y: cp.y, r: st.splash });
    }

    if (st.slow) {
      target.slowT = 1.6;
      target.slowAmt = Math.max(target.slowAmt, 1 - st.slow * (1 - (target.spec.slowResist || 0)));
    }
  }

  function stepTowers(s, dt) {
    for (var i = 0; i < s.towers.length; i++) {
      var tw = s.towers[i];
      var st = towerStat(tw);
      if (tw.pulse > 0) tw.pulse = Math.max(0, tw.pulse - dt * 2);
      tw.cd -= dt;
      if (tw.cd <= 0) {
        fire(s, tw);
        tw.cd = st.rate;
      }
    }
  }

  function stepHealers(s, dt) {
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (e.dead || !e.spec.heal || !e.spec.healRange) continue;
      var ep = enemyXY(s, e);
      var r2 = e.spec.healRange * e.spec.healRange;
      for (var j = 0; j < s.enemies.length; j++) {
        var o = s.enemies[j];
        if (o.dead || o === e) continue;
        var op = enemyXY(s, o);
        if (dist2(op.x, op.y, ep.x, ep.y) <= r2 && o.hp < o.maxHp) {
          o.hp = Math.min(o.maxHp, o.hp + e.spec.heal * dt);
        }
      }
    }
  }

  /* ------------------------------------------------------------ movement */

  function stepEnemies(s, dt) {
    var grid = s.grid;
    G.ensureField(grid);
    var castle = grid.castle;

    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i];
      if (e.dead) continue;

      if (e.hurtT > 0) e.hurtT = Math.max(0, e.hurtT - dt);
      if (e.slowT > 0) {
        e.slowT = Math.max(0, e.slowT - dt);
        if (e.slowT === 0) e.slowAmt = 0;
      }

      var slowFactor = 1 - (e.slowAmt || 0);
      var speed = T.enemySpeedBase * e.speed * slowFactor * dt;

      var remaining = speed;
      /* Advance along the flow field, hopping cell to cell. Bounded so a large
       * dt cannot tunnel a cell and skip the castle check. */
      var guard = 0;
      while (remaining > 0 && !e.dead && guard++ < 12) {
        var fi = G.idx(grid, e.c, e.r);
        var dx = grid.dirX[fi], dy = grid.dirY[fi];
        if (dx === 0 && dy === 0) {
          /* At the castle, or stranded. */
          if (castle && e.c === castle.c && e.r === castle.r) { leak(s, e); }
          else leak(s, e);
          break;
        }
        e.dc = dx; e.dr = dy;
        var cellLen = 1;
        var need = (1 - e.p) * cellLen;
        if (remaining < need) {
          e.p += remaining / cellLen;
          e.progress += remaining;
          remaining = 0;
        } else {
          remaining -= need;
          e.c += dx; e.r += dy;
          e.p = 0;
          e.progress += cellLen;
        }
        if (castle && e.c === castle.c && e.r === castle.r) { leak(s, e); break; }
      }
    }
  }

  function leak(s, e) {
    if (e.leak || e.dead) return;
    e.leak = true;
    e.dead = true;
    var dmg = e.spec.leak;
    s.lives -= dmg;
    s.score = Math.max(0, s.score - dmg * 5);
    emit(s, 'leak', { c: e.c, r: e.r, id: e.id, damage: dmg, x: e.c, y: e.r });
    if (s.lives <= 0) { s.lives = 0; endLevel(s, 'lost'); }
  }

  /* -------------------------------------------------------------- waves */

  function stepWaves(s, dt) {
    if (s.over) return;

    if (s.wavePhase === 'prep' || s.wavePhase === 'between') {
      s.waveT -= dt;
      if (s.waveT <= 0) startWave(s);
      return;
    }

    if (s.wavePhase !== 'running') return;

    s.waveT += dt;
    while (s.spawnCursor < s.spawnQueue.length && s.spawnQueue[s.spawnCursor].t <= s.waveT) {
      spawnEnemy(s, s.spawnQueue[s.spawnCursor].id);
      s.spawnCursor++;
    }

    if (s.spawnCursor >= s.spawnQueue.length && s.enemies.length === 0) {
      /* Wave cleared. */
      var bonus = 20 + s.waveIdx * 8 + (s.endless ? 0 : 0);
      s.gold += bonus;
      s.score += 50 + s.waveIdx * 15;
      emit(s, 'wave-clear', { index: s.waveIdx, bonus: bonus });

      if (!s.endless && s.waveIdx + 1 >= s.level.waveCount) {
        endLevel(s, 'won');
        return;
      }
      s.wavePhase = 'between';
      s.waveT = T.betweenWaves;
    }
  }

  function autoStart(s) {
    if (s.over) return;
    if (s.wavePhase === 'prep' || s.wavePhase === 'between') startWave(s);
  }

  function endLevel(s, result) {
    if (s.over) return;
    s.over = true;
    s.result = result;
    if (result === 'won') {
      s.lives = Math.max(0, s.lives);
      var ratio = s.lives / s.maxLives;
      s.stars = ratio >= 0.999 ? 3 : ratio >= 0.5 ? 2 : 1;
      s.score += s.lives * 25;
    }
    emit(s, result, { score: s.score, stars: s.stars });
  }

  /* ---------------------------------------------------------- debug/QA */

  /* Jump straight to a wave, for the headless browser harness to reach late
   * content without grinding. */
  function debugSkipToWave(s, n) {
    s.waveIdx = Math.max(-1, n - 2);
    s.wavePhase = 'between';
    s.waveT = 0.05;
    return s;
  }

  function debugGrant(s, gold) { s.gold += gold; return s; }

  /* ---------------------------------------------------------------- step */

  function step(s, rawDt) {
    if (s.over) return s;
    var dt = Math.min(0.05, Math.max(0, rawDt));
    s.t += dt;

    stepWaves(s, dt);
    if (s.over) { s.enemies.length = 0; return s; }

    stepTowers(s, dt);
    stepEnemies(s, dt);
    stepHealers(s, dt);

    s.enemies = s.enemies.filter(function (e) { return !e.dead; });
    ageVisuals(s, dt);
    return s;
  }

  function ageVisuals(s, dt) {
    var i, p;
    for (i = s.parts.length - 1; i >= 0; i--) {
      p = s.parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx -= p.vx * Math.min(1, 2.4 * dt);
      p.vy -= p.vy * Math.min(1, 2.4 * dt);
      p.life -= dt;
      if (p.life <= 0) s.parts.splice(i, 1);
    }
    for (i = s.floats.length - 1; i >= 0; i--) {
      p = s.floats[i];
      p.y -= 0.9 * dt;
      p.life -= dt;
      if (p.life <= 0) s.floats.splice(i, 1);
    }
  }

  function burst(s, x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = s.rand() * Math.PI * 2;
      var sp = 0.6 + s.rand() * 2.4;
      s.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + s.rand() * 0.25, max: 0.55,
        r: 0.04 + s.rand() * 0.07, color: color || '#ffd180'
      });
    }
  }

  var CCRules = {
    createState: createState,
    step: step,
    emit: emit,
    tryPlace: tryPlace,
    tryUpgrade: tryUpgrade,
    trySell: trySell,
    tryRemoveWall: tryRemoveWall,
    towerAtCell: towerAtCell,
    isWall: isWall,
    canAfford: canAfford,
    itemCost: itemCost,
    autoStart: autoStart,
    startWave: startWave,
    waveLabel: waveLabel,
    waveTotal: waveTotal,
    towerStat: towerStat,
    enemyXY: enemyXY,
    burst: burst,
    clamp: clamp,
    debugSkipToWave: debugSkipToWave,
    debugGrant: debugGrant
  };

  global.CCRules = CCRules;
  if (typeof module !== 'undefined' && module.exports) module.exports = CCRules;
})(typeof window !== 'undefined' ? window : globalThis);
