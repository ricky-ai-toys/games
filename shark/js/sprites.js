/* Amber's Shark Hunt — vector creature painters.
 * Every creature is drawn with canvas paths so it looks identical on iOS,
 * Android, Linux and Windows. Emoji glyphs render differently per platform and
 * the generic shark emoji made a weak player character.
 *
 * Each painter draws in local space: origin at the creature's centre, +x is
 * forward, +y is down. Callers translate/rotate. Silhouette is the priority —
 * tier-1 fish are only ~18px across, so shape has to read before detail.
 */
(function (global) {
  'use strict';

  var D = global.SHData;

  /* ---------------------------------------------------------------- utils */

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  }

  function tail(ctx, x, y, r, sway, color) {
    /* Forked caudal fin, hinged so it sweeps with the swim cycle. */
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.85, -r * 0.62);
    ctx.quadraticCurveTo(-r * 0.5, 0, -r * 0.85, r * 0.62);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function dorsal(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.34, y);
    ctx.quadraticCurveTo(x, y - r * 0.72, x + r * 0.42, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function pectoral(ctx, x, y, r, dir, color) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - r * 0.18 * dir, y + r * 0.5 * dir, x + r * 0.26 * dir, y + r * 0.3 * dir);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function eye(ctx, x, y, r, pupilR) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1530';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.3, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function scale(ctx, r, fn) {
    fn(r);
  }

  /* ----------------------------------------------------------------- fish */

  /* Per-tier silhouette. Tier 0-2 are slim reef fish, 3 is a round puffer,
   * 4 is a squid, 5 is a whale. The shapes are deliberately distinct so a
   * player can read threat from the outline alone. */
  function drawFish(ctx, o, t) {
    var spec = D.tier(o.n);
    var r = o.r;
    var sway = Math.sin(t * 6 + (o.phase || 0));
    var body = spec.body, fin = spec.fin, belly = spec.belly;

    ctx.save();

    if (o.n === 3) {
      /* Puffer: round, spiky, slow. */
      ctx.rotate(sway * 0.12);
      tail(ctx, -r * 0.72, 0, r * 0.42, sway, fin);
      ellipse(ctx, 0, 0, r * 0.86, r * 0.8);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = (i / 10) * Math.PI * 2;
        var sx = Math.cos(a) * r * 0.86, sy = Math.sin(a) * r * 0.8;
        var ex = Math.cos(a) * r * 1.14, ey = Math.sin(a) * r * 1.06;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = fin;
        ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.stroke();
      }
      ellipse(ctx, r * 0.16, r * 0.2, r * 0.4, r * 0.34, -0.3);
      ctx.fillStyle = belly;
      ctx.fill();
      eye(ctx, r * 0.34, -r * 0.16, r * 0.14, r * 0.05);

    } else if (o.n === 4) {
      /* Squid: mantle plus trailing arms, unmistakably not a fish. */
      tail(ctx, -r * 0.8, 0, r * 0.5, sway, fin);
      ctx.beginPath();
      ctx.moveTo(r * 0.95, 0);
      ctx.quadraticCurveTo(r * 0.1, -r * 0.62, -r * 0.72, -r * 0.3);
      ctx.quadraticCurveTo(-r * 0.95, 0, -r * 0.72, r * 0.3);
      ctx.quadraticCurveTo(r * 0.1, r * 0.62, r * 0.95, 0);
      ctx.closePath();
      ctx.fillStyle = body;
      ctx.fill();
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.66, k * r * 0.2);
        ctx.quadraticCurveTo(-r * 1.05, k * r * 0.26 + sway * r * 0.12, -r * 1.3, k * r * 0.3);
        ctx.strokeStyle = fin;
        ctx.lineWidth = Math.max(1, r * 0.13);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      eye(ctx, r * 0.42, -r * 0.1, r * 0.15, r * 0.06);

    } else if (o.n === 5) {
      /* Whale: big, blunt, pale, with a fluke. Slow but dangerous. */
      tail(ctx, -r * 0.86, 0, r * 0.6, sway * 0.6, fin);
      ctx.beginPath();
      ctx.moveTo(r * 0.94, -r * 0.06);
      ctx.quadraticCurveTo(r * 0.72, -r * 0.62, r * 0.05, -r * 0.56);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.5, -r * 0.82, -r * 0.2);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.56, r * 0.1, r * 0.6);
      ctx.quadraticCurveTo(r * 0.74, r * 0.64, r * 0.94, -r * 0.06);
      ctx.closePath();
      ctx.fillStyle = body;
      ctx.fill();
      /* pale belly */
      ctx.beginPath();
      ctx.moveTo(r * 0.9, r * 0.06);
      ctx.quadraticCurveTo(r * 0.3, r * 0.62, -r * 0.5, r * 0.44);
      ctx.quadraticCurveTo(-r * 0.1, r * 0.2, r * 0.9, r * 0.06);
      ctx.closePath();
      ctx.fillStyle = belly;
      ctx.fill();
      pectoral(ctx, r * 0.16, r * 0.3, r, 1, fin);
      eye(ctx, r * 0.66, -r * 0.12, r * 0.09, r * 0.035);

    } else {
      /* Tiers 0-2: classic fish silhouette, proportions widening with tier. */
      var depth = 0.52 + o.n * 0.06;
      tail(ctx, -r * 0.78, 0, r * 0.56, sway, fin);
      dorsal(ctx, r * 0.04, -r * depth * 0.9, r, fin);
      ctx.beginPath();
      ctx.moveTo(r * 0.96, 0);
      ctx.quadraticCurveTo(r * 0.6, -r * depth, -r * 0.1, -r * depth);
      ctx.quadraticCurveTo(-r * 0.7, -r * depth * 0.8, -r * 0.76, 0);
      ctx.quadraticCurveTo(-r * 0.7, r * depth * 0.8, -r * 0.1, r * depth);
      ctx.quadraticCurveTo(r * 0.6, r * depth, r * 0.96, 0);
      ctx.closePath();
      ctx.fillStyle = body;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.86, r * 0.02);
      ctx.quadraticCurveTo(r * 0.3, r * depth * 0.82, -r * 0.42, r * depth * 0.66);
      ctx.quadraticCurveTo(r * 0.1, r * depth * 0.3, r * 0.86, r * 0.02);
      ctx.closePath();
      ctx.fillStyle = belly;
      ctx.fill();
      pectoral(ctx, r * 0.24, r * depth * 0.4, r, 1, fin);
      eye(ctx, r * 0.62, -r * depth * 0.26, r * 0.12, r * 0.045);
    }

    ctx.restore();
  }

  /* ---------------------------------------------------------------- shark */

  function drawShark(ctx, r, angle, t, opts) {
    opts = opts || {};
    var sway = Math.sin(t * 5.2);
    var g = opts.gills;
    var body = opts.body || '#6fb3d9';
    var fin = opts.fin || '#3d7fa6';
    var belly = opts.belly || '#e8f6ff';
    var r2 = r;

    ctx.save();
    ctx.rotate(angle);

    /* tail first, behind the body */
    tail(ctx, -r2 * 0.95, 0, r2 * 0.78, sway, fin);

    /* body — pointed snout, thick shoulders, tapering to the peduncle */
    ctx.beginPath();
    ctx.moveTo(r2 * 1.06, -r2 * 0.04);
    ctx.quadraticCurveTo(r2 * 0.72, -r2 * 0.5, r2 * 0.1, -r2 * 0.5);
    ctx.quadraticCurveTo(-r2 * 0.62, -r2 * 0.46, -r2 * 0.92, -r2 * 0.2);
    ctx.quadraticCurveTo(-r2 * 0.66, r2 * 0.5, r2 * 0.06, r2 * 0.52);
    ctx.quadraticCurveTo(r2 * 0.7, r2 * 0.5, r2 * 1.06, -r2 * 0.04);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();

    /* pale underside */
    ctx.beginPath();
    ctx.moveTo(r2 * 1.02, r2 * 0.02);
    ctx.quadraticCurveTo(r2 * 0.3, r2 * 0.54, -r2 * 0.5, r2 * 0.4);
    ctx.quadraticCurveTo(-r2 * 0.1, r2 * 0.16, r2 * 1.02, r2 * 0.02);
    ctx.closePath();
    ctx.fillStyle = belly;
    ctx.fill();

    /* primary dorsal */
    ctx.beginPath();
    ctx.moveTo(-r2 * 0.1, -r2 * 0.46);
    ctx.quadraticCurveTo(r2 * 0.18, -r2 * 1.02, r2 * 0.46, -r2 * 0.36);
    ctx.closePath();
    ctx.fillStyle = fin;
    ctx.fill();

    /* pectoral */
    pectoral(ctx, r2 * 0.3, r2 * 0.3, r2, 1, fin);

    /* gill slits — the visual tell for the Gills powerup */
    if (g) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, r2 * 0.06);
      for (var i = 0; i < 4; i++) {
        var gx = r2 * (0.42 - i * 0.11);
        ctx.beginPath();
        ctx.moveTo(gx, -r2 * 0.2);
        ctx.lineTo(gx - r2 * 0.04, r2 * 0.16);
        ctx.stroke();
      }
    }

    /* mouth */
    ctx.beginPath();
    var open = opts.jaw || 0;
    ctx.moveTo(r2 * 0.98, r2 * 0.06);
    ctx.quadraticCurveTo(r2 * 0.72, r2 * (0.16 + open * 0.4), r2 * 0.46, r2 * (0.1 + open * 0.2));
    ctx.quadraticCurveTo(r2 * 0.74, r2 * 0.04, r2 * 0.98, r2 * 0.02);
    ctx.closePath();
    ctx.fillStyle = '#2a4a63';
    ctx.fill();

    /* teeth when the jaw is open (biting or the predator gapes) */
    if (open > 0.3) {
      ctx.fillStyle = '#ffffff';
      for (var k = 0; k < 4; k++) {
        var tx = r2 * (0.86 - k * 0.1);
        ctx.beginPath();
        ctx.moveTo(tx, r2 * 0.05);
        ctx.lineTo(tx + r2 * 0.05, r2 * (0.05 + open * 0.22));
        ctx.lineTo(tx + r2 * 0.1, r2 * 0.05);
        ctx.closePath();
        ctx.fill();
      }
    }

    eye(ctx, r2 * 0.66, -r2 * 0.16, r2 * 0.11, r2 * 0.04);
    ctx.restore();
  }

  /* ------------------------------------------------------- apex predator */

  function drawApex(ctx, a, t) {
    var A = D.APEX;
    var r = a.r;
    var isTele = a.phase === 'telegraph';
    var isLunge = a.phase === 'lunge';
    var isRecover = a.phase === 'recover';
    var sway = Math.sin(t * 4);

    /* Telegraph: rear back and up, coiling before the strike. */
    var coil = isTele ? 0.16 : 0;
    var gape = a.jaw || 0;

    ctx.save();
    ctx.translate(a.x, a.y);

    /* Aim line: the locked lunge path, drawn during telegraph so the player can
     * read exactly where it is going to go. */
    if (isTele) {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,77,77,0.75)';
      ctx.beginPath();
      ctx.moveTo(a.x * 0, a.y * 0);
      ctx.lineTo(a.aimX - a.x, a.aimY - a.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(a.aimX - a.x, a.aimY - a.y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,77,77,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(a.face);
    ctx.translate(-coil * r * 0.2, 0);

    var body = isRecover ? '#7a8798' : A.body;
    var fin = isRecover ? '#54606e' : A.fin;
    var belly = isRecover ? '#c3cedb' : A.belly;

    /* Motion smear during the lunge. */
    if (isLunge) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(-r * 1.1, 0, r * 1.7, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    /* Tail. Big and slow — the same motion reads as "big". */
    ctx.save();
    ctx.translate(-r * 1.02, 0);
    ctx.rotate(sway * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.95, -r * 0.8);
    ctx.quadraticCurveTo(-r * 0.5, 0, -r * 0.95, r * 0.8);
    ctx.closePath();
    ctx.fillStyle = fin;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.1);
    ctx.lineTo(-r * 0.78, -r * 0.66);
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.stroke();
    ctx.restore();

    /* Body — heavier than the player's shark, with a scar. */
    ctx.beginPath();
    ctx.moveTo(r * 1.12, -r * 0.02);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.54, r * 0.12, -r * 0.54);
    ctx.quadraticCurveTo(-r * 0.66, -r * 0.5, -r * 0.98, -r * 0.22);
    ctx.quadraticCurveTo(-r * 0.7, r * 0.54, r * 0.08, r * 0.56);
    ctx.quadraticCurveTo(r * 0.78, r * 0.54, r * 1.12, -r * 0.02);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 1.08, r * 0.06);
    ctx.quadraticCurveTo(r * 0.32, r * 0.6, -r * 0.56, r * 0.44);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.2, r * 1.08, r * 0.06);
    ctx.closePath();
    ctx.fillStyle = belly;
    ctx.fill();

    /* dorsal */
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.2, -r * 1.12, r * 0.5, -r * 0.4);
    ctx.closePath();
    ctx.fillStyle = fin;
    ctx.fill();

    /* second, smaller dorsal */
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.44);
    ctx.quadraticCurveTo(-r * 0.36, -r * 0.74, -r * 0.22, -r * 0.38);
    ctx.closePath();
    ctx.fillStyle = fin;
    ctx.fill();

    pectoral(ctx, r * 0.32, r * 0.32, r, 1, fin);

    /* scar */
    ctx.strokeStyle = 'rgba(30,40,55,0.4)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.34);
    ctx.lineTo(r * 0.12, -r * 0.08);
    ctx.stroke();

    /* Jaw. Gapes during telegraph, which is the wind-up tell. */
    var jawDrop = isTele ? 0.55 : gape;
    ctx.beginPath();
    ctx.moveTo(r * 1.04, r * 0.04);
    ctx.quadraticCurveTo(r * 0.78, r * (0.2 + jawDrop * 0.5), r * 0.44, r * (0.14 + jawDrop * 0.26));
    ctx.quadraticCurveTo(r * 0.78, r * 0.02, r * 1.04, r * 0.0);
    ctx.closePath();
    ctx.fillStyle = A.mouth;
    ctx.fill();

    if (jawDrop > 0.25) {
      ctx.fillStyle = '#ffffff';
      for (var k = 0; k < 5; k++) {
        var tx = r * (0.94 - k * 0.11);
        ctx.beginPath();
        ctx.moveTo(tx, r * 0.03);
        ctx.lineTo(tx + r * 0.05, r * (0.03 + jawDrop * 0.3));
        ctx.lineTo(tx + r * 0.1, r * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }

    /* Red eyes. Flash during telegraph. */
    var eyeCol = isTele ? '#ff2b2b' : A.eye;
    ctx.beginPath();
    ctx.arc(r * 0.7, -r * 0.18, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = eyeCol;
    ctx.fill();
    if (isTele) {
      ctx.beginPath();
      ctx.arc(r * 0.7, -r * 0.18, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,43,43,0.3)';
      ctx.fill();
    }

    /* Recover: the tail glows so the player can see the opening. */
    if (isRecover) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(t * 8) * 0.15;
      ctx.beginPath();
      ctx.arc(-r * 1.5, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.restore();
    }

    /* Hit flash when the tail was struck. */
    if (a.hitFlash > 0) {
      ctx.globalAlpha = a.hitFlash * 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.15, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* --------------------------------------------------------------- relics */

  function drawRelic(ctx, relic, t) {
    var def = null, i;
    for (i = 0; i < D.RELICS.length; i++) {
      if (D.RELICS[i].id === relic.id) { def = D.RELICS[i]; break; }
    }
    if (!def) return;
    var pulse = 1 + Math.sin(t * 3 + relic.phase) * 0.12;
    var r = relic.r * pulse;

    ctx.save();
    ctx.translate(relic.x, relic.y);

    var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.1);
    glow.addColorStop(0, 'rgba(255,215,0,0.4)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,215,0,0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    /* Emoji only here — a one-off pickup is exactly where instant recognition
     * beats a hand-drawn icon, and these are identical across platforms. */
    ctx.font = Math.round(r * 1.3) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, 0, 1);
    ctx.restore();
  }

  var SHSprites = {
    drawFish: drawFish,
    drawShark: drawShark,
    drawApex: drawApex,
    drawRelic: drawRelic
  };

  global.SHSprites = SHSprites;
  if (typeof module !== 'undefined' && module.exports) module.exports = SHSprites;
})(typeof window !== 'undefined' ? window : globalThis);
