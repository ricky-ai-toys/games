/* Amber's Candy Castle — DOM overlays and in-level HUD.
 * Stage/level select, results, and the in-game chrome. Reads engine values that
 * main.js hands it; knows nothing about the simulation.
 */
(function (global) {
  'use strict';

  var D = global.CCData;
  var Save = global.CCSave;

  var overlay = null, hud = null, toasts = null, refs = {};
  var last = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function put(key, node, prop, value) {
    if (last[key] === value) return;
    last[key] = value;
    node[prop] = value;
  }

  function mount() {
    overlay = document.getElementById('overlay');
    hud = document.getElementById('hud');
    toasts = document.getElementById('toasts');
    if (!overlay) throw new Error('castle: missing #overlay');
  }

  function show(html) {
    overlay.innerHTML = html;
    overlay.hidden = false;
    overlay.classList.add('is-open');
  }
  function hide() {
    overlay.hidden = true;
    overlay.classList.remove('is-open');
    overlay.innerHTML = '';
  }
  function isOpen() { return overlay && !overlay.hidden; }

  var toastTimers = [];
  function toast(text, kind) {
    if (!toasts) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = text;
    toasts.appendChild(el);
    var t = setTimeout(function () {
      var i = toastTimers.indexOf(t);
      if (i >= 0) toastTimers.splice(i, 1);
      try { el.remove(); } catch (e) { /* detached */ }
    }, 1400);
    toastTimers.push(t);
  }
  function clearToasts() {
    toastTimers.forEach(clearTimeout);
    toastTimers.length = 0;
    if (toasts) toasts.innerHTML = '';
  }

  /* ------------------------------------------------------------- menus */

  function starRow(n, of) {
    var s = '';
    for (var i = 0; i < (of || 3); i++) s += i < n ? '<span class="star on">★</span>' : '<span class="star">★</span>';
    return s;
  }

  function showMenu(onPlay, onEndless) {
    var total = Save.totalStars();
    var maxStars = D.LEVELS.length * 3;
    var html = '<div class="panel panel--menu">' +
      '<div class="brand">Amber\'s Arcade</div>' +
      '<h1 class="title">Candy Castle</h1>' +
      '<p class="sub">Build the road. Place the towers.<br>Hold the gate for every wave.</p>' +
      '<div class="progress-line">' +
        '<span class="stars-total">' + starRow(total, maxStars) + '</span>' +
        '<span class="stars-count">' + total + ' / ' + maxStars + '</span>' +
      '</div>';

    D.STAGES.forEach(function (st, si) {
      html += '<div class="stage' + (si ? '' : ' stage--first') + '">' +
        '<h3 class="stage-name">' + esc(st.name) + '</h3>' +
        '<div class="stage-blurb">' + esc(st.blurb) + '</div>' +
        '<div class="level-row">';
      st.levels.forEach(function (lv) {
        var unlocked = Save.isUnlocked(lv.index, lv.id);
        var stars = Save.starsFor(lv.id);
        html += unlocked
          ? '<button class="lvl-card" data-id="' + lv.id + '" type="button">' +
              '<span class="lvl-title">' + esc(lv.name) + '</span>' +
              '<span class="lvl-stars">' + starRow(stars) + '</span>' +
              '<span class="lvl-best">best ' + Save.bestFor(lv.id) + '</span>' +
            '</button>'
          : '<div class="lvl-card is-locked" aria-disabled="true">' +
              '<span class="lvl-title">🔒 Locked</span>' +
              '<span class="lvl-stars">' + starRow(0) + '</span>' +
              '<span class="lvl-best">clear the level before</span>' +
            '</div>';
      });
      html += '</div></div>';
    });

    html += '<div class="stack">' +
      (Save.unlockedEndless()
        ? '<button class="btn btn--endless" id="endlessBtn" type="button">♾ Endless</button>'
        : '') +
      '<a class="btn btn--ghost" href="../portal.html">← Games</a>' +
    '</div></div>';
    show(html);

    overlay.querySelectorAll('.lvl-card[data-id]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (global.CCAudio) global.CCAudio.unlock();
        onPlay(b.getAttribute('data-id'));
      });
    });
    var eb = overlay.querySelector('#endlessBtn');
    if (eb) eb.addEventListener('click', function () {
      if (global.CCAudio) global.CCAudio.unlock();
      onEndless();
    });
  }

  function showHow(onBack) {
    show('<div class="panel">' +
      '<h2 class="title title--sm">How to defend</h2>' +
      '<ul class="how">' +
        '<li><b>Walls bend the road.</b> Enemies always walk the <i>shortest</i> open route, so every wall you buy makes them walk further — and towers need time to shoot.</li>' +
        '<li><b>Walls are cheap, towers are not.</b> Spend everything on road and nothing dies. Spend everything on towers and everything gets through. The split is the game.</li>' +
        '<li><b>Draw lines, not dots.</b> A wall on its own barely slows anything. A line of walls across the board makes the road detour a long way.</li>' +
        '<li><b>You can never seal the gate.</b> If a placement would cut the road too short, it is refused and tells you why.</li>' +
        '<li><b>Build the road length on the left</b> — that is your score beyond the stars.</li>' +
      '</ul>' +
      '<button class="btn btn--primary" id="backBtn" type="button">Got it</button>' +
    '</div>');
    Save.markSeen('how');
    var b = overlay.querySelector('#backBtn');
    if (b) b.addEventListener('click', onBack);
  }

  function showResult(state, diffLabel, onAgain, onMenu) {
    var won = state.result === 'won';
    var lv = state.level;
    var isNew = Save.recordResult(lv.id, state.stars, state.score);
    var road = Math.round(state.grid.routeLength);
    var target = lv.targetPath;

    if (state.endless) Save.recordEndless(state.waveIdx + 1, state.score);

    var rows = [
      ['Score', state.score.toLocaleString()],
      ['Waves cleared', state.endless ? (state.waveIdx + 1) : (state.waveIdx + 1) + ' / ' + lv.waveCount],
      ['Longest road', road + ' cells' + (target ? ' (goal ' + target + ')' : '')],
      ['Castle left', state.lives + ' / ' + state.maxLives],
      ['Enemies stopped', state.kills]
    ].map(function (r) {
      return '<div class="stat"><span class="stat-k">' + esc(r[0]) + '</span><span class="stat-v">' + esc(r[1]) + '</span></div>';
    }).join('');

    show('<div class="panel panel--over">' +
      '<div class="over-ico">' + (won ? '👑' : '🏰') + '</div>' +
      '<h2 class="title title--sm ' + (won ? 'is-win' : 'is-lose') + '">' +
        (state.endless ? (won ? 'Endless cleared!' : 'Endless run') : (won ? esc(lv.name) + ' cleared!' : 'Overrun')) +
      '</h2>' +
      (won && !state.endless
        ? '<div class="big-stars">' + starRow(state.stars) + '</div>'
        : '') +
      '<p class="sub">' +
        (won ? 'Nothing got through.'
              : state.lives <= 0 ? 'The castle fell. Try a longer road before wave ' + (state.waveIdx + 1) + '.'
              : 'The waves ran out.') +
      '</p>' +
      (isNew ? '<div class="badge">New best!</div>' : '') +
      '<div class="stats">' + rows + '</div>' +
      '<div class="stack">' +
        '<button class="btn btn--primary" id="againBtn" type="button">' + (won ? 'Play again' : 'Try again') + '</button>' +
        '<button class="btn btn--ghost" id="menuBtn" type="button">Level select</button>' +
        '<a class="btn btn--ghost" href="../portal.html">← Games</a>' +
      '</div>' +
    '</div>');
    var a = overlay.querySelector('#againBtn');
    var m = overlay.querySelector('#menuBtn');
    if (a) a.addEventListener('click', onAgain);
    if (m) a && m.addEventListener('click', onMenu);
  }

  /* ---------------------------------------------------------------- HUD */

  function showHud(level) {
    if (!hud) return;
    last = {};
    hud.hidden = false;
    var unlocked = level ? level.unlock : ['arrow'];
    /* The wall button is FIRST and always present. Without it the entire
     * "walls bend the road" mechanic is unreachable — the picker only offered
     * towers, so every tap built a tower and the road could never be lengthened.
     */
    var picker = '<button class="picker picker--wall' + (level ? '' : ' is-on') + '" data-item="wall" type="button">' +
      '<span class="picker-cost">' + D.TUNE.wallCost + '</span>' +
      '<span class="picker-name">Wall</span>' +
      '<span class="picker-crew">bends the road</span>' +
    '</button>' + unlocked.map(function (id) {
      var spec = D.tower(id);
      return '<button class="picker" data-item="' + id + '" type="button">' +
        '<span class="picker-cost">' + spec.cost + '</span>' +
        '<span class="picker-name">' + esc(spec.name) + '</span>' +
        '<span class="picker-crew">' + esc(spec.crew) + '</span>' +
      '</button>';
    }).join('');

    hud.innerHTML = '' +
      '<div class="hud-tl">' +
        '<div class="chip chip--gold" id="hGold">0</div>' +
        '<div class="chip chip--hearts" id="hHearts"></div>' +
      '</div>' +
      '<div class="hud-tc">' +
        '<div class="wave-label" id="hWave">Wave 1 / 6</div>' +
        '<div class="wave-bar"><div class="wave-fill" id="hWaveFill"></div></div>' +
        '<div class="wave-sub" id="hWaveSub"></div>' +
      '</div>' +
      '<div class="hud-tr">' +
        '<button class="icon" id="hMute" type="button" aria-label="Toggle sound">🔊</button>' +
        '<button class="icon" id="hQuit" type="button" aria-label="Back to levels">✕</button>' +
      '</div>' +
      '<div class="hud-bl">' +
        '<div class="picker-label">BUILD</div>' +
        '<div class="picker-row" id="hPicker">' + picker + '</div>' +
        '<div class="road" id="hRoad"></div>' +
      '</div>' +
      '<div class="hud-br">' +
        '<button class="btn btn--wave" id="hWaveBtn" type="button">Start wave</button>' +
      '</div>' +
      '<div class="hint" id="hHint"></div>';

    refs.gold = document.getElementById('hGold');
    refs.hearts = document.getElementById('hHearts');
    refs.wave = document.getElementById('hWave');
    refs.waveFill = document.getElementById('hWaveFill');
    refs.waveSub = document.getElementById('hWaveSub');
    refs.mute = document.getElementById('hMute');
    refs.quit = document.getElementById('hQuit');
    refs.picker = document.getElementById('hPicker');
    refs.road = document.getElementById('hRoad');
    refs.waveBtn = document.getElementById('hWaveBtn');
    refs.hint = document.getElementById('hHint');
    syncMute();
  }

  function hideHud() { if (hud) { hud.hidden = true; hud.innerHTML = ''; refs = {}; } }

  function syncMute() {
    if (!refs.mute) return;
    refs.mute.textContent = (global.CCAudio && global.CCAudio.isMuted()) ? '🔇' : '🔊';
  }

  function markSelected(item) {
    if (!refs.picker) return;
    refs.picker.querySelectorAll('.picker').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-item') === item);
      var item = b.getAttribute('data-item');
      b.classList.toggle('is-poor', !b.classList.contains('is-on') && global.CCRules &&
        global.CCSave && false);
    });
  }

  function updateHud(state) {
    if (!refs.gold) return;
    put('gold', refs.gold, 'textContent', String(Math.floor(state.gold)));

    /* 30 separate heart glyphs spanned the whole width of the screen. A compact
     * count plus a bar reads the same and costs one line. */
    var hearts = '<span class="heart-ico">♥</span>' + state.lives +
      '<span class="heart-max">/' + state.maxLives + '</span>' +
      '<span class="heart-bar"><i style="width:' +
      Math.round((state.lives / state.maxLives) * 100) + '%"></i></span>';
    put('hearts', refs.hearts, 'innerHTML', hearts);

    put('wave', refs.wave, 'textContent', R_label(state));
    var total = state.endless ? Infinity : state.level.waveCount;
    var done = state.waveIdx + (state.wavePhase === 'prep' || state.wavePhase === 'between' ? 0 : 1);
    put('waveFill', refs.waveFill, 'style.width',
      isFinite(total) ? Math.min(100, (done / total) * 100).toFixed(1) + '%' : '100%');

    var sub = '';
    if (state.wavePhase === 'prep') sub = 'Build your road, then start';
    else if (state.wavePhase === 'between') sub = 'Next wave in ' + Math.ceil(state.waveT) + 's';
    else sub = state.enemies.length + ' left on the road';
    put('waveSub', refs.waveSub, 'textContent', sub);

    var btnLabel = 'Start wave';
    var canStart = state.wavePhase === 'prep' || state.wavePhase === 'between';
    if (!canStart) btnLabel = 'Fighting…';
    put('waveBtn', refs.waveBtn, 'textContent', btnLabel);
    if (refs.waveBtn.classList.contains('is-off') !== !canStart) {
      refs.waveBtn.classList.toggle('is-off', !canStart);
    }

    var route = Math.round(state.grid.routeLength);
    var target = state.grid.targetPath || 0;
    var met = target > 0 && route >= target;
    put('road', refs.road, 'innerHTML',
      '<span class="road-k">ROAD</span> <span class="road-v' + (met ? ' is-met' : '') + '">' + route + '</span>' +
      (target ? '<span class="road-t">' + (met ? 'goal met' : 'goal ' + target) + '</span>' : ''));

    if (state.hint) put('hint', refs.hint, 'textContent', state.hint);
  }

  function R_label(state) {
    return state.endless ? 'Wave ' + (state.waveIdx + 1) : 'Wave ' + Math.max(1, state.waveIdx + 1) + ' / ' + state.level.waveCount;
  }

  function setHint(text) { if (refs.hint) put('hint', refs.hint, 'textContent', text || ''); }

  global.CCUI = {
    mount: mount,
    show: show,
    hide: hide,
    isOpen: isOpen,
    showMenu: showMenu,
    showHow: showHow,
    showResult: showResult,
    showHud: showHud,
    hideHud: hideHud,
    updateHud: updateHud,
    setHint: setHint,
    markSelected: markSelected,
    syncMute: syncMute,
    toast: toast,
    clearToasts: clearToasts,
    refs: function () { return refs; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
