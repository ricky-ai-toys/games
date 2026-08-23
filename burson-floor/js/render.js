/* Pixel canvas renderer — centered floor, distinct sprites, props */

const Render = (() => {
  let canvas, ctx;
  let cam = { x: 0, y: 0 };
  let scale = 1;

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width = CONST.VIEW_W;
    canvas.height = CONST.VIEW_H;
    const fit = Math.min(window.innerWidth / CONST.VIEW_W, window.innerHeight / CONST.VIEW_H);
    scale = Math.max(0.5, fit * 0.98);
    canvas.style.width = Math.floor(CONST.VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(CONST.VIEW_H * scale) + 'px';
    ctx.imageSmoothingEnabled = false;
  }

  function mapPixelSize() {
    return {
      w: CONST.MAP_W * CONST.TILE,
      h: CONST.MAP_H * CONST.TILE,
    };
  }

  /** Center map in view when smaller; clamp follow when larger */
  function centeredCam(followX, followY) {
    const { w, h } = mapPixelSize();
    const maxX = w - canvas.width;
    const maxY = h - canvas.height;

    let goalX, goalY;
    if (maxX <= 0) {
      goalX = maxX / 2; // negative → shifts content to center
    } else {
      goalX = Utils.clamp(followX - canvas.width / 2, 0, maxX);
    }
    if (maxY <= 0) {
      goalY = maxY / 2;
    } else {
      goalY = Utils.clamp(followY - canvas.height / 2, 0, maxY);
    }
    return { x: goalX, y: goalY };
  }

  function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const cx = ((sx - rect.left) / rect.width) * canvas.width;
    const cy = ((sy - rect.top) / rect.height) * canvas.height;
    return { x: cx + cam.x, y: cy + cam.y };
  }

  function updateCamera(state, dt) {
    const { w, h } = mapPixelSize();
    let followX = w / 2;
    let followY = h / 2;
    if (state.player) {
      followX = state.player.x;
      followY = state.player.y;
    }
    const goal = centeredCam(followX, followY);
    const t = state.player ? 1 - Math.pow(1 - CONST.CAMERA_LERP, dt * 60) : 1;
    cam.x = Utils.lerp(cam.x, goal.x, t);
    cam.y = Utils.lerp(cam.y, goal.y, t);
  }

  function draw(state) {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // Soft office backdrop outside map bounds
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, '#1a2433');
    grd.addColorStop(1, '#121820');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!OfficeMap.grid) return;

    // Keep camera centered even on title
    if (!state.player) {
      const goal = centeredCam(mapPixelSize().w / 2, mapPixelSize().h / 2);
      cam.x = goal.x;
      cam.y = goal.y;
    }

    ctx.save();
    ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));

    drawFloor();
    drawDesks();
    drawProps();
    drawZoneLabels();

    const actors = [];
    if (state.player) actors.push({ kind: 'player', ref: state.player });
    for (const n of state.npcs || []) actors.push({ kind: 'npc', ref: n });
    actors.sort((a, b) => a.ref.y - b.ref.y);
    for (const a of actors) drawPerson(a.ref, a.kind === 'player');

    drawBubbles(state);

    ctx.restore();

    ctx.strokeStyle = '#1a2230';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }

  function drawFloor() {
    const T = CONST.TILE;
    for (let y = 0; y < CONST.MAP_H; y++) {
      for (let x = 0; x < CONST.MAP_W; x++) {
        const aisle = y === 4 || y === 7 || y === 10;
        const alt = (x + y) % 2 === 0;
        if (x === 0 || y === 0 || x === CONST.MAP_W - 1 || y === CONST.MAP_H - 1) {
          ctx.fillStyle = CONST.COLORS.wall;
        } else if (aisle) {
          ctx.fillStyle = CONST.COLORS.aisle;
        } else {
          ctx.fillStyle = alt ? CONST.COLORS.carpet : CONST.COLORS.carpetAlt;
        }
        ctx.fillRect(x * T, y * T, T, T);
      }
    }
  }

  function drawZoneLabels() {
    const T = CONST.TILE;
    ctx.fillStyle = 'rgba(200,220,240,0.18)';
    ctx.font = '10px monospace';
    ctx.fillText('ROW 1 · MD / DIRECTORS', 4 * T, 1.6 * T);
    ctx.fillText('ROW 2', 2 * T, 4.6 * T);
    ctx.fillText('WORK STATION', 10.5 * T, 4.6 * T);
    ctx.fillText('ROW 3', 2 * T, 7.6 * T);
    ctx.fillText('CORP', 16 * T, 1.6 * T);
    ctx.fillText('CPA', 2 * T, 9.6 * T);
  }

  function drawDeskAt(tx, ty, color, label, grey) {
    const T = CONST.TILE;
    const x = tx * T;
    const y = ty * T;
    ctx.fillStyle = color || CONST.COLORS.desk;
    ctx.fillRect(x + 2, y + 4, T * 2 - 4, T - 10);
    ctx.fillStyle = CONST.COLORS.monitor;
    ctx.fillRect(x + T * 0.55, y + 6, 14, 10);
    ctx.fillStyle = grey ? '#4a5560' : '#3d8fd4';
    ctx.fillRect(x + T * 0.55 + 2, y + 8, 10, 6);
    ctx.fillStyle = '#3a4555';
    ctx.fillRect(x + T * 0.65, y + T - 4, 12, 6);
    if (label) {
      ctx.fillStyle = grey ? 'rgba(220,220,220,0.55)' : 'rgba(240,248,255,0.9)';
      ctx.font = 'bold 8px monospace';
      const short = label.length > 11 ? label.split(' ')[0] : label;
      ctx.fillText(short, x + 4, y + T - 8);
    }
  }

  function drawDesks() {
    for (const p of ROSTER) {
      drawDeskAt(p.tx, p.ty, p.color, p.name, false);
    }
    for (const d of PROP_DESKS) {
      const col =
        d.kind === 'x'
          ? CONST.COLORS.deskX
          : d.kind === 'cpa' || d.kind === 'corp' || d.kind === 'bbg'
            ? CONST.COLORS.deskGrey
            : '#6a7580';
      drawDeskAt(d.tx, d.ty, col, d.label, true);
    }
  }

  function drawProps() {
    const T = CONST.TILE;
    for (const p of OfficeMap.getProps()) {
      const x = p.tx * T;
      const y = p.ty * T;
      if (p.kind === 'coffee') {
        ctx.fillStyle = CONST.COLORS.coffee;
        ctx.fillRect(x + 8, y + 6, 16, 18);
        ctx.fillStyle = '#c4a574';
        ctx.fillRect(x + 12, y + 10, 8, 6);
        ctx.fillStyle = '#eee';
        ctx.font = '7px monospace';
        ctx.fillText('COFFEE', x + 2, y + 28);
      } else if (p.kind === 'water') {
        ctx.fillStyle = CONST.COLORS.water;
        ctx.fillRect(x + 10, y + 4, 12, 20);
        ctx.fillStyle = '#dff';
        ctx.fillRect(x + 12, y + 8, 8, 8);
        ctx.font = '7px monospace';
        ctx.fillText('H2O', x + 6, y + 28);
      } else if (p.kind === 'plant') {
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(x + 12, y + 16, 8, 8);
        ctx.fillStyle = CONST.COLORS.plant;
        ctx.beginPath();
        ctx.arc(x + 16, y + 12, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'printer') {
        // Bigger printer station
        ctx.fillStyle = '#4a5562';
        ctx.fillRect(x + 2, y + 4, 28, 22);
        ctx.fillStyle = '#2a3038';
        ctx.fillRect(x + 6, y + 8, 20, 8);
        ctx.fillStyle = '#8ab4d4';
        ctx.fillRect(x + 8, y + 10, 16, 4);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(x + 10, y + 18, 12, 3);
        ctx.fillStyle = '#e8eef5';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('PRINTER', x + 2, y + 30);
      } else if (p.kind === 'bloomberg') {
        // Dual-screen orange terminal
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x + 2, y + 4, 28, 20);
        ctx.fillStyle = CONST.COLORS.bloomberg;
        ctx.fillRect(x + 4, y + 6, 11, 12);
        ctx.fillRect(x + 17, y + 6, 11, 12);
        ctx.fillStyle = '#1a1000';
        ctx.fillRect(x + 5, y + 7, 9, 10);
        ctx.fillRect(x + 18, y + 7, 9, 10);
        ctx.fillStyle = '#ffaa44';
        ctx.font = '6px monospace';
        ctx.fillText('BBG', x + 6, y + 14);
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('BLOOMBERG', x - 2, y + 30);
      } else if (p.kind === 'booth1') {
        // Solo glass phone booth
        ctx.fillStyle = 'rgba(110, 198, 255, 0.25)';
        ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
        ctx.strokeStyle = '#7ec8e3';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
        ctx.fillStyle = '#3a4555';
        ctx.fillRect(x + 10, y + 18, 12, 6);
        ctx.fillStyle = '#cfe9f5';
        ctx.font = 'bold 6px monospace';
        ctx.fillText('BOOTH×1', x + 2, y + T + 8);
      } else if (p.kind === 'booth4') {
        // Huddle booth for 4
        ctx.fillStyle = 'rgba(110, 198, 255, 0.2)';
        ctx.fillRect(x + 2, y + 2, T * 2 - 4, T * 2 - 4);
        ctx.strokeStyle = '#5eb1bf';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, T * 2 - 4, T * 2 - 4);
        // 4 chairs
        ctx.fillStyle = '#3a4555';
        ctx.fillRect(x + 8, y + 10, 10, 6);
        ctx.fillRect(x + T + 6, y + 10, 10, 6);
        ctx.fillRect(x + 8, y + T + 6, 10, 6);
        ctx.fillRect(x + T + 6, y + T + 6, 10, 6);
        ctx.fillStyle = '#cfe9f5';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('HUDDLE×4', x + 8, y + T * 2 + 8);
      }
    }
  }

  function drawPerson(p, isPlayer) {
    const look = p.data.look || {};
    const h = look.height || 1;
    const bob = p.sitting ? Math.sin(p.bob) * 0.5 : Math.sin(p.bob * 2) * 1.5;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y + bob);
    const color = p.data.color || '#888';
    const skin = look.skin || '#f0d0b0';
    const hair = look.hair || p.data.hair || '#222';
    const face = isPlayer ? 1 : p.facing || 1;
    const bodyW = look.body === 'slim' ? 5 : look.body === 'broad' ? 7 : 6;
    const legColor = look.legs === 'skirt' ? shade(color, -40) : '#2a3340';
    const shoe = look.shoes || '#222';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 6 + bodyW * 0.3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const legH = Math.round(6 * h);
    const bodyH = Math.round(12 * h);
    const headS = Math.round(10 * Math.min(h, 1.05));
    const bodyTop = y - Math.round(14 * h);
    const headTop = bodyTop - headS + 2;

    // Legs / skirt
    if (!p.sitting) {
      const swing = Math.sin(p.bob * 3) * 2;
      if (look.legs === 'skirt') {
        ctx.fillStyle = legColor;
        ctx.fillRect(x - bodyW, y - 2, bodyW * 2, legH + 2);
        ctx.fillStyle = shoe;
        ctx.fillRect(x - bodyW + 1, y + legH - 1, 3, 2);
        ctx.fillRect(x + bodyW - 4, y + legH - 1, 3, 2);
      } else {
        ctx.fillStyle = legColor;
        ctx.fillRect(x - 4, y - 2, 3, legH + swing);
        ctx.fillRect(x + 1, y - 2, 3, legH - swing);
        ctx.fillStyle = shoe;
        ctx.fillRect(x - 4, y + legH - 2 + swing, 3, 2);
        ctx.fillRect(x + 1, y + legH - 2 - swing, 3, 2);
      }
    } else {
      ctx.fillStyle = legColor;
      ctx.fillRect(x - bodyW, y, bodyW * 2, 4);
    }

    // Body / shirt
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyW, bodyTop, bodyW * 2, bodyH);
    if (look.shirtPattern === 'stripe') {
      ctx.fillStyle = shade(color, 30);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - bodyW, bodyTop + 3 + i * 3, bodyW * 2, 1);
      }
    } else if (look.shirtPattern === 'collar') {
      ctx.fillStyle = shade(color, 40);
      ctx.fillRect(x - 2, bodyTop, 4, 3);
      ctx.fillStyle = '#eee';
      ctx.fillRect(x - 1, bodyTop + 1, 2, 2);
    }

    // Head
    ctx.fillStyle = skin;
    ctx.fillRect(x - Math.floor(headS / 2), headTop, headS, headS);

    // Hair styles
    drawHair(x, headTop, headS, hair, look.hairStyle || 'short', face);

    // Eyes
    ctx.fillStyle = '#222';
    const eyeY = headTop + Math.floor(headS * 0.45);
    if (face >= 0) {
      ctx.fillRect(x - 2, eyeY, 2, 2);
      ctx.fillRect(x + 2, eyeY, 2, 2);
    } else {
      ctx.fillRect(x - 3, eyeY, 2, 2);
      ctx.fillRect(x + 1, eyeY, 2, 2);
    }

    // Accessories
    drawAccessory(x, headTop, headS, bodyTop, bodyW, look.accessory, color);

    // Player outline
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(126, 200, 227, 0.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - bodyW - 1, headTop - 4, bodyW * 2 + 2, y - headTop + 8);
    }

    // Name + title crumb
    if (isPlayer || !p.data.generic) {
      const name = p.data.name.split(' ')[0];
      ctx.font = 'bold 8px monospace';
      const w = ctx.measureText(name).width;
      const tagY = headTop - 12;
      ctx.fillStyle = 'rgba(10,14,22,0.75)';
      ctx.fillRect(x - w / 2 - 2, tagY, w + 4, 10);
      ctx.fillStyle = isPlayer ? '#7ec8e3' : '#e8eef5';
      ctx.fillText(name, x - w / 2, tagY + 8);

      if (p.data.title && (isPlayer || Math.sin(p.bob) > 0.3)) {
        // subtle title flash while idle bob high — actually always show short title for directors/MD
        const tShort = shortTitle(p.data.title);
        ctx.font = '6px monospace';
        const tw = ctx.measureText(tShort).width;
        ctx.fillStyle = 'rgba(10,14,22,0.55)';
        ctx.fillRect(x - tw / 2 - 1, tagY - 7, tw + 2, 7);
        ctx.fillStyle = 'rgba(180,200,220,0.85)';
        ctx.fillText(tShort, x - tw / 2, tagY - 1);
      }
    }
  }

  function shortTitle(t) {
    if (t === 'Managing Director') return 'MD';
    if (t === 'Associate Director') return 'AD';
    if (t === 'Senior Associate') return 'Sr Assoc';
    if (t === 'Operations Lead') return 'Ops Lead';
    if (t === 'Operations Associate') return 'Ops';
    if (t === 'Director') return 'Director';
    if (t === 'Associate') return 'Assoc';
    return t.length > 10 ? t.slice(0, 9) + '…' : t;
  }

  function shade(hex, amt) {
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Utils.clamp(r, 0, 255);
    g = Utils.clamp(g, 0, 255);
    b = Utils.clamp(b, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function drawHair(x, headTop, headS, hair, style, face) {
    ctx.fillStyle = hair;
    const left = x - Math.floor(headS / 2);
    if (style === 'buzz') {
      ctx.fillRect(left, headTop, headS, 3);
    } else if (style === 'short') {
      ctx.fillRect(left, headTop - 2, headS, 4);
      ctx.fillRect(left - 1, headTop, 2, 5);
      ctx.fillRect(left + headS - 1, headTop, 2, 5);
    } else if (style === 'bob') {
      ctx.fillRect(left - 1, headTop - 2, headS + 2, 5);
      ctx.fillRect(left - 2, headTop + 2, 3, headS - 2);
      ctx.fillRect(left + headS - 1, headTop + 2, 3, headS - 2);
    } else if (style === 'long') {
      ctx.fillRect(left - 1, headTop - 2, headS + 2, 5);
      ctx.fillRect(left - 2, headTop + 2, 3, headS + 4);
      ctx.fillRect(left + headS - 1, headTop + 2, 3, headS + 4);
    } else if (style === 'ponytail') {
      ctx.fillRect(left, headTop - 2, headS, 4);
      ctx.fillRect(left + headS - 2, headTop + 2, 3, headS + 2);
      ctx.fillRect(left + headS, headTop + headS - 2, 4, 6);
    } else if (style === 'side') {
      ctx.fillRect(left, headTop - 2, headS, 4);
      if (face >= 0) {
        ctx.fillRect(left + headS - 1, headTop + 1, 4, headS - 1);
      } else {
        ctx.fillRect(left - 3, headTop + 1, 4, headS - 1);
      }
    } else if (style === 'curly') {
      ctx.fillRect(left - 1, headTop - 3, headS + 2, 5);
      ctx.fillRect(left - 2, headTop, 3, 4);
      ctx.fillRect(left + headS - 1, headTop, 3, 4);
      ctx.fillRect(left + 2, headTop - 4, 4, 3);
    } else if (style === 'pixie') {
      ctx.fillRect(left, headTop - 1, headS, 3);
      ctx.fillRect(left - 1, headTop + 1, 2, 4);
      ctx.fillRect(left + headS / 2, headTop - 3, 4, 3);
    } else {
      ctx.fillRect(left, headTop - 2, headS, 4);
    }
  }

  function drawAccessory(x, headTop, headS, bodyTop, bodyW, acc, shirtColor) {
    if (!acc || acc === 'none') return;
    if (acc === 'glasses') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      const ey = headTop + Math.floor(headS * 0.42);
      ctx.strokeRect(x - 4, ey, 4, 3);
      ctx.strokeRect(x + 1, ey, 4, 3);
      ctx.beginPath();
      ctx.moveTo(x, ey + 1);
      ctx.lineTo(x + 1, ey + 1);
      ctx.stroke();
    } else if (acc === 'headphones') {
      ctx.fillStyle = '#333';
      ctx.fillRect(x - Math.floor(headS / 2) - 2, headTop + 2, 3, 6);
      ctx.fillRect(x + Math.floor(headS / 2) - 1, headTop + 2, 3, 6);
      ctx.fillRect(x - Math.floor(headS / 2), headTop - 1, headS, 2);
    } else if (acc === 'badge') {
      ctx.fillStyle = '#f5d76e';
      ctx.fillRect(x + bodyW - 3, bodyTop + 4, 4, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + bodyW - 2, bodyTop + 5, 2, 2);
    } else if (acc === 'watch') {
      ctx.fillStyle = '#888';
      ctx.fillRect(x + bodyW - 1, bodyTop + bodyW + 2, 3, 2);
    } else if (acc === 'scarf') {
      ctx.fillStyle = shade(shirtColor, 50);
      ctx.fillRect(x - 3, bodyTop, 6, 3);
      ctx.fillRect(x - 1, bodyTop + 3, 2, 5);
    } else if (acc === 'lanyard') {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 2, bodyTop);
      ctx.lineTo(x - 3, bodyTop + 10);
      ctx.moveTo(x + 2, bodyTop);
      ctx.lineTo(x + 3, bodyTop + 10);
      ctx.stroke();
      ctx.fillStyle = '#f5d76e';
      ctx.fillRect(x - 3, bodyTop + 10, 6, 4);
    }
  }

  function drawBubbles(state) {
    if (!state.ambient) return;
    for (const b of state.ambient.bubbles) {
      const alpha = Utils.clamp(b.life / 0.4, 0, 1) * Utils.clamp((b.maxLife - b.life) / 0.15, 0, 1);
      const maxW = 120;
      ctx.font = '10px monospace';
      const lines = wrapText(b.text, maxW);
      const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 12;
      const bh = lines.length * 12 + 10;
      const bx = Math.floor(b.x - bw / 2);
      const by = Math.floor(b.y - bh - 8);

      ctx.globalAlpha = 0.15 + alpha * 0.85;
      ctx.fillStyle = '#f4f7fb';
      roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = b.color || '#5eb1bf';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x - 4, by + bh);
      ctx.lineTo(b.x, by + bh + 6);
      ctx.lineTo(b.x + 4, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1a2030';
      ctx.font = '10px monospace';
      lines.forEach((line, i) => {
        ctx.fillText(line, bx + 6, by + 14 + i * 12);
      });
      ctx.globalAlpha = 1;
    }
  }

  function wrapText(text, maxW) {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { init, draw, updateCamera, screenToWorld, resize };
})();
