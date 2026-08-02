'use strict';
(function () {
  function boot() {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    Game.init(canvas);
    OdysseyAudio.startMusic('title');
    let last = performance.now();
    function loop(now) {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      Game.update(dt);
      Game.render(ctx);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
