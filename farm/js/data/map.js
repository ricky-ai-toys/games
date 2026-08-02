/* ========================================
   Amber's Farm — Map Layout Generator
   ======================================== */

const MapData = (() => {
  function createOutdoor() {
    const W = CONST.MAP_W;
    const H = CONST.MAP_H;
    const tiles = [];
    const rng = Utils.mulberry32(42);

    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        tiles[y][x] = TILE.GRASS;
      }
    }

    // Path from left to house and around (full east-west lane on row 12)
    for (let x = 0; x < W; x++) {
      tiles[12][x] = TILE.PATH;
    }
    for (let y = 8; y <= 16; y++) {
      tiles[y][14] = TILE.PATH;
      tiles[y][15] = TILE.PATH;
    }
    // Path to coop
    for (let x = 6; x <= 14; x++) tiles[17][x] = TILE.PATH;
    // Path to shop / neighbor
    for (let x = 15; x <= 30; x++) tiles[8][x] = TILE.PATH;
    for (let y = 8; y <= 12; y++) tiles[y][28] = TILE.PATH;

    // Pond (bottom right area)
    for (let y = 19; y <= 23; y++) {
      for (let x = 24; x <= 32; x++) {
        const cx = 28, cy = 21;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) * 1.4 < 18) {
          tiles[y][x] = TILE.WATER;
        }
      }
    }

    // Cottage footprint (solid) + door
    // House at ~16-20 x, 4-7 y
    for (let y = 4; y <= 7; y++) {
      for (let x = 16; x <= 21; x++) {
        tiles[y][x] = TILE.HOUSE;
      }
    }
    tiles[7][18] = TILE.DOOR;
    tiles[7][19] = TILE.DOOR;

    // Shipping bin left of house
    tiles[8][15] = TILE.BIN;

    // Sell box right of house (instant coins)
    tiles[9][23] = TILE.SELLBOX;

    // Coop area
    for (let y = 18; y <= 20; y++) {
      for (let x = 4; x <= 8; x++) {
        if (y === 18 || y === 20 || x === 4 || x === 8) tiles[y][x] = TILE.FENCE;
        else tiles[y][x] = TILE.PATH;
      }
    }
    tiles[18][6] = TILE.COOP;
    tiles[19][4] = TILE.FENCE;
    tiles[19][8] = TILE.FENCE;
    tiles[20][6] = TILE.PATH; // gate

    // Barn area (east of coop, clear of the pond fish spots at x 25–27)
    for (let y = 18; y <= 20; y++) {
      for (let x = 19; x <= 23; x++) {
        if (y === 18 || y === 20 || x === 19 || x === 23) tiles[y][x] = TILE.FENCE;
        else tiles[y][x] = TILE.PATH;
      }
    }
    tiles[18][21] = TILE.BARN;
    tiles[20][21] = TILE.PATH; // gate
    // Path lane from the main road (row 12) down to the barn gate
    for (let y = 13; y <= 17; y++) tiles[y][21] = TILE.PATH;
    // Shop stand
    tiles[7][28] = TILE.SHOP;
    tiles[7][29] = TILE.SHOP;

    // Quest board
    tiles[9][26] = TILE.BOARD;

    // Farm plots — main field (tillable dirt region)
    // Primary plots 10-15 x 10-15, and expandable rocks nearby
    for (let y = 10; y <= 15; y++) {
      for (let x = 8; x <= 13; x++) {
        tiles[y][x] = TILE.DIRT;
      }
    }

    // Expandable rocky plots
    for (let y = 10; y <= 15; y++) {
      for (let x = 3; x <= 6; x++) {
        tiles[y][x] = TILE.ROCK;
      }
    }
    for (let y = 10; y <= 12; y++) {
      for (let x = 20; x <= 23; x++) {
        tiles[y][x] = TILE.ROCK;
      }
    }
    // Carve the barn road through the rock strip (rows 10–12)
    for (let y = 10; y <= 12; y++) tiles[y][21] = TILE.PATH;

    // Trees along edges (leave north path open for forest warp)
    for (let x = 0; x < W; x++) {
      if (x >= 13 && x <= 16) continue; // forest road
      if (rng() > 0.55) tiles[0][x] = TILE.TREE;
      if (rng() > 0.6 && tiles[H - 1][x] === TILE.GRASS) tiles[H - 1][x] = TILE.TREE;
    }
    for (let y = 0; y < H; y++) {
      if (rng() > 0.5) tiles[y][0] = TILE.TREE;
      if (rng() > 0.55 && tiles[y][W - 1] === TILE.GRASS) tiles[y][W - 1] = TILE.TREE;
    }

    // Path north to forest + warp tiles
    for (let y = 0; y <= 8; y++) {
      tiles[y][14] = TILE.PATH;
      tiles[y][15] = TILE.PATH;
    }
    tiles[0][14] = TILE.WARP;
    tiles[0][15] = TILE.WARP;

    // Fishing spots around pond (walkable shore edge, outside the water ellipse)
    tiles[18][26] = TILE.FISH_SPOT;
    tiles[18][27] = TILE.FISH_SPOT;
    tiles[18][25] = TILE.FISH_SPOT;
    tiles[21][33] = TILE.FISH_SPOT;

    // Flower meadow near pond path
    for (let y = 14; y <= 17; y++) {
      for (let x = 26; x <= 30; x++) {
        if (tiles[y][x] === TILE.GRASS && rng() > 0.4) tiles[y][x] = TILE.FLOWER;
      }
    }

    // Decor spots near house
    tiles[9][17] = TILE.DECOR_SPOT;
    tiles[9][20] = TILE.DECOR_SPOT;
    tiles[8][22] = TILE.DECOR_SPOT;

    // Fence around farm edge soft
    for (let x = 2; x <= 14; x++) {
      if (tiles[9][x] === TILE.GRASS) tiles[9][x] = TILE.FENCE;
    }

    // South path to beach (leave bottom open)
    for (let y = 17; y < H; y++) {
      tiles[y][14] = TILE.PATH;
      tiles[y][15] = TILE.PATH;
    }
    // Clear trees on beach road at bottom
    tiles[H - 1][13] = TILE.PATH;
    tiles[H - 1][14] = TILE.WARP;
    tiles[H - 1][15] = TILE.WARP;
    tiles[H - 1][16] = TILE.PATH;
    tiles[H - 2][14] = TILE.PATH;
    tiles[H - 2][15] = TILE.PATH;

    // West road → Village Market
    for (let y = 13; y <= 16; y++) {
      tiles[y][0] = TILE.PATH;
      tiles[y][1] = TILE.PATH;
    }
    tiles[14][0] = TILE.WARP;
    tiles[15][0] = TILE.WARP;

    // East road → Mountain Pass
    for (let y = 13; y <= 16; y++) {
      tiles[y][W - 1] = TILE.PATH;
      tiles[y][W - 2] = TILE.PATH;
    }
    tiles[14][W - 1] = TILE.WARP;
    tiles[15][W - 1] = TILE.WARP;

    return tiles;
  }

  function createInterior() {
    // 16x11 cottage interior: bedroom (left), kitchen (right), living room (center)
    const W = 16, H = 11;
    const tiles = [];
    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        if (y === 0 || y === H - 1 || x === 0 || x === W - 1) tiles[y][x] = TILE.WALL;
        else tiles[y][x] = TILE.FLOOR;
      }
    }
    // Door at bottom center (exit)
    tiles[H - 1][7] = TILE.DOOR;
    tiles[H - 1][8] = TILE.DOOR;
    // Bedroom (top-left)
    tiles[2][2] = TILE.BED;
    tiles[2][3] = TILE.BED;
    // Wardrobe / dresser in bedroom
    tiles[2][5] = TILE.WARDROBE;
    // Kitchen (top-right)
    tiles[2][13] = TILE.KITCHEN;
    tiles[2][14] = TILE.KITCHEN;
    // Windows on walls (north + side walls)
    tiles[0][3] = TILE.WINDOW;
    tiles[0][12] = TILE.WINDOW;
    tiles[4][0] = TILE.WINDOW;
    tiles[5][15] = TILE.WINDOW;
    return { tiles, w: W, h: H };
  }

  function createForest() {
    const W = CONST.FOREST_W || 28;
    const H = CONST.FOREST_H || 22;
    const tiles = [];
    const rng = Utils.mulberry32(99);

    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        tiles[y][x] = TILE.GRASS;
      }
    }

    // Dense trees
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (y === 0 || x === 0 || x === W - 1) tiles[y][x] = TILE.TREE;
        else if (rng() > 0.72) tiles[y][x] = TILE.TREE;
      }
    }

    // Clearing path from south warp
    for (let y = H - 4; y < H; y++) {
      tiles[y][13] = TILE.PATH;
      tiles[y][14] = TILE.PATH;
    }
    tiles[H - 1][13] = TILE.WARP;
    tiles[H - 1][14] = TILE.WARP;

    // Winding path into woods
    for (let y = 4; y < H - 3; y++) {
      const wobble = Math.floor(Math.sin(y * 0.4) * 2);
      const px = 13 + wobble;
      tiles[y][px] = TILE.PATH;
      tiles[y][px + 1] = TILE.PATH;
    }

    // Forest pond (fishing)
    for (let y = 6; y <= 10; y++) {
      for (let x = 18; x <= 23; x++) {
        if ((x - 20.5) * (x - 20.5) + (y - 8) * (y - 8) < 12) {
          tiles[y][x] = TILE.WATER;
        }
      }
    }
    tiles[10][18] = TILE.FISH_SPOT;
    tiles[10][19] = TILE.FISH_SPOT;
    tiles[11][20] = TILE.FISH_SPOT;

    // Mushrooms
    for (let i = 0; i < 18; i++) {
      const mx = 2 + Math.floor(rng() * (W - 4));
      const my = 2 + Math.floor(rng() * (H - 5));
      if (tiles[my][mx] === TILE.GRASS) tiles[my][mx] = TILE.MUSHROOM;
    }

    // Flowers / berries
    for (let i = 0; i < 12; i++) {
      const mx = 2 + Math.floor(rng() * (W - 4));
      const my = 2 + Math.floor(rng() * (H - 5));
      if (tiles[my][mx] === TILE.GRASS) tiles[my][mx] = TILE.FLOWER;
    }

    return { tiles, w: W, h: H };
  }

  function createBeach() {
    const W = CONST.BEACH_W || 32;
    const H = CONST.BEACH_H || 20;
    const tiles = [];
    const rng = Utils.mulberry32(77);

    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        // Top: grass fringe, then sand, then water
        if (y < 3) tiles[y][x] = TILE.GRASS;
        else if (y < 11) tiles[y][x] = TILE.SAND;
        else tiles[y][x] = TILE.WATER;
      }
    }

    // Sand extends irregularly into water edge
    for (let x = 0; x < W; x++) {
      const shore = 10 + Math.floor(Math.sin(x * 0.5) * 1.5);
      for (let y = 3; y <= shore; y++) tiles[y][x] = TILE.SAND;
      for (let y = shore + 1; y < H; y++) tiles[y][x] = TILE.WATER;
    }

    // Path from north warp (back to farm)
    for (let y = 0; y <= 5; y++) {
      tiles[y][14] = TILE.PATH;
      tiles[y][15] = TILE.PATH;
    }
    tiles[0][14] = TILE.WARP;
    tiles[0][15] = TILE.WARP;

    // Palm-ish trees as TREE on grass fringe
    for (let x = 1; x < W - 1; x++) {
      if (rng() > 0.65) tiles[1][x] = TILE.TREE;
      if (rng() > 0.7) tiles[2][x] = TILE.TREE;
    }
    tiles[1][14] = TILE.PATH;
    tiles[1][15] = TILE.PATH;
    tiles[2][14] = TILE.PATH;
    tiles[2][15] = TILE.PATH;

    // Shells on sand
    for (let i = 0; i < 22; i++) {
      const sx = 1 + Math.floor(rng() * (W - 2));
      const sy = 4 + Math.floor(rng() * 6);
      if (tiles[sy][sx] === TILE.SAND) tiles[sy][sx] = TILE.SHELL;
    }

    // Fishing spots on sand next to water
    for (let x = 4; x < W - 4; x += 3) {
      for (let y = 8; y < H - 1; y++) {
        if (tiles[y][x] === TILE.SAND && tiles[y + 1][x] === TILE.WATER) {
          tiles[y][x] = TILE.FISH_SPOT;
          break;
        }
      }
    }

    // Driftwood rocks
    for (let i = 0; i < 6; i++) {
      const sx = 2 + Math.floor(rng() * (W - 4));
      const sy = 5 + Math.floor(rng() * 4);
      if (tiles[sy][sx] === TILE.SAND) tiles[sy][sx] = TILE.ROCK;
    }

    return { tiles, w: W, h: H };
  }

  function createMountain() {
    const W = CONST.MOUNTAIN_W || 28;
    const H = CONST.MOUNTAIN_H || 22;
    const tiles = [];
    const rng = Utils.mulberry32(123);

    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        tiles[y][x] = TILE.GRASS;
      }
    }

    // Rocky rim — mountains are stony
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (y === 0 || y === H - 1 || x === W - 1) tiles[y][x] = TILE.ROCK;
        else if (rng() > 0.82) tiles[y][x] = TILE.ROCK;
      }
    }

    // Cave mouth on the west: stone ring + dark cave floor inside
    for (let y = 5; y <= 13; y++) {
      for (let x = 1; x <= 7; x++) {
        const ring = (y === 5 || y === 13 || x === 1);
        if (ring) tiles[y][x] = TILE.ROCK;
        else tiles[y][x] = TILE.CAVE;
      }
    }
    // Cave opening on the right side (x=8)
    for (let y = 6; y <= 12; y++) tiles[y][8] = TILE.CAVE;
    tiles[9][8] = TILE.CAVE; // widen mouth a touch

    // Gem nodes inside the cave
    tiles[7][3] = TILE.GEM_NODE;
    tiles[9][5] = TILE.GEM_NODE;
    tiles[11][3] = TILE.GEM_NODE;
    tiles[7][6] = TILE.GEM_NODE;
    tiles[12][6] = TILE.GEM_NODE;

    // Geodes resting on the cave floor
    tiles[10][4] = TILE.GEODE;
    tiles[8][7] = TILE.GEODE;
    tiles[6][5] = TILE.GEODE;

    // Main path from east warp (back to farm) into the clearing
    for (let x = 8; x <= 26; x++) {
      tiles[10][x] = TILE.PATH;
      tiles[11][x] = TILE.PATH;
    }
    tiles[10][26] = TILE.WARP;
    tiles[11][26] = TILE.WARP;
    // Path up to the cave mouth
    for (let y = 6; y <= 9; y++) tiles[y][8] = TILE.PATH;
    tiles[8][8] = TILE.PATH;

    // Rori's crack bench — just outside the cave
    tiles[9][10] = TILE.CRACK_BENCH;

    // Scattered gem nodes on the mountain
    tiles[13][14] = TILE.GEM_NODE;
    tiles[16][19] = TILE.GEM_NODE;
    tiles[4][13] = TILE.GEM_NODE;
    tiles[17][8] = TILE.GEM_NODE;
    tiles[15][23] = TILE.GEM_NODE;

    // Sparkling crystals
    tiles[3][9] = TILE.CRYSTAL;
    tiles[5][17] = TILE.CRYSTAL;
    tiles[13][20] = TILE.CRYSTAL;
    tiles[18][13] = TILE.CRYSTAL;
    tiles[19][21] = TILE.CRYSTAL;

    // A couple of grounded geodes out on the trail
    tiles[14][12] = TILE.GEODE;
    tiles[18][17] = TILE.GEODE;

    // Wildflowers for contrast
    for (let i = 0; i < 8; i++) {
      const mx = 4 + Math.floor(rng() * (W - 8));
      const my = 2 + Math.floor(rng() * (H - 4));
      if (tiles[my][mx] === TILE.GRASS) tiles[my][mx] = TILE.FLOWER;
    }

    return { tiles, w: W, h: H };
  }

  function createVillage() {
    const W = CONST.VILLAGE_W || 32;
    const H = CONST.VILLAGE_H || 20;
    const tiles = [];
    const rng = Utils.mulberry32(555);

    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        tiles[y][x] = TILE.GRASS;
      }
    }

    // Main street: full row
    for (let x = 0; x < W; x++) {
      tiles[10][x] = TILE.PATH;
      tiles[11][x] = TILE.PATH;
    }
    tiles[10][0] = TILE.WARP;
    tiles[11][0] = TILE.WARP;

    // Vertical lanes to fountain square
    for (let y = 10; y <= 14; y++) {
      tiles[y][14] = TILE.PATH;
      tiles[y][15] = TILE.PATH;
    }

    // Fountain in the square (solid center, splash ring)
    tiles[13][14] = TILE.FOUNTAIN;
    tiles[13][15] = TILE.FOUNTAIN;

    // Cottages (decorative, solid) north of the street
    for (let y = 3; y <= 6; y++) {
      for (let x = 4; x <= 7; x++) tiles[y][x] = TILE.HOUSE;
      for (let x = 24; x <= 27; x++) tiles[y][x] = TILE.HOUSE;
    }
    // Little front yards
    tiles[7][4] = TILE.FLOWER;
    tiles[7][6] = TILE.FLOWER;
    tiles[7][24] = TILE.FLOWER;
    tiles[7][27] = TILE.FLOWER;

    // Market stall on the street (west end)
    tiles[10][6] = TILE.STALL;

    // Postbox on the street (east end)
    tiles[10][26] = TILE.POSTBOX;

    // Benches
    tiles[12][11] = TILE.BENCH;
    tiles[8][18] = TILE.BENCH;

    // Lamp posts
    tiles[8][15] = TILE.LAMP;
    tiles[12][20] = TILE.LAMP;
    tiles[11][3] = TILE.LAMP;

    // Trees, hedges, flowers
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (tiles[y][x] !== TILE.GRASS) continue;
        if (y === 0 || y === H - 1 || x === 0 || x === W - 1) tiles[y][x] = TILE.TREE;
        else if (rng() > 0.78) tiles[y][x] = TILE.TREE;
        else if (rng() > 0.85) tiles[y][x] = TILE.FLOWER;
      }
    }

    // Keep the warp + street clear
    for (let x = 0; x < W; x++) {
      if (tiles[10][x] === TILE.TREE || tiles[11][x] === TILE.TREE) { tiles[10][x] = TILE.PATH; tiles[11][x] = TILE.PATH; }
    }

    return { tiles, w: W, h: H };
  }

  return { createOutdoor, createInterior, createForest, createBeach, createMountain, createVillage };
})();

