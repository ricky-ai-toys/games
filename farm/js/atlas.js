/* ========================================
   Amber's Farm — 16×16 Tile Atlas + Autotile
   Generated at runtime, drawn at 2× (32px world tiles)
   ======================================== */

const Atlas = (() => {
  const SRC = 16;           // source tile size in atlas
  const SCALE = 2;          // world pixels per source pixel
  // CONST.TILE should equal SRC * SCALE (32)

  let atlas = null;
  let actx = null;
  let ready = false;
  let frame = 0; // water animation frame 0..3

  // Atlas layout: each entry is [col, row] in the sheet (16px cells)
  // Sheet is 16 tiles wide × enough rows
  const COLS = 16;

  // IDs into atlas grid
  const ID = {
    // Grass variants 0-3
    GRASS0: 0, GRASS1: 1, GRASS2: 2, GRASS3: 3,
    // Path autotile 0-15 at index 16+mask
    PATH0: 16,
    // Water autotile 0-15 at 32+mask
    WATER0: 32,
    // Dirt
    DIRT: 48, DIRT_TILLED: 49, DIRT_WET: 50,
    // Fall / winter / summer grass variants
    GRASS_FALL0: 51, GRASS_FALL1: 52,
    GRASS_WIN0: 53, GRASS_WIN1: 54,
    GRASS_SUM0: 55, GRASS_SUM1: 56,
    // Objects
    FENCE_H: 64, FENCE_V: 65, FENCE_POST: 66,
    ROCK: 67, FLOWER0: 68, FLOWER1: 69, FLOWER2: 70,
    TREE_TOP: 71, TREE_TRUNK: 72,
    BIN: 73, SHOP: 74, COOP: 75, BOARD: 76,
    HOUSE: 77, DOOR: 78, BARN: 79,
    // Interior
    FLOOR: 80, WALL: 81, BED: 82, KITCHEN: 83, WARDROBE: 84,
    SELLBOX: 85,
    // v3.0 mountain & village
    GEM_NODE: 86, CRYSTAL: 87, GEODE: 88, CRACK_BENCH: 89,
    FOUNTAIN: 90, POSTBOX: 91, STALL: 92, BENCH: 93, LAMP: 94,
    CAVE: 95,
    // Path→grass edge overlays (optional extra)
    // Water frame 2 set
    WATER_B0: 96, // second animation row base
    // v4.0 interior home
    WINDOW: 97, RUG: 98, BOOKSHELF: 99, SOFA: 100, FIREPLACE: 101,
    TABLE: 102, CHAIR: 103, TOYBOX: 104, PETBED: 105, WALLLAMP: 106, PICTURE: 107,
  };

  function idx(id) {
    return { sx: (id % COLS) * SRC, sy: Math.floor(id / COLS) * SRC };
  }

  function pset(x, y, c) {
    actx.fillStyle = c;
    actx.fillRect(x, y, 1, 1);
  }

  function prect(x, y, w, h, c) {
    actx.fillStyle = c;
    actx.fillRect(x, y, w, h);
  }

  function at(id, localX, localY) {
    return {
      x: (id % COLS) * SRC + localX,
      y: Math.floor(id / COLS) * SRC + localY,
    };
  }

  function fillTile(id, color) {
    const { x, y } = at(id, 0, 0);
    prect(x, y, SRC, SRC, color);
  }

  function paintOn(id, fn) {
    const base = at(id, 0, 0);
    fn(base.x, base.y);
  }

  // ---- Generators ----

  function genGrass(id, cols) {
    // cols: [dark, mid, light, tuft, fleck]
    paintOn(id, (ox, oy) => {
      prect(ox, oy, 16, 16, cols[1]);
      for (let i = 0; i < 40; i++) {
        const hx = (i * 37 + id * 13) & 15;
        const hy = (i * 19 + id * 7) & 15;
        pset(ox + hx, oy + hy, cols[i % 3 === 0 ? 0 : 2]);
      }
      // tufts
      for (let t = 0; t < 3; t++) {
        const tx = 2 + ((id * 5 + t * 5) % 12);
        const ty = 6 + ((id + t * 3) % 8);
        pset(ox + tx, oy + ty, cols[3]);
        pset(ox + tx, oy + ty - 1, cols[3]);
        pset(ox + tx + 1, oy + ty, cols[2]);
      }
      // flecks
      pset(ox + 4, oy + 12, cols[4]);
      pset(ox + 11, oy + 5, cols[4]);
    });
  }

  function genPathMask(mask) {
    const id = ID.PATH0 + mask;
    paintOn(id, (ox, oy) => {
      // Start with grass underlay so open edges blend
      prect(ox, oy, 16, 16, '#5da34a');
      // Path body inset depending on open sides
      const n = mask & 1, e = mask & 2, s = mask & 4, w = mask & 8;
      let x0 = w ? 0 : 2;
      let y0 = n ? 0 : 2;
      let x1 = e ? 16 : 14;
      let y1 = s ? 16 : 14;
      // cobble fill
      prect(ox + x0, oy + y0, x1 - x0, y1 - y0, '#b89870');
      // stones
      const stones = [
        [x0, y0, 7, 7], [x0 + 7, y0, 7, 6],
        [x0, y0 + 7, 6, 7], [x0 + 6, y0 + 6, 8, 8],
      ];
      for (let i = 0; i < stones.length; i++) {
        let [sx, sy, sw, sh] = stones[i];
        sx = Math.max(x0, sx);
        sy = Math.max(y0, sy);
        sw = Math.min(sw, x1 - sx);
        sh = Math.min(sh, y1 - sy);
        if (sw < 2 || sh < 2) continue;
        const c = i % 2 ? '#d4c4a0' : '#c4b088';
        prect(ox + sx, oy + sy, sw - 1, sh - 1, c);
        // edge shadow
        prect(ox + sx, oy + sy + sh - 2, sw - 1, 1, '#8a7458');
        prect(ox + sx + sw - 2, oy + sy, 1, sh - 1, '#8a7458');
        // highlight
        pset(ox + sx + 1, oy + sy + 1, '#e8dcc0');
      }
      // soft grass blend on open edges
      if (!n) {
        for (let x = x0; x < x1; x++) {
          if (x % 2 === 0) pset(ox + x, oy + y0, '#6fb85a');
        }
      }
      if (!s) {
        for (let x = x0; x < x1; x++) {
          if (x % 2 === 1) pset(ox + x, oy + y1 - 1, '#4f8f3e');
        }
      }
      if (!w) {
        for (let y = y0; y < y1; y++) {
          if (y % 2 === 0) pset(ox + x0, oy + y, '#5da34a');
        }
      }
      if (!e) {
        for (let y = y0; y < y1; y++) {
          if (y % 2 === 1) pset(ox + x1 - 1, oy + y, '#5da34a');
        }
      }
    });
  }

  function genWaterMask(mask, anim) {
    // anim 0 or 1 offsets sparkle
    const id = (anim ? ID.WATER_B0 : ID.WATER0) + mask;
    paintOn(id, (ox, oy) => {
      const n = mask & 1, e = mask & 2, s = mask & 4, w = mask & 8;
      // deep water base
      prect(ox, oy, 16, 16, '#1e4a72');
      // body
      let x0 = w ? 0 : 1;
      let y0 = n ? 0 : 1;
      let x1 = e ? 16 : 15;
      let y1 = s ? 16 : 15;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const band = ((y + anim * 2) >> 1) % 2;
          pset(ox + x, oy + y, band ? '#2e6a9e' : '#3d82b8');
        }
      }
      // shore foam on open edges (grass contact)
      const foam = '#a8d8e8';
      if (!n) for (let x = 0; x < 16; x++) if (x % 2 === anim) pset(ox + x, oy + 0, foam);
      if (!s) for (let x = 0; x < 16; x++) if (x % 2 !== anim) pset(ox + x, oy + 15, foam);
      if (!w) for (let y = 0; y < 16; y++) if (y % 2 === anim) pset(ox + 0, oy + y, foam);
      if (!e) for (let y = 0; y < 16; y++) if (y % 2 !== anim) pset(ox + 15, oy + y, foam);
      // sparkles
      const sp = anim ? [[4, 5], [11, 10]] : [[7, 4], [3, 11], [12, 8]];
      for (const [sx, sy] of sp) {
        if (sx >= x0 && sx < x1 && sy >= y0 && sy < y1) {
          pset(ox + sx, oy + sy, '#c0e8f8');
        }
      }
    });
  }

  function genDirt() {
    paintOn(ID.DIRT, (ox, oy) => {
      prect(ox, oy, 16, 16, '#b89040');
      for (let i = 0; i < 30; i++) {
        const hx = (i * 11) & 15, hy = (i * 17) & 15;
        pset(ox + hx, oy + hy, i % 3 ? '#a07828' : '#c4a050');
      }
      prect(ox + 3, oy + 5, 3, 2, '#989898');
      prect(ox + 10, oy + 11, 2, 2, '#7a7a7a');
    });
    paintOn(ID.DIRT_TILLED, (ox, oy) => {
      prect(ox, oy, 16, 16, '#a07828');
      for (let row = 0; row < 5; row++) {
        prect(ox + 1, oy + 2 + row * 3, 14, 1, '#6b5010');
        prect(ox + 1, oy + 3 + row * 3, 14, 1, '#b89040');
      }
    });
    paintOn(ID.DIRT_WET, (ox, oy) => {
      prect(ox, oy, 16, 16, '#6b4e18');
      for (let row = 0; row < 5; row++) {
        prect(ox + 1, oy + 2 + row * 3, 14, 1, '#5a4010');
        prect(ox + 1, oy + 3 + row * 3, 14, 1, '#7a5a20');
      }
      prect(ox + 3, oy + 4, 5, 1, 'rgba(100,160,200,0.4)');
      prect(ox + 8, oy + 10, 6, 1, 'rgba(100,160,200,0.35)');
    });
  }

  function genObjects() {
    // Fence post + rails as full tiles (drawn on grass)
    paintOn(ID.FENCE_H, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 1, oy + 5, 14, 2, '#7a4e28');
      prect(ox + 1, oy + 10, 14, 2, '#7a4e28');
      prect(ox + 2, oy + 3, 2, 10, '#5c3a1e');
      prect(ox + 12, oy + 3, 2, 10, '#5c3a1e');
    });
    paintOn(ID.FENCE_V, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 7, oy + 1, 2, 14, '#5c3a1e');
      prect(ox + 5, oy + 4, 6, 2, '#7a4e28');
      prect(ox + 5, oy + 10, 6, 2, '#7a4e28');
    });
    paintOn(ID.FENCE_POST, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 6, oy + 2, 4, 12, '#5c3a1e');
      prect(ox + 7, oy + 2, 1, 5, '#9a6432');
    });

    paintOn(ID.ROCK, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 3, oy + 7, 10, 6, '#7a7a7a');
      prect(ox + 4, oy + 5, 8, 4, '#989898');
      prect(ox + 5, oy + 4, 6, 3, '#b0b0b0');
      pset(ox + 6, oy + 5, '#d0d0d0');
      prect(ox + 7, oy + 8, 1, 4, '#5a5a5a');
    });

    const flowerCols = [['#f070a0', '#f0d040'], ['#f09040', '#a060d0'], ['#f0f0f0', '#f070a0']];
    [ID.FLOWER0, ID.FLOWER1, ID.FLOWER2].forEach((fid, i) => {
      paintOn(fid, (ox, oy) => {
        genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
        const [c1, c2] = flowerCols[i];
        prect(ox + 4, oy + 9, 1, 5, '#3d8a34');
        prect(ox + 10, oy + 8, 1, 5, '#3d8a34');
        pset(ox + 3, oy + 7, c1); pset(ox + 4, oy + 6, c1); pset(ox + 5, oy + 7, c1);
        pset(ox + 4, oy + 7, c2);
        pset(ox + 9, oy + 6, c2); pset(ox + 10, oy + 5, c1); pset(ox + 11, oy + 6, c1);
        pset(ox + 10, oy + 6, c2);
      });
    });

    // Tree: trunk tile + canopy (canopy drawn oversized in blit)
    paintOn(ID.TREE_TRUNK, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 6, oy + 8, 4, 8, '#5c3a1e');
      prect(ox + 7, oy + 8, 1, 6, '#9a6432');
      prect(ox + 4, oy + 14, 3, 2, '#7a4e28');
      prect(ox + 9, oy + 14, 3, 2, '#7a4e28');
    });
    paintOn(ID.TREE_TOP, (ox, oy) => {
      prect(ox, oy, 16, 16, 'rgba(0,0,0,0)');
      // clear first — use dark green circle-ish
      actx.clearRect(ox, oy, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const dx = x - 7.5, dy = y - 8;
          if (dx * dx + dy * dy < 55) {
            const c = (dx * dx + dy * dy < 30) ? '#4ea040' : '#2d6b28';
            pset(ox + x, oy + y, c);
          }
        }
      }
      pset(ox + 5, oy + 5, '#70c868');
      pset(ox + 10, oy + 7, '#70c868');
      pset(ox + 4, oy + 9, '#f070a0'); // blossom
      pset(ox + 11, oy + 6, '#f070a0');
    });

    paintOn(ID.BIN, (ox, oy) => {
      // path-ish base
      prect(ox, oy, 16, 16, '#b89870');
      prect(ox + 2, oy + 5, 12, 9, '#5c3a1e');
      prect(ox + 3, oy + 6, 10, 6, '#7a4e28');
      prect(ox + 1, oy + 3, 14, 3, '#9a6432');
      prect(ox + 5, oy + 8, 6, 2, '#3d2410');
      pset(ox + 7, oy + 4, '#d0d0d0');
    });

    paintOn(ID.SHOP, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 1, oy + 9, 14, 5, '#7a4e28');
      for (let i = 0; i < 7; i++) {
        prect(ox + 1 + i * 2, oy + 3, 2, 6, i % 2 ? '#f0e8d0' : '#c04830');
      }
      prect(ox + 2, oy + 3, 1, 11, '#5c3a1e');
      prect(ox + 13, oy + 3, 1, 11, '#5c3a1e');
      pset(ox + 5, oy + 11, '#f0d040');
      pset(ox + 8, oy + 11, '#f070a0');
      pset(ox + 11, oy + 11, '#f09040');
    });

    paintOn(ID.COOP, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 2, oy + 7, 12, 7, '#e8d8b8');
      for (let i = 0; i < 6; i++) {
        prect(ox + 1 + i, oy + 6 - i, 14 - i * 2, 1, i % 2 ? '#c04830' : '#a83828');
      }
      prect(ox + 6, oy + 10, 4, 4, '#5c3a1e');
      prect(ox + 3, oy + 9, 2, 2, '#7ec8e8');
      prect(ox + 11, oy + 9, 2, 2, '#7ec8e8');
    });

    paintOn(ID.BARN, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      // wide body
      prect(ox + 1, oy + 8, 14, 8, '#e8d8b8');
      prect(ox + 1, oy + 8, 14, 2, '#f0e8d0');
      // big red roof
      for (let i = 0; i < 8; i++) {
        prect(ox + i, oy + 7 - i, 16 - i * 2, 1, i % 2 ? '#d05838' : '#b84828');
      }
      // double doors
      prect(ox + 3, oy + 11, 4, 5, '#5c3a1e');
      prect(ox + 9, oy + 11, 4, 5, '#5c3a1e');
      prect(ox + 4, oy + 12, 2, 3, '#3d2410');
      prect(ox + 10, oy + 12, 2, 3, '#3d2410');
      // hay loft window
      prect(ox + 6, oy + 4, 4, 2, '#7ec8e8');
    });

    paintOn(ID.SELLBOX, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      // crate
      prect(ox + 2, oy + 6, 12, 9, '#7a4e28');
      prect(ox + 2, oy + 6, 12, 2, '#9a6432');
      prect(ox + 2, oy + 6, 2, 9, '#5c3a1e');
      prect(ox + 12, oy + 6, 2, 9, '#5c3a1e');
      // coin slot + sign
      prect(ox + 5, oy + 9, 6, 3, '#3d2410');
      pset(ox + 8, oy + 2, '#f0d040');
      pset(ox + 7, oy + 3, '#f0d040');
      pset(ox + 9, oy + 3, '#f0d040');
    });

    paintOn(ID.GEM_NODE, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 2, oy + 6, 12, 8, '#8a8a8a');
      prect(ox + 3, oy + 5, 10, 2, '#a9a9a9');
      prect(ox + 2, oy + 6, 2, 8, '#6e6e6e');
      prect(ox + 12, oy + 6, 2, 8, '#6e6e6e');
      // embedded gem glint
      prect(ox + 6, oy + 8, 4, 4, '#7ec8e8');
      pset(ox + 7, oy + 9, '#e8f4ff');
      prect(ox + 11, oy + 3, 3, 3, '#b8b8b8');
    });

    paintOn(ID.CRYSTAL, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      // crystal cluster
      prect(ox + 6, oy + 8, 4, 6, '#9a6ae0');
      prect(ox + 6, oy + 8, 2, 6, '#b48cf0');
      prect(ox + 3, oy + 11, 3, 3, '#7a4ac0');
      prect(ox + 10, oy + 10, 3, 4, '#7a4ac0');
      prect(ox + 7, oy + 4, 2, 4, '#c4a8f8');
      pset(ox + 7, oy + 3, '#fff');
    });

    paintOn(ID.GEODE, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      // rounded stone
      prect(ox + 3, oy + 8, 10, 7, '#9c8a78');
      prect(ox + 4, oy + 7, 8, 2, '#b8a894');
      prect(ox + 3, oy + 8, 2, 7, '#7c6a58');
      // crack
      prect(ox + 9, oy + 7, 1, 3, '#5c4a38');
      prect(ox + 8, oy + 10, 3, 1, '#5c4a38');
      pset(ox + 9, oy + 6, '#7ec8e8');
    });

    paintOn(ID.CRACK_BENCH, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      // anvil stone
      prect(ox + 4, oy + 7, 8, 6, '#6e6e6e');
      prect(ox + 5, oy + 6, 6, 2, '#8a8a8a');
      prect(ox + 6, oy + 13, 4, 2, '#555');
      // geode sitting on it
      prect(ox + 6, oy + 4, 4, 3, '#9c8a78');
      pset(ox + 8, oy + 4, '#7ec8e8');
      // wooden bench side
      prect(ox + 10, oy + 10, 3, 5, '#7a4e28');
      prect(ox + 10, oy + 10, 3, 1, '#9a6432');
    });

    paintOn(ID.FOUNTAIN, (ox, oy) => {
      // stone ring + water
      prect(ox + 1, oy + 3, 14, 10, '#9c9c9c');
      prect(ox + 1, oy + 3, 14, 2, '#b8b8b8');
      prect(ox + 3, oy + 5, 10, 6, '#4a9ad6');
      prect(ox + 4, oy + 6, 8, 4, '#6ab8e8');
      pset(ox + 7, oy + 2, '#b8dff0');
      pset(ox + 9, oy + 1, '#b8dff0');
      prect(ox + 2, oy + 13, 12, 2, '#7c7c7c');
    });

    paintOn(ID.POSTBOX, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 6, oy + 4, 4, 12, '#b84030');
      prect(ox + 5, oy + 7, 6, 5, '#d05848');
      prect(ox + 5, oy + 7, 6, 1, '#e87868');
      prect(ox + 4, oy + 12, 8, 2, '#8a2a20');
      prect(ox + 7, oy + 5, 2, 2, '#3d2410');
      pset(ox + 8, oy + 2, '#f0d040');
    });

    paintOn(ID.STALL, (ox, oy) => {
      prect(ox + 1, oy + 6, 14, 8, '#7a4e28');
      prect(ox + 1, oy + 6, 14, 2, '#9a6432');
      // awning
      prect(ox, oy + 2, 16, 4, '#e87868');
      for (let i = 0; i < 4; i++) prect(ox + i * 4, oy + 2, 2, 4, '#f0a090');
      // goods
      prect(ox + 3, oy + 9, 3, 3, '#f0c870');
      prect(ox + 10, oy + 9, 3, 3, '#d0a050');
      prect(ox + 6, oy + 10, 3, 2, '#8a6a3a');
    });

    paintOn(ID.BENCH, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 2, oy + 10, 12, 2, '#9a6432');
      prect(ox + 3, oy + 12, 2, 3, '#7a4e28');
      prect(ox + 11, oy + 12, 2, 3, '#7a4e28');
      prect(ox + 2, oy + 8, 12, 2, '#b87a3a');
      prect(ox + 1, oy + 7, 14, 1, '#c89050');
    });

    paintOn(ID.LAMP, (ox, oy) => {
      genGrassOnto(ox, oy, ['#4f8f3e', '#5da34a', '#6fb85a', '#3d7330', '#8fd46a']);
      prect(ox + 7, oy + 5, 2, 11, '#3d3d3d');
      prect(ox + 5, oy + 4, 6, 3, '#ffd970');
      prect(ox + 6, oy + 5, 4, 1, '#ffe9a0');
      prect(ox + 6, oy + 3, 4, 1, '#3d3d3d');
      prect(ox + 5, oy + 15, 6, 1, '#555');
    });

    paintOn(ID.CAVE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#3a3040');
      prect(ox, oy, 16, 2, '#2a2430');
      for (let i = 0; i < 6; i++) {
        pset(ox + ((i * 5 + 2) & 15), oy + ((i * 7 + 3) & 15), '#4a4050');
      }
    });

    paintOn(ID.BOARD, (ox, oy) => {
      prect(ox, oy, 16, 16, '#b89870');
      prect(ox + 7, oy + 4, 2, 11, '#5c3a1e');
      prect(ox + 3, oy + 2, 10, 9, '#f5ecd0');
      prect(ox + 4, oy + 4, 8, 1, '#c0a878');
      prect(ox + 4, oy + 6, 6, 1, '#c0a878');
      prect(ox + 4, oy + 8, 5, 1, '#c0a878');
      pset(ox + 7, oy + 2, '#e04040');
    });

    paintOn(ID.HOUSE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#e8d8b8');
      for (let y = 0; y < 16; y += 4) prect(ox, oy + y, 16, 1, '#d0c098');
      for (let x = 0; x < 16; x += 5) prect(ox + x, oy, 1, 16, '#c0a878');
    });

    paintOn(ID.DOOR, (ox, oy) => {
      prect(ox, oy, 16, 16, '#e8d8b8');
      prect(ox + 3, oy + 2, 10, 14, '#5c3a1e');
      prect(ox + 4, oy + 3, 8, 12, '#3d2410');
      prect(ox + 5, oy + 5, 2, 3, '#2a1810');
      prect(ox + 9, oy + 5, 2, 3, '#2a1810');
      prect(ox + 5, oy + 10, 2, 3, '#2a1810');
      prect(ox + 9, oy + 10, 2, 3, '#2a1810');
      pset(ox + 11, oy + 9, '#f0d040');
    });

    // Interior
    paintOn(ID.FLOOR, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      for (let y = 0; y < 16; y += 5) {
        prect(ox, oy + y, 16, 1, '#b89868');
        prect(ox + (y * 3) % 12, oy + y, 1, 5, '#c4a878');
      }
    });
    paintOn(ID.WALL, (ox, oy) => {
      prect(ox, oy, 16, 16, '#8b5a2b');
      for (let y = 0; y < 16; y += 4) {
        prect(ox, oy + y, 16, 1, '#6b4018');
        for (let x = 0; x < 16; x += 6) {
          prect(ox + x + (y % 8 === 0 ? 0 : 3), oy + y, 1, 4, '#7a4a22');
        }
      }
    });
    paintOn(ID.BED, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 4, 12, 10, '#4a7ab0');
      prect(ox + 2, oy + 4, 12, 3, '#e8e0d0');
      prect(ox + 3, oy + 3, 5, 3, '#fff8f0');
      prect(ox + 2, oy + 9, 12, 2, '#3a6a9a');
    });
    paintOn(ID.KITCHEN, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 1, oy + 6, 14, 8, '#a0a8b0');
      prect(ox + 1, oy + 6, 14, 2, '#c0c8d0');
      prect(ox + 4, oy + 9, 8, 4, '#3a3a40');
      prect(ox + 5, oy + 10, 2, 2, '#e05030');
      prect(ox + 9, oy + 10, 2, 2, '#e05030');
      prect(ox + 6, oy + 3, 4, 4, '#4a4a50');
    });
    paintOn(ID.WARDROBE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 3, oy + 1, 10, 14, '#5c3a1e');
      prect(ox + 4, oy + 2, 4, 11, '#9a6432');
      prect(ox + 8, oy + 2, 4, 11, '#9a6432');
      pset(ox + 7, oy + 7, '#f0d040');
      pset(ox + 9, oy + 7, '#f0d040');
    });

    // ---- v4.0 interior home furniture ----
    paintOn(ID.WINDOW, (ox, oy) => {
      prect(ox, oy, 16, 16, '#8b5a2b');
      prect(ox + 1, oy + 2, 14, 12, '#87c8e8');
      prect(ox + 1, oy + 2, 14, 2, '#e8f4fa');
      prect(ox + 8, oy + 2, 1, 12, '#7a4a22');
      prect(ox + 1, oy + 8, 14, 1, '#7a4a22');
      prect(ox, oy, 16, 1, '#6b4018');
    });
    paintOn(ID.RUG, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 3, 12, 10, '#b0606a');
      prect(ox + 2, oy + 3, 12, 2, '#c87882');
      prect(ox + 3, oy + 6, 10, 4, '#a0505a');
      for (let i = 0; i < 4; i++) {
        pset(ox + 4 + i * 3, oy + 5, '#e8a0a8');
      }
    });
    paintOn(ID.BOOKSHELF, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 1, 12, 14, '#6a3f1c');
      prect(ox + 3, oy + 2, 10, 3, '#3d2410');
      prect(ox + 3, oy + 7, 10, 3, '#3d2410');
      prect(ox + 3, oy + 12, 10, 3, '#3d2410');
      const bookCols = ['#e05040', '#4a90d9', '#7ec86a', '#f0c040', '#b0609a'];
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 4; i++) {
          prect(ox + 4 + i * 2 + (i === 3 ? 1 : 0), oy + 2 + r * 5, 1, 3, bookCols[(r + i) % 5]);
        }
      }
    });
    paintOn(ID.SOFA, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 1, oy + 6, 14, 8, '#7a5aa0');
      prect(ox + 1, oy + 6, 14, 2, '#9a7ac0');
      prect(ox + 2, oy + 3, 4, 5, '#7a5aa0');
      prect(ox + 10, oy + 3, 4, 5, '#7a5aa0');
      prect(ox + 2, oy + 14, 3, 1, '#5a4078');
      prect(ox + 11, oy + 14, 3, 1, '#5a4078');
      pset(ox + 4, oy + 4, '#c0a8e0');
      pset(ox + 12, oy + 4, '#c0a8e0');
    });
    paintOn(ID.FIREPLACE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 2, 12, 13, '#a0503a');
      prect(ox + 2, oy + 2, 12, 3, '#c06850');
      prect(ox + 4, oy + 5, 8, 8, '#3a2a20');
      prect(ox + 5, oy + 9, 6, 4, '#8a5a3a');
      prect(ox + 5, oy + 10, 2, 2, '#e89040');
      pset(ox + 8, oy + 8, '#f0a050');
      prect(ox + 5, oy + 14, 6, 1, '#7a3a28');
    });
    paintOn(ID.TABLE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 7, 12, 2, '#9a6432');
      prect(ox + 2, oy + 5, 12, 2, '#b87a3a');
      prect(ox + 4, oy + 9, 2, 6, '#7a4e28');
      prect(ox + 10, oy + 9, 2, 6, '#7a4e28');
    });
    paintOn(ID.CHAIR, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 3, oy + 6, 10, 3, '#b87a3a');
      prect(ox + 3, oy + 3, 2, 6, '#9a6432');
      prect(ox + 11, oy + 3, 2, 6, '#9a6432');
      prect(ox + 5, oy + 9, 3, 6, '#7a4e28');
      prect(ox + 9, oy + 9, 3, 6, '#7a4e28');
    });
    paintOn(ID.TOYBOX, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 6, 12, 9, '#4a7ab0');
      prect(ox + 2, oy + 6, 12, 2, '#6a9ad0');
      prect(ox + 5, oy + 3, 6, 4, '#e0e8f0');
      pset(ox + 6, oy + 4, '#f0d040');
      pset(ox + 9, oy + 4, '#e05040');
      pset(ox + 11, oy + 9, '#f0c040');
      pset(ox + 5, oy + 11, '#7ec86a');
    });
    paintOn(ID.PETBED, (ox, oy) => {
      prect(ox, oy, 16, 16, '#d4b888');
      prect(ox + 2, oy + 8, 12, 6, '#e8a050');
      prect(ox + 2, oy + 8, 12, 2, '#f8c070');
      prect(ox + 4, oy + 6, 8, 3, '#d08038');
      pset(ox + 6, oy + 10, '#8a5a20');
      pset(ox + 10, oy + 10, '#8a5a20');
    });
    paintOn(ID.WALLLAMP, (ox, oy) => {
      prect(ox, oy, 16, 16, '#8b5a2b');
      prect(ox + 6, oy + 2, 4, 6, '#3d3d3d');
      prect(ox + 4, oy + 6, 8, 3, '#ffe082');
      prect(ox + 5, oy + 7, 6, 1, '#fff0b8');
      prect(ox + 5, oy + 9, 6, 1, '#3d3d3d');
    });
    paintOn(ID.PICTURE, (ox, oy) => {
      prect(ox, oy, 16, 16, '#8b5a2b');
      prect(ox + 2, oy + 2, 12, 10, '#fff8f0');
      prect(ox + 2, oy + 2, 12, 1, '#c89050');
      // tiny landscape
      prect(ox + 3, oy + 8, 10, 4, '#7bc67e');
      prect(ox + 3, oy + 5, 10, 3, '#87c8e8');
      prect(ox + 4, oy + 4, 3, 2, '#f0d040');
      prect(ox + 3, oy + 12, 12, 1, '#8b5a2b');
    });
  }

  function genGrassOnto(ox, oy, cols) {
    prect(ox, oy, 16, 16, cols[1]);
    for (let i = 0; i < 20; i++) {
      pset(ox + ((i * 7) & 15), oy + ((i * 11) & 15), cols[i % 2]);
    }
  }

  function build() {
    atlas = document.createElement('canvas');
    // 16 cols × 8 rows = 128 tiles capacity
    atlas.width = COLS * SRC;
    atlas.height = 12 * SRC;
    actx = atlas.getContext('2d');
    actx.imageSmoothingEnabled = false;

    // Clear transparent
    actx.clearRect(0, 0, atlas.width, atlas.height);

    // Spring grass variants
    const spring = ['#3d7330', '#5da34a', '#6fb85a', '#2d5a20', '#8fd46a'];
    const summer = ['#2f6a24', '#4e9e3f', '#62b850', '#245a1c', '#7ad060'];
    const fall = ['#8a6428', '#c99a4a', '#d4a85c', '#6a4a18', '#e8c070'];
    const winter = ['#a8b8a8', '#d8e0d8', '#e8eee8', '#889888', '#f0f4f0'];

    genGrass(ID.GRASS0, spring);
    genGrass(ID.GRASS1, spring);
    genGrass(ID.GRASS2, spring);
    genGrass(ID.GRASS3, spring);
    genGrass(ID.GRASS_SUM0, summer);
    genGrass(ID.GRASS_SUM1, summer);
    genGrass(ID.GRASS_FALL0, fall);
    genGrass(ID.GRASS_FALL1, fall);
    genGrass(ID.GRASS_WIN0, winter);
    genGrass(ID.GRASS_WIN1, winter);

    for (let m = 0; m < 16; m++) {
      genPathMask(m);
      genWaterMask(m, 0);
      genWaterMask(m, 1);
    }
    genDirt();
    genObjects();

    ready = true;
  }

  function blit(ctx, id, dx, dy) {
    if (!ready) return;
    const { sx, sy } = idx(id);
    ctx.drawImage(atlas, sx, sy, SRC, SRC, dx, dy, SRC * SCALE, SRC * SCALE);
  }

  function blitTree(ctx, dx, dy, season) {
    // trunk at tile
    blit(ctx, ID.TREE_TRUNK, dx, dy);
    // canopy centered above — slightly larger by drawing twice offset
    const top = idx(ID.TREE_TOP);
    // recolor isn't free — draw canopy sprite with optional tint overlay
    ctx.drawImage(atlas, top.sx, top.sy, SRC, SRC, dx - 4, dy - 14, 24, 24);
    if (season === 'fall') {
      ctx.fillStyle = 'rgba(200,80,20,0.25)';
      ctx.fillRect(dx - 4, dy - 14, 24, 24);
    } else if (season === 'winter') {
      ctx.fillStyle = 'rgba(200,220,230,0.35)';
      ctx.fillRect(dx - 4, dy - 14, 24, 24);
    }
  }

  function isPathLike(state, tx, ty) {
    const t = World.getTile(state, tx, ty);
    return t === TILE.PATH || t === TILE.DOOR || t === TILE.BIN || t === TILE.BOARD ||
      t === TILE.DECOR_SPOT || t === TILE.WARP || t === TILE.FISH_SPOT;
  }

  function isWater(state, tx, ty) {
    return World.getTile(state, tx, ty) === TILE.WATER;
  }

  function mask(state, tx, ty, fn) {
    let m = 0;
    if (fn(state, tx, ty - 1)) m |= 1;
    if (fn(state, tx + 1, ty)) m |= 2;
    if (fn(state, tx, ty + 1)) m |= 4;
    if (fn(state, tx - 1, ty)) m |= 8;
    return m;
  }

  function grassId(tx, ty, season) {
    const v = (tx * 3 + ty * 7) & 3;
    if (season === 'fall') return v % 2 ? ID.GRASS_FALL0 : ID.GRASS_FALL1;
    if (season === 'winter') return v % 2 ? ID.GRASS_WIN0 : ID.GRASS_WIN1;
    if (season === 'summer') return v % 2 ? ID.GRASS_SUM0 : ID.GRASS_SUM1;
    return ID.GRASS0 + v;
  }

  function drawGroundTile(ctx, state, tx, ty, season) {
    if (!ready) return;
    const t = World.getTile(state, tx, ty);
    const dx = tx * CONST.TILE;
    const dy = ty * CONST.TILE;
    const gId = grassId(tx, ty, season);

    switch (t) {
      case TILE.GRASS:
      case TILE.DECOR_SPOT:
        blit(ctx, gId, dx, dy);
        break;
      case TILE.PATH:
        blit(ctx, ID.PATH0 + mask(state, tx, ty, isPathLike), dx, dy);
        break;
      case TILE.DIRT: {
        const soil = Farming.getSoil(state, tx, ty);
        if (soil && soil.tilled) {
          blit(ctx, soil.watered ? ID.DIRT_WET : ID.DIRT_TILLED, dx, dy);
        } else {
          blit(ctx, ID.DIRT, dx, dy);
        }
        break;
      }
      case TILE.WATER: {
        const base = (frame % 2 === 0) ? ID.WATER0 : ID.WATER_B0;
        blit(ctx, base + mask(state, tx, ty, isWater), dx, dy);
        break;
      }
      case TILE.FENCE: {
        // pick orientation from neighbors
        const up = World.getTile(state, tx, ty - 1) === TILE.FENCE;
        const dn = World.getTile(state, tx, ty + 1) === TILE.FENCE;
        const lf = World.getTile(state, tx - 1, ty) === TILE.FENCE;
        const rt = World.getTile(state, tx + 1, ty) === TILE.FENCE;
        if ((up || dn) && !(lf || rt)) blit(ctx, ID.FENCE_V, dx, dy);
        else if ((lf || rt) && !(up || dn)) blit(ctx, ID.FENCE_H, dx, dy);
        else if (up || dn || lf || rt) blit(ctx, ID.FENCE_H, dx, dy);
        else blit(ctx, ID.FENCE_POST, dx, dy);
        break;
      }
      case TILE.HOUSE:
        blit(ctx, ID.HOUSE, dx, dy);
        break;
      case TILE.DOOR:
        blit(ctx, ID.DOOR, dx, dy);
        break;
      case TILE.COOP:
        blit(ctx, ID.COOP, dx, dy);
        break;
      case TILE.BARN:
        blit(ctx, ID.BARN, dx, dy);
        break;
      case TILE.SHOP:
        blit(ctx, ID.SHOP, dx, dy);
        break;
      case TILE.BIN:
        blit(ctx, ID.BIN, dx, dy);
        break;
      case TILE.SELLBOX:
        blit(ctx, ID.SELLBOX, dx, dy);
        break;
      case TILE.GEM_NODE: {
        const picked = typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty);
        if (!picked) blit(ctx, ID.GEM_NODE, dx, dy);
        else blit(ctx, gId, dx, dy);
        break;
      }
      case TILE.CRYSTAL: {
        const picked = typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty);
        if (!picked) blit(ctx, ID.CRYSTAL, dx, dy);
        else blit(ctx, gId, dx, dy);
        break;
      }
      case TILE.GEODE: {
        const picked = typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty);
        if (!picked) blit(ctx, ID.GEODE, dx, dy);
        else blit(ctx, gId, dx, dy);
        break;
      }
      case TILE.CRACK_BENCH:
        blit(ctx, ID.CRACK_BENCH, dx, dy);
        break;
      case TILE.FOUNTAIN:
        blit(ctx, ID.FOUNTAIN, dx, dy);
        break;
      case TILE.POSTBOX:
        blit(ctx, ID.POSTBOX, dx, dy);
        break;
      case TILE.STALL:
        blit(ctx, ID.STALL, dx, dy);
        break;
      case TILE.BENCH:
        blit(ctx, ID.BENCH, dx, dy);
        break;
      case TILE.LAMP:
        blit(ctx, ID.LAMP, dx, dy);
        break;
      case TILE.CAVE:
        blit(ctx, ID.CAVE, dx, dy);
        break;
      case TILE.ROCK:
        blit(ctx, ID.ROCK, dx, dy);
        break;
      case TILE.FLOWER: {
        const picked = typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty);
        if (picked) blit(ctx, gId, dx, dy);
        else blit(ctx, ID.FLOWER0 + ((tx + ty) % 3), dx, dy);
        break;
      }
      case TILE.TREE:
        blitTree(ctx, dx, dy, season);
        break;
      case TILE.BOARD:
        blit(ctx, ID.BOARD, dx, dy);
        break;
      case TILE.WARP:
        blit(ctx, ID.PATH0 + 15, dx, dy); // full path
        // arrow marker
        ctx.fillStyle = '#ffe566';
        ctx.fillRect(dx + 12, dy + 8, 8, 3);
        ctx.fillRect(dx + 14, dy + 4, 4, 12);
        break;
      case TILE.MUSHROOM:
        blit(ctx, gId, dx, dy);
        if (!(typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty))) {
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(dx + 13, dy + 18, 4, 8);
          ctx.fillStyle = '#c0392b';
          ctx.fillRect(dx + 8, dy + 10, 14, 10);
          ctx.fillStyle = '#fff8e0';
          ctx.fillRect(dx + 11, dy + 13, 3, 3);
          ctx.fillRect(dx + 16, dy + 15, 2, 2);
        }
        break;
      case TILE.FISH_SPOT:
        if (state.scene === 'beach') {
          // sand base
          ctx.fillStyle = '#e8d4a0';
          ctx.fillRect(dx, dy, CONST.TILE, CONST.TILE);
          ctx.fillStyle = '#d4c090';
          ctx.fillRect(dx + 4, dy + 8, 6, 4);
          ctx.fillRect(dx + 18, dy + 20, 8, 5);
        } else {
          blit(ctx, ID.PATH0 + 15, dx, dy);
        }
        ctx.fillStyle = '#3d82b8';
        ctx.fillRect(dx + 8, dy + 18, 16, 6);
        ctx.fillStyle = '#ffe566';
        ctx.fillRect(dx + 14, dy + 6, 3, 14);
        ctx.fillRect(dx + 10, dy + 6, 10, 3);
        break;
      case TILE.SAND: {
        ctx.fillStyle = '#e8d4a0';
        ctx.fillRect(dx, dy, CONST.TILE, CONST.TILE);
        const h = (tx * 7 + ty * 13) & 7;
        ctx.fillStyle = '#d4c090';
        ctx.fillRect(dx + h, dy + 6, 5, 3);
        ctx.fillRect(dx + 12 + (h % 5), dy + 18, 7, 3);
        ctx.fillStyle = '#f0e4b8';
        ctx.fillRect(dx + 20, dy + 10, 4, 2);
        break;
      }
      case TILE.SHELL: {
        ctx.fillStyle = '#e8d4a0';
        ctx.fillRect(dx, dy, CONST.TILE, CONST.TILE);
        if (!(typeof Forage !== 'undefined' && Forage.isPicked(state, tx, ty))) {
          ctx.fillStyle = '#f5f0e8';
          ctx.fillRect(dx + 10, dy + 14, 12, 8);
          ctx.fillStyle = '#e8a0b0';
          ctx.fillRect(dx + 12, dy + 16, 8, 4);
          ctx.fillStyle = '#fff';
          ctx.fillRect(dx + 14, dy + 15, 3, 2);
        } else {
          ctx.fillStyle = '#d4c090';
          ctx.fillRect(dx + 14, dy + 18, 4, 2);
        }
        break;
      }
      // Interior
      case TILE.FLOOR:
        blit(ctx, ID.FLOOR, dx, dy);
        break;
      case TILE.WALL:
        blit(ctx, ID.WALL, dx, dy);
        break;
      case TILE.BED:
        blit(ctx, ID.BED, dx, dy);
        break;
      case TILE.KITCHEN:
        blit(ctx, ID.KITCHEN, dx, dy);
        break;
      case TILE.WARDROBE:
        blit(ctx, ID.WARDROBE, dx, dy);
        break;
      default:
        blit(ctx, gId, dx, dy);
    }
  }

  function drawCottageRoof(ctx, time) {
    // Pixel roof over house footprint (16,4)-(21,7) in tile coords
    const T = CONST.TILE;
    const baseX = 16 * T;
    const baseY = 4 * T;
    // layered roof
    for (let i = 0; i < 12; i++) {
      const inset = i;
      const col = i < 2 ? '#d86040' : (i % 2 ? '#c04830' : '#a83828');
      ctx.fillStyle = col;
      ctx.fillRect(baseX - 8 + inset, baseY - 24 + i * 2, 6 * T + 16 - inset * 2, 3);
    }
    // chimney
    ctx.fillStyle = '#989898';
    ctx.fillRect(baseX + 4 * T + 8, baseY - 36, 12, 24);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(baseX + 4 * T + 6, baseY - 40, 16, 6);
    // smoke
    const sy = baseY - 48 - ((time * 16) % 20);
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    ctx.fillRect(baseX + 4 * T + 10, sy, 6, 5);
    ctx.fillRect(baseX + 4 * T + 14, sy - 6, 7, 5);
    // windows
    function win(wx, wy) {
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(wx, wy, 12, 12);
      ctx.fillStyle = '#7ec8e8';
      ctx.fillRect(wx + 2, wy + 2, 8, 8);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(wx + 5, wy + 2, 2, 8);
      ctx.fillRect(wx + 2, wy + 5, 8, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(wx + 3, wy + 3, 2, 2);
    }
    win(baseX + 10, baseY + 14);
    win(baseX + 4 * T + 6, baseY + 14);
  }

  function update(dt) {
    // water frame every ~0.4s
    frame = Math.floor(performance.now() / 400) % 2;
  }

  function init() {
    // Sync tile size
    if (CONST.TILE !== SRC * SCALE) {
      console.info('[Atlas] Using TILE=%d (expected %d for clean scale)', CONST.TILE, SRC * SCALE);
    }
    build();
  }

  /** Debug: draw atlas sheet to a corner */
  function debugDraw(ctx, x, y) {
    if (!ready) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, x, y);
  }

  return {
    init, update, drawGroundTile, drawCottageRoof, blit, blitTree,
    ready: () => ready, SRC, SCALE, ID, debugDraw, getAtlas: () => atlas,
  };
})();
