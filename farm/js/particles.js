/* ========================================
   Amber's Farm — Particle System
   ======================================== */

const Particles = (() => {
  const MAX = 180;
  let pool = [];
  let active = [];
  let enabled = true;

  function init() {
    pool = [];
    active = [];
    for (let i = 0; i < MAX; i++) pool.push(blank());
  }

  function blank() {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 3, sizeEnd: 0,
      color: '#FFD700',
      alpha: 1,
      gravity: 0,
      drag: 0.98,
      shape: 'circle',
      text: '',
      rotation: 0,
      rotSpeed: 0,
      active: false,
      world: true, // world space vs screen space
    };
  }

  function acquire() {
    let p = pool.pop();
    if (!p) {
      if (active.length) {
        p = active.shift();
      } else {
        p = blank();
      }
    }
    p.active = true;
    active.push(p);
    return p;
  }

  function setEnabled(v) { enabled = v; }
  function isEnabled() { return enabled; }

  function emit(opts) {
    if (!enabled) return;
    const p = acquire();
    p.x = opts.x || 0;
    p.y = opts.y || 0;
    p.vx = opts.vx || 0;
    p.vy = opts.vy || 0;
    p.life = opts.life || 0.8;
    p.maxLife = p.life;
    p.size = opts.size || 4;
    p.sizeEnd = opts.sizeEnd != null ? opts.sizeEnd : 0;
    p.color = opts.color || '#FFD700';
    p.alpha = opts.alpha != null ? opts.alpha : 1;
    p.gravity = opts.gravity || 0;
    p.drag = opts.drag != null ? opts.drag : 0.98;
    p.shape = opts.shape || 'circle';
    p.text = opts.text || '';
    p.rotation = opts.rotation || 0;
    p.rotSpeed = opts.rotSpeed || 0;
    p.world = opts.world !== false;
  }

  function burst(x, y, n, colors, opts = {}) {
    if (!enabled) return;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = Utils.rand(opts.speedMin || 20, opts.speedMax || 80);
      emit({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (opts.up || 20),
        life: Utils.rand(0.4, 1.0),
        size: Utils.rand(2, 6),
        color: Utils.pick(colors),
        gravity: opts.gravity != null ? opts.gravity : 40,
        shape: opts.shape || 'circle',
        world: opts.world !== false,
      });
    }
  }

  function harvest(x, y) {
    burst(x, y, 14, ['#FFB347', '#FFD700', '#FFF8F0', '#7ED957'], { speedMax: 100, up: 40 });
  }

  function water(x, y) {
    burst(x, y, 8, ['#5BA3D9', '#A5D6F7', '#FFFFFF'], { speedMax: 40, gravity: 60, up: 10 });
  }

  function hearts(x, y) {
    if (!enabled) return;
    for (let i = 0; i < 5; i++) {
      emit({
        x: x + Utils.rand(-10, 10),
        y: y,
        vx: Utils.rand(-15, 15),
        vy: Utils.rand(-40, -20),
        life: 1.2,
        size: 10,
        color: '#FF6B9D',
        shape: 'text',
        text: '♥',
        gravity: -5,
      });
    }
  }

  function firefly(x, y) {
    emit({
      x, y,
      vx: Utils.rand(-12, 12),
      vy: Utils.rand(-8, 8),
      life: Utils.rand(2, 4),
      size: Utils.rand(2, 4),
      color: '#FFE082',
      gravity: 0,
      drag: 0.99,
    });
  }

  // ---- v4.0 ambient life ----
  function butterfly(x, y) {
    emit({
      x, y,
      vx: Utils.rand(-20, 20),
      vy: Utils.rand(-14, -4),
      life: Utils.rand(3, 5),
      size: Utils.rand(2, 3),
      sizeEnd: 2,
      color: Utils.pick(['#FFB7C5', '#FFF8F0', '#B39DDB', '#FFD970']),
      gravity: 2,
      drag: 0.99,
    });
  }

  function leaf(x, y) {
    emit({
      x: x + Utils.rand(-8, 8),
      y,
      vx: Utils.rand(-16, 16),
      vy: Utils.rand(10, 24),
      life: Utils.rand(2.5, 4.5),
      size: 3,
      sizeEnd: 1,
      color: Utils.pick(['#C99A4A', '#D4A85C', '#E8C070', '#8A6428']),
      gravity: 6,
      drag: 0.995,
    });
  }

  function snowSparkle(x, y) {
    emit({
      x: x + Utils.rand(-10, 10),
      y: y + Utils.rand(-10, 10),
      vx: 0, vy: -4,
      life: Utils.rand(1, 2),
      size: Utils.rand(1, 2),
      color: '#F0F4F0',
      gravity: 0,
      drag: 1,
    });
  }

  function rainDrop(x, y) {
    emit({
      x, y,
      vx: -20,
      vy: 220,
      life: 0.6,
      size: 2,
      sizeEnd: 1,
      color: 'rgba(180,210,255,0.7)',
      gravity: 100,
      world: false,
    });
  }

  function sleepStars(cx, cy) {
    burst(cx, cy, 20, ['#FFB347', '#FFF8F0', '#B39DDB'], { speedMax: 60, gravity: -10, world: false });
  }

  function confetti(x, y) {
    burst(x, y, 24, ['#FFB347', '#FFB7C5', '#7EC8E3', '#98D8C8', '#FFD700'], {
      speedMax: 120, gravity: 50, world: false,
    });
  }

  function floatText(x, y, text, color) {
    emit({
      x, y,
      vx: 0,
      vy: -30,
      life: 1.4,
      size: 14,
      color: color || '#FFB347',
      shape: 'text',
      text,
      gravity: 0,
      drag: 1,
    });
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        active.splice(i, 1);
        pool.push(p);
        continue;
      }
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;
    }
  }

  function drawOne(ctx, p) {
    const t = 1 - p.life / p.maxLife;
    const alpha = p.alpha * (1 - t);
    const size = Utils.lerp(p.size, p.sizeEnd, t);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.shape === 'text') {
      ctx.font = `bold ${size}px Fredoka One, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, 0, 0);
    } else if (p.shape === 'star') {
      ctx.fillStyle = p.color;
      drawStar(ctx, 0, 0, 5, size, size / 2);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Call inside world-translated context
  function drawWorld(ctx) {
    for (const p of active) {
      if (p.world) drawOne(ctx, p);
    }
  }

  // Call in screen space (no camera transform)
  function drawScreen(ctx) {
    for (const p of active) {
      if (!p.world) drawOne(ctx, p);
    }
  }

  // Title / generic: draw everything in current space
  function draw(ctx, camera) {
    for (const p of active) {
      if (camera && p.world) {
        const t = 1 - p.life / p.maxLife;
        const alpha = p.alpha * (1 - t);
        const size = Utils.lerp(p.size, p.sizeEnd, t);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(p.x - camera.x, p.y - camera.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'text') {
          ctx.font = `bold ${size}px Fredoka One, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text, 0, 0);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        drawOne(ctx, p);
      }
    }
  }

  function drawStar(ctx, x, y, spikes, outer, inner) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(x, y - outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  return {
    init, setEnabled, isEnabled, emit, burst, harvest, water, hearts,
    firefly, butterfly, leaf, snowSparkle, rainDrop, sleepStars, confetti, floatText, update, draw,
    drawWorld, drawScreen,
  };
})();
