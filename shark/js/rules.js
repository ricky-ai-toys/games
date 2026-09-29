/* Amber's Shark Hunt — pure game engine.
 * No DOM. No canvas. No audio. Owns simulation state and mutates it in step().
 * Presentation is driven entirely by state.events, which main.js drains each frame.
 */
(function (global) {
  'use strict';

  var D = global.SHData;
  var T = D.TUNE;

  /* ---------------------------------------------------------------- rng */

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------ geometry */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function angDiff(a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function approach(cur, want, rate, dt) {
    var d = want - cur;
    var step = rate * dt;
    return Math.abs(d) <= step ? want : cur + Math.sign(d) * step;
  }

  /* -------------------------------------------------------------- shapes */

  /* THE shared radius. Collision and rendering both call this, so what the
   * player sees drawn is exactly what the game tests. The old file drew the
   * safe ring at o.r*1.28 but collided at playerR + o.r*0.64, which made every
   * fish look smaller than its actual hitbox.
   */
  function playerRadius(state) {
    var r = T.baseRadius + state.size * T.sizeRadiusPer;
    if (state.driftT > 0) r *= T.driftHitbox;
    return r;
  }
  function hitRadius(state, obj) {
    if (!obj) return playerRadius(state);
    if (obj.kind === 'player') return playerRadius(state);
    return obj.r;
  }

  function edible(state, obj) {
    return obj.kind === 'fish' && obj.n <= state.size;
  }
  function dangerous(state, obj) {
    if (obj.kind === 'apex') return true;
    return obj.kind === 'fish' && obj.n > state.size;
  }

  /* --------------------------------------------------------------- state */

  function createState(difficulty, seed, w, h) {
    var cfg = D.DIFF[difficulty] || D.DIFF.med;
    var rng = mulberry32(seed >>> 0);
    var state = {
      cfg: cfg,
      difficulty: cfg.key,
      seed: seed >>> 0,
      rng: rng,
      rand: rng,
      w: w, h: h,

      t: 0,
      over: false,
      result: null,          // 'win' | 'lose'

      score: 0,
      combo: 0,
      comboT: 0,
      bestChain: 0,
      near: 0,

      size: 1,
      xp: 0,
      xpNeed: T.xpPerSize,

      life: cfg.life,
      maxLife: cfg.life,
      iFrames: 0,             // damage immunity after a hit
      ward: 0,                // star powerup shield — separate concern from iFrames
      driftT: 0,             // time-dilation powerup
      gillsT: 0,             // dash-cooldown powerup

      frenzy: 0,
      dangerNear: 0,
      shake: 0,
      slow: 0,                // level-up time dilation

      x: w * 0.5, y: h * 0.62,
      vx: 0, vy: 0, face: 0,

      dashT: 0,
      dashCD: 0,
      dashDirX: 0,
      dashDirY: -1,
      biteT: 0,
      biteCD: 0,

      goal: 0,                // apex-hold progress, seconds
      holding: false,         // true once size >= WIN_SIZE
      apexWait: -1,           // countdown to the predator's first spawn
      apex: null,             // tier-6 predator instance, or null

      objs: [],
      relics: [],
      parts: [],
      floats: [],
      trail: [],
      bubbles: [],

      nextSpawn: 0,
      nextRelic: T.relicIntervalMin,
      graceT: 3,               // opening seconds with no forced threats

      events: [],
      input: { dx: 0, dy: 0, mag: 0, dash: false, bite: false }
    };
    bootSchool(state);
    return state;
  }

  function emit(state, type, data) {
    var e = data || {};
    e.t = type;
    state.events.push(e);
  }

  /* ------------------------------------------------------------ spawning */

  /* Weighted so small fish stay common and giants stay an event. */
  var TIER_WEIGHTS = [30, 26, 20, 13, 8, 3];
  var TIER_TOTAL = TIER_WEIGHTS.reduce(function (a, b) { return a + b; }, 0);

  /* Spawn weights are biased by player size, so the ocean leans friendly while
   * the shark is small and turns hostile as it grows. At size 1 the natural
   * table put ~44% of the water outranking the player before any forced-danger
   * roll, which is a minefield before the player has found the controls. */
  var biasScratch = [0, 0, 0, 0, 0, 0];
  function pickNormalTier(state) {
    var sizeBias = Math.max(0.3, state.size / D.MAX_SIZE);
    var total = 0, i, n;
    for (i = 0; i < TIER_WEIGHTS.length; i++) {
      n = D.TIERS[i].n;
      biasScratch[i] = TIER_WEIGHTS[i] * (n <= state.size ? 1 : sizeBias);
      total += biasScratch[i];
    }
    var r = state.rand() * total, acc = 0;
    for (i = 0; i < TIER_WEIGHTS.length; i++) {
      acc += biasScratch[i];
      if (r < acc) return i;
    }
    return 0;
  }

  function pickTier(state, forceDanger) {
    if (forceDanger) {
      /* Prefer the SMALLEST tier that outranks the player: n+1 most of the time,
       * n+2 sometimes, n+3 rarely. Picking uniformly across every bigger tier
       * means a size-1 player meets whales in the first minute, which is not a
       * fair opening. At max size no prey tier qualifies, so this falls through
       * to a normal pick — the tier-6 predator is what makes the endgame
       * dangerous, not the spawn table. */
      var order = [state.size + 1, state.size + 2, state.size + 3];
      var avail = [];
      for (var q = 0; q < order.length; q++) {
        if (order[q] >= 0 && order[q] < D.TIERS.length) avail.push(order[q]);
      }
      if (avail.length) {
        var r = state.rand();
        var idx = r < 0.6 ? 0 : (r < 0.9 ? 1 : 2);
        return Math.min(idx, avail.length - 1);
      }
    }
    return pickNormalTier(state);
  }

  /* Population scales with viewport area, so a large desktop window is not
   * denser than a 390x780 phone. */
  function densityScale(state) {
    return Math.sqrt((state.w * state.h) / (390 * 780));
  }

  function fishCap(state) {
    return Math.max(10, Math.round(T.maxFish * densityScale(state)));
  }

  function spawnFish(state, forceDanger, spread) {
    if (state.objs.length >= fishCap(state)) return null;
    var ti = pickTier(state, forceDanger);
    var spec = D.TIERS[ti];
    var inset = 70;      // keeps spread fish clear of the screen edges
    var entry = 34;      // how far outside a swimming fish starts
    var x, y;
    if (spread) {
      x = inset + state.rand() * Math.max(1, state.w - inset * 2);
      y = 70 + state.rand() * Math.max(1, state.h - 150);
    } else {
      /* Enter from whichever side has more room, so short viewports cannot
       * produce an inverted range. The entry margin is small so fish populate
       * the water promptly instead of queueing up off-screen. */
      var side = state.rand() < 0.5 ? -1 : 1;
      x = side < 0 ? -entry : state.w + entry;
      var lo = Math.min(95, state.h - 80);
      var hi = Math.max(95, state.h - 80);
      y = lo + state.rand() * Math.max(1, hi - lo);
    }
    var gold = state.rand() < T.goldChance;
    var o = {
      kind: 'fish',
      n: spec.n,
      r: gold ? spec.r * 1.2 : spec.r,
      spd: spec.spd * (gold ? 1.15 : 1),
      pts: spec.pts,
      xp: spec.xp,
      x: x, y: y, vx: 0, vy: 0,
      face: side < 0 ? 0 : Math.PI,
      gold: gold,
      missed: false,
      gone: false,
      phase: state.rand() * Math.PI * 2,
      wob: 0.6 + state.rand() * 0.8,
      tier: ti
    };
    /* Gold fish are always worth points and never a tier surprise, so the
     * sparkle never wears the red danger glow it inherited in the old file. */
    if (gold) { o.n = Math.min(o.n, Math.max(0, state.size)); o.safe = true; }
    state.objs.push(o);
    return o;
  }

  function bootSchool(state) {
    /* Scaled by area: a fixed count left a 375px phone looking empty next to a
     * desktop window. */
    var n = Math.round(T.startSchool * densityScale(state));
    for (var i = 0; i < n; i++) spawnFish(state, false, true);
  }

  function spawnRelic(state) {
    var r = D.RELICS[(state.rand() * D.RELICS.length) | 0];
    var relic = {
      kind: 'relic',
      id: r.id,
      x: 60 + state.rand() * Math.max(1, state.w - 120),
      y: 80 + state.rand() * Math.max(1, state.h - 170),
      r: 20,
      phase: state.rand() * Math.PI * 2,
      gone: false
    };
    state.relics.push(relic);
    return relic;
  }

  function spawnApex(state) {
    var A = D.APEX;
    var side = state.rand() < 0.5 ? 0 : Math.PI;
    var dist = Math.max(state.w, state.h) * 0.7;
    state.apex = {
      kind: 'apex',
      n: A.n,
      r: A.r,
      spd: A.spd,
      pts: 0,
      x: state.x + Math.cos(side) * dist,
      y: state.y + Math.sin(side) * dist,
      vx: 0, vy: 0,
      face: side + Math.PI,
      phase: 'stalk',
      phaseT: 0,
      aimX: state.x, aimY: state.y,
      orbit: state.rand() < 0.5 ? 1 : -1,
      jaw: 0,
      hitFlash: 0,
      tailHit: false
    };
    emit(state, 'phase', { phase: 'stalk' });
    return state.apex;
  }

  /* ------------------------------------------------------------- visuals */

  /* Transient visual data. The engine owns it because it is a direct product of
   * gameplay events; render.js only draws it. */
  function burst(state, x, y, n, color, power) {
    power = power || 1;
    for (var i = 0; i < n; i++) {
      var a = state.rand() * Math.PI * 2;
      var sp = (40 + state.rand() * 150) * power;
      state.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + state.rand() * 0.25, max: 0.55,
        r: 1.5 + state.rand() * 3 * power,
        color: color || '#5ffbf1'
      });
    }
  }

  function float(state, x, y, text, color) {
    state.floats.push({ x: x, y: y, text: text, color: color || '#5ffbf1', life: 0.9, max: 0.9 });
  }

  function puff(state, x, y, n) {
    for (var i = 0; i < n; i++) {
      state.bubbles.push({
        x: x + (state.rand() - 0.5) * 16,
        y: y + (state.rand() - 0.5) * 16,
        r: 1.5 + state.rand() * 3.5,
        life: 0.5 + state.rand() * 0.7,
        max: 1.2
      });
    }
  }

  /* -------------------------------------------------------------- scoring */

  function multiplier(state) {
    var tiers = T.comboTiers;
    var idx = Math.floor(state.combo / 3);
    return tiers[Math.min(idx, tiers.length - 1)];
  }

  function addCombo(state) {
    state.combo++;
    state.comboT = T.comboWindow;
    if (state.combo > state.bestChain) state.bestChain = state.combo;
    if (state.combo > 0 && state.combo % 5 === 0) emit(state, 'combo', { n: state.combo });
  }

  function breakCombo(state) {
    if (state.combo > 0) { state.combo = 0; state.comboT = 0; }
  }

  function award(state, base, x, y, label) {
    var m = multiplier(state);
    var total = Math.floor(base * m);
    state.score += total;
    if (label) float(state, x, y, label, m >= 3 ? '#ffd700' : '#5ffbf1');
    return total;
  }

  /* --------------------------------------------------------------- eating */

  function eat(state, o, chomp) {
    if (o.gone) return;
    o.gone = true;
    var mult = chomp ? T.biteMult : 1;
    if (o.gold) mult *= T.goldMult;
    var gained = award(state, o.pts * mult, o.x, o.y, '+' + Math.floor(o.pts * mult));
    state.xp += o.xp + (chomp ? 1 : 0);
    state.frenzy = Math.min(1, state.frenzy + T.frenzyPerEat);
    addCombo(state);
    burst(state, o.x, o.y, o.gold ? 18 : 10, o.gold ? '#ffd700' : '#5ffbf1', o.gold ? 1.3 : 1);
    puff(state, o.x, o.y, 3);
    emit(state, 'eat', { x: o.x, y: o.y, pts: gained, n: o.n, chomp: !!chomp, gold: !!o.gold });
    checkGrowth(state);
  }

  function checkGrowth(state) {
    if (state.size >= D.MAX_SIZE) return;
    while (state.size < D.MAX_SIZE && state.xp >= state.xpNeed) {
      /* Carry the remainder. The old file zeroed xp on level-up, silently
       * discarding a whole fish's worth of progress. */
      state.xp -= state.xpNeed;
      state.size++;
      state.xpNeed = state.size * T.xpPerSize;
      state.slow = T.growSlowMo;
      burst(state, state.x, state.y, 22, '#5ffbf1', 1.4);
      emit(state, 'grow', { size: state.size });
      if (state.size >= D.WIN_SIZE && !state.holding) {
        state.holding = true;
        state.apexWait = T.predatorSpawnDelay;
        emit(state, 'apex-begin', {});
      }
    }
  }

  /* --------------------------------------------------------------- damage */

  function takeHit(state, fromX, fromY, source) {
    /* No damage at all during the opening grace, including body contact. A run
     * that ends at zero points means the player died before finding the controls. */
    if (state.graceT > 0) return false;
    if (state.iFrames > 0 || state.ward > 0 || state.over) return false;
    state.life--;
    state.iFrames = T.iframes;
    breakCombo(state);
    state.frenzy = Math.max(0, state.frenzy - 0.3);
    state.shake = 1;
    var a = Math.atan2(state.y - fromY, state.x - fromX);
    var kb = source === 'apex' ? T.predatorKnockback : T.hitKnockback;
    state.vx = Math.cos(a) * kb;
    state.vy = Math.sin(a) * kb;
    burst(state, state.x, state.y, 16, '#ff6e6e', 1.2);
    emit(state, 'hit', { x: state.x, y: state.y, source: source, life: state.life });
    if (state.life <= 0) {
      state.life = 0;
      end(state, 'lose');
    }
    return true;
  }

  function end(state, result) {
    if (state.over) return;
    state.over = true;
    state.result = result;
    if (result === 'win') {
      state.score += T.winFlat + state.bestChain * T.winPerChain + state.near * T.winPerNear;
    }
    emit(state, result, { score: state.score });
  }

  /* ---------------------------------------------------------------- relics */

  function takeRelic(state, relic) {
    relic.gone = true;
    var noEffect = false;
    switch (relic.id) {
      case 'heart':
        if (state.life >= state.maxLife + 2) { noEffect = true; }
        else { state.life++; }
        break;
      case 'ward':  state.ward = T.wardDur; break;
      case 'swirl':
        var pulled = 0;
        for (var i = 0; i < state.objs.length; i++) {
          var o = state.objs[i];
          if (o.gone || !edible(state, o)) continue;
          var d = dist(state.x, state.y, o.x, o.y);
          if (d < T.swirlRadius) {
            pulled++;
            o.vx += ((state.x - o.x) / (d || 1)) * 300 * T.swirlPull;
            o.vy += ((state.y - o.y) / (d || 1)) * 300 * T.swirlPull;
          }
        }
        if (!pulled) noEffect = true;
        break;
      case 'pearl': award(state, 320, relic.x, relic.y, '+320'); break;
      case 'drift': state.driftT = T.driftDur; break;
      case 'gills': state.gillsT = T.gillsDur; break;
    }
    burst(state, relic.x, relic.y, 14, '#ffd700', 1.1);
    float(state, relic.x, relic.y, noEffect ? 'no effect' : (relicLabel(relic.id)), '#ffd180');
    emit(state, 'relic', { id: relic.id, noEffect: noEffect, x: relic.x, y: relic.y });
  }

  function relicLabel(id) {
    for (var i = 0; i < D.RELICS.length; i++) if (D.RELICS[i].id === id) return D.RELICS[i].tip;
    return id;
  }

  /* -------------------------------------------------------------- collision */

  function inBiteCone(state, o) {
    var reach = playerRadius(state) * T.biteReach + hitRadius(state, o);
    var d = dist(state.x, state.y, o.x, o.y);
    if (d > reach) return false;
    var a = Math.atan2(o.y - state.y, o.x - state.x);
    return Math.abs(angDiff(state.face, a)) <= T.biteCone;
  }

  function collide(state, dt) {
    var pr = playerRadius(state);
    var danger = 0;
    var i, o, d, oR, gap;

    /* Bite cone first: an active attack should claim its target before the
     * passive body-eat sweep gets to it. */
    if (state.biteT > 0) {
      for (i = 0; i < state.objs.length; i++) {
        o = state.objs[i];
        if (o.gone || !edible(state, o) || !inBiteCone(state, o)) continue;
        eat(state, o, true);
      }
      if (state.apex && !state.apex.gone && state.apex.phase === 'recover') {
        /* Tail strike. Generous radius: the tail is the predator's closest part,
         * and this is the player's reward for choosing to close on a creature
         * that just lunged at them. A narrow annulus here made the mechanic
         * unreachable in practice. */
        var ap = state.apex;
        d = dist(state.x, state.y, ap.x, ap.y);
        oR = hitRadius(state, ap);
        if (d < pr + oR * 1.1) {
          ap.tailHit = true;
          ap.hitFlash = 1;
          var gained = award(state, D.APEX.tailPts, ap.x, ap.y, '+' + D.APEX.tailPts);
          state.combo += D.APEX.tailCombo;
          state.comboT = T.comboWindow;
          if (state.combo > state.bestChain) state.bestChain = state.combo;
          var away = Math.atan2(ap.y - state.y, ap.x - state.x);
          ap.vx += Math.cos(away) * 380;
          ap.vy += Math.sin(away) * 380;
          burst(state, ap.x, ap.y, 22, '#ffd700', 1.4);
          emit(state, 'tail', { x: ap.x, y: ap.y, pts: gained });
        }
      }
    }

    /* Body sweep: eat, near-miss, and damage in one pass. */
    for (i = 0; i < state.objs.length; i++) {
      o = state.objs[i];
      if (o.gone) continue;
      oR = hitRadius(state, o);
      d = dist(state.x, state.y, o.x, o.y);

      if (edible(state, o)) {
        if (d < pr + oR) {
          eat(state, o, false);
          continue;
        }
        if (state.dashT > 0 && !o.missed) {
          var near = pr + oR * 0.6, far = pr + oR * 2.0;
          if (d > near && d < far) {
            o.missed = true;
            state.near++;
            var pts = T.nearMiss + state.near * T.nearMissStep;
            state.score += pts;
            float(state, o.x, o.y, 'near +' + pts, '#5ffbf1');
            emit(state, 'near', { x: o.x, y: o.y, pts: pts });
          }
        }
      } else if (dangerous(state, o)) {
        gap = Math.max(0, pr + oR - d);
        danger = Math.max(danger, clamp(1 - gap / (oR + 40), 0, 1));
        if (d < pr + oR * 0.85) takeHit(state, o.x, o.y, 'fish');
      }
    }

    if (state.apex && !state.apex.gone) {
      var A = state.apex;
      d = dist(state.x, state.y, A.x, A.y);
      oR = hitRadius(state, A);
      gap = Math.max(0, pr + oR - d);
      danger = Math.max(danger, clamp(1 - gap / (oR + 60), 0, 1));
      if (A.phase !== 'lunge' && d < pr + oR * 0.8) takeHit(state, A.x, A.y, 'apex');
      if (A.phase === 'lunge' && d < pr + oR) takeHit(state, A.x, A.y, 'apex');
    }

    state.dangerNear = danger;

    /* Relic pickups. */
    for (i = state.relics.length - 1; i >= 0; i--) {
      var rl = state.relics[i];
      if (rl.gone) continue;
      var magnetR = T.magnetR * playerRadius(state) * state.cfg.magnet * T.relicMagnet;
      var dd = dist(state.x, state.y, rl.x, rl.y);
      if (dd < pr + rl.r) {
        takeRelic(state, rl);
      } else if (dd < magnetR) {
        var ux = (state.x - rl.x) / (dd || 1), uy = (state.y - rl.y) / (dd || 1);
        rl.x += ux * 240 * dt;
        rl.y += uy * 240 * dt;
      }
    }

    /* Compaction. */
    for (i = state.objs.length - 1; i >= 0; i--) if (state.objs[i].gone) state.objs.splice(i, 1);
    for (i = state.relics.length - 1; i >= 0; i--) if (state.relics[i].gone) state.relics.splice(i, 1);
  }

  /* ---------------------------------------------------------------- timers */

  function tickTimers(state, dt) {
    if (state.iFrames > 0) state.iFrames = Math.max(0, state.iFrames - dt);
    if (state.ward > 0) state.ward = Math.max(0, state.ward - dt);
    if (state.driftT > 0) state.driftT = Math.max(0, state.driftT - dt);
    if (state.gillsT > 0) state.gillsT = Math.max(0, state.gillsT - dt);
    if (state.dashCD > 0) state.dashCD = Math.max(0, state.dashCD - dt);
    if (state.dashT > 0) state.dashT = Math.max(0, state.dashT - dt);
    if (state.biteCD > 0) state.biteCD = Math.max(0, state.biteCD - dt);
    if (state.biteT > 0) state.biteT = Math.max(0, state.biteT - dt);
    if (state.comboT > 0) {
      state.comboT = Math.max(0, state.comboT - dt);
      if (state.comboT === 0) breakCombo(state);
    }
    state.frenzy = Math.max(0, state.frenzy - T.frenzyDecay * dt);
    state.shake = Math.max(0, state.shake - dt * 3.2);
    if (state.slow > 0) state.slow = Math.max(0, state.slow - dt);
  }

  function timeScale(state) {
    if (state.driftT > 0) return T.driftScale;
    if (state.slow > 0) return T.growSlowScale;
    return 1;
  }

  /* -------------------------------------------------------------- movement */

  function movePlayer(state, dt) {
    var input = state.input;
    var scale = timeScale(state);
    var speed = T.baseSpeed * (1 + state.frenzy * (T.frenzySpeedBoost - 1));

    if (input.dash && state.dashCD <= 0 && state.dashT <= 0) {
      state.dashT = T.dashTime;
      state.dashCD = T.dashCooldown * (state.gillsT > 0 ? T.gillsMult : 1);
      state.iFrames = Math.max(state.iFrames, T.dashIFrames);
      var dlen = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      state.dashDirX = dlen > 0.01 ? input.dx / dlen : Math.cos(state.face);
      state.dashDirY = dlen > 0.01 ? input.dy / dlen : Math.sin(state.face);
      puff(state, state.x, state.y, state.gillsT > 0 ? 14 : 8);
      emit(state, 'dash', { x: state.x, y: state.y });
    }
    input.dash = false;

    if (state.dashT > 0) {
      var dashSpeed = T.dashSpeed * T.baseSpeed;
      state.vx = state.dashDirX * dashSpeed;
      state.vy = state.dashDirY * dashSpeed;
    } else if (input.mag > 0.01) {
      var want = speed * input.mag;
      state.vx = approach(state.vx, input.dx * want, T.accel * speed, dt);
      state.vy = approach(state.vy, input.dy * want, T.accel * speed, dt);
    } else {
      state.vx -= state.vx * Math.min(1, T.inertia * dt);
      state.vy -= state.vy * Math.min(1, T.inertia * dt);
    }

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    /* Soft walls: keep the whole player on screen rather than a hard clamp, so
     * the shark never gets stuck grinding a wall at speed. */
    var pr = playerRadius(state);
    /* Soft walls, but inset by how far the shark is actually *drawn* on each
     * side. The snout reaches ~1.06r ahead but the tail trails ~1.8r behind, so a
     * symmetric radius-based inset either clipped the tail off-screen or walled
     * the shark off the water it was swimming into. Inset by facing instead. */
    var facingRight = Math.cos(state.face) >= 0;
    var ahead = pr * 1.2, behind = pr * 1.5;
    var minX = facingRight ? behind : ahead;
    var maxX = facingRight ? state.w - ahead : state.w - behind;
    if (state.x < minX) { state.x = minX; state.vx = Math.max(0, state.vx); }
    if (state.x > maxX) { state.x = maxX; state.vx = Math.min(0, state.vx); }
    var topM = 56 + pr * 0.6;
    if (state.y < topM) { state.y = topM; state.vy = Math.max(0, state.vy); }
    if (state.y > state.h - pr * 0.7) { state.y = state.h - pr * 0.7; state.vy = Math.min(0, state.vy); }

    if (Math.abs(state.vx) > 4 || Math.abs(state.vy) > 4) {
      state.face = Math.atan2(state.vy, state.vx);
    }

    /* Swim trail and bubbles. */
    state.trail.push({ x: state.x, y: state.y, life: 1, dashing: state.dashT > 0 });
    if (state.trail.length > 20) state.trail.shift();
    for (var i = 0; i < state.trail.length; i++) state.trail[i].life -= dt * 1.6;
    if (state.trail[0] && state.trail[0].life <= 0) state.trail.shift();

    if (state.rand() < (state.dashT > 0 ? 0.9 : 0.22)) puff(state, state.x, state.y, 1);
  }

  /* -------------------------------------------------------------- spawning */

  function tickSpawns(state, dt) {
    if (state.graceT > 0) state.graceT = Math.max(0, state.graceT - dt);

    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      var boost = 1 + state.frenzy * (T.frenzySpawnBoost - 1);
      state.nextSpawn = (T.spawnInterval / state.cfg.spd) / boost * densityScale(state);
      /* No forced threats during the opening seconds. A new player should get
       * a moment to find the controls before something hunts them. */
      var force = state.graceT <= 0 && state.rand() < T.dangerChance;
      spawnFish(state, force, false);
    }

    state.nextRelic -= dt;
    if (state.nextRelic <= 0) {
      state.nextRelic = T.relicIntervalMin + state.rand() * (T.relicIntervalMax - T.relicIntervalMin);
      if (state.relics.length < 3) spawnRelic(state);
    }

    if (state.holding && state.apexWait >= 0) {
      state.apexWait -= dt;
      if (state.apexWait < 0 && !state.apex) spawnApex(state);
    }
  }

  /* ----------------------------------------------------------------- step */

  function step(state, rawDt) {
    if (state.over) return state;
    var scale = timeScale(state);
    var dt = Math.min(0.05, Math.max(0, rawDt)) * scale;
    state.t += dt;

    tickTimers(state, dt);

    if (state.input.bite && state.biteCD <= 0) {
      state.biteT = T.biteWindow;
      state.biteCD = T.biteCooldown;
      emit(state, 'bite', { x: state.x, y: state.y });
    }
    state.input.bite = false;

    movePlayer(state, dt);
    tickSpawns(state, dt);

    if (global.SHBots) {
      global.SHBots.updateFish(state, dt);
      global.SHBots.updateApex(state, dt);
    } else {
      fallbackDrift(state, dt);
    }

    collide(state, dt);

    if (state.holding && !state.over) {
      state.goal += dt * (1 + state.frenzy * 0.4);
      if (state.goal >= D.HOLD_TIME) end(state, 'win');
    }

    /* Transient visuals age on real time so they read the same under slow-mo. */
    var rdt = Math.min(0.05, Math.max(0, rawDt));
    ageVisuals(state, rdt);
    return state;
  }

  function fallbackDrift(state, dt) {
    for (var i = 0; i < state.objs.length; i++) {
      var o = state.objs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
    }
  }

  function ageVisuals(state, dt) {
    var i, p;
    for (i = state.parts.length - 1; i >= 0; i--) {
      p = state.parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx -= p.vx * Math.min(1, 2.2 * dt);
      p.vy -= p.vy * Math.min(1, 2.2 * dt);
      p.life -= dt;
      if (p.life <= 0) state.parts.splice(i, 1);
    }
    for (i = state.floats.length - 1; i >= 0; i--) {
      p = state.floats[i];
      p.y -= 38 * dt;
      p.life -= dt;
      if (p.life <= 0) state.floats.splice(i, 1);
    }
    for (i = state.bubbles.length - 1; i >= 0; i--) {
      p = state.bubbles[i];
      p.y -= 34 * dt;
      p.x += Math.sin(p.y * 0.05) * 8 * dt;
      p.life -= dt;
      if (p.life <= 0) state.bubbles.splice(i, 1);
    }
    if (state.bubbles.length > 80) state.bubbles.splice(0, state.bubbles.length - 80);
  }

  var SHRules = {
    createState: createState,
    step: step,
    emit: emit,
    burst: burst,
    float: float,
    puff: puff,
    mulberry32: mulberry32,
    clamp: clamp,
    dist: dist,
    angDiff: angDiff,
    approach: approach,
    playerRadius: playerRadius,
    hitRadius: hitRadius,
    multiplier: multiplier,
    timeScale: timeScale,
    edible: edible,
    dangerous: dangerous,
    inBiteCone: inBiteCone
  };

  global.SHRules = SHRules;
  if (typeof module !== 'undefined' && module.exports) module.exports = SHRules;
})(typeof window !== 'undefined' ? window : globalThis);
