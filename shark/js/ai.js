/* Amber's Shark Hunt — creature AI.
 * Pure steering. No DOM, no canvas. Called by rules.step().
 *
 * updateFish() handles prey and threat behaviour.
 * updateApex() runs the tier-6 predator's phase machine, which is the reason the
 * APEX finale has any teeth at all.
 */
(function (global) {
  'use strict';

  var D = global.SHData;
  var T = D.TUNE;
  var R = global.SHRules;

  function dist(ax, ay, bx, by) { return R.dist(ax, ay, bx, by); }

  /* ------------------------------------------------------------------ fish */

  function updateFish(state, dt) {
    var spdScale = state.cfg.spd;
    var pr = R.playerRadius(state);
    var magnetR = T.magnetR * pr;
    var fleeR = T.fleeR * pr;
    var chaseR = T.chaseR * pr;
    var chasing = state.cfg.chase;

    for (var i = 0; i < state.objs.length; i++) {
      var o = state.objs[i];
      if (o.gone) continue;
      o.phase += dt * (2.2 + o.wob);

      var dx = state.x - o.x, dy = state.y - o.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d;

      var ax = 0, ay = 0;
      var edible = o.n <= state.size;
      /* Gold fish are always safe, so they never trigger the chase branch. */
      if (edible || o.gold) {
        /* Prey drift on their heading, wobbling, and get nudged toward the
         * player inside the magnet radius — a forgiveness aid for younger
         * players, scaled per difficulty. */
        ax += Math.cos(o.face) * o.spd * spdScale;
        ay += Math.sin(o.face) * o.spd * spdScale;
        ax += Math.sin(o.phase) * 16 * o.wob;
        ay += Math.cos(o.phase * 1.3) * 12 * o.wob;

        if (d < magnetR && !o.gold) {
          var pull = (1 - d / magnetR) * 90 * state.cfg.magnet;
          ax += ux * pull;
          ay += uy * pull;
        }

        /* Prey flees once the player is comfortably bigger and outside magnet
         * range. The old file's flee branch sat in a 14px window at size 1 and
         * was exactly empty at size 5, so prey never actually ran. */
        if (d < fleeR && d > magnetR && o.n < state.size) {
          var flee = (1 - d / fleeR) * 150;
          ax -= ux * flee;
          ay -= uy * flee;
          o.face = Math.atan2(-uy, -ux);
        }
      } else {
        /* Threats hunt. wanderR controls how long they commit before reconsidering. */
        ax += Math.cos(o.face) * o.spd * spdScale * 0.7;
        ay += Math.sin(o.face) * o.spd * spdScale * 0.7;
        ax += Math.sin(o.phase * 0.8) * 10;
        ay += Math.cos(o.phase) * 10;
        /* Nothing gives chase during the opening grace. Without this, Hard could
         * burn both lives before the player had swum far enough to eat anything. */
        if (d < chaseR && state.graceT <= 0) {
          var chase = (1 - d / chaseR) * 120 * chasing;
          ax += ux * chase;
          ay += uy * chase;
        }
        /* Occasional turn so a pack doesn't converge into a single line. */
        if (state.rand() < dt * 0.35) {
          o.face += (state.rand() - 0.5) * 1.2;
        }
      }

      o.vx = R.approach(o.vx, ax, 120, dt);
      o.vy = R.approach(o.vy, ay, 120, dt);
      o.x += o.vx * dt;
      o.y += o.vy * dt;

      /* Vertical containment: fish stay in the swim band, no matter the viewport. */
      var top = 62 + o.r * 0.4, bot = state.h - o.r * 0.7;
      if (bot < top) bot = top;
      if (o.y < top) { o.y = top; o.vy = Math.abs(o.vy) * 0.5; }
      if (o.y > bot) { o.y = bot; o.vy = -Math.abs(o.vy) * 0.5; }

      /* Horizontal wrap. The old file spawned off-screen and left fish stranded
       * there when the viewport was very short. */
      var m = o.r + 8;
      if (o.x < -m * 3) o.x = state.w + m;
      if (o.x > state.w + m * 3) o.x = -m;

      if (Math.abs(o.vx) > 6) o.face = Math.atan2(o.vy, o.vx);
    }
  }

  /* ---------------------------------------------------------- apex predator */

  var PHASES = {
    stalk:     { min: 1.6, max: 2.6 },
    telegraph: { fixed: null },   // duration comes from cfg.tele
    lunge:     { max: null },     // ends on arrival, capped by APEX.lungeMax
    recover:   { fixed: 2.2 }
  };

  function enterPhase(state, a, name) {
    a.phase = name;
    a.phaseT = 0;
    if (name === 'telegraph') {
      a.aimX = state.x;
      a.aimY = state.y;
      R.emit(state, 'telegraph', { x: a.x, y: a.y, aimX: a.aimX, aimY: a.aimY });
    }
    if (name === 'lunge') {
      var dx = a.aimX - a.x, dy = a.aimY - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      a.lungeX = dx / d;
      a.lungeY = dy / d;
      a.lungeLeft = d;                 // remaining ground to cover
    }
    if (name === 'recover') a.tailHit = false;
    R.emit(state, 'phase', { phase: name });
  }

  function updateApex(state, dt) {
    var a = state.apex;
    if (!a || a.over) return;
    var A = D.APEX;
    var pr = R.playerRadius(state);
    a.hitFlash = Math.max(0, a.hitFlash - dt * 3);
    a.phaseT += dt;

    var dx = state.x - a.x, dy = state.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / d, uy = dy / d;

    /* Mouth animation reads well during stalk and lunge, and gapes in telegraph. */
    a.jaw = a.phase === 'telegraph' ? 1 : Math.max(0, 1 - a.phaseT * 2);

    if (a.phase === 'stalk') {
      /* Menace scales the orbit radius and the commit rate together, so an Easy
       * predator genuinely pressures the player less rather than just lunging
       * more slowly and staying parked on top of them. */
      var ring = A.stalkR;
      var radial = (d - ring) * 0.6;
      var tangentX = -uy * a.orbit, tangentY = ux * a.orbit;
      var ax = ux * radial + tangentX * A.spd * 0.55;
      var ay = uy * radial + tangentY * A.spd * 0.55;
      a.vx = R.approach(a.vx, ax, 160, dt);
      a.vy = R.approach(a.vy, ay, 160, dt);
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.face = Math.atan2(state.y - a.y, state.x - a.x);

      /* Menace now scales only the commit rate, so a patient predator is easier
       * to survive but never out-damages a brash one. */
      var dur = (PHASES.stalk.min + state.rand() * (PHASES.stalk.max - PHASES.stalk.min)) / state.cfg.menace;
      if (a.phaseT >= dur || d < ring * 0.75) enterPhase(state, a, 'telegraph');

    } else if (a.phase === 'telegraph') {
      /* Halt, rear back, and hold the aim line. The player reads the growl,
       * the flash, and the locked line, and has state.cfg.tele seconds to dash. */
      a.vx = R.approach(a.vx, -ux * 40, 220, dt);
      a.vy = R.approach(a.vy, -uy * 40, 220, dt);
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.face = Math.atan2(a.aimY - a.y, a.aimX - a.x);
      if (a.phaseT >= state.cfg.tele) enterPhase(state, a, 'lunge');

    } else if (a.phase === 'lunge') {
      /* Runs until it covers the ground to the point locked at telegraph time —
       * not the player's current position. That is what makes sidestepping work,
       * and it guarantees the lunge can always reach, on every difficulty. */
      var lungeSpeed = A.lungeSpeed * state.cfg.lunge;
      var step = lungeSpeed * dt;
      if (step >= a.lungeLeft) {
        a.x = a.aimX;
        a.y = a.aimY;
        enterPhase(state, a, 'recover');
      } else {
        a.x += a.lungeX * step;
        a.y += a.lungeY * step;
        a.lungeLeft -= step;
        a.vx = a.lungeX * lungeSpeed;
        a.vy = a.lungeY * lungeSpeed;
        a.face = Math.atan2(a.lungeY, a.lungeX);
        if (a.phaseT >= A.lungeMax) enterPhase(state, a, 'recover');
      }

    } else if (a.phase === 'recover') {
      /* Drifts tangentially, barely closing. The tail stays reachable so the
       * player has an offensive window, but it stops sitting on top of them —
       * which is what made Easy's slow predator the most lethal one. */
      var tanX = -uy * a.orbit, tanY = ux * a.orbit;
      a.vx = R.approach(a.vx, tanX * A.spd * 0.3 + ux * A.spd * 0.06, 90, dt);
      a.vy = R.approach(a.vy, tanY * A.spd * 0.3 + uy * A.spd * 0.06, 90, dt);
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.face = Math.atan2(state.y - a.y, state.x - a.x);
      if (a.phaseT >= PHASES.recover.fixed) {
        a.orbit = -a.orbit;
        enterPhase(state, a, 'stalk');
      }
    }

    /* Keep the predator from drifting entirely off the playfield — the
     * off-screen chevron in render.js handles bearing, but an unbounded
     * excursion would stall the fight. */
    var margin = 90;
    a.x = R.clamp(a.x, -margin, state.w + margin);
    a.y = R.clamp(a.y, 40, state.h - 40);
  }

  var SHBots = {
    updateFish: updateFish,
    updateApex: updateApex,
    enterPhase: enterPhase,
    PHASES: PHASES
  };

  global.SHBots = SHBots;
  if (typeof module !== 'undefined' && module.exports) module.exports = SHBots;
})(typeof window !== 'undefined' ? window : globalThis);
