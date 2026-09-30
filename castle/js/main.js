/* Amber's Candy Castle — boot, input, loop, teardown.
 * The one place the engine meets the browser. Drains engine events into sound,
 * haptics and toasts.
 *
 * Session-lifetime and per-run listeners use SEPARATE disposer pools. The shark
 * remake shared one pool, so teardown() — which runs at the start of every
 * startLevel() — silently removed resize and tab-auto-pause after the first
 * game. Do not merge these.
 */
(function (global) {
  'use strict';

  var D = global.CCData;
  var G = global.CCGrid;
  var R = global.CCRules;
  var UI = global.CCUI;
  var Snd = global.CCAudio;
  var Save = global.CCSave;
  var Draw = global.CCRender;
  var H = global.AmberHardening;

  var canvas = null, ctx = null;
  var state = null;
  var running = false, over = false;
  var raf = 0, lastT = 0;
  var disposers = [], bootDisposers = [];
  var mode = 'levelId';
  var levelId = null;
  var reducedMotion = false;
  var frameNo = 0;

  try {
    reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* ignore */ }

  /* ------------------------------------------------------------ plumbing */

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    disposers.push(function () {
      try { target.removeEventListener(type, fn, opts); } catch (e) { /* ignore */ }
    });
  }
  function onBoot(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    bootDisposers.push(function () {
      try { target.removeEventListener(type, fn, opts); } catch (e) { /* ignore */ }
    });
  }

  function buzz(p) {
    if (reducedMotion) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ }
  }

  function resize() {
    if (!canvas) return;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var w = global.innerWidth, h = global.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) { state.w = w; state.h = h; }
  }

  function teardown() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    disposers.forEach(function (d) { d(); });
    disposers = [];
    state = null;
    over = false;
  }

  /* -------------------------------------------------------------- input */

  function cellFromPoint(px, py) {
    if (!state) return null;
    var l = Draw.layout(state);
    var c = Math.floor((px - l.x) / l.s);
    var r = Math.floor((py - l.y) / l.s);
    if (c < 0 || c >= D.COLS || r < 0 || r >= D.ROWS) return null;
    return { c: c, r: r };
  }

  function bindInput() {
    on(canvas, 'pointerdown', function (e) {
      if (!state || over) return;
      e.preventDefault();
      var cell = cellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      handleTap(cell);
    });

    on(canvas, 'pointermove', function (e) {
      if (!state || over) return;
      state.hover = cellFromPoint(e.clientX, e.clientY);
    });

    on(canvas, 'pointerleave', function () { if (state) state.hover = null; });
    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });

    var refs = UI.refs();

    /* One tap on an existing thing does the contextual thing: upgrade a tower,
     * sell a tower, or remove a wall. A second tap on the selected empty cell
     * places. That keeps the controls to one verb for a child. */
    on(refs.waveBtn, 'click', function () {
      if (!state || over) return;
      if (state.wavePhase === 'prep' || state.wavePhase === 'between') R.autoStart(state);
    });

    on(refs.picker, 'click', function (e) {
      var b = e.target.closest ? e.target.closest('.picker') : null;
      if (!b || !state) return;
      var item = b.getAttribute('data-item');
      state.selected = item;
      UI.markSelected(item);
      Snd.play('click');
    });

    on(refs.mute, 'click', function () {
      Snd.unlock();
      Snd.toggleMute();
      UI.syncMute();
    });

    on(refs.quit, 'click', function () { leaveLevel(); });
  }

  function handleTap(cell) {
    var existing = R.towerAtCell(state, cell.c, cell.r);
    if (existing) {
      /* Tap a tower: upgrade if affordable, otherwise offer nothing rather than
       * silently doing the wrong thing. */
      var spec = D.tower(existing.id);
      if (existing.tier < spec.tiers.length - 1 && R.tryUpgrade(state, cell.c, cell.r)) {
        Snd.play('upgrade');
        buzz(12);
        return;
      }
      if (existing.tier >= spec.tiers.length - 1) {
        R.trySell(state, cell.c, cell.r);
        Snd.play('sell');
      }
      return;
    }
    if (R.isWall(state, cell.c, cell.r)) {
      R.tryRemoveWall(state, cell.c, cell.r);
      Snd.play('sell');
      return;
    }
    var item = state.selected || 'arrow';
    if (R.tryPlace(state, cell.c, cell.r, item)) {
      Snd.play(item === 'wall' ? 'wall' : 'tower');
      buzz(8);
    }
    /* Once the player has built something, the level's one-line lesson has done
     * its job. Leaving it up covered the board for the whole run. */
    if (state.built) state.hint = '';
    state.built = true;
  }

  /* ------------------------------------------------------------- events */

  function handle(e) {
    switch (e.t) {
      case 'place': break;
      case 'refuse':
        Snd.play('deny');
        UI.toast(e.reason || 'Not allowed', 'bad');
        break;
      case 'upgrade': UI.toast(D.tower(e.item).name + ' → tier ' + (e.tier + 1)); break;
      case 'sell': UI.toast('+' + e.refund + ' gold'); break;
      case 'remove-wall': break;
      case 'kill':
        Snd.play('kill');
        R.burst(state, e.x, e.y, 4, '#ffd180');
        break;
      case 'bolt':
        Snd.play(e.item === 'arc' ? 'chain' : e.item === 'frost' ? 'frost' : 'fire');
        break;
      case 'boom': R.burst(state, e.x, e.y, 10, '#c8a2ff'); break;
      case 'leak':
        Snd.play('leak');
        buzz([24, 30, 24]);
        UI.toast('−' + e.damage + ' castle', 'bad');
        break;
      case 'wave-start': Snd.play('wave'); break;
      case 'wave-clear': Snd.play('clear'); UI.toast('Wave clear · +' + e.bonus); break;
      case 'won': Snd.play('win'); break;
      case 'lost': Snd.play('lose'); buzz([40, 50, 40]); break;
    }
  }

  function finish() {
    if (over) return;
    over = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    var finalState = state;
    setTimeout(function () {
      UI.hideHud();
      UI.showResult(finalState, null,
        function () { UI.hide(); startLevel(); },
        function () { leaveLevel(); });
    }, 650);
  }

  /* --------------------------------------------------------------- loop */

  function loop(t) {
    if (!running || !state) return;
    raf = requestAnimationFrame(loop);
    if (!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    R.step(state, dt);
    for (var i = 0; i < state.events.length; i++) handle(state.events[i]);
    state.events.length = 0;

    if ((frameNo++ % 20) === 0) measureInsets();
    var l = Draw.draw(ctx, state, { reducedMotion: reducedMotion });
    UI.updateHud(state);

    if (state.over) finish();
  }

  /* -------------------------------------------------------------- flow */

  function startLevel(id, endless) {
    teardown();
    mode = endless ? 'endless' : 'levelId';
    levelId = id;
    var opts = {
      seed: (Math.random() * 0xffffffff) >>> 0,
      endless: !!endless,
      w: global.innerWidth,
      h: global.innerHeight
    };
    state = R.createState(id || D.LEVELS[0].id, opts);
    state.hint = state.level ? state.level.teach : 'Hold on as long as you can.';
    over = false;
    /* Walls first: the road is the thing the player is shaping, so it is the
     * default verb and the first button in the picker. */
    state.selected = 'wall';

    UI.hide();
    UI.showHud(state.level);
    UI.markSelected(state.selected);
    measureInsets();
    bindInput();
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(loop);
  }

  /* Measure where the HUD actually sits so the board can be fitted to the gap.
   * Done by measurement rather than hardcoded CSS values, because the HUD
   * reflows with viewport width and the answer differs between phones. */
  function measureInsets() {
    if (!state) return;
    var top = 0, bottom = 0;
    var tc = document.querySelector('.hud-tc');
    var bl = document.querySelector('.hud-bl');
    var br = document.querySelector('.hud-br');
    if (tc) top = tc.getBoundingClientRect().bottom;
    if (bl) bottom = state.h - bl.getBoundingClientRect().top;
    if (br) bottom = Math.max(bottom, state.h - br.getBoundingClientRect().top);
    state.insetTop = Math.max(0, Math.round(top + 6));
    state.insetBottom = Math.max(0, Math.round(bottom + 6));
  }

  function leaveLevel() {
    teardown();
    UI.clearToasts();
    UI.hideHud();
    toMenu();
  }

  function toMenu() {
    UI.showMenu(
      function (id) { Snd.unlock(); startLevel(id, false); },
      function () { Snd.unlock(); startLevel(D.LEVELS[0].id, true); }
    );
  }

  /* --------------------------------------------------------------- boot */

  function boot() {
    canvas = document.getElementById('cv');
    if (!canvas) throw new Error('castle: missing #cv');
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('castle: no 2d context');

    if (H && H.installErrorOverlay) H.installErrorOverlay('Candy Castle hit a snag. Reload to continue!');
    if (global.AmberPlaytime && global.AmberPlaytime.setGameTitle) {
      global.AmberPlaytime.setGameTitle("Amber's Candy Castle");
    }

    UI.mount();
    resize();
    onBoot(global, 'resize', function () { resize(); measureInsets(); });
    onBoot(global, 'orientationchange', function () { resize(); measureInsets(); });
    onBoot(document, 'visibilitychange', function () {
      if (document.hidden && state && !over) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        running = false;
      }
    });

    /* Resume on return, but only if the level is still live. */
    onBoot(document, 'visibilitychange', function () {
      if (!document.hidden && state && !over && !running) {
        running = true;
        lastT = 0;
        raf = requestAnimationFrame(loop);
      }
    });

    toMenu();
    if (!Save.seen('how')) UI.showHow(function () { toMenu(); });

    /* Exposed for the headless browser harness. */
    global.CCState = function () { return state; };
    global.CCLevel = function (id) { startLevel(id, false); };
    global.CCEndless = function () { startLevel(D.LEVELS[0].id, true); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
