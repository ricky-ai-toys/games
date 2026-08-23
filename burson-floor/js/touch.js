/* Burson Floor — mobile touch controls.
   Only active on touch / coarse-pointer devices; desktop is untouched.
   Reuses the existing Game + Player globals; the canvas already auto-fits. */
(function () {
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!(coarse || hasTouch)) return; // desktop: do nothing

  function st() { return window.Game && Game.state; }

  // Walk target = a point offset from the player; Player.update already chases
  // state.clickTarget, so we just keep re-aiming it while a direction is held.
  function dirOffset(dir) {
    var s = st();
    var p = s && s.player;
    if (!p) return null;
    var d = 70;
    if (dir === 'up') return { x: p.x, y: p.y - d };
    if (dir === 'down') return { x: p.x, y: p.y + d };
    if (dir === 'left') return { x: p.x - d, y: p.y };
    if (dir === 'right') return { x: p.x + d, y: p.y };
    return null;
  }

  function startDir(dir, btn) {
    btn.classList.add('active');
    stopDir();
    var tick = function () {
      var s = st();
      if (!s || s.mode !== 'play' || s.dialogue) return;
      var off = dirOffset(dir);
      if (off) s.clickTarget = off;
    };
    tick();
    btn._iv = setInterval(tick, 40);
  }

  function stopDir(btn) {
    if (btn && btn._iv) { clearInterval(btn._iv); btn._iv = null; }
    if (btn) btn.classList.remove('active');
    var s = st();
    if (s) s.clickTarget = null;
  }

  function bindDpad() {
    document.querySelectorAll('.dbtn').forEach(function (btn) {
      var dir = btn.getAttribute('data-dir');
      var down = function (e) { e.preventDefault(); startDir(dir, btn); };
      var up = function (e) { e.preventDefault(); stopDir(btn); };
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up, { passive: false });
      btn.addEventListener('touchcancel', up, { passive: false });
      // desktop fallback so it's testable with a mouse
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('mouseleave', up);
    });
  }

  function bindAct() {
    var act = document.getElementById('act-btn');
    if (!act) return;
    var fire = function (e) {
      e.preventDefault();
      var s = st();
      if (!s || s.mode !== 'play') return;
      if (window.Player) Player.tryInteract(s);
    };
    act.addEventListener('touchstart', fire, { passive: false });
    act.addEventListener('click', fire);
  }

  function init() {
    bindDpad();
    bindAct();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
