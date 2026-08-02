/* ========================================
   Amber's Farm — Weather FX helper
   ======================================== */

const Weather = (() => {
  let rainTimer = 0;

  function update(state, dt, canvasW, canvasH) {
    if (state.weather !== 'rain' || state.scene === 'title') return;
    rainTimer += dt;
    if (rainTimer > 0.03) {
      rainTimer = 0;
      for (let i = 0; i < 3; i++) {
        Particles.rainDrop(Math.random() * canvasW, -10 + Math.random() * 40);
      }
    }
  }

  function ambient(state, dt) {
    if (state.scene === 'title' || state.scene === 'interior') return;
    const cam = Game.state.camera;
    // Snowflakes
    if (state.weather === 'snow' && Math.random() < 0.15) {
      Particles.emit({
        x: cam.x + Math.random() * CONST.VIEW_W,
        y: cam.y - 5,
        vx: Utils.rand(-15, 5),
        vy: Utils.rand(30, 70),
        life: 2.5,
        size: 2,
        color: '#ffffff',
        gravity: 10,
        world: true,
        drag: 0.99,
      });
    }
    // Fireflies in evening
    if (state.period === 'evening' && state.weather === 'sun' && Math.random() < 0.05) {
      Particles.firefly(
        cam.x + Math.random() * CONST.VIEW_W,
        cam.y + Math.random() * CONST.VIEW_H
      );
    }
    // Butterflies daytime near meadow (Iteration 2)
    if (state.weather === 'sun' && state.period !== 'evening' && Math.random() < 0.02) {
      const x = cam.x + Math.random() * CONST.VIEW_W;
      const y = cam.y + Math.random() * CONST.VIEW_H;
      Particles.emit({
        x, y,
        vx: Utils.rand(-25, 25),
        vy: Utils.rand(-15, 10),
        life: 2.5,
        size: 12,
        color: '#FFB7C5',
        shape: 'text',
        text: Math.random() > 0.5 ? '🦋' : '✨',
        gravity: -2,
        drag: 0.99,
        world: true,
      });
    }
    // Falling leaves in fall
    if (TimeSys.seasonName(state) === 'fall' && Math.random() < 0.03) {
      Particles.emit({
        x: cam.x + Math.random() * CONST.VIEW_W,
        y: cam.y - 10,
        vx: Utils.rand(-20, 10),
        vy: Utils.rand(20, 50),
        life: 3,
        size: 10,
        color: '#E65100',
        shape: 'text',
        text: '🍂',
        gravity: 10,
        world: true,
      });
    }
  }

  return { update, ambient };
})();
