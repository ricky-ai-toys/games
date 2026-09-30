/* Amber's Candy Castle — vector creature and prop painters.
 * Everything is drawn with canvas paths, so the game looks the same on every
 * platform. Emoji are used only for the two tower-picker icons, where instant
 * recognition matters more than consistency.
 */
(function (global) {
  'use strict';

  var D = global.CCData;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------------------------------------------------------- walls */

  /* A candy barricade. Silhouette matters more than detail at cell size, so it
   * is a rounded block with a lighter cap and two studs. */
  function drawWall(ctx, s, t, seed) {
    var p = s * 0.06;
    var grad = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
    grad.addColorStop(0, '#8d6e63');
    grad.addColorStop(1, '#5d4037');
    rr(ctx, -s / 2 + p, -s / 2 + p, s - p * 2, s - p * 2, s * 0.18);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.stroke();
    /* cap */
    ctx.beginPath();
    ctx.moveTo(-s / 2 + p, -s * 0.16);
    ctx.lineTo(s / 2 - p, -s * 0.16);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.stroke();
    /* studs, alternating position by cell so the grid does not look uniform */
    var ox = (seed % 2) ? s * 0.18 : -s * 0.18;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(ox, -s * 0.3, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-ox, s * 0.28, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --------------------------------------------------------------- towers */

  /* Each tower reads as a distinct silhouette before any colour is seen, so the
   * player can tell an Arc from a Cannon by shape alone at cell size. */
  function drawTower(ctx, spec, tier, s, t, angle) {
    var r = s * 0.42;
    ctx.save();
    if (angle != null) ctx.rotate(angle);

    var body = spec.color, acc = spec.accent;

    /* base */
    ctx.beginPath();
    ctx.arc(0, r * 0.42, r * 0.62, Math.PI, 0);
    ctx.fillStyle = 'rgba(20,30,45,0.5)';
    ctx.fill();

    if (spec.id === 'arrow') {
      /* slim turret with a barrel */
      ctx.fillStyle = body;
      rr(ctx, -r * 0.3, -r * 0.5, r * 0.6, r * 0.9, r * 0.16);
      ctx.fill();
      ctx.fillStyle = acc;
      rr(ctx, -r * 0.09, -r * 1.0, r * 0.18, r * 0.7, r * 0.06);
      ctx.fill();
      if (tier >= 1) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.42, -r * 0.36);
        ctx.lineTo(-r * 0.2, -r * 0.9);
        ctx.lineTo(r * 0.02, -r * 0.36);
        ctx.closePath();
        ctx.fillStyle = acc;
        ctx.fill();
      }
    } else if (spec.id === 'frost') {
      /* crystal spire */
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.05);
      ctx.lineTo(r * 0.46, r * 0.1);
      ctx.lineTo(0, r * 0.44);
      ctx.lineTo(-r * 0.46, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = acc;
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.stroke();
      if (tier >= 2) {
        ctx.fillStyle = acc;
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (spec.id === 'cannon') {
      /* fat barrel */
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = acc;
      rr(ctx, -r * 0.16, -r * 0.95, r * 0.46, r * 0.6, r * 0.12);
      ctx.fill();
      if (tier >= 1) {
        ctx.strokeStyle = acc;
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.66, -0.9, 0.9);
        ctx.stroke();
      }
    } else if (spec.id === 'arc') {
      /* coil on a plinth */
      ctx.fillStyle = body;
      rr(ctx, -r * 0.42, -r * 0.1, r * 0.84, r * 0.6, r * 0.14);
      ctx.fill();
      ctx.strokeStyle = acc;
      ctx.lineWidth = Math.max(1, r * 0.14);
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * (0.2 + i * 0.16), Math.PI, 0);
        ctx.stroke();
      }
      if (tier >= 2) {
        ctx.globalAlpha = 0.4 + Math.sin(t * 8) * 0.25;
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      /* longshot: long thin barrel on a wide base */
      ctx.fillStyle = body;
      rr(ctx, -r * 0.55, -r * 0.2, r * 1.1, r * 0.7, r * 0.16);
      ctx.fill();
      ctx.fillStyle = acc;
      rr(ctx, -r * 0.07, -r * 1.18, r * 0.14, r * 1.1, r * 0.05);
      ctx.fill();
      if (tier >= 1) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = acc;
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- enemies */

  function drawEnemy(ctx, e, t) {
    var spec = e.spec;
    var r = spec.size * 0.5;
    var bob = Math.sin(t * 6 + e.c + e.r) * 0.04;

    ctx.save();
    ctx.globalAlpha = e.hurtT > 0 ? 0.55 : 1;

    if (spec.shape === 'boss') {
      /* Bosses are big and crowned so they are unmistakable at a glance. */
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = spec.body;
      ctx.fill();
      ctx.strokeStyle = spec.dark;
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + (i - 2) * 0.42;
        ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
        ctx.lineTo(Math.cos(a + 0.18) * r * 0.95, Math.sin(a + 0.18) * r * 0.95);
      }
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.12, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.32, -r * 0.12, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.12, r * 0.1, 0, Math.PI * 2);
      ctx.arc(r * 0.32, -r * 0.12, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.shape === 'honeybug') {
      /* round body with a cross marking, and a visible heal pulse */
      ctx.beginPath();
      ctx.arc(0, bob, r, 0, Math.PI * 2);
      ctx.fillStyle = spec.body;
      ctx.fill();
      ctx.strokeStyle = spec.dark;
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, bob);
      ctx.lineTo(r * 0.6, bob);
      ctx.stroke();
      if (e.hp < e.maxHp) {
        ctx.globalAlpha = 0.25 + Math.sin(t * 5 + e.c) * 0.15;
        ctx.beginPath();
        ctx.arc(0, bob, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#7ef7a0';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (spec.shape === 'swarm') {
      /* small and triangular — a swarm should read as many, not big */
      ctx.beginPath();
      ctx.moveTo(r * 1.1, bob * r);
      ctx.lineTo(-r * 0.7, r * 0.7);
      ctx.lineTo(-r * 0.7, -r * 0.7);
      ctx.closePath();
      ctx.fillStyle = spec.body;
      ctx.fill();
    } else if (spec.shape === 'armoured') {
      /* hexagonal shell */
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var ang = (k / 6) * Math.PI * 2;
        var px = Math.cos(ang) * r, py = Math.sin(ang) * r + bob * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = spec.body;
      ctx.fill();
      ctx.strokeStyle = spec.dark;
      ctx.lineWidth = Math.max(1, r * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#ffd180';
      ctx.beginPath();
      ctx.arc(0, bob * r, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.shape === 'runner') {
      /* dart: sharp, leaning forward */
      ctx.beginPath();
      ctx.moveTo(r * 1.35, bob * r);
      ctx.lineTo(-r * 0.5, r * 0.85);
      ctx.lineTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.5, -r * 0.85);
      ctx.closePath();
      ctx.fillStyle = spec.body;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(r * 0.45, -r * 0.12, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      /* grunt: soft blob with feet */
      ctx.beginPath();
      ctx.ellipse(0, bob * r, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fillStyle = spec.body;
      ctx.fill();
      ctx.fillStyle = spec.dark;
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.9, r * 0.16, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.9, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.18, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.18, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------- gate & castle */

  function drawGate(ctx, s, t, idx) {
    var w = s * 0.8, h = s * 0.8;
    ctx.save();
    rr(ctx, -w / 2, -h / 2, w, h, s * 0.14);
    var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#7f1d1d');
    g.addColorStop(1, '#450a0a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#ffd180';
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.stroke();
    /* arrow pointing the way in */
    ctx.fillStyle = '#ffd180';
    ctx.globalAlpha = 0.6 + Math.sin(t * 3 + idx) * 0.3;
    ctx.beginPath();
    ctx.moveTo(s * 0.16, 0);
    ctx.lineTo(-s * 0.06, -s * 0.16);
    ctx.lineTo(-s * 0.06, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCastle(ctx, s, t, hurt) {
    var w = s * 0.94, h = s * 0.9;
    ctx.save();
    /* towers */
    ctx.fillStyle = hurt ? '#a06a6a' : '#cbd5e1';
    ctx.fillRect(-w / 2, -h * 0.1, w * 0.24, h * 0.6);
    ctx.fillRect(w * 0.26, -h * 0.1, w * 0.24, h * 0.6);
    /* keep */
    ctx.fillRect(-w * 0.2, -h * 0.4, w * 0.4, h * 0.9);
    /* battlements */
    ctx.fillStyle = hurt ? '#8a5555' : '#94a3b8';
    var n = 4;
    for (var i = 0; i < n; i++) {
      var bx = -w * 0.2 + (i / n) * w * 0.4;
      ctx.fillRect(bx, -h * 0.52, w * 0.07, h * 0.14);
    }
    ctx.fillRect(-w / 2, -h * 0.2, w * 0.24, h * 0.1);
    ctx.fillRect(w * 0.26, -h * 0.2, w * 0.24, h * 0.1);
    /* door */
    ctx.beginPath();
    ctx.moveTo(-w * 0.11, h * 0.5);
    ctx.lineTo(-w * 0.11, h * 0.2);
    ctx.arc(0, h * 0.2, w * 0.11, Math.PI, 0);
    ctx.lineTo(w * 0.11, h * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#3f2d1e';
    ctx.fill();
    /* flag */
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.52);
    ctx.lineTo(0, -h * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#ff8a65';
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.95);
    ctx.lineTo(w * 0.3, -h * 0.82);
    ctx.lineTo(0, -h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  var CCSprites = {
    drawWall: drawWall,
    drawTower: drawTower,
    drawEnemy: drawEnemy,
    drawGate: drawGate,
    drawCastle: drawCastle,
    roundRect: rr
  };

  global.CCSprites = CCSprites;
})(typeof window !== 'undefined' ? window : globalThis);
