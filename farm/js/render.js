/* ========================================
   Amber's Farm — Beautiful Canvas Renderer
   ======================================== */

const Render = (() => {
  let canvas, ctx;
  let skyCanvas, skyCtx;

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    canvas.width = CONST.VIEW_W;
    canvas.height = CONST.VIEW_H;
    // Crisp pixel art — no blur
    ctx.imageSmoothingEnabled = false;
    skyCanvas = document.createElement('canvas');
    skyCanvas.width = CONST.VIEW_W;
    skyCanvas.height = CONST.VIEW_H;
    skyCtx = skyCanvas.getContext('2d');
    if (typeof Atlas !== 'undefined') Atlas.init();
  }

  function draw(state, time) {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.scene === 'title') {
      drawTitleBg(time);
      Particles.drawScreen(ctx);
      return;
    }

    // Camera
    const cam = state.camera;
    ctx.save();

    // Sky / backdrop strip
    drawSky(state, time);

    ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));

    if (state.scene === 'interior') {
      drawInterior(state, time);
    } else if (state.scene === 'forest' || state.scene === 'outdoor' || state.scene === 'beach' ||
      state.scene === 'mountain' || state.scene === 'village') {
      drawOutdoor(state, time);
    }

    // Target tile highlight
    if (state.scene !== 'title') drawTargetHighlight(state, time);

    // Y-sorted entities
    if (state.scene === 'outdoor') {
      Decor.draw(ctx, state);
      drawYSortedEntities(state, time);
    } else if (state.scene === 'forest' || state.scene === 'beach' || state.scene === 'interior' ||
      state.scene === 'mountain' || state.scene === 'village') {
      if (typeof Sprites !== 'undefined') Sprites.player(ctx, state.player, time);
      else Player.draw(ctx, state.player, time);
    }

    // Tall furniture overlaps the player inside the cottage
    if (state.scene === 'interior' && typeof Home !== 'undefined') Home.draw(ctx, state, true);

    // World-space particles
    Particles.drawWorld(ctx);

    ctx.restore();

    // Lighting overlay
    const tint = TimeSys.lightTint(state.period, state.weather);
    if (tint && tint !== 'rgba(255,255,255,0.0)') {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Interior coziness: warm glow in the evening + fireplace light
    if (state.scene === 'interior' && state.period === 'evening') {
      ctx.fillStyle = 'rgba(255,170,60,0.10)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (typeof Home !== 'undefined' && state.homeDecor) {
        for (const key of Object.keys(state.homeDecor)) {
          const h = state.homeDecor[key];
          if (h.id !== 'fireplace') continue;
          const cx = h.tx * CONST.TILE + 16 - Math.floor(cam.x);
          const cy = h.ty * CONST.TILE + 10 - Math.floor(cam.y);
          const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90);
          g.addColorStop(0, 'rgba(255,170,60,0.35)');
          g.addColorStop(1, 'rgba(255,170,60,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 90, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }

    // Evening window glow on cottage
    if (state.scene === 'outdoor' && state.period === 'evening') {
      ctx.save();
      ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));
      ctx.fillStyle = 'rgba(255,200,80,0.35)';
      ctx.shadowColor = '#FFB347';
      ctx.shadowBlur = 20;
      ctx.fillRect(17.2 * CONST.TILE, 5.2 * CONST.TILE, 14, 14);
      ctx.fillRect(19.5 * CONST.TILE, 5.2 * CONST.TILE, 14, 14);
      ctx.restore();
    }

    // Screen-space particles (rain, confetti, sleep stars)
    Particles.drawScreen(ctx);

    // Minimap off by default — Stardew HUD uses clock panel instead
    // if (state.scene === 'outdoor') drawMinimapScreen(state);

    // Sleep flash
    if (state.sleepFlash > 0) {
      ctx.fillStyle = `rgba(255,200,120,${state.sleepFlash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawMinimapScreen(state) {
    const mw = 110, mh = 80;
    const mx = canvas.width - mw - 12;
    const my = canvas.height - mh - 90;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = 'rgba(255,248,240,0.9)';
    ctx.strokeStyle = 'rgba(232,148,26,0.7)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, mx, my, mw, mh, 8);
    ctx.fill();
    ctx.stroke();

    const sx = mw / CONST.MAP_W;
    const sy = mh / CONST.MAP_H;
    // Dirt plots
    ctx.fillStyle = '#C4A574';
    for (let ty = 0; ty < CONST.MAP_H; ty++) {
      for (let tx = 0; tx < CONST.MAP_W; tx++) {
        const t = World.getTile(state, tx, ty);
        if (t === TILE.DIRT) {
          ctx.fillStyle = '#C4A574';
          ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        } else if (t === TILE.WATER) {
          ctx.fillStyle = '#5BA3D9';
          ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        } else if (t === TILE.HOUSE || t === TILE.DOOR) {
          ctx.fillStyle = '#E07A5F';
          ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        } else if (t === TILE.PATH) {
          ctx.fillStyle = '#D4C4A8';
          ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        }
      }
    }
    // Player
    ctx.fillStyle = '#FFB347';
    const px = state.player.x / CONST.TILE;
    const py = state.player.y / CONST.TILE;
    ctx.beginPath();
    ctx.arc(mx + px * sx, my + py * sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky(state, time) {
    const period = state.period;
    let g;
    if (state.weather === 'rain') {
      g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#6B7B8A');
      g.addColorStop(1, '#A8B8C8');
    } else if (period === 'morning') {
      g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#FFD4A8');
      g.addColorStop(0.5, '#87CEEB');
      g.addColorStop(1, '#B8E0A8');
    } else if (period === 'evening') {
      g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#FF8C42');
      g.addColorStop(0.4, '#FFB347');
      g.addColorStop(1, '#7BC67E');
    } else {
      g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#5BA3D9');
      g.addColorStop(0.55, '#87CEEB');
      g.addColorStop(1, '#8FCB8A');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft clouds (Iteration 2)
    if (state.weather !== 'rain') {
      drawClouds(time, period);
    }

    // Soft sun / moon
    if (state.weather !== 'rain') {
      if (period === 'evening') {
        ctx.fillStyle = 'rgba(255,180,80,0.85)';
        ctx.beginPath();
        ctx.arc(canvas.width - 120, 80, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,100,0.2)';
        ctx.beginPath();
        ctx.arc(canvas.width - 120, 80, 55, 0, Math.PI * 2);
        ctx.fill();
      } else if (period === 'morning') {
        ctx.fillStyle = 'rgba(255,230,150,0.9)';
        ctx.beginPath();
        ctx.arc(100, 90, 28, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,250,200,0.95)';
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 70, 32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawClouds(time, period) {
    const alpha = period === 'evening' ? 0.35 : 0.5;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < 5; i++) {
      const x = ((time * 8 + i * 200) % (canvas.width + 120)) - 60;
      const y = 40 + i * 18 + Math.sin(time * 0.5 + i) * 6;
      cloud(x, y, 28 + i * 3);
    }
  }

  function cloud(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.arc(x + r * 0.5, y - r * 0.15, r * 0.45, 0, Math.PI * 2);
    ctx.arc(x + r * 0.95, y, r * 0.5, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y + r * 0.15, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawYSortedEntities(state, time) {
    const entities = [];
    for (const a of state.animals || []) {
      entities.push({ y: a.y, type: 'animal', ref: a });
    }
    for (const id of Object.keys(NPCS || {})) {
      const n = NPCS[id];
      if ((n.scene || 'outdoor') !== state.scene) continue;
      entities.push({
        y: (n.ty + 0.5) * CONST.TILE + 12,
        type: 'npc',
        ref: id,
      });
    }
    entities.push({ y: state.player.y + 12, type: 'player', ref: state.player });
    entities.sort((a, b) => a.y - b.y);

    for (const e of entities) {
      if (e.type === 'player') {
        if (typeof Sprites !== 'undefined') Sprites.player(ctx, state.player, time);
        else Player.draw(ctx, state.player, time);
      } else if (e.type === 'animal') {
        Animals.drawOne(ctx, e.ref, time);
      } else if (e.type === 'npc') {
        NPC.drawOne(ctx, state, e.ref, time);
      }
    }
  }

  function drawTargetHighlight(state, time) {
    const { tx, ty } = World.facingTile(state);
    const x = tx * CONST.TILE;
    const y = ty * CONST.TILE;
    const on = Math.sin(time * 5) > 0;
    // Pixel-corner brackets (Stardew-like selection)
    ctx.fillStyle = on ? '#ffe566' : '#c9a227';
    const s = 6, t = 2;
    // TL
    ctx.fillRect(x, y, s, t); ctx.fillRect(x, y, t, s);
    // TR
    ctx.fillRect(x + CONST.TILE - s, y, s, t); ctx.fillRect(x + CONST.TILE - t, y, t, s);
    // BL
    ctx.fillRect(x, y + CONST.TILE - t, s, t); ctx.fillRect(x, y + CONST.TILE - s, t, s);
    // BR
    ctx.fillRect(x + CONST.TILE - s, y + CONST.TILE - t, s, t);
    ctx.fillRect(x + CONST.TILE - t, y + CONST.TILE - s, t, s);

    // Tutorial: soft gold outline on starter plots
    if (!state.tutorialDone && state.tutorialStep >= 1 && state.tutorialStep <= 3 && state.scene === 'outdoor') {
      ctx.fillStyle = 'rgba(255, 220, 80, 0.12)';
      for (let fy = 10; fy <= 15; fy++) {
        for (let fx = 8; fx <= 13; fx++) {
          ctx.fillRect(fx * CONST.TILE, fy * CONST.TILE, CONST.TILE, CONST.TILE);
        }
      }
    }
  }

  function drawMinimap(state, cam) {
    // Drawn in world space at end — better as screen overlay
    // Store flag; actual draw after restore in draw()
    state._drawMini = true;
  }

  function drawTitleBg(time) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#87CEEB');
    g.addColorStop(0.35, '#FFD4A8');
    g.addColorStop(0.55, '#FFE0B2');
    g.addColorStop(0.72, '#7BC67E');
    g.addColorStop(1, '#5AA65E');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun glow
    ctx.fillStyle = 'rgba(255,200,80,0.9)';
    ctx.beginPath();
    ctx.arc(canvas.width - 140, 100, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,150,0.35)';
    ctx.beginPath();
    ctx.arc(canvas.width - 140, 100, 80, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    cloud((time * 12) % (canvas.width + 100) - 50, 70, 36);
    cloud((time * 8 + 300) % (canvas.width + 100) - 50, 110, 28);

    // Distant hills
    ctx.fillStyle = '#8FCB8A';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    for (let x = 0; x <= canvas.width; x += 16) {
      ctx.lineTo(x, 280 + Math.sin(x * 0.008 + time * 0.2) * 14);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    ctx.fillStyle = '#6BB86E';
    ctx.beginPath();
    ctx.moveTo(0, 340);
    for (let x = 0; x <= canvas.width; x += 14) {
      ctx.lineTo(x, 320 + Math.sin(x * 0.012 + time * 0.35) * 10);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    ctx.fillStyle = '#5AA65E';
    ctx.beginPath();
    ctx.moveTo(0, 400);
    for (let x = 0; x <= canvas.width; x += 12) {
      ctx.lineTo(x, 380 + Math.sin(x * 0.018 + time * 0.5) * 7);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    // Flower dots on foreground hill
    for (let i = 0; i < 18; i++) {
      const fx = (i * 57 + time * 5) % canvas.width;
      const fy = 420 + Math.sin(i + time) * 8;
      ctx.font = '14px serif';
      ctx.fillText(['🌸', '🌼', '🌷'][i % 3], fx, fy);
    }

    // Cottage
    drawCottageSprite(ctx, canvas.width / 2 - 100, 250, 1.15, time);
  }

  function drawOutdoor(state, time) {
    const season = TimeSys.seasonName(state);
    if (typeof Atlas !== 'undefined') Atlas.update(0);

    const dims = World.mapDims(state);
    const cam = state.camera;
    const T = CONST.TILE;
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const x1 = Math.min(dims.w - 1, Math.ceil((cam.x + CONST.VIEW_W) / T) + 1);
    const y1 = Math.min(dims.h - 1, Math.ceil((cam.y + CONST.VIEW_H) / T) + 1);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (typeof Atlas !== 'undefined' && Atlas.ready()) {
          Atlas.drawGroundTile(ctx, state, tx, ty, season);
        } else {
          drawTileFallback(state, tx, ty, time, season);
        }
        // Gentle sparkle glints on water (ambient life)
        const t = World.getTile(state, tx, ty);
        if (t === TILE.WATER && ((tx * 7 + ty * 13 + Math.floor(time * 3)) % 41 === 0)) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(tx * CONST.TILE + 8 + ((tx * 5) % 14), ty * CONST.TILE + 6 + ((ty * 9) % 16), 2, 2);
        }
      }
    }

    // Crops only on farm
    if (state.scene === 'outdoor') {
      for (const k of Object.keys(state.soil)) {
        const s = state.soil[k];
        if (s.tx < x0 || s.tx > x1 || s.ty < y0 || s.ty > y1) continue;
        drawSoilCrop(s, time);
      }
      if (typeof Atlas !== 'undefined') Atlas.drawCottageRoof(ctx, time);
      else if (typeof Sprites !== 'undefined') Sprites.cottage(ctx, 16 * T, 4 * T, time);
    }
  }

  function drawInterior(state, time) {
    const { tiles, w, h } = state.interior;
    // Cottage map is smaller than the canvas — fill the rest of the viewport
    // with a cozy wall tone so sky never bleeds around the room.
    const bg = ctx.createLinearGradient(0, 0, 0, CONST.VIEW_H);
    bg.addColorStop(0, '#7B5A3E');
    bg.addColorStop(1, '#5A3D26');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CONST.VIEW_W, CONST.VIEW_H);
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const t = tiles[ty][tx];
        const x = tx * CONST.TILE;
        const y = ty * CONST.TILE;
        if (typeof Atlas !== 'undefined' && Atlas.ready()) {
          // Map interior types through World.getTile path by temporary scene — direct blit
          const idMap = {};
          idMap[TILE.WALL] = Atlas.ID.WALL;
          idMap[TILE.FLOOR] = Atlas.ID.FLOOR;
          idMap[TILE.DOOR] = Atlas.ID.DOOR;
          idMap[TILE.BED] = Atlas.ID.BED;
          idMap[TILE.KITCHEN] = Atlas.ID.KITCHEN;
          idMap[TILE.WARDROBE] = Atlas.ID.WARDROBE;
          idMap[TILE.WINDOW] = Atlas.ID.WINDOW;
          const id = idMap[t] != null ? idMap[t] : Atlas.ID.FLOOR;
          Atlas.blit(ctx, id, x, y);
        } else if (typeof Sprites !== 'undefined') {
          if (t === TILE.WALL) Sprites.wallTile(ctx, x, y, CONST.TILE);
          else if (t === TILE.DOOR) Sprites.door(ctx, x, y, CONST.TILE);
          else if (t === TILE.BED) Sprites.bed(ctx, x, y, CONST.TILE);
          else if (t === TILE.KITCHEN) Sprites.kitchen(ctx, x, y, CONST.TILE);
          else if (t === TILE.WARDROBE) Sprites.wardrobe(ctx, x, y, CONST.TILE);
          else if (t === TILE.WINDOW) {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(x, y, CONST.TILE, CONST.TILE);
            ctx.fillStyle = '#87c8e8';
            ctx.fillRect(x + 3, y + 5, 26, 22);
            ctx.fillStyle = '#7a4a22';
            ctx.fillRect(x + 15, y + 5, 2, 22);
            ctx.fillRect(x + 3, y + 15, 26, 2);
          }
          else Sprites.floorTile(ctx, x, y, CONST.TILE, tx, ty);
        }
      }
    }
    // Player-placed furniture (drawn under the player; tall pieces re-drawn after entities)
    if (typeof Home !== 'undefined') Home.draw(ctx, state);
  }

  function drawTileFallback(state, tx, ty, time, season) {
    if (typeof Sprites === 'undefined') return;
    const t = World.getTile(state, tx, ty);
    const x = tx * CONST.TILE;
    const y = ty * CONST.TILE;
    const T = CONST.TILE;
    const S = Sprites;
    switch (t) {
      case TILE.PATH: S.path(ctx, x, y, T, tx, ty); break;
      case TILE.DIRT: S.dirt(ctx, x, y, T, tx, ty, Farming.getSoil(state, tx, ty)); break;
      case TILE.WATER: S.water(ctx, x, y, T, tx, ty, time); break;
      case TILE.FENCE: S.fence(ctx, x, y, T, season, tx, ty); break;
      case TILE.HOUSE: S.houseWall(ctx, x, y, T, tx, ty); break;
      case TILE.DOOR: S.door(ctx, x, y, T); break;
      case TILE.COOP: S.coop(ctx, x, y, T, season, tx, ty); break;
      case TILE.BARN: S.barn(ctx, x, y, T, season, tx, ty); break;
      case TILE.SHOP: S.shop(ctx, x, y, T, season, tx, ty); break;
      case TILE.BIN: S.bin(ctx, x, y, T, season, tx, ty); break;
      case TILE.SELLBOX: S.sellbox(ctx, x, y, T, season, tx, ty); break;
      case TILE.GEM_NODE:
        if (typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty)) S.grass(ctx, x, y, T, tx, ty, season, 0);
        else S.gemNode(ctx, x, y, T, season, tx, ty);
        break;
      case TILE.CRYSTAL:
        if (typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty)) S.grass(ctx, x, y, T, tx, ty, season, 0);
        else S.crystal(ctx, x, y, T, season, tx, ty);
        break;
      case TILE.GEODE:
        if (typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty)) S.grass(ctx, x, y, T, tx, ty, season, 0);
        else S.geode(ctx, x, y, T, season, tx, ty);
        break;
      case TILE.CRACK_BENCH: S.crackBench(ctx, x, y, T, season, tx, ty); break;
      case TILE.FOUNTAIN: S.fountain(ctx, x, y, T); break;
      case TILE.POSTBOX: S.postbox(ctx, x, y, T, season, tx, ty); break;
      case TILE.STALL: S.stall(ctx, x, y, T); break;
      case TILE.BENCH: S.bench(ctx, x, y, T, season, tx, ty); break;
      case TILE.LAMP: S.lamp(ctx, x, y, T, season, tx, ty); break;
      case TILE.CAVE: S.cave(ctx, x, y, T); break;
      case TILE.ROCK: S.rock(ctx, x, y, T, season, tx, ty); break;
      case TILE.FLOWER:
        S.flower(ctx, x, y, T, season, tx, ty, time,
          typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty));
        break;
      case TILE.TREE: S.tree(ctx, x, y, T, season, tx, ty); break;
      case TILE.BOARD: S.board(ctx, x, y, T, season, tx, ty); break;
      default: S.grass(ctx, x, y, T, tx, ty, season, time);
    }
  }

  function drawSoilCrop(s, time) {
    if (!s.cropId) return;
    const crop = CROPS[s.cropId];
    if (!crop) return;
    const x = s.tx * CONST.TILE + CONST.TILE / 2;
    const y = s.ty * CONST.TILE + CONST.TILE / 2;
    if (typeof Sprites !== 'undefined') {
      Sprites.crop(ctx, x, y, crop, s.stage, s.mature, s.quality, time);
    }
    if (s.mature && Math.random() < 0.015) {
      Particles.emit({
        x: x + Utils.rand(-6, 6), y: y - 12,
        vx: 0, vy: -12, life: 0.5, size: 2, color: '#ffd700', gravity: 0,
      });
    }
  }

  function drawCottageSprite(ctx, x, y, scale, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // Body
    ctx.fillStyle = '#F5E6D0';
    ctx.fillRect(20, 40, 200, 100);
    // Roof
    ctx.fillStyle = '#E07A5F';
    ctx.beginPath();
    ctx.moveTo(10, 50);
    ctx.lineTo(120, 5);
    ctx.lineTo(230, 50);
    ctx.closePath();
    ctx.fill();
    // Chimney
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(170, 15, 18, 35);
    // Smoke in evening-ish
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    const sy = 10 - (time * 20 % 30);
    ctx.beginPath();
    ctx.arc(179, sy, 6 + Math.sin(time) * 2, 0, Math.PI * 2);
    ctx.fill();
    // Door
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(100, 80, 36, 60);
    // Windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(40, 70, 28, 28);
    ctx.fillRect(170, 70, 28, 28);
    ctx.strokeStyle = '#FFF8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 70, 28, 28);
    ctx.strokeRect(170, 70, 28, 28);
    ctx.restore();
  }

  function updateCamera(state) {
    const map = World.mapPixelSize(state);
    const targetX = state.player.x - CONST.VIEW_W / 2;
    const targetY = state.player.y - CONST.VIEW_H / 2;
    const maxX = Math.max(0, map.w - CONST.VIEW_W);
    const maxY = Math.max(0, map.h - CONST.VIEW_H);
    const tx = Utils.clamp(targetX, 0, maxX);
    const ty = Utils.clamp(targetY, 0, maxY);
    state.camera.x = Utils.lerp(state.camera.x, tx, CONST.CAMERA_LERP);
    state.camera.y = Utils.lerp(state.camera.y, ty, CONST.CAMERA_LERP);
  }

  return { init, draw, updateCamera };
})();
