/* ========================================
   Amber's Farm — Player (Amber)
   ======================================== */

const Player = (() => {
  function create(x, y) {
    return {
      x, y,
      vx: 0, vy: 0,
      dir: 'down',
      moving: false,
      anim: 0,
      outfit: 'amber',
      hw: 10,
      hh: 12,
    };
  }

  function update(state, dt, input) {
    const p = state.player;
    let ix = 0, iy = 0;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    if (input.up) iy -= 1;
    if (input.down) iy += 1;

    if (ix !== 0 || iy !== 0) {
      const len = Math.sqrt(ix * ix + iy * iy);
      ix /= len; iy /= len;
      if (Math.abs(ix) > Math.abs(iy)) p.dir = ix > 0 ? 'right' : 'left';
      else p.dir = iy > 0 ? 'down' : 'up';
      p.moving = true;
      if (!state.tutorialDone && state.tutorialStep === 0) {
        state.tutorialStep = 1;
        UI.updateTutorial();
      }
    } else {
      p.moving = false;
    }

    // Soft energy: never stop, only slow when tired
    let speed = CONST.PLAYER_SPEED;
    if ((state.energy != null) && state.energy < CONST.ENERGY_WALK_SLOW) {
      speed *= 0.7;
    }
    const nx = p.x + ix * speed * dt;
    const ny = p.y + iy * speed * dt;
    const resolved = World.resolveMove(state, nx, ny, p.hw, p.hh);
    p.x = resolved.x;
    p.y = resolved.y;

    if (p.moving) p.anim += dt * 8;
    else p.anim = 0;

    // Clamp to map
    const map = World.mapPixelSize(state);
    p.x = Utils.clamp(p.x, 16, map.w - 16);
    p.y = Utils.clamp(p.y, 16, map.h - 16);
  }

  function draw(ctx, p, time) {
    const outfit = CONST.OUTFITS[p.outfit] || CONST.OUTFITS.amber;
    const bob = p.moving ? Math.sin(p.anim) * 2 : 0;
    const x = p.x;
    const y = p.y + bob;

    // Shadow
    ctx.fillStyle = CONST.COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = outfit.shirt;
    roundRect(ctx, x - 10, y - 4, 20, 16, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFD7B5';
    ctx.beginPath();
    ctx.arc(x, y - 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair / fox ears vibe
    ctx.fillStyle = '#E8A05A';
    ctx.beginPath();
    ctx.arc(x, y - 14, 9, Math.PI, 0);
    ctx.fill();
    // Ears
    ctx.fillStyle = '#E8941A';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 18);
    ctx.lineTo(x - 4, y - 28);
    ctx.lineTo(x - 1, y - 18);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 18);
    ctx.lineTo(x + 4, y - 28);
    ctx.lineTo(x + 1, y - 18);
    ctx.fill();
    ctx.fillStyle = '#FFB7C5';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 19);
    ctx.lineTo(x - 4, y - 25);
    ctx.lineTo(x - 3, y - 19);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 19);
    ctx.lineTo(x + 4, y - 25);
    ctx.lineTo(x + 3, y - 19);
    ctx.fill();

    // Hat
    ctx.fillStyle = outfit.hat;
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 7, y - 28, 14, 10);
    ctx.fillStyle = outfit.scarf;
    ctx.fillRect(x - 7, y - 22, 14, 3);

    // Scarf
    ctx.fillStyle = outfit.scarf;
    ctx.fillRect(x - 8, y - 2, 16, 5);

    // Eyes
    ctx.fillStyle = '#3E2723';
    const eyeY = y - 12;
    if (p.dir === 'left') {
      ctx.beginPath(); ctx.arc(x - 4, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.dir === 'right') {
      ctx.beginPath(); ctx.arc(x + 4, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.dir === 'up') {
      // looking away — small
      ctx.fillRect(x - 4, eyeY - 1, 2, 1);
      ctx.fillRect(x + 2, eyeY - 1, 2, 1);
    } else {
      ctx.beginPath(); ctx.arc(x - 3.5, eyeY, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 3.5, eyeY, 1.6, 0, Math.PI * 2); ctx.fill();
      // Smile
      ctx.strokeStyle = '#E07A5F';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y - 9, 3, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Legs
    ctx.fillStyle = '#5D4E37';
    const legSwing = p.moving ? Math.sin(p.anim) * 3 : 0;
    ctx.fillRect(x - 7, y + 10, 5, 6 + legSwing);
    ctx.fillRect(x + 2, y + 10, 5, 6 - legSwing);

    // Soft rim light (Iteration 2 beauty)
    ctx.strokeStyle = 'rgba(255,200,120,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - 12, 11, 0, Math.PI * 2);
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { create, update, draw };
})();
