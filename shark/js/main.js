/* Amber's Shark Hunt — boot, input, loop, teardown.
 * The one place the engine meets the browser. Drains engine events and turns them
 * into sound, haptics, and toasts.
 *
 * Every listener registration goes through on() so teardown is complete. The old
 * file registered an anonymous visibilitychange handler it could never remove,
 * leaking a whole run's closure on every retry.
 */
(function (global) {
  'use strict';

  var D = global.SHData;
  var R = global.SHRules;
  var UI = global.SHUI;
  var Audio = global.SHAudio;
  var Render = global.SHRender;
  var H = global.AmberHardening;

  var canvas = null, ctx = null;
  var state = null;
  var running = false, paused = false, ended = false;
  var raf = 0, lastT = 0;
  var diffKey = 'med';
  var disposers = [];
  var bootDisposers = [];
  var dpr = 1;

  var reducedMotion = false;
  try {
    reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reducedMotion = false; }

  /* ------------------------------------------------------------- plumbing */

  /* Per-run listener. Cleared by teardown(). */
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    disposers.push(function () {
      try { target.removeEventListener(type, fn, opts); } catch (e) { /* ignore */ }
    });
  }

  /* Session-lifetime listener, registered once at boot. These must NOT be torn
   * down between runs: teardown() runs at the start of every startRun(), so
   * sharing one pool meant resize and visibilitychange stopped working after the
   * player's first game. */
  function onBoot(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    bootDisposers.push(function () {
      try { target.removeEventListener(type, fn, opts); } catch (e) { /* ignore */ }
    });
  }

  function buzz(pattern) {
    if (reducedMotion) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, global.devicePixelRatio || 1);
    var w = global.innerWidth;
    var h = global.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) { state.w = w; state.h = h; }
  }

  /* ------------------------------------------------------------- teardown */

  function teardown() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    disposers.forEach(function (d) { d(); });
    disposers = [];
    state = null;
    paused = false;
    ended = false;
  }

  function leaveRun() {
    teardown();
    UI.clearToasts();
    UI.hideHud();
    toMenu();
  }

  /* ---------------------------------------------------------------- input */

  /* Two steering modes, chosen per pointer event so hybrid devices work.
   *   follow — mouse/pen: swim toward the cursor, with the target offset so the
   *            hand never covers the shark, plus a drawn reticle.
   *   stick  — touch: a virtual joystick that appears where the player first
   *            touched, so there is nothing to aim at but what they already hit. */
  var input = {
    mode: 'keys',
    px: 0, py: 0,          // pointer position
    stickId: null,
    baseX: 0, baseY: 0,
    dx: 0, dy: 0, mag: 0,
    keys: {},
    dash: false,
    bite: false
  };

  function readInput() {
    var dx = 0, dy = 0, mag = 0;

    if (input.mode === 'stick' && input.stickId !== null) {
      dx = input.dx; dy = input.dy; mag = input.mag;
    } else if (input.mode === 'follow' || input.mode === 'keys') {
      if (input.keys.up) dy -= 1;
      if (input.keys.down) dy += 1;
      if (input.keys.left) dx -= 1;
      if (input.keys.right) dx += 1;
      if (dx || dy) {
        var kl = Math.hypot(dx, dy);
        dx /= kl; dy /= kl; mag = 1;
      } else if (input.mode === 'follow') {
        /* Swim toward the cursor. Offset by the player radius along the
         * approach vector so the shark sits just ahead of the hand. */
        var tx = input.px, ty = input.py;
        var vx = tx - state.x, vy = ty - state.y;
        var d = Math.hypot(vx, vy);
        if (d > 8) {
          dx = vx / d; dy = vy / d;
          mag = Math.min(1, d / 90);
          state.input.reticle = { x: tx, y: ty };
        } else {
          mag = 0;
          state.input.reticle = null;
        }
      }
    }

    state.input.dx = dx;
    state.input.dy = dy;
    state.input.mag = mag;
    state.input.dash = input.dash;
    state.input.bite = input.bite;
    input.dash = false;
    input.bite = false;
  }

  function setStick(px, py) {
    var refs = UI.refs();
    if (!refs.joystick) return;
    var maxR = 52;
    var vx = px - input.baseX, vy = py - input.baseY;
    var d = Math.hypot(vx, vy);
    var k = d > maxR ? maxR / d : 1;
    var hx = vx * k, hy = vy * k;
    input.dx = d < 6 ? 0 : vx / (d || 1);
    input.dy = d < 6 ? 0 : vy / (d || 1);
    input.mag = Math.min(1, d / maxR);

    refs.joystick.hidden = false;
    refs.joyBase.style.transform = 'translate(' + input.baseX + 'px,' + input.baseY + 'px)';
    refs.joyStick.style.transform = 'translate(' + (input.baseX + hx) + 'px,' + (input.baseY + hy) + 'px)';
  }

  function clearStick() {
    var refs = UI.refs();
    input.stickId = null;
    input.dx = 0; input.dy = 0; input.mag = 0;
    if (refs.joystick) {
      refs.joystick.hidden = true;
      refs.joyBase.style.transform = '';
      refs.joyStick.style.transform = '';
    }
  }

  function bindInput() {
    var refs = UI.refs();

    on(canvas, 'pointerdown', function (e) {
      if (!state || paused || ended) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (e.pointerType === 'touch') {
        input.mode = 'stick';
        input.stickId = e.pointerId;
        input.baseX = e.clientX;
        input.baseY = e.clientY;
        setStick(e.clientX, e.clientY);
      } else {
        input.mode = 'follow';
        input.px = e.clientX;
        input.py = e.clientY;
      }
      e.preventDefault();
    });

    on(canvas, 'pointermove', function (e) {
      if (!state || paused || ended) return;
      if (e.pointerType === 'touch') {
        if (e.pointerId === input.stickId) setStick(e.clientX, e.clientY);
      } else {
        input.mode = 'follow';
        input.px = e.clientX;
        input.py = e.clientY;
      }
    });

    function endPointer(e) {
      if (e.pointerType === 'touch' && e.pointerId === input.stickId) clearStick();
    }
    on(canvas, 'pointerup', endPointer);
    on(canvas, 'pointercancel', endPointer);
    on(canvas, 'lostpointercapture', endPointer);

    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });

    /* Action buttons. */
    function press(btn, prop) {
      if (!btn) return;
      on(btn, 'pointerdown', function (e) { e.preventDefault(); input[prop] = true; });
      /* Keyboard activation of the focused button must not also fire the global
       * key handler, which used to trigger a bite AND a dash from one Space. */
      on(btn, 'keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); input[prop] = true; }
      });
    }
    press(refs.dashBtn, 'dash');
    press(refs.biteBtn, 'bite');

    on(document, 'keydown', function (e) {
      if (!state) return;
      var k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright' || k === ' ') e.preventDefault();
      if (k === 'w' || k === 'arrowup') input.keys.up = true;
      if (k === 's' || k === 'arrowdown') input.keys.down = true;
      if (k === 'a' || k === 'arrowleft') input.keys.left = true;
      if (k === 'd' || k === 'arrowright') input.keys.right = true;
      if (k === 'shift') input.dash = true;
      if (k === ' ') input.bite = true;
      if ((k === 'escape' || k === 'p') && !paused && !ended) doPause();
    });

    on(document, 'keyup', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') input.keys.up = false;
      if (k === 's' || k === 'arrowdown') input.keys.down = false;
      if (k === 'a' || k === 'arrowleft') input.keys.left = false;
      if (k === 'd' || k === 'arrowright') input.keys.right = false;
    });

    on(refs.mute, 'click', function () {
      Audio.unlock();
      Audio.toggleMute();
      UI.syncMute();
    });

    on(refs.pause, 'click', function () { doPause(); });
  }

  /* ---------------------------------------------------------------- pause */

  function doPause() {
    if (!state || paused || ended) return;
    paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    UI.showPause(
      function () { UI.hide(); paused = false; lastT = 0; raf = requestAnimationFrame(loop); },
      function () { leaveRun(); }
    );
  }

  /* ---------------------------------------------------------------- events */

  function handle(e) {
    switch (e.t) {
      case 'eat':
        Audio.play(e.chomp ? 'chomp' : (e.n >= 4 ? 'big' : 'eat'));
        if (e.chomp) buzz(14);
        break;
      case 'dash': Audio.play('dash'); buzz([8, 30, 8]); break;
      case 'bite': Audio.play('bite'); break;
      case 'hit':
        Audio.play('bad');
        buzz([30, 40, 30]);
        UI.toast(e.source === 'apex' ? 'The great white hit you!' : 'Ouch!');
        break;
      case 'grow':
        Audio.play('grow');
        buzz([12, 40, 18]);
        if (e.size === D.WIN_SIZE) UI.toast('APEX! Hold for 8s');
        else UI.toast(D.SIZE_NAMES[e.size] + '!');
        break;
      case 'combo': Audio.play('combo'); break;
      case 'near': Audio.play('near'); break;
      case 'tail': Audio.play('tail'); buzz([16, 24, 16]); UI.toast('Tail strike!'); break;
      case 'relic':
        Audio.play(e.noEffect ? 'bite' : 'relic');
        if (e.id === 'drift') Audio.play('drift');
        if (!e.noEffect) UI.toast(e.id.toUpperCase());
        break;
      case 'telegraph': Audio.play('growl'); buzz([24, 30, 24]); break;
      case 'phase': if (e.phase === 'lunge') Audio.play('lunge'); break;
      case 'win': Audio.play('win'); buzz([20, 40, 20, 40, 30]); break;
      case 'lose': Audio.play('lose'); buzz([40, 60, 40]); break;
    }
  }

  function finish(result) {
    if (ended) return;
    ended = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    var finalState = state;
    setTimeout(function () {
      UI.hideHud();
      UI.showOver(result, finalState, diffKey,
        function () { UI.hide(); startRun(diffKey); },
        function () { leaveRun(); });
    }, result === 'win' ? 700 : 900);
  }

  /* ------------------------------------------------------------------ loop */

  function loop(t) {
    if (!running || !state) return;
    raf = requestAnimationFrame(loop);
    if (paused) return;
    if (!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    readInput();
    R.step(state, dt);

    for (var i = 0; i < state.events.length; i++) handle(state.events[i]);
    state.events.length = 0;

    Render.draw(ctx, state, { reducedMotion: reducedMotion });
    UI.updateHud(state, diffKey);

    if (state.over) finish(state.result);
  }

  /* ----------------------------------------------------------------- boot */

  function startRun(lvl) {
    teardown();
    diffKey = D.DIFF[lvl] ? lvl : 'med';
    state = R.createState(diffKey, (Math.random() * 0xffffffff) >>> 0, global.innerWidth, global.innerHeight);
    ended = false;
    paused = false;
    input.keys = {};
    input.mode = (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) ? 'stick' : 'follow';

    UI.hide();
    UI.showHud();
    bindInput();
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(loop);
  }

  function toMenu() {
    UI.showMenu(function (lvl) { Audio.unlock(); startRun(lvl); });
  }

  function boot() {
    canvas = document.getElementById('cv');
    if (!canvas) throw new Error('shark: missing #cv');
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('shark: no 2d context');

    /* Use the shared overlay rather than the inlined copy, whose guard read
     * AmberHardening.__amberErrorInstalled while hardening.js sets the flag on
     * window — so the guard could never be true and the message was discarded. */
    if (H && H.installErrorOverlay) H.installErrorOverlay('Shark hit a current. Reload to continue!');
    if (global.AmberPlaytime && global.AmberPlaytime.setGameTitle) {
      global.AmberPlaytime.setGameTitle("Amber's Shark Hunt");
    }

    UI.mount();
    resize();
    onBoot(global, 'resize', resize);
    onBoot(global, 'orientationchange', resize);

    /* Auto-pause when the tab is hidden: cancel rAF so a backgrounded tab does
     * not peg the CPU, and resume cleanly on return.
     *
     * Registered on `document` (where the event fires) via our own onBoot(), so
     * it survives between runs. AmberHardening.onHidden registers an anonymous
     * listener that can never be detached. */
    onBoot(document, 'visibilitychange', function () {
      if (document.hidden && state && !paused && !ended) doPause();
    });

    toMenu();

    if (!SaveSeen()) UI.showHelp(function () { toMenu(); });
  }

  function SaveSeen() {
    try { return global.SHSave && global.SHSave.tutorialSeen(); } catch (e) { return true; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Exposed for the headless smoke harness in the repo's QA flow. The debug
   * hooks jump straight to states that are otherwise hard to reach on demand —
   * chiefly the APEX finale, which only occurs after a full growth run. */
  global.SHMain = {
    startRun: startRun,
    teardown: teardown,
    isRunning: function () { return running; },
    debugState: function () { return state; },
    debugApex: function () {
      if (!state) return null;
      state.size = D.WIN_SIZE;
      state.xp = 0;
      state.xpNeed = state.size * D.TUNE.xpPerSize;
      state.holding = true;
      state.apexWait = 0.05;
      return true;
    },
    debugWin: function () { if (state) { state.goal = D.HOLD_TIME; } },
    debugLose: function () { if (state) { state.life = 0; R.emit(state, 'lose', {}); state.over = true; state.result = 'lose'; } }
  };
})(typeof window !== 'undefined' ? window : globalThis);
