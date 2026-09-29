/* Amber's Shark Hunt — DOM overlays and HUD.
 * Level select, how-to-play, pause, results, and the in-game HUD.
 * Knows nothing about engine internals beyond the values main.js hands it.
 */
(function (global) {
  'use strict';

  var D = global.SHData;
  var Save = global.SHSave;

  var root = null, overlay = null, hud = null, toastBox = null;
  var refs = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    root = document.getElementById('app');
    overlay = document.getElementById('overlay');
    hud = document.getElementById('hud');
    toastBox = document.getElementById('toasts');
    if (!root || !overlay) throw new Error('shark: missing #app or #overlay');
  }

  /* ------------------------------------------------------------- toasts */

  var toastTimers = [];
  function toast(text, kind) {
    if (!toastBox) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = text;
    toastBox.appendChild(el);
    var t = setTimeout(function () {
      toastTimers.splice(toastTimers.indexOf(t), 1);
      try { el.remove(); } catch (e) { /* already detached */ }
    }, 1100);
    toastTimers.push(t);
  }

  function clearToasts() {
    toastTimers.forEach(clearTimeout);
    toastTimers.length = 0;
    if (toastBox) toastBox.innerHTML = '';
  }

  /* ------------------------------------------------------------- helpers */

  function hearts(life, base) {
    var out = '';
    for (var i = 0; i < base; i++) out += i < life ? '❤️' : '<span class="ghost">🤍</span>';
    /* Bonus hearts above the starting allowance get a badge, so the player can
     * see what a Heart relic actually bought them. The old file rendered
     * "x7" and silently dropped the baseline. */
    if (life > base) out += '<span class="hearts-extra">+' + (life - base) + '</span>';
    return out;
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* Audio must never be able to block navigation. The old wiring called a
   * SHAudio.click() that did not exist, so "Got it" on the help screen threw
   * and the player was stuck there forever. */
  function clickSfx() {
    try {
      if (global.SHAudio && global.SHAudio.play) global.SHAudio.play('click');
    } catch (e) { /* ignore */ }
  }

  function show(html) {
    overlay.innerHTML = html;
    overlay.classList.add('is-open');
    overlay.hidden = false;
  }

  function hide() {
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  function isOpen() {
    return overlay && !overlay.hidden;
  }

  /* ------------------------------------------------------------- screens */

  function showMenu(onPlay) {
    var cards = D.DIFF_KEYS.map(function (k) {
      var cfg = D.DIFF[k];
      var b = Save.best(k);
      var w = Save.wins(k);
      return '' +
        '<button class="lvl lvl--' + k + '" data-lvl="' + k + '" type="button">' +
          '<span class="lvl-ico" aria-hidden="true">' +
            (k === 'easy' ? '🐠' : k === 'med' ? '🦈' : '🐋') +
          '</span>' +
          '<span class="lvl-body">' +
            '<span class="lvl-name">' + esc(cfg.label) + '</span>' +
            '<span class="lvl-blurb">' + esc(cfg.blurb) + '</span>' +
            '<span class="lvl-stats">' +
              '<span>🏆 ' + b + '</span>' +
              '<span>📏 ' + Save.bestSize(k) + '</span>' +
              '<span>👑 ' + w + '</span>' +
            '</span>' +
          '</span>' +
          '<span class="lvl-tip">' + esc(cfg.tip) + '</span>' +
        '</button>';
    }).join('');

    show('' +
      '<div class="panel panel--menu">' +
        '<div class="brand">Amber\'s Arcade</div>' +
        '<h1 class="title">Shark Hunt</h1>' +
        '<p class="sub">Eat, grow, and hold the apex.<br>The ocean has one predator above you — and it is watching.</p>' +
        '<div class="legend">' +
          '<span><i class="dot dot--safe"></i>green ring = safe to eat</span>' +
          '<span><i class="dot dot--danger"></i>red ring = will hurt you</span>' +
          '<span><i class="dot dot--gold"></i>gold = bonus</span>' +
        '</div>' +
        '<div class="levels">' + cards + '</div>' +
        '<div class="menu-actions">' +
          '<button class="btn btn--ghost" id="howBtn" type="button">How to hunt</button>' +
          '<a class="btn btn--ghost" href="../portal.html">← Games</a>' +
        '</div>' +
      '</div>');

    var panel = overlay.querySelector('.panel');
    Array.prototype.forEach.call(panel.querySelectorAll('.lvl'), function (btn) {
      btn.addEventListener('click', function () {
        if (global.SHAudio) global.SHAudio.unlock();
        onPlay(btn.getAttribute('data-lvl'));
      });
    });
    var how = overlay.querySelector('#howBtn');
    if (how) how.addEventListener('click', function () { clickSfx(); showHelp(onPlay); });
  }

  function showHelp(onBack) {
    show('' +
      '<div class="panel">' +
        '<div class="brand">Amber\'s Arcade</div>' +
        '<h2 class="title title--sm">How to hunt</h2>' +
        '<ul class="how">' +
          '<li><b>Swim</b> — drag anywhere on touch, or move the mouse on desktop. Keyboard: WASD or arrows.</li>' +
          '<li><b>Eat what is smaller.</b> A green ring means safe. Eat enough to grow through six sizes.</li>' +
          '<li><b>Dash</b> — the ⚡ button, or Shift. It makes you briefly untouchable.</li>' +
          '<li><b>Bite</b> — the 🦷 button, or Space. Bites score more and reach further.</li>' +
          '<li><b>Relics</b> — grab the glowing pickups. Some have a timer; the ring around them is the countdown.</li>' +
          '<li><b>The apex</b> — at the top size a great white arrives. It circles, <b class="c-danger">growls and rears back</b>, then charges along the red line. <b class="c-safe">Dash the moment it growls.</b></li>' +
          '<li><b>Strike back</b> — while it recovers its tail glows. Bite it for bonus points.</li>' +
          '<li><b>Hold for 8 seconds</b> to win. Watch the top bar.</li>' +
        '</ul>' +
        '<button class="btn btn--primary" id="backBtn" type="button">Got it</button>' +
      '</div>');
    Save.markTutorialSeen();
    var back = overlay.querySelector('#backBtn');
    if (back) back.addEventListener('click', function () { clickSfx(); onBack(); });
  }

  function showPause(onResume, onQuit) {
    show('' +
      '<div class="panel panel--sm">' +
        '<h2 class="title title--sm">Paused</h2>' +
        '<div class="stack">' +
          '<button class="btn btn--primary" id="resumeBtn" type="button">Resume</button>' +
          '<button class="btn btn--ghost" id="quitBtn" type="button">Back to menu</button>' +
        '</div>' +
      '</div>');
    var r = overlay.querySelector('#resumeBtn');
    var q = overlay.querySelector('#quitBtn');
    if (r) r.addEventListener('click', onResume);
    if (q) q.addEventListener('click', onQuit);
  }

  function showOver(result, state, diffKey, onAgain, onMenu) {
    var cfg = D.DIFF[diffKey];
    var prevBest = Save.best(diffKey);
    var won = result === 'win';
    var isBest = state.score > 0 && state.score >= prevBest;

    if (state.score >= prevBest) Save.setBest(diffKey, state.score);
    Save.setBestSize(diffKey, state.size);
    if (won) Save.addWin(diffKey);

    var rows = [
      ['Score', state.score.toLocaleString()],
      ['Size reached', state.size + ' · ' + D.SIZE_NAMES[state.size]],
      ['Best chain', state.bestChain + 'x'],
      ['Near misses', state.near],
      ['Time', fmtTime(state.t)]
    ].map(function (r) {
      return '<div class="stat"><span class="stat-k">' + esc(r[0]) + '</span><span class="stat-v">' + esc(r[1]) + '</span></div>';
    }).join('');

    show('' +
      '<div class="panel panel--over">' +
        '<div class="over-ico" aria-hidden="true">' + (won ? '👑' : '🦈') + '</div>' +
        '<h2 class="title title--sm ' + (won ? 'is-win' : 'is-lose') + '">' +
          (won ? 'Apex!' : 'Hunt over') +
        '</h2>' +
        '<p class="sub">' +
          (won
            ? 'You held the ocean. Nothing out there is bigger than you.'
            : state.holding
              ? 'The great white got you. Watch the growl and dash early.'
              : 'You never reached the top. Eat the big fish to grow faster.') +
        '</p>' +
        (isBest ? '<div class="badge">New best!</div>' : '') +
        '<div class="stats">' + rows + '</div>' +
        '<div class="stack">' +
          '<button class="btn btn--primary" id="againBtn" type="button">Hunt again</button>' +
          '<button class="btn btn--ghost" id="menuBtn" type="button">Menu</button>' +
          '<a class="btn btn--ghost" href="../portal.html">← Games</a>' +
        '</div>' +
      '</div>');

    var a = overlay.querySelector('#againBtn');
    var m = overlay.querySelector('#menuBtn');
    if (a) a.addEventListener('click', onAgain);
    if (m) m.addEventListener('click', onMenu);
  }

  /* ---------------------------------------------------------------- HUD */

  function showHud() {
    if (!hud) return;
    hud.hidden = false;
    hud.innerHTML = '' +
      '<div class="hud-zone hud-zone--tl">' +
        '<div class="score" id="hudScore">0</div>' +
        '<div class="combo" id="hudCombo" hidden><span id="hudComboN">0</span><span class="combo-lbl">combo</span><span id="hudComboMult">×1</span></div>' +
      '</div>' +
      '<div class="hud-zone hud-zone--tc">' +
        '<div class="bar-label" id="hudBarLabel">GROW TO APEX</div>' +
        '<div class="bar"><div class="bar-fill" id="hudBarFill"></div></div>' +
        '<div class="bar-sub" id="hudBarSub"></div>' +
      '</div>' +
      '<div class="hud-zone hud-zone--tr">' +
        '<div class="hearts" id="hudHearts"></div>' +
        '<div class="hud-btns">' +
          '<button class="icon" id="muteBtn" type="button" aria-label="Toggle sound">🔊</button>' +
          '<button class="icon" id="pauseBtn" type="button" aria-label="Pause">⏸</button>' +
        '</div>' +
      '</div>' +
      '<div class="hud-zone hud-zone--bl">' +
        '<div class="pills" id="hudPills"></div>' +
        '<div class="hint" id="hudHint"></div>' +
      '</div>' +
      '<div class="hud-zone hud-zone--br">' +
        '<button class="fab fab--dash" id="dashBtn" type="button" aria-label="Dash">' +
          '<span class="fab-ring"></span><span class="fab-ico">⚡</span>' +
        '</button>' +
        '<button class="fab fab--bite" id="biteBtn" type="button" aria-label="Bite">' +
          '<span class="fab-ring"></span><span class="fab-ico">🦷</span>' +
        '</button>' +
      '</div>' +
      '<div class="joystick" id="joystick" hidden><span class="joy-base"></span><span class="joy-stick"></span></div>';

    refs.score = document.getElementById('hudScore');
    refs.combo = document.getElementById('hudCombo');
    refs.comboMult = document.getElementById('hudComboMult');
    refs.comboN = document.getElementById('hudComboN');
    refs.hearts = document.getElementById('hudHearts');
    refs.barLabel = document.getElementById('hudBarLabel');
    refs.barFill = document.getElementById('hudBarFill');
    refs.barSub = document.getElementById('hudBarSub');
    refs.pills = document.getElementById('hudPills');
    refs.hint = document.getElementById('hudHint');
    refs.mute = document.getElementById('muteBtn');
    refs.pause = document.getElementById('pauseBtn');
    refs.dashBtn = document.getElementById('dashBtn');
    refs.biteBtn = document.getElementById('biteBtn');
    refs.joystick = document.getElementById('joystick');
    refs.joyBase = refs.joystick ? refs.joystick.querySelector('.joy-base') : null;
    refs.joyStick = refs.joystick ? refs.joystick.querySelector('.joy-stick') : null;

    syncMute();
  }

  function hideHud() {
    if (!hud) return;
    hud.hidden = true;
    hud.innerHTML = '';
    refs = {};
  }

  function syncMute() {
    if (!refs.mute) return;
    var m = global.SHAudio ? global.SHAudio.isMuted() : false;
    refs.mute.textContent = m ? '🔇' : '🔊';
  }

  /* Cached last-written values. The old file wrote six DOM properties plus two
   * querySelector+innerHTML parses for the cooldown labels every single frame. */
  var last = {};
  function put(key, node, prop, value) {
    if (last[key] === value) return;
    last[key] = value;
    node[prop] = value;
  }

  function updateHud(state, diffKey) {
    if (!refs.score) return;
    var cfg = D.DIFF[diffKey];
    var pr = 0;

    put('score', refs.score, 'textContent', state.score.toLocaleString());
    put('hearts', refs.hearts, 'innerHTML', hearts(state.life, cfg.life));

    /* Combo chip shows the multiplier actually in effect, not the raw count.
     * The old file labelled combo 2 as "x2" while scoring was still x1. */
    var mult = global.SHRules ? global.SHRules.multiplier(state) : 1;
    if (state.combo >= 2) {
      if (refs.combo.hidden) refs.combo.hidden = false;
      put('comboMult', refs.comboMult, 'textContent', '×' + mult);
      put('comboN', refs.comboN, 'textContent', state.combo);
      refs.combo.classList.toggle('is-hot', mult >= 3);
    } else if (!refs.combo.hidden) {
      refs.combo.hidden = true;
    }

    if (state.holding) {
      pr = Math.min(1, state.goal / D.HOLD_TIME);
      put('barLabel', refs.barLabel, 'textContent', 'APEX HOLD');
      put('barSub', refs.barSub, 'textContent', state.goal.toFixed(1) + 's / ' + D.HOLD_TIME + 's');
      refs.barFill.classList.add('is-apex');
    } else {
      pr = Math.min(1, state.xp / state.xpNeed);
      put('barLabel', refs.barLabel, 'textContent', 'GROW TO APEX');
      put('barSub', refs.barSub, 'textContent',
        'Grow ' + state.xp + '/' + state.xpNeed + ' · next ' + D.SIZE_NAMES[Math.min(D.MAX_SIZE, state.size + 1)]);
      refs.barFill.classList.remove('is-apex');
    }
    put('barFill', refs.barFill, 'style.width', (pr * 100).toFixed(1) + '%');

    /* Active powerup timers. */
    var pills = '';
    if (state.ward > 0) pills += '<span class="pill pill--ward">⭐ ' + state.ward.toFixed(1) + 's</span>';
    if (state.driftT > 0) pills += '<span class="pill pill--drift">⏳ ' + state.driftT.toFixed(1) + 's</span>';
    if (state.gillsT > 0) pills += '<span class="pill pill--gills">💨 ' + state.gillsT.toFixed(1) + 's</span>';
    if (state.frenzy > 0.5) pills += '<span class="pill pill--frenzy">FRENZY</span>';
    put('pills', refs.pills, 'innerHTML', pills);

    /* Contextual hint — teaches the mechanic at the moment it matters. */
    var hint = '';
    if (state.holding && state.apex) {
      if (state.apex.phase === 'telegraph') hint = '<b class="c-danger">DASH NOW!</b>';
      else if (state.apex.phase === 'recover') hint = 'Its tail is open — bite it!';
      else hint = 'Survive the great white';
    } else if (state.graceT > 0) {
      hint = 'Swim to eat the green-ringed fish';
    } else if (state.size >= 3) {
      hint = 'Bigger fish are worth more XP';
    }
    put('hint', refs.hint, 'innerHTML', hint);

    /* Cooldown rings via a custom property — no per-frame DOM text writes.
     * The old file ran two querySelector + innerHTML parses every frame just to
     * relabel these two buttons. */
    var dashReady = state.dashCD <= 0;
    var biteReady = state.biteCD <= 0;
    var dashTotal = D.TUNE.dashCooldown * (state.gillsT > 0 ? D.TUNE.gillsMult : 1);
    var dashFrac = dashReady ? '1' : (1 - state.dashCD / dashTotal).toFixed(3);
    var biteFrac = biteReady ? '1' : (1 - state.biteCD / D.TUNE.biteCooldown).toFixed(3);
    if (last.dashFrac !== dashFrac) {
      last.dashFrac = dashFrac;
      refs.dashBtn.style.setProperty('--ready', dashFrac);
      refs.dashBtn.classList.toggle('is-ready', dashReady);
    }
    if (last.biteFrac !== biteFrac) {
      last.biteFrac = biteFrac;
      refs.biteBtn.style.setProperty('--ready', biteFrac);
      refs.biteBtn.classList.toggle('is-ready', biteReady);
    }
  }

  var SHUI = {
    mount: mount,
    toast: toast,
    clearToasts: clearToasts,
    showMenu: showMenu,
    showHelp: showHelp,
    showPause: showPause,
    showOver: showOver,
    showHud: showHud,
    hideHud: hideHud,
    updateHud: updateHud,
    syncMute: syncMute,
    show: show,
    hide: hide,
    isOpen: isOpen,
    refs: function () { return refs; }
  };

  global.SHUI = SHUI;
})(typeof window !== 'undefined' ? window : globalThis);
