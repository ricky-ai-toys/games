/* Amber's Shark Hunt — scene renderer.
 * Reads engine state and draws. Never mutates game state.
 * Draw order: biome background, god rays, parallax props, swim trail, bubbles,
 * creatures, particles, bite cone, player FX, floating text, overlays.
 */
(function (global) {
  'use strict';

  var D = global.SHData;
  var R = global.SHRules;
  var S = global.SHSprites;

  /* Cached per-biome gradient. The old file rebuilt a createLinearGradient every
   * single frame for the background. */
  var gradCache = {};
  function background(ctx, state, biome) {
    var key = biome.id + ':' + Math.round(state.w) + 'x' + Math.round(state.h);
    var g = gradCache[key];
    if (!g) {
      g = ctx.createLinearGradient(0, 0, 0, state.h);
      g.addColorStop(0, biome.stops[0]);
      g.addColorStop(0.55, biome.stops[1]);
      g.addColorStop(1, biome.stops[2]);
      gradCache[key] = g;
    }
    return g;
  }

  function godRays(ctx, state, biome) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = biome.ray;
    for (var i = 0; i < biome.rayCount; i++) {
      var seedX = (i + 0.5) / biome.rayCount;
      var x = ((seedX * state.w + state.t * biome.raySpeed) % (state.w * 1.4)) - state.w * 0.2;
      var tilt = Math.sin(state.t * 0.4 + i) * 26;
      var w = 26 + i * 5;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + w, -10);
      ctx.lineTo(x + w + tilt + 90, state.h);
      ctx.lineTo(x + tilt - 10, state.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* Parallax silhouettes. Positions derive from time so they scroll without
   * needing any stored layout state. */
  function props(ctx, state, biome) {
    if (biome.prop === 'none') return;
    ctx.save();
    for (var i = 0; i < biome.propCount; i++) {
      var seedX = (i + 0.37) / biome.propCount;
      var scroll = state.t * (10 + i * 2);
      var span = state.w + 260;
      var x = ((seedX * span + scroll) % span) - 130;
      var y = state.h - 10 - ((i * 47) % Math.max(60, state.h * 0.3));
      var h = 50 + ((i * 71) % 90);
      var c = i % 2 ? biome.prop1 : biome.prop2;
      var sway = Math.sin(state.t * 0.8 + i) * 5;

      if (biome.prop === 'coral') {
        /* Branching coral */
        ctx.strokeStyle = c;
        ctx.lineCap = 'round';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + sway, y - h * 0.6, x + sway * 1.6, y - h);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + sway * 0.4, y - h * 0.5);
        ctx.quadraticCurveTo(x + 18 + sway, y - h * 0.66, x + 26 + sway, y - h * 0.88);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + sway * 0.3, y - h * 0.3);
        ctx.quadraticCurveTo(x - 16 + sway, y - h * 0.46, x - 22 + sway, y - h * 0.7);
        ctx.stroke();
      } else {
        /* Kelp fronds */
        ctx.strokeStyle = c;
        ctx.lineCap = 'round';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + sway * 2, y - h * 0.4, x - sway * 2, y - h * 0.7, x + sway, y - h);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 20 + sway, y - h * 0.35, x + 12 - sway, y - h * 0.6, x + 26 + sway, y - h * 0.85);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function trail(ctx, state) {
    ctx.save();
    for (var i = 0; i < state.trail.length; i++) {
      var p = state.trail[i];
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life) * 0.3;
      ctx.fillStyle = p.dashing ? '#5ffbf1' : '#8fd3ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + p.life * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function bubbles(ctx, state) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,240,255,0.55)';
    ctx.lineWidth = 1.4;
    for (var i = 0; i < state.bubbles.length; i++) {
      var b = state.bubbles[i];
      if (b.life <= 0) continue;
      ctx.globalAlpha = Math.min(1, b.life / b.max);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* The visible safety ring. Radius comes from the same SHRules.hitRadius the
   * collision test uses, so the ring IS the hitbox — the old file drew the ring
   * at o.r*1.28 and collided at playerR + o.r*0.64, which made every fish look
   * far smaller than it really was. */
  function marker(ctx, state, o, t) {
    var edible = R.edible(state, o);
    var r = R.hitRadius(state, o);
    ctx.save();
    if (edible) {
      var pulse = 1 + Math.sin(t * 4 + (o.phase || 0)) * 0.04;
      ctx.strokeStyle = 'rgba(95,251,241,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * pulse, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      var near = state.dangerNear;
      var a = 0.35 + near * 0.55 + Math.sin(t * 7) * 0.12;
      var g = ctx.createRadialGradient(o.x, o.y, r * 0.2, o.x, o.y, r * 1.7);
      g.addColorStop(0, 'rgba(255,60,60,' + (a * 0.55) + ')');
      g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,90,' + a + ')';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (o.gold) {
      ctx.strokeStyle = 'rgba(255,215,0,' + (0.55 + Math.sin(t * 6) * 0.3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 1.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = Math.round(r * 0.9) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('✨', o.x, o.y - r * 1.75);
    }
    ctx.restore();
  }

  function particles(ctx, state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < state.parts.length; i++) {
      var p = state.parts[i];
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function biteCone(ctx, state) {
    if (state.biteT <= 0) return;
    var r = R.playerRadius(state);
    var reach = r * D.TUNE.biteReach;
    var alpha = 0.16 + (state.biteT / D.TUNE.biteWindow) * 0.26;
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.face);
    ctx.fillStyle = 'rgba(95,251,241,' + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    /* Drawn at exactly the tested reach, so the cone never lies about its range. */
    ctx.arc(0, 0, reach, -D.TUNE.biteCone, D.TUNE.biteCone);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,251,241,' + (alpha + 0.2) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function playerFx(ctx, state, t) {
    var r = R.playerRadius(state);

    if (state.ward > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,0,' + (0.5 + Math.sin(t * 5) * 0.2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.x, state.y, r * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.driftT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.arc(state.x, state.y, r * 1.8 + Math.sin(t * 4) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (state.gillsT > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120,255,220,0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(state.x, state.y, r * 1.28, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }

    if (state.dashT > 0) {
      ctx.save();
      ctx.globalAlpha = state.dashT / D.TUNE.dashTime;
      ctx.strokeStyle = '#5ffbf1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(state.x, state.y, r * (1.4 + (1 - state.dashT / D.TUNE.dashTime) * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.iFrames > 0 && state.ward <= 0) {
      /* Blink rather than a red flash — less alarming for the target audience. */
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(t * 30) * 0.2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.x, state.y, r * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function floatingText(ctx, state) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px -apple-system, system-ui, sans-serif';
    for (var i = 0; i < state.floats.length; i++) {
      var f = state.floats[i];
      if (f.life <= 0) continue;
      var a = Math.min(1, f.life / f.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(6,21,38,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  /* Steering reticle for pointer input — shows the player exactly where they are
   * pointing, which matters because the shark eases toward it rather than
   * teleporting. */
  function reticle(ctx, state) {
    var r = state.input.reticle;
    if (!r) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#5ffbf1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12 + Math.sin(state.t * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#5ffbf1';
    ctx.fill();
    ctx.restore();
  }

  /* Off-screen danger chevron. Points at the nearest threat that is outside the
   * viewport, so the player is never blindsided by something they cannot see. */
  function offscreenMarkers(ctx, state) {
    var m = 22, i, o, out = false;
    var threats = [];
    for (i = 0; i < state.objs.length; i++) {
      o = state.objs[i];
      if (R.dangerous(state, o) && (o.x < 0 || o.x > state.w || o.y < 0 || o.y > state.h)) threats.push(o);
    }
    if (state.apex && (state.apex.x < 0 || state.apex.x > state.w || state.apex.y < 0 || state.apex.y > state.h)) {
      threats.push(state.apex);
    }
    if (!threats.length) return;

    ctx.save();
    for (i = 0; i < threats.length; i++) {
      o = threats[i];
      var cx = R.clamp(o.x, m, state.w - m);
      var cy = R.clamp(o.y, m, state.h - m);
      var a = Math.atan2(o.y - state.h / 2, o.x - state.w / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      var big = o.kind === 'apex';
      var s = big ? 15 : 9;
      ctx.globalAlpha = big ? 0.95 : 0.55;
      ctx.fillStyle = big ? '#ff4d4d' : '#ff9a9a';
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.7, s * 0.75);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.7, -s * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* Edge-weighted, so the centre of the playfield stays clean. A vignette that
   * tints the whole screen turns a dark teal ocean purple whenever anything
   * dangerous is nearby, which reads as a rendering bug rather than a warning. */
  function vignette(ctx, state) {
    var amount = Math.max(state.frenzy * 0.14, state.dangerNear * 0.22);
    if (state.driftT > 0) amount = Math.max(amount, 0.18);
    if (amount <= 0.01) return;
    ctx.save();
    var g = ctx.createRadialGradient(
      state.w / 2, state.h / 2, Math.min(state.w, state.h) * 0.45,
      state.w / 2, state.h / 2, Math.max(state.w, state.h) * 0.78
    );
    var hue = state.driftT > 0 ? '150,80,255' : '255,70,70';
    g.addColorStop(0, 'rgba(' + hue + ',0)');
    g.addColorStop(1, 'rgba(' + hue + ',' + amount + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);
    ctx.restore();
  }

  /* --------------------------------------------------------------- main */

  function draw(ctx, state, opts) {
    opts = opts || {};
    var t = state.t;
    var biome = D.biomeForSize(state.size);
    var motion = opts.reducedMotion ? 0 : 1;

    ctx.save();

    /* Screen shake. Disabled under prefers-reduced-motion. */
    if (state.shake > 0 && motion) {
      var amp = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }

    ctx.fillStyle = background(ctx, state, biome);
    ctx.fillRect(-30, -30, state.w + 60, state.h + 60);

    godRays(ctx, state, biome);
    props(ctx, state, biome);
    trail(ctx, state);
    bubbles(ctx, state);

    /* Apex predator sits behind the prey so it reads as a backdrop threat. */
    if (state.apex) S.drawApex(ctx, state.apex, t);

    for (var i = 0; i < state.objs.length; i++) {
      var o = state.objs[i];
      marker(ctx, state, o, t);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.face);
      /* Gold fish get a little extra sparkle. */
      if (o.gold) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(t * 7 + o.phase) * 0.2;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, o.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      S.drawFish(ctx, o, t);
      ctx.restore();
    }

    for (var ri = 0; ri < state.relics.length; ri++) {
      S.drawRelic(ctx, state.relics[ri], t);
    }

    particles(ctx, state);
    biteCone(ctx, state);

    /* The player shark. */
    ctx.save();
    ctx.translate(state.x, state.y);
    S.drawShark(ctx, R.playerRadius(state), state.face, t, {
      jaw: state.biteT > 0 ? 1 : 0,
      gills: state.gillsT > 0
    });
    ctx.restore();

    playerFx(ctx, state, t);
    floatingText(ctx, state);
    reticle(ctx, state);
    offscreenMarkers(ctx, state);
    vignette(ctx, state);

    ctx.restore();
  }

  var SHRender = { draw: draw };

  global.SHRender = SHRender;
  if (typeof module !== 'undefined' && module.exports) module.exports = SHRender;
})(typeof window !== 'undefined' ? window : globalThis);
