/* ========================================
   Amber's Farm — Pixel-art tile & entity sprites
   Stardew-inspired blocks (not flat rectangles)
   ======================================== */

const Sprites = (() => {
  const P = 2; // pixel size inside world (crisp 2×2 cells)

  // Stardew-ish palettes
  const PAL = {
    // Grass (spring default)
    g0: '#4f8f3e', g1: '#5da34a', g2: '#6fb85a', g3: '#3d7330', g4: '#8fd46a',
    // Fall grass
    f0: '#b8863a', f1: '#c99a4a', f2: '#d4a85c', f3: '#8a6428', f4: '#e8c070',
    // Winter
    w0: '#c8d4c8', w1: '#d8e0d8', w2: '#e8eee8', w3: '#a8b8a8', w4: '#f0f4f0',
    // Summer richer
    s0: '#3f8a32', s1: '#4e9e3f', s2: '#62b850', s3: '#2f6a24', s4: '#7ad060',
    // Path / cobble
    p0: '#c4b090', p1: '#d4c4a0', p2: '#a89070', p3: '#8a7458', p4: '#e8dcc0',
    // Dirt / soil
    d0: '#8b6914', d1: '#a07828', d2: '#b89040', d3: '#6b5010', d4: '#c4a050',
    dWet0: '#5a4010', dWet1: '#6b4e18', dWet2: '#7a5a20',
    // Water
    aq0: '#2e6a9e', aq1: '#3d82b8', aq2: '#4a96c8', aq3: '#1e4a72', aq4: '#7ec8e8',
    // Wood
    wd0: '#5c3a1e', wd1: '#7a4e28', wd2: '#9a6432', wd3: '#3d2410', wd4: '#c48848',
    // Roof terracotta
    rf0: '#a83828', rf1: '#c04830', rf2: '#d86040', rf3: '#782018',
    // Stone
    st0: '#7a7a7a', st1: '#989898', st2: '#b0b0b0', st3: '#5a5a5a', st4: '#d0d0d0',
    // Walls cream
    wh0: '#e8d8b8', wh1: '#f0e4c8', wh2: '#d0c098', wh3: '#c0a878',
    // Flowers
    pk: '#f070a0', ye: '#f0d040', or: '#f09040', pu: '#a060d0',
    // Leaves
    lf0: '#2d6b28', lf1: '#3d8a34', lf2: '#4ea040',
    // Skin / amber
    sk: '#f0c8a0', sk2: '#e0a878', hair: '#d4883a',
  };

  function hash(tx, ty) {
    let n = tx * 374761393 + ty * 668265263;
    n = (n ^ (n >>> 13)) * 1274126177;
    return (n >>> 0);
  }

  function px(ctx, x, y, col, s) {
    const sc = s || P;
    ctx.fillStyle = col;
    ctx.fillRect(Math.floor(x), Math.floor(y), sc, sc);
  }

  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  }

  function grassPalette(season) {
    if (season === 'fall') return [PAL.f0, PAL.f1, PAL.f2, PAL.f3, PAL.f4];
    if (season === 'winter') return [PAL.w0, PAL.w1, PAL.w2, PAL.w3, PAL.w4];
    if (season === 'summer') return [PAL.s0, PAL.s1, PAL.s2, PAL.s3, PAL.s4];
    return [PAL.g0, PAL.g1, PAL.g2, PAL.g3, PAL.g4];
  }

  /** Full grass tile with tufts & variation */
  function grass(ctx, x, y, T, tx, ty, season, time) {
    const g = grassPalette(season);
    const h = hash(tx, ty);
    // base fill with subtle 4-quadrant noise
    rect(ctx, x, y, T, T, g[1]);
    for (let i = 0; i < 28; i++) {
      const hx = hash(tx + i * 3, ty + i * 7);
      const px_ = x + (hx % (T - 2));
      const py_ = y + ((hx >>> 8) % (T - 2));
      const c = g[(hx >>> 16) % 3];
      px(ctx, px_, py_, c, 2);
    }
    // darker dirt flecks
    if ((h % 5) === 0) {
      px(ctx, x + 6 + (h % 8), y + 20, g[3], 2);
      px(ctx, x + 22, y + 12 + (h % 6), g[3], 2);
    }
    // grass tufts (small vertical blades)
    const tufts = 3 + (h % 3);
    for (let i = 0; i < tufts; i++) {
      const bx = x + 4 + ((h + i * 11) % (T - 10));
      const by = y + 10 + ((h + i * 5) % (T - 16));
      const sway = Math.sin(time * 2.2 + tx + i) > 0 ? 0 : 2;
      rect(ctx, bx + sway, by, 2, 8, g[3]);
      rect(ctx, bx + sway, by, 2, 4, g[4]);
      // side blade
      rect(ctx, bx + 2 + sway, by + 2, 2, 6, g[0]);
    }
    // light highlight dots
    if ((h % 4) === 1) {
      px(ctx, x + 30, y + 8, g[4], 2);
      px(ctx, x + 12, y + 28, g[4], 2);
    }
  }

  /** Cobblestone / dirt path */
  function path(ctx, x, y, T, tx, ty) {
    const h = hash(tx, ty);
    rect(ctx, x, y, T, T, PAL.p2);
    // stone blocks 8x8-ish
    const stones = [
      [2, 2, 16, 16], [18, 2, 18, 14], [2, 18, 14, 18], [16, 16, 20, 20],
    ];
    for (let i = 0; i < stones.length; i++) {
      const [sx, sy, sw, sh] = stones[i];
      const varc = ((h + i * 9) % 3);
      const c = [PAL.p1, PAL.p0, PAL.p4][varc];
      rect(ctx, x + sx, y + sy, sw - 2, sh - 2, c);
      // stone edge shadow
      rect(ctx, x + sx, y + sy + sh - 4, sw - 2, 2, PAL.p3);
      rect(ctx, x + sx + sw - 4, y + sy, 2, sh - 2, PAL.p3);
      // highlight
      rect(ctx, x + sx + 2, y + sy + 2, 4, 2, PAL.p4);
    }
    // pebbles
    px(ctx, x + 8 + (h % 5), y + 8, PAL.p3, 2);
    px(ctx, x + 28, y + 24 + (h % 4), PAL.st0, 2);
  }

  /** Farmable dirt / tilled / wet */
  function dirt(ctx, x, y, T, tx, ty, soil) {
    const h = hash(tx, ty);
    const tilled = soil && soil.tilled;
    const wet = soil && soil.watered;

    if (!tilled) {
      rect(ctx, x, y, T, T, PAL.d2);
      for (let i = 0; i < 18; i++) {
        const hx = hash(tx + i, ty * 3 + i);
        px(ctx, x + (hx % (T - 2)), y + ((hx >>> 6) % (T - 2)),
          [PAL.d1, PAL.d0, PAL.d4][(hx >>> 12) % 3], 2);
      }
      // small rocks
      if ((h % 3) === 0) {
        rect(ctx, x + 10, y + 14, 6, 4, PAL.st1);
        rect(ctx, x + 26, y + 22, 5, 4, PAL.st0);
      }
      return;
    }

    // Tilled furrows
    const base = wet ? PAL.dWet1 : PAL.d1;
    const dark = wet ? PAL.dWet0 : PAL.d0;
    const light = wet ? PAL.dWet2 : PAL.d2;
    rect(ctx, x, y, T, T, base);
    for (let row = 0; row < 5; row++) {
      const yy = y + 4 + row * 7;
      rect(ctx, x + 2, yy, T - 4, 3, dark);
      rect(ctx, x + 2, yy + 3, T - 4, 2, light);
    }
    // clods
    px(ctx, x + 6, y + 8, dark, 2);
    px(ctx, x + 20, y + 18, light, 2);
    px(ctx, x + 30, y + 10, dark, 2);
    if (wet) {
      // water sheen
      rect(ctx, x + 8, y + 6, 10, 2, 'rgba(120,180,220,0.35)');
      rect(ctx, x + 18, y + 20, 12, 2, 'rgba(120,180,220,0.3)');
    }
  }

  /** Water with shimmer */
  function water(ctx, x, y, T, tx, ty, time) {
    rect(ctx, x, y, T, T, PAL.aq3);
    // depth bands
    const phase = Math.floor(time * 3 + tx * 0.7 + ty * 0.5) % 4;
    for (let row = 0; row < T; row += 4) {
      const c = ((row / 4 + phase + tx) % 2 === 0) ? PAL.aq1 : PAL.aq0;
      rect(ctx, x, y + row, T, 4, c);
    }
    // lighter surface
    rect(ctx, x + 2, y + 2, T - 4, T - 4, 'rgba(80,160,210,0.25)');
    // sparkles
    const sp = Math.floor(time * 4 + tx + ty * 2) % 6;
    const sparks = [[8, 8], [24, 14], [14, 26], [28, 28], [6, 22], [20, 6]];
    const [sx, sy] = sparks[sp];
    rect(ctx, x + sx, y + sy, 4, 2, PAL.aq4);
    rect(ctx, x + sx + 8, y + sy + 6, 3, 2, 'rgba(200,240,255,0.7)');
  }

  /** Wood fence posts + rails */
  function fence(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // posts
    rect(ctx, x + 6, y + 6, 6, 28, PAL.wd0);
    rect(ctx, x + 28, y + 6, 6, 28, PAL.wd0);
    rect(ctx, x + 7, y + 6, 2, 10, PAL.wd2);
    rect(ctx, x + 29, y + 6, 2, 10, PAL.wd2);
    // rails
    rect(ctx, x + 4, y + 12, 32, 5, PAL.wd1);
    rect(ctx, x + 4, y + 24, 32, 5, PAL.wd1);
    rect(ctx, x + 4, y + 12, 32, 2, PAL.wd2);
    rect(ctx, x + 4, y + 24, 32, 2, PAL.wd2);
  }

  /** Tree: trunk + layered canopy (draws on grass base) */
  function tree(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // trunk
    rect(ctx, x + 16, y + 22, 8, 16, PAL.wd0);
    rect(ctx, x + 17, y + 22, 3, 12, PAL.wd2);
    // roots
    rect(ctx, x + 12, y + 34, 6, 4, PAL.wd1);
    rect(ctx, x + 22, y + 34, 6, 4, PAL.wd1);

    let c0 = PAL.lf0, c1 = PAL.lf1, c2 = PAL.lf2;
    if (season === 'fall') { c0 = '#a84818'; c1 = '#d06020'; c2 = '#e88830'; }
    if (season === 'winter') { c0 = '#6a7a80'; c1 = '#8a9aa0'; c2 = '#b0c0c4'; }
    if (season === 'spring') { c0 = '#2d7a38'; c1 = '#48a050'; c2 = '#70c868'; }

    // canopy blobs (pixel clusters)
    function canopy(cx, cy, r, col) {
      for (let dy = -r; dy <= r; dy += 2) {
        for (let dx = -r; dx <= r; dx += 2) {
          if (dx * dx + dy * dy <= r * r) {
            px(ctx, cx + dx, cy + dy, col, 2);
          }
        }
      }
    }
    canopy(x + 20, y + 14, 14, c0);
    canopy(x + 14, y + 16, 10, c1);
    canopy(x + 26, y + 16, 10, c1);
    canopy(x + 20, y + 10, 9, c2);
    // spring blossoms
    if (season === 'spring') {
      px(ctx, x + 12, y + 12, PAL.pk, 2);
      px(ctx, x + 28, y + 14, PAL.pk, 2);
      px(ctx, x + 18, y + 6, '#fff0f5', 2);
    }
    if (season === 'fall') {
      px(ctx, x + 10, y + 28, '#d06020', 2);
      px(ctx, x + 30, y + 30, '#e88830', 2);
    }
  }

  /** Boulder */
  function rock(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // shadow
    rect(ctx, x + 8, y + 28, 26, 8, 'rgba(0,0,0,0.2)');
    // main rock body (stepped pixels)
    const shape = [
      [10, 18, 20, 14],
      [8, 22, 24, 10],
      [12, 14, 16, 8],
      [14, 12, 12, 6],
    ];
    for (const [sx, sy, sw, sh] of shape) {
      rect(ctx, x + sx, y + sy, sw, sh, PAL.st1);
    }
    rect(ctx, x + 12, y + 14, 8, 6, PAL.st2);
    rect(ctx, x + 22, y + 20, 6, 4, PAL.st0);
    // cracks
    rect(ctx, x + 18, y + 18, 2, 10, PAL.st3);
    rect(ctx, x + 14, y + 24, 8, 2, PAL.st3);
    // highlight
    rect(ctx, x + 14, y + 14, 4, 2, PAL.st4);
  }

  /** Wildflowers */
  function flower(ctx, x, y, T, season, tx, ty, time, picked) {
    grass(ctx, x, y, T, tx, ty, season, time);
    if (picked) return;
    const h = hash(tx, ty);
    const colors = [PAL.pk, PAL.ye, PAL.or, PAL.pu, '#f0f0f0'];
    const n = 2 + (h % 3);
    for (let i = 0; i < n; i++) {
      const fx = x + 8 + ((h + i * 13) % 22);
      const fy = y + 14 + ((h + i * 7) % 14);
      const bob = Math.sin(time * 2 + i + tx) > 0 ? 0 : 1;
      // stem
      rect(ctx, fx + 2, fy + 4 + bob, 2, 10, PAL.lf1);
      // petals
      const col = colors[(h + i) % colors.length];
      px(ctx, fx, fy + bob, col, 2);
      px(ctx, fx + 4, fy + bob, col, 2);
      px(ctx, fx + 2, fy - 2 + bob, col, 2);
      px(ctx, fx + 2, fy + 2 + bob, PAL.ye, 2);
    }
  }

  /** Shipping bin */
  function bin(ctx, x, y, T, season, tx, ty) {
    path(ctx, x, y, T, tx, ty);
    // box
    rect(ctx, x + 6, y + 12, 28, 22, PAL.wd0);
    rect(ctx, x + 8, y + 14, 24, 16, PAL.wd1);
    // lid
    rect(ctx, x + 4, y + 8, 32, 8, PAL.wd2);
    rect(ctx, x + 4, y + 8, 32, 3, PAL.wd4);
    // slot
    rect(ctx, x + 12, y + 18, 16, 4, PAL.wd3);
    // metal latch
    rect(ctx, x + 18, y + 10, 4, 4, PAL.st2);
  }

  /** Shop stall */
  function shop(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // counter
    rect(ctx, x + 2, y + 22, 36, 14, PAL.wd1);
    rect(ctx, x + 2, y + 22, 36, 4, PAL.wd2);
    // awning stripes
    rect(ctx, x + 2, y + 8, 36, 14, PAL.rf1);
    for (let i = 0; i < 6; i++) {
      rect(ctx, x + 2 + i * 6, y + 8, 3, 14, i % 2 ? '#f0e8d0' : PAL.rf1);
    }
    // posts
    rect(ctx, x + 4, y + 8, 4, 28, PAL.wd0);
    rect(ctx, x + 32, y + 8, 4, 28, PAL.wd0);
    // goods dots
    px(ctx, x + 12, y + 26, PAL.ye, 2);
    px(ctx, x + 18, y + 28, PAL.pk, 2);
    px(ctx, x + 24, y + 26, PAL.or, 2);
  }

  /** Chicken coop */
  function coop(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // body
    rect(ctx, x + 4, y + 16, 32, 20, PAL.wh0);
    rect(ctx, x + 4, y + 16, 32, 4, PAL.wh1);
    // roof
    for (let i = 0; i < 8; i++) {
      const rw = 36 - i * 4;
      rect(ctx, x + 2 + i * 2, y + 14 - i * 2, rw, 3, i % 2 ? PAL.rf1 : PAL.rf0);
    }
    // door
    rect(ctx, x + 14, y + 24, 12, 12, PAL.wd1);
    rect(ctx, x + 16, y + 26, 8, 8, PAL.wd3);
    // window
    rect(ctx, x + 8, y + 22, 6, 6, '#7ec8e8');
    rect(ctx, x + 26, y + 22, 6, 6, '#7ec8e8');
  }

  /** Barn — wider home for cows, goats, sheep, pigs */
  function barn(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // body
    rect(ctx, x + 2, y + 16, 36, 20, PAL.wh0);
    rect(ctx, x + 2, y + 16, 36, 4, PAL.wh1);
    // roof
    for (let i = 0; i < 9; i++) {
      const rw = 40 - i * 4;
      rect(ctx, x + i * 2, y + 14 - i * 2, rw, 3, i % 2 ? PAL.rf1 : PAL.rf0);
    }
    // double doors
    rect(ctx, x + 8, y + 24, 12, 12, PAL.wd1);
    rect(ctx, x + 12, y + 26, 6, 8, PAL.wd3);
    rect(ctx, x + 22, y + 24, 12, 12, PAL.wd1);
    rect(ctx, x + 26, y + 26, 6, 8, PAL.wd3);
    // hay loft window
    rect(ctx, x + 18, y + 14, 8, 6, '#7ec8e8');
    rect(ctx, x + 20, y + 14, 4, 6, PAL.wd0);
  }

  /** Sell box — quick coins for unwanted items */
  function sellbox(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    // crate
    rect(ctx, x + 6, y + 14, 28, 20, PAL.wd0);
    rect(ctx, x + 6, y + 14, 28, 4, PAL.wd2);
    rect(ctx, x + 8, y + 18, 24, 8, PAL.wd1);
    // slot
    rect(ctx, x + 12, y + 24, 16, 6, PAL.wd3);
    // coin sign
    px(ctx, x + 26, y + 8, PAL.ye, 3);
    px(ctx, x + 24, y + 10, PAL.ye, 3);
    px(ctx, x + 28, y + 10, PAL.ye, 3);
  }

  /** Cottage footprint wall (under roof sprite) */
  function houseWall(ctx, x, y, T, tx, ty) {
    rect(ctx, x, y, T, T, PAL.wh0);
    // brick / plank lines
    for (let row = 0; row < T; row += 8) {
      rect(ctx, x, y + row, T, 1, PAL.wh2);
    }
    for (let col = 0; col < T; col += 10) {
      const off = ((ty + Math.floor(col / 10)) % 2) * 5;
      rect(ctx, x + col + off, y, 1, T, PAL.wh3);
    }
    // light edge
    rect(ctx, x, y, T, 2, PAL.wh1);
  }

  /** Door tile */
  function door(ctx, x, y, T) {
    rect(ctx, x, y, T, T, PAL.wh0);
    rect(ctx, x + 8, y + 4, 24, T - 4, PAL.wd1);
    rect(ctx, x + 10, y + 6, 20, T - 8, PAL.wd0);
    // panels
    rect(ctx, x + 12, y + 10, 7, 10, PAL.wd3);
    rect(ctx, x + 21, y + 10, 7, 10, PAL.wd3);
    rect(ctx, x + 12, y + 22, 7, 10, PAL.wd3);
    rect(ctx, x + 21, y + 22, 7, 10, PAL.wd3);
    // knob
    rect(ctx, x + 28, y + 22, 3, 3, PAL.ye);
  }

  /** Big cottage roof + walls spanning house footprint */
  function cottage(ctx, baseX, baseY, time) {
    const T = CONST.TILE;
    // walls already drawn as HOUSE tiles — add roof, chimney, windows decoration
    // Roof over 16-21 x, rows above house
    const roofX = baseX - 8;
    const roofY = baseY - 28;
    const roofW = 6 * T + 16;
    // layered roof
    for (let i = 0; i < 16; i++) {
      const inset = i * 2;
      const col = i < 2 ? PAL.rf2 : (i % 3 === 0 ? PAL.rf0 : PAL.rf1);
      rect(ctx, roofX + inset, roofY + i * 2, roofW - inset * 2, 3, col);
    }
    // chimney
    rect(ctx, baseX + 4.5 * T, baseY - 40, 14, 28, PAL.st1);
    rect(ctx, baseX + 4.5 * T - 2, baseY - 44, 18, 8, PAL.st0);
    // smoke puffs
    const sy = baseY - 50 - (time * 18 % 24);
    rect(ctx, baseX + 4.5 * T + 2, sy, 6, 6, 'rgba(200,200,200,0.45)');
    rect(ctx, baseX + 4.5 * T + 8, sy - 8, 8, 6, 'rgba(200,200,200,0.3)');
    // windows on wall area
    function window(wx, wy) {
      rect(ctx, wx, wy, 14, 14, PAL.wd0);
      rect(ctx, wx + 2, wy + 2, 10, 10, '#7ec8e8');
      rect(ctx, wx + 6, wy + 2, 2, 10, PAL.wd0);
      rect(ctx, wx + 2, wy + 6, 10, 2, PAL.wd0);
      rect(ctx, wx + 3, wy + 3, 3, 2, 'rgba(255,255,255,0.5)');
    }
    window(baseX + 12, baseY + 18);
    window(baseX + 4 * T + 8, baseY + 18);
    // porch roof strip
    rect(ctx, baseX + T - 4, baseY + 2.5 * T - 6, 2 * T + 8, 6, PAL.rf1);
  }

  /** Crop stages — pixel plant, not emoji */
  function crop(ctx, cx, cy, cropDef, stage, mature, quality, time) {
    if (!cropDef) return;
    const col = cropDef.color || '#e05040';
    const leaf = cropDef.leaf || PAL.lf1;

    if (stage <= 0) {
      // seed hole
      rect(ctx, cx - 2, cy + 4, 4, 3, PAL.d0);
      px(ctx, cx - 1, cy + 3, '#3d2810', 2);
      return;
    }

    // stem
    const h = mature ? 16 : 4 + stage * 4;
    const sway = Math.sin(time * 2.5 + cx * 0.1) > 0 ? 0 : 1;
    rect(ctx, cx - 1 + sway, cy + 8 - h, 3, h, leaf);

    if (!mature) {
      // leaves
      rect(ctx, cx - 6 + sway, cy + 6 - h / 2, 6, 3, leaf);
      rect(ctx, cx + 2 + sway, cy + 4 - h / 2, 6, 3, leaf);
      if (stage >= 2) {
        rect(ctx, cx - 3 + sway, cy + 2 - h, 6, 4, leaf);
      }
      return;
    }

    // Mature produce
    const id = cropDef.id;
    if (id === 'corn') {
      rect(ctx, cx - 2 + sway, cy - 14, 5, 14, leaf);
      rect(ctx, cx - 3 + sway, cy - 12, 7, 10, col);
      rect(ctx, cx - 2 + sway, cy - 14, 5, 3, '#f0e060');
    } else if (id === 'blueberry') {
      for (let i = 0; i < 5; i++) {
        px(ctx, cx - 6 + i * 3 + sway, cy - 4 - (i % 2) * 3, col, 3);
      }
      rect(ctx, cx - 4 + sway, cy - 2, 10, 6, leaf);
    } else if (id === 'tomato') {
      rect(ctx, cx - 5 + sway, cy - 2, 10, 8, leaf);
      px(ctx, cx - 4 + sway, cy - 4, col, 5);
      px(ctx, cx + 1 + sway, cy - 2, col, 5);
    } else if (id === 'melon') {
      rect(ctx, cx - 8 + sway, cy - 2, 16, 12, col);
      rect(ctx, cx - 6 + sway, cy, 12, 8, '#6aaa50');
      rect(ctx, cx - 2 + sway, cy + 2, 4, 6, '#2d6b28');
    } else if (id === 'potato') {
      rect(ctx, cx - 5 + sway, cy + 2, 10, 6, leaf);
      px(ctx, cx - 4 + sway, cy + 6, col, 4);
      px(ctx, cx + 1 + sway, cy + 5, col, 4);
    } else if (id === 'pumpkin') {
      rect(ctx, cx - 8 + sway, cy, 16, 12, col);
      rect(ctx, cx - 2 + sway, cy - 4, 4, 5, leaf);
      px(ctx, cx - 1 + sway, cy + 4, '#d35400', 3);
    } else if (id === 'cranberry') {
      rect(ctx, cx - 5 + sway, cy + 2, 10, 5, leaf);
      px(ctx, cx - 4 + sway, cy, col, 3);
      px(ctx, cx + 1 + sway, cy - 1, col, 3);
      px(ctx, cx - 1 + sway, cy + 2, col, 3);
    } else if (id === 'winter_root') {
      rect(ctx, cx - 3 + sway, cy + 2, 6, 4, leaf);
      rect(ctx, cx - 2 + sway, cy + 5, 4, 8, col);
    } else {
      // radish default
      rect(ctx, cx - 4 + sway, cy + 2, 8, 5, leaf);
      rect(ctx, cx - 3 + sway, cy + 4, 6, 8, col);
      rect(ctx, cx - 2 + sway, cy + 10, 4, 3, '#f0a090');
    }

    if (quality > 0) {
      // star sparkle
      const sc = quality >= 2 ? '#ffd700' : '#ffeaa0';
      px(ctx, cx + 8, cy - 12, sc, 2);
      px(ctx, cx + 10, cy - 14, sc, 2);
    }
  }

  /**
   * Amber — fox-eared farmer (clearer 16×-style pixel hero)
   * Anchor: feet at (p.x, p.y)
   */
  function player(ctx, p, time) {
    const outfit = CONST.OUTFITS[p.outfit] || CONST.OUTFITS.amber;
    const walk = p.moving ? Math.floor(p.anim * 1.2) % 4 : 0;
    const bob = p.moving ? (walk === 1 || walk === 3 ? 1 : 0) : 0;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y) + bob;
    const dir = p.dir || 'down';
    const skin = '#ffd2a8';
    const skinShade = '#e8b080';
    const hair = '#e8941a';
    const hairDark = '#c07018';
    const overall = '#3d6ab0';
    const overallDark = '#2a4a80';
    const boot = '#3a2418';

    // Soft oval shadow
    ctx.fillStyle = 'rgba(20,12,8,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walk cycle leg offsets
    const L = (walk === 1) ? 2 : (walk === 3) ? -1 : 0;
    const R = (walk === 3) ? 2 : (walk === 1) ? -1 : 0;

    // --- Legs / boots (drawn first) ---
    if (dir !== 'up') {
      rect(ctx, x - 5, y - 2 + L, 4, 7, overallDark);
      rect(ctx, x + 1, y - 2 + R, 4, 7, overallDark);
      rect(ctx, x - 5, y + 4 + L, 4, 3, boot);
      rect(ctx, x + 1, y + 4 + R, 4, 3, boot);
    } else {
      rect(ctx, x - 5, y - 2 + L, 4, 7, overallDark);
      rect(ctx, x + 1, y - 2 + R, 4, 7, overallDark);
      rect(ctx, x - 5, y + 4 + L, 4, 3, boot);
      rect(ctx, x + 1, y + 4 + R, 4, 3, boot);
    }

    // --- Torso / overalls ---
    rect(ctx, x - 7, y - 12, 14, 11, outfit.shirt);
    // overall bib
    rect(ctx, x - 6, y - 8, 12, 8, overall);
    rect(ctx, x - 5, y - 11, 3, 5, overall); // left strap
    rect(ctx, x + 2, y - 11, 3, 5, overall); // right strap
    // pocket
    rect(ctx, x - 3, y - 4, 6, 3, overallDark);
    // scarf / bandana
    rect(ctx, x - 7, y - 12, 14, 3, outfit.scarf);
    rect(ctx, x + 5, y - 10, 3, 5, outfit.scarf); // scarf tail

    // --- Arms + held tool ---
    const tool = (typeof Game !== 'undefined' && Game.state && Game.state.hotbar)
      ? Game.state.hotbar[Game.state.selectedSlot]
      : null;
    drawArmsAndTool(ctx, x, y, dir, outfit.shirt, skin, tool, walk);

    // --- Head ---
    if (dir === 'up') {
      // back of head
      rect(ctx, x - 6, y - 22, 12, 11, hair);
      rect(ctx, x - 7, y - 20, 2, 7, hairDark);
      rect(ctx, x + 5, y - 20, 2, 7, hairDark);
    } else {
      // face
      rect(ctx, x - 6, y - 22, 12, 11, skin);
      rect(ctx, x - 6, y - 13, 12, 2, skinShade); // chin shade
      // blush
      if (dir === 'down') {
        rect(ctx, x - 5, y - 16, 2, 2, '#f0a0a0');
        rect(ctx, x + 3, y - 16, 2, 2, '#f0a0a0');
      }
      // hair bangs / sides
      rect(ctx, x - 6, y - 24, 12, 4, hair);
      rect(ctx, x - 7, y - 22, 2, 8, hair);
      rect(ctx, x + 5, y - 22, 2, 8, hair);
      // side locks
      rect(ctx, x - 8, y - 18, 2, 6, hairDark);
      rect(ctx, x + 6, y - 18, 2, 6, hairDark);
    }

    // Fox ears (always on top of hair)
    // left ear
    rect(ctx, x - 7, y - 29, 5, 6, hair);
    rect(ctx, x - 6, y - 28, 3, 4, PAL.pk);
    // right ear
    rect(ctx, x + 2, y - 29, 5, 6, hair);
    rect(ctx, x + 3, y - 28, 3, 4, PAL.pk);
    // ear tips darker
    rect(ctx, x - 6, y - 30, 3, 2, hairDark);
    rect(ctx, x + 3, y - 30, 3, 2, hairDark);

    // Straw hat (sits between ears)
    rect(ctx, x - 8, y - 25, 16, 3, outfit.hat); // brim
    rect(ctx, x - 5, y - 28, 10, 4, outfit.hat); // crown
    rect(ctx, x - 5, y - 25, 10, 2, outfit.scarf); // ribbon band

    // Eyes / mouth by facing
    if (dir === 'down') {
      rect(ctx, x - 3, y - 19, 2, 2, '#2a1810');
      rect(ctx, x + 2, y - 19, 2, 2, '#2a1810');
      // eye shine
      px(ctx, x - 3, y - 19, '#fff8f0', 1);
      px(ctx, x + 2, y - 19, '#fff8f0', 1);
      // smile
      rect(ctx, x - 1, y - 15, 3, 1, '#e07070');
      // freckles
      px(ctx, x - 4, y - 17, '#e8a080', 1);
      px(ctx, x + 4, y - 17, '#e8a080', 1);
    } else if (dir === 'left') {
      rect(ctx, x - 4, y - 19, 2, 2, '#2a1810');
      px(ctx, x - 4, y - 19, '#fff8f0', 1);
      rect(ctx, x - 3, y - 15, 2, 1, '#e07070');
    } else if (dir === 'right') {
      rect(ctx, x + 2, y - 19, 2, 2, '#2a1810');
      px(ctx, x + 3, y - 19, '#fff8f0', 1);
      rect(ctx, x + 1, y - 15, 2, 1, '#e07070');
    }
    // up: no face
  }

  function drawArmsAndTool(ctx, x, y, dir, shirt, skin, tool, walk) {
    const armY = y - 10;
    // arms
    if (dir === 'down' || dir === 'up') {
      rect(ctx, x - 9, armY, 3, 7, shirt);
      rect(ctx, x + 6, armY, 3, 7, shirt);
      rect(ctx, x - 9, armY + 6, 3, 3, skin);
      rect(ctx, x + 6, armY + 6, 3, 3, skin);
      // tool in right hand when facing down
      if (dir === 'down' && tool) drawTool(ctx, x + 9, y - 6, tool, 1);
    } else if (dir === 'left') {
      rect(ctx, x - 9, armY + (walk % 2), 3, 7, shirt);
      rect(ctx, x - 9, armY + 6 + (walk % 2), 3, 3, skin);
      if (tool) drawTool(ctx, x - 12, y - 8, tool, -1);
    } else if (dir === 'right') {
      rect(ctx, x + 6, armY + (walk % 2), 3, 7, shirt);
      rect(ctx, x + 6, armY + 6 + (walk % 2), 3, 3, skin);
      if (tool) drawTool(ctx, x + 10, y - 8, tool, 1);
    }
  }

  function drawTool(ctx, tx, ty, tool, flip) {
    if (!tool) return;
    const f = flip || 1;
    if (tool.type === 'hoe') {
      rect(ctx, tx, ty - 8, 2, 12, '#8b5a2b');
      rect(ctx, tx - 3 * f, ty - 10, 8, 3, '#989898');
    } else if (tool.type === 'water') {
      rect(ctx, tx - 1, ty - 2, 5, 6, '#4a90d9');
      rect(ctx, tx, ty - 6, 2, 5, '#8b5a2b');
      px(ctx, tx + 5, ty, '#7ec8e3', 2);
    } else if (tool.type === 'seed') {
      rect(ctx, tx, ty, 4, 5, '#c48a4a');
      px(ctx, tx + 1, ty + 1, '#6fb85a', 2);
    } else if (tool.type === 'basket') {
      rect(ctx, tx - 1, ty, 7, 5, '#c48a4a');
      rect(ctx, tx, ty - 2, 5, 2, '#8b5a2b');
    } else if (tool.type === 'hand') {
      // empty hand
    } else if (tool.type === 'decor') {
      px(ctx, tx, ty, '#f070a0', 3);
    }
  }

  /** Interior floor / wall / furniture */
  function floorTile(ctx, x, y, T, tx, ty) {
    rect(ctx, x, y, T, T, '#d4b888');
    const h = hash(tx, ty);
    // wood planks horizontal
    for (let row = 0; row < T; row += 10) {
      rect(ctx, x, y + row, T, 1, '#b89868');
      const seam = 8 + (h + row) % 20;
      rect(ctx, x + seam, y + row, 1, 10, '#c4a878');
    }
    // grain
    px(ctx, x + 6, y + 4, '#c4a070', 2);
    px(ctx, x + 24, y + 18, '#c4a070', 2);
  }

  function wallTile(ctx, x, y, T) {
    rect(ctx, x, y, T, T, '#8b5a2b');
    for (let row = 0; row < T; row += 8) {
      rect(ctx, x, y + row, T, 1, '#6b4018');
      for (let col = 0; col < T; col += 12) {
        rect(ctx, x + col + (row % 16 === 0 ? 0 : 6), y + row, 1, 8, '#7a4a22');
      }
    }
    rect(ctx, x, y + T - 4, T, 4, '#5c3a1e');
  }

  function bed(ctx, x, y, T) {
    floorTile(ctx, x, y, T, 0, 0);
    rect(ctx, x + 4, y + 8, T - 8, T - 12, '#4a7ab0');
    rect(ctx, x + 4, y + 8, T - 8, 6, '#e8e0d0');
    rect(ctx, x + 6, y + 10, 10, 4, '#f0e8e0');
    // blanket fold
    rect(ctx, x + 4, y + 18, T - 8, 4, '#3a6a9a');
    // pillow
    rect(ctx, x + 6, y + 6, 12, 6, '#fff8f0');
  }

  function kitchen(ctx, x, y, T) {
    floorTile(ctx, x, y, T, 1, 1);
    // counter
    rect(ctx, x + 2, y + 14, T - 4, 20, '#a0a8b0');
    rect(ctx, x + 2, y + 14, T - 4, 4, '#c0c8d0');
    // stove
    rect(ctx, x + 8, y + 18, 16, 12, '#3a3a40');
    rect(ctx, x + 10, y + 20, 5, 5, '#e05030');
    rect(ctx, x + 17, y + 20, 5, 5, '#e05030');
    // pot
    rect(ctx, x + 12, y + 10, 10, 8, '#4a4a50');
    rect(ctx, x + 14, y + 8, 6, 4, '#6a6a70');
  }

  function wardrobe(ctx, x, y, T) {
    floorTile(ctx, x, y, T, 2, 2);
    rect(ctx, x + 6, y + 4, T - 12, T - 8, PAL.wd0);
    rect(ctx, x + 8, y + 6, T - 16, T - 14, PAL.wd1);
    // doors
    rect(ctx, x + 10, y + 8, 8, 22, PAL.wd2);
    rect(ctx, x + 20, y + 8, 8, 22, PAL.wd2);
    px(ctx, x + 16, y + 18, PAL.ye, 2);
    px(ctx, x + 20, y + 18, PAL.ye, 2);
  }

  function board(ctx, x, y, T, season, tx, ty) {
    path(ctx, x, y, T, tx, ty);
    // post
    rect(ctx, x + 18, y + 10, 4, 26, PAL.wd0);
    // paper
    rect(ctx, x + 8, y + 6, 24, 22, '#f5ecd0');
    rect(ctx, x + 8, y + 6, 24, 22, 'rgba(0,0,0,0)');
    rect(ctx, x + 10, y + 10, 20, 2, '#c0a878');
    rect(ctx, x + 10, y + 16, 16, 2, '#c0a878');
    rect(ctx, x + 10, y + 22, 12, 2, '#c0a878');
    // pushpin
    px(ctx, x + 18, y + 6, '#e04040', 2);
  }

  /** Gem node — chip me! */
  function gemNode(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 6, y + 14, 26, 16, '#8a8a8a');
    rect(ctx, x + 8, y + 12, 22, 4, '#a9a9a9');
    rect(ctx, x + 6, y + 14, 4, 16, '#6e6e6e');
    rect(ctx, x + 28, y + 14, 4, 16, '#6e6e6e');
    rect(ctx, x + 12, y + 18, 10, 8, '#7ec8e8');
    px(ctx, x + 14, y + 20, '#e8f4ff', 2);
  }

  /** Crystal — sparkly pick */
  function crystal(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 12, y + 18, 10, 12, '#9a6ae0');
    rect(ctx, x + 12, y + 18, 5, 12, '#b48cf0');
    rect(ctx, x + 6, y + 24, 6, 6, '#7a4ac0');
    rect(ctx, x + 20, y + 22, 7, 8, '#7a4ac0');
    rect(ctx, x + 14, y + 10, 5, 8, '#c4a8f8');
    px(ctx, x + 14, y + 8, '#fff', 2);
  }

  /** Geode — cracked stone on the ground */
  function geode(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 8, y + 18, 20, 14, '#9c8a78');
    rect(ctx, x + 9, y + 16, 16, 4, '#b8a894');
    rect(ctx, x + 8, y + 18, 4, 14, '#7c6a58');
    rect(ctx, x + 20, y + 18, 1, 5, '#5c4a38');
    rect(ctx, x + 18, y + 22, 6, 1, '#5c4a38');
    px(ctx, x + 20, y + 17, '#7ec8e8', 2);
  }

  /** Crack bench — geode anvil */
  function crackBench(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 8, y + 16, 18, 12, '#6e6e6e');
    rect(ctx, x + 10, y + 14, 14, 4, '#8a8a8a');
    rect(ctx, x + 13, y + 28, 8, 4, '#555');
    rect(ctx, x + 13, y + 10, 8, 6, '#9c8a78');
    px(ctx, x + 17, y + 10, '#7ec8e8', 2);
    rect(ctx, x + 22, y + 22, 6, 10, '#7a4e28');
  }

  /** Fountain */
  function fountain(ctx, x, y, T) {
    rect(ctx, x + 2, y + 8, 28, 20, '#9c9c9c');
    rect(ctx, x + 2, y + 8, 28, 4, '#b8b8b8');
    rect(ctx, x + 6, y + 12, 20, 12, '#4a9ad6');
    rect(ctx, x + 8, y + 14, 16, 8, '#6ab8e8');
    px(ctx, x + 14, y + 5, '#b8dff0', 2);
    px(ctx, x + 18, y + 3, '#b8dff0', 2);
    rect(ctx, x + 4, y + 28, 24, 4, '#7c7c7c');
  }

  /** Postbox */
  function postbox(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 12, y + 10, 8, 24, '#b84030');
    rect(ctx, x + 10, y + 16, 12, 10, '#d05848');
    rect(ctx, x + 10, y + 16, 12, 2, '#e87868');
    rect(ctx, x + 8, y + 26, 16, 4, '#8a2a20');
    rect(ctx, x + 14, y + 12, 4, 4, '#3d2410');
    px(ctx, x + 16, y + 6, '#f0d040', 2);
  }

  /** Market stall */
  function stall(ctx, x, y, T) {
    rect(ctx, x + 2, y + 14, 28, 16, '#7a4e28');
    rect(ctx, x + 2, y + 14, 28, 4, '#9a6432');
    rect(ctx, x, y + 4, 32, 8, '#e87868');
    for (let i = 0; i < 4; i++) rect(ctx, x + i * 8, y + 4, 4, 8, '#f0a090');
    rect(ctx, x + 6, y + 20, 6, 6, '#f0c870');
    rect(ctx, x + 20, y + 20, 6, 6, '#d0a050');
    rect(ctx, x + 13, y + 22, 6, 4, '#8a6a3a');
  }

  /** Bench */
  function bench(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 4, y + 22, 24, 4, '#9a6432');
    rect(ctx, x + 6, y + 26, 4, 6, '#7a4e28');
    rect(ctx, x + 22, y + 26, 4, 6, '#7a4e28');
    rect(ctx, x + 4, y + 18, 24, 4, '#b87a3a');
    rect(ctx, x + 2, y + 16, 28, 2, '#c89050');
  }

  /** Lamp post */
  function lamp(ctx, x, y, T, season, tx, ty) {
    grass(ctx, x, y, T, tx, ty, season, 0);
    rect(ctx, x + 14, y + 12, 4, 22, '#3d3d3d');
    rect(ctx, x + 10, y + 10, 12, 6, '#ffd970');
    rect(ctx, x + 12, y + 12, 8, 2, '#ffe9a0');
    rect(ctx, x + 12, y + 8, 8, 2, '#3d3d3d');
    rect(ctx, x + 10, y + 32, 12, 2, '#555');
  }

  /** Cave floor */
  function cave(ctx, x, y, T) {
    rect(ctx, x, y, T, T, '#3a3040');
    rect(ctx, x, y, T, 4, '#2a2430');
    px(ctx, x + 6, y + 8, '#4a4050', 2);
    px(ctx, x + 18, y + 14, '#4a4050', 2);
    px(ctx, x + 10, y + 24, '#4a4050', 2);
    px(ctx, x + 24, y + 26, '#4a4050', 2);
  }

  return {
    PAL, grass, path, dirt, water, fence, tree, rock, flower,
    bin, shop, coop, barn, sellbox, houseWall, door, cottage, crop, player,
    floorTile, wallTile, bed, kitchen, wardrobe, board,
    gemNode, crystal, geode, crackBench, fountain, postbox, stall, bench, lamp, cave,
  };
})();
