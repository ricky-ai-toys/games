/* Amber's Candy Castle — scene renderer.
 * Reads engine state and draws it. Never mutates game state.
 * Draw order: board, road, gates, castle, walls, range preview, towers, enemies,
 * projectiles, particles, floating text.
 */
(function (global) {
  'use strict';

  var D = global.CCData;
  var G = global.CCGrid;
  var R = global.CCRules;
  var S = global.CCSprites;

  /* Cached board gradient — rebuilt only when the cell size changes, not per frame. */
  var grad = null, gradKey = '';

  /* The board is a fixed-aspect grid, so cells stay square and the whole board is
   * always visible — the player must be able to see the road they are editing.
   *
   * It is fitted to the space BETWEEN the HUD zones, not the whole viewport.
   * Centring it in the full viewport put the bottom of the board underneath the
   * tower picker, which covered the last two rows of the grid on a phone. */
  function layout(state) {
    var pad = 8;
    var top = (state.insetTop || 0) + pad;
    var bottom = (state.insetBottom || 0) + pad;
    var availW = state.w - pad * 2;
    var availH = Math.max(120, state.h - top - bottom);
    var s = Math.floor(Math.min(availW / D.COLS, availH / D.ROWS));
    var bw = s * D.COLS, bh = s * D.ROWS;
    return {
      s: s,
      x: Math.round((state.w - bw) / 2),
      y: Math.round(top + (availH - bh) / 2)
    };
  }

  function cellCentre(l, c, r) {
    return { x: l.x + c * l.s + l.s / 2, y: l.y + r * l.s + l.s / 2 };
  }

  function board(ctx, state) {
    var l = layout(state);
    var key = l.s + 'x' + D.COLS + 'x' + D.ROWS;
    if (key !== gradKey) {
      grad = ctx.createLinearGradient(0, l.y, 0, l.y + l.s * D.ROWS);
      grad.addColorStop(0, '#20415e');
      grad.addColorStop(1, '#16293d');
      gradKey = key;
    }
    S.roundRect(ctx, l.x - 4, l.y - 4, l.s * D.COLS + 8, l.s * D.ROWS + 8, 10);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,128,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return l;
  }

  /* Grid dots: a hint of structure without turning the board into graph paper. */
  function dots(ctx, l) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var c = 0; c <= D.COLS; c++) {
      for (var r = 0; r <= D.ROWS; r++) {
        ctx.beginPath();
        ctx.arc(l.x + c * l.s, l.y + r * l.s, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(ctx, state, opts) {
    opts = opts || {};
    var t = state.t;
    var l = board(ctx, state);
    dots(ctx, l);
    var c, r, i, o, p;

    /* --- road: a subtle tile per open cell.
     * The first version stroked a single polyline through every walkable cell in
     * row-major order, which is not the route at all — it scribbled a grey smear
     * across the whole board. Per-cell tiles read correctly and cost nothing. */
    ctx.save();
    for (i = 0; i < D.COLS * D.ROWS; i++) {
      if (!G.walkable(state.grid, i % D.COLS, (i / D.COLS) | 0)) continue;
      var rp = cellCentre(l, i % D.COLS, (i / D.COLS) | 0);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,209,128,0.09)';
      ctx.fillRect(l.x + (i % D.COLS) * l.s + 2, l.y + (((i / D.COLS) | 0)) * l.s + 2, l.s - 4, l.s - 4);
    }
    ctx.restore();

    /* --- range preview for the selected item */
    if (state.selected && state.selected !== 'wall' && state.hover) {
      var spec = D.tower(state.selected);
      var hc = cellCentre(l, state.hover.c, state.hover.r);
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(hc.x, hc.y, spec.tiers[0].range * l.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* --- walls */
    for (i = 0; i < D.COLS * D.ROWS; i++) {
      c = i % D.COLS; r = (i / D.COLS) | 0;
      if (state.grid.cells[i] !== G.WALL) continue;
      var wpos = cellCentre(l, c, r);
      ctx.save();
      ctx.translate(wpos.x, wpos.y);
      S.drawWall(ctx, l.s, t, i);
      ctx.restore();
    }

    /* --- gates */
    for (i = 0; i < state.grid.gates.length; i++) {
      var g = state.grid.gates[i];
      var gp = cellCentre(l, g.c, g.r);
      ctx.save();
      ctx.translate(gp.x, gp.y);
      S.drawGate(ctx, l.s, t, i);
      ctx.restore();
    }

    /* --- castle */
    if (state.grid.castle) {
      var cpos = cellCentre(l, state.grid.castle.c, state.grid.castle.r);
      ctx.save();
      ctx.translate(cpos.x, cpos.y);
      S.drawCastle(ctx, l.s, t, state.lives <= state.maxLives * 0.34);
      ctx.restore();
    }

    /* --- towers */
    for (i = 0; i < state.towers.length; i++) {
      var tw = state.towers[i];
      var tspec = D.tower(tw.id);
      var tp = cellCentre(l, tw.c, tw.r);
      ctx.save();
      ctx.translate(tp.x, tp.y);
      if (tw.pulse > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, l.s * (0.4 + (1 - tw.pulse) * 0.5), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,215,0,' + tw.pulse + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      S.drawTower(ctx, tspec, tw.tier, l.s, t, tw.angle);
      /* tier pips: readable without a number */
      for (var k = 0; k <= tw.tier; k++) {
        ctx.beginPath();
        ctx.arc(-l.s * 0.16 + k * l.s * 0.16, l.s * 0.4, l.s * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd180';
        ctx.fill();
      }
      ctx.restore();
    }

    /* --- enemies */
    for (i = 0; i < state.enemies.length; i++) {
      o = state.enemies[i];
      var ep = R.enemyXY(state, o);
      p = cellCentre(l, ep.x, ep.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      S.drawEnemy(ctx, o, t);
      /* health bar only when damaged, so a healthy wave stays clean */
      if (o.hp < o.maxHp) {
        var w = o.spec.size * l.s;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-w / 2, -o.spec.size * l.s * 0.62, w, l.s * 0.07);
        ctx.fillStyle = o.hp / o.maxHp > 0.4 ? '#7ef7a0' : '#ff6e6e';
        ctx.fillRect(-w / 2, -o.spec.size * l.s * 0.62, w * (o.hp / o.maxHp), l.s * 0.07);
      }
      /* slow marker */
      if (o.slowAmt > 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#8fd3ff';
        ctx.beginPath();
        ctx.arc(0, 0, o.spec.size * l.s * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    /* --- particles */
    ctx.save();
    for (i = 0; i < state.parts.length; i++) {
      var pa = state.parts[i];
      if (pa.life <= 0) continue;
      var pp = cellCentre(l, pa.x, pa.y);
      ctx.globalAlpha = Math.max(0, pa.life / pa.max);
      ctx.fillStyle = pa.color;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, pa.r * l.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* --- floating text */
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(l.s * 0.3) + 'px -apple-system, system-ui, sans-serif';
    for (i = 0; i < state.floats.length; i++) {
      var f = state.floats[i];
      if (f.life <= 0) continue;
      var fp = cellCentre(l, f.x, f.y);
      ctx.globalAlpha = Math.min(1, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, fp.x, fp.y);
    }
    ctx.restore();

    return l;
  }

  /* The road-length readout that lives on the board, so the player watches the
   * thing they are actually changing. */
  function drawRoadMeter(ctx, state, l, y) {
    var route = state.grid.routeLength;
    var target = state.grid.targetPath || 0;
    var met = target > 0 && route >= target;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 12px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(244,246,255,0.8)';
    ctx.fillText('ROAD', l.x, y - 22);
    ctx.font = '800 15px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = met ? '#7ef7a0' : '#ffd180';
    ctx.fillText(Math.round(route) + ' cells', l.x, y - 6);
    if (target > 0) {
      ctx.font = '600 11px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(244,246,255,0.6)';
      ctx.fillText(met ? 'goal reached' : 'goal ' + target, l.x + 66, y - 6);
    }
    ctx.restore();
  }

  global.CCRender = { draw: draw, layout: layout, cellCentre: cellCentre, drawRoadMeter: drawRoadMeter };
})(typeof window !== 'undefined' ? window : globalThis);
