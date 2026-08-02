'use strict';
const Atlas = (() => {
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function meander(ctx, x, y, w, h, th) {
    ctx.strokeStyle = C.black;
    ctx.lineWidth = Math.max(1, th || 3);
    ctx.strokeRect(x, y, w, h);
    const step = h * 0.5;
    ctx.beginPath();
    for (let sx = x + step / 2; sx < x + w; sx += step) {
      ctx.moveTo(sx - step / 2, y + h / 2);
      ctx.lineTo(sx - step / 4, y + h / 2);
      ctx.lineTo(sx - step / 4, y + h / 4);
      ctx.lineTo(sx + step / 4, y + h / 4);
      ctx.lineTo(sx + step / 4, y + h / 2);
      ctx.lineTo(sx + step / 2, y + h / 2);
      ctx.moveTo(sx - step / 2, y + h / 2 + 0.5);
    }
    ctx.stroke();
  }

  function ship(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.moveTo(-52, 8);
    ctx.quadraticCurveTo(0, -10, 52, 8);
    ctx.quadraticCurveTo(50, 20, 30, 16);
    ctx.lineTo(-30, 16);
    ctx.quadraticCurveTo(-50, 20, -52, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-52, 8);
    ctx.quadraticCurveTo(-70, -26, -44, -14);
    ctx.lineTo(-36, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -58);
    ctx.stroke();
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(28, -30);
    ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10 - 4, 14);
      ctx.lineTo(i * 10 + 4, 26);
      ctx.stroke();
    }
    ctx.restore();
  }

  function wave(ctx, x, y, w) {
    ctx.strokeStyle = C.seaDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let sx = 0; sx < w; sx += 14) {
      ctx.moveTo(x + sx, y);
      ctx.quadraticCurveTo(x + sx + 7, y - 5, x + sx + 14, y);
    }
    ctx.stroke();
  }

  function island(ctx, x, y, r) {
    ctx.fillStyle = C.terracotta;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.terracottaDark;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.45, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.1);
    ctx.lineTo(x - r * 0.2, y - r * 0.6);
    ctx.lineTo(x + r * 0.3, y - r * 0.15);
    ctx.lineTo(x + r * 0.65, y - r * 0.5);
    ctx.lineTo(x + r * 0.7, y - r * 0.05);
    ctx.closePath();
    ctx.fill();
  }

  function crewman(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(0, -30, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-14, -22, 28, 42);
    ctx.fillStyle = C.terracotta;
    ctx.fillRect(-16, -16, 32, 8);
    ctx.restore();
  }

  function amphora(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracotta;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(10, -8);
    ctx.quadraticCurveTo(18, 6, 12, 24);
    ctx.lineTo(-12, 24);
    ctx.quadraticCurveTo(-18, 6, -10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(-6, -20);
    ctx.moveTo(6, -14);
    ctx.lineTo(6, -20);
    ctx.stroke();
    ctx.restore();
  }

  function lyreIcon(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.moveTo(-8, -6);
    ctx.lineTo(-8, 2);
    ctx.moveTo(8, -6);
    ctx.lineTo(8, 2);
    ctx.stroke();
    ctx.restore();
  }

  function loom(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(-6, -34, 12, 44);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, -30);
    ctx.lineTo(22, -30);
    ctx.moveTo(-22, -18);
    ctx.lineTo(22, -18);
    ctx.moveTo(-22, 6);
    ctx.lineTo(22, 6);
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.fillRect(-10, -28, 20, 8);
    ctx.restore();
  }

  function altar(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(-24, 0, 48, 6);
    ctx.fillRect(-20, 6, 12, 18);
    ctx.fillRect(8, 6, 12, 18);
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(6, -4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function chest(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(-22, -6, 44, 26);
    ctx.fillRect(-24, -12, 48, 8);
    ctx.fillStyle = C.gold;
    ctx.fillRect(-4, -8, 8, 22);
    ctx.restore();
  }

  function cattle(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.quadraticCurveTo(36, -12, 34, -2);
    ctx.lineTo(24, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(-6, -24);
    ctx.lineTo(0, -14);
    ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.fillRect(-6, -20, 12, 4);
    ctx.restore();
  }

  function cyclops(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(0, -40, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-30, -20, 60, 70);
    ctx.fillRect(-24, 50, 16, 26);
    ctx.fillRect(8, 50, 16, 26);
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(0, -44, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(0, -44, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function ghost(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = 'rgba(243,233,210,0.85)';
    ctx.beginPath();
    ctx.arc(0, -12, 12, Math.PI, 0);
    ctx.quadraticCurveTo(12, 8, 9, 16);
    ctx.lineTo(-9, 16);
    ctx.quadraticCurveTo(-12, 8, -12, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(-4, -14, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -14, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function sirenBird(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(0, -10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -16);
    ctx.quadraticCurveTo(22, -24, 24, -6);
    ctx.lineTo(10, -6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(-26, 10, -20, 20);
    ctx.quadraticCurveTo(-10, 12, -12, 2);
    ctx.fill();
    ctx.fillStyle = C.terracotta;
    ctx.fillRect(-3, -16, 6, 22);
    ctx.restore();
  }

  function plant(ctx, x, y, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (type === 'moly') {
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(0, -8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.gold;
      ctx.font = 'bold 12px serif';
      ctx.fillText('★', -8, 2);
    } else {
      ctx.fillStyle = C.black;
      ctx.beginPath();
      ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function boulder(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracottaDark;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.black;
    ctx.beginPath();
    ctx.arc(-5, -4, 4, 0, Math.PI * 2);
    ctx.arc(6, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function heart(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-16, -2, -10, -14, 0, -4);
    ctx.bezierCurveTo(10, -14, 16, -2, 0, 10);
    ctx.fill();
    ctx.restore();
  }

  function drop(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.blue;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(10, 2, 0, 12);
    ctx.quadraticCurveTo(-10, 2, 0, -12);
    ctx.fill();
    ctx.restore();
  }

  function bowl(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s || 1, s || 1);
    ctx.fillStyle = C.terracotta;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function raftGather(ctx, stage, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(-36, -4, 72, 9);
    ctx.fillRect(-30, 6, 60, 9);
    ctx.fillRect(-24, -14, 48, 8);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -4, 72, 9);
    ctx.strokeRect(-30, 6, 60, 9);
    ctx.strokeRect(-24, -14, 48, 8);
    if (stage >= 3) {
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, -70);
      ctx.stroke();
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(30, -40);
      ctx.lineTo(0, -28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (stage === 0) {
      ctx.fillStyle = C.terracotta;
      ctx.fillRect(-16, -30, 10, 16);
      ctx.fillRect(-4, -26, 10, 12);
      ctx.fillRect(8, -22, 8, 10);
    } else if (stage === 1) {
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.ellipse(0, -24, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = C.terracotta;
      ctx.beginPath();
      ctx.arc(0, -24, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.black;
      ctx.fillRect(-2, -38, 4, 9);
    }
    ctx.restore();
  }

  return { rr, meander, ship, wave, island, crewman, amphora, lyreIcon, loom, altar, chest, cattle, cyclops, ghost, sirenBird, plant, boulder, heart, drop, bowl, raftGather };
})();
