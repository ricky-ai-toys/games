/* Office map: collision + props */

const OfficeMap = (() => {
  let grid = null;
  let props = [];

  function build() {
    grid = [];
    for (let y = 0; y < CONST.MAP_H; y++) {
      grid[y] = [];
      for (let x = 0; x < CONST.MAP_W; x++) {
        if (x === 0 || y === 0 || x === CONST.MAP_W - 1 || y === CONST.MAP_H - 1) {
          grid[y][x] = 1;
        } else {
          grid[y][x] = 0;
        }
      }
    }

    // Soft-block phone booth interiors (approach from door tile)
    // Solo booth 1×1 interior
    set(19, 8, 1);
    // Huddle booth 2×2 interior
    set(12, 10, 1);
    set(13, 10, 1);
    set(12, 11, 1);
    set(13, 11, 1);

    props = [
      { id: 'coffee', kind: 'coffee', tx: 10, ty: 4, label: 'Coffee machine' },
      { id: 'water', kind: 'water', tx: 10, ty: 7, label: 'Water cooler' },
      { id: 'printer', kind: 'printer', tx: 13, ty: 3, label: 'Printer' },
      { id: 'bloomberg', kind: 'bloomberg', tx: 14, ty: 5, label: 'Bloomberg terminal' },
      // Solo phone booth (1 person)
      { id: 'booth1', kind: 'booth1', tx: 19, ty: 8, label: 'Phone booth (solo)', doorTx: 19, doorTy: 9 },
      // Huddle booth for 4
      { id: 'booth4', kind: 'booth4', tx: 12, ty: 10, label: 'Huddle booth (4)', doorTx: 12, doorTy: 9 },
      { id: 'plant1', kind: 'plant', tx: 14, ty: 2 },
      { id: 'plant2', kind: 'plant', tx: 3, ty: 7 },
      { id: 'plant3', kind: 'plant', tx: 17, ty: 8 },
      { id: 'plant4', kind: 'plant', tx: 9, ty: 11 },
    ];
  }

  function set(tx, ty, v) {
    if (ty < 0 || tx < 0 || ty >= CONST.MAP_H || tx >= CONST.MAP_W) return;
    grid[ty][tx] = v;
  }

  function solid(tx, ty) {
    if (ty < 0 || tx < 0 || ty >= CONST.MAP_H || tx >= CONST.MAP_W) return true;
    return grid[ty][tx] === 1;
  }

  function walkableAt(px, py, radius) {
    const r = radius || 8;
    const points = [
      [px - r, py - r * 0.4],
      [px + r, py - r * 0.4],
      [px - r, py + r],
      [px + r, py + r],
      [px, py + r * 0.5],
    ];
    for (const [x, y] of points) {
      const t = Utils.tileAt(x, y);
      if (solid(t.tx, t.ty)) return false;
    }
    return true;
  }

  function getProps() {
    return props;
  }

  function propNear(px, py, range) {
    let best = null;
    let bestD = range || CONST.PROP_RANGE || 40;
    for (const p of props) {
      if (p.kind === 'plant') continue;
      // Use door tile for booths
      const tx = p.doorTx != null ? p.doorTx : p.tx;
      const ty = p.doorTy != null ? p.doorTy : p.ty;
      const c = Utils.worldCenter(tx, ty);
      // Also check main prop position
      const c2 = Utils.worldCenter(p.tx, p.ty);
      const d = Math.min(Utils.dist(px, py, c.x, c.y), Utils.dist(px, py, c2.x, c2.y));
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function spawnFor(person) {
    return {
      x: (person.tx + 1.0) * CONST.TILE,
      y: (person.ty + 0.85) * CONST.TILE,
    };
  }

  function deskWorld(person) {
    return {
      x: (person.tx + 1) * CONST.TILE,
      y: (person.ty + 0.5) * CONST.TILE,
    };
  }

  /** World pixel size of map */
  function worldSize() {
    return { w: CONST.MAP_W * CONST.TILE, h: CONST.MAP_H * CONST.TILE };
  }

  return {
    build,
    solid,
    walkableAt,
    getProps,
    propNear,
    spawnFor,
    deskWorld,
    worldSize,
    get grid() {
      return grid;
    },
  };
})();
