/* Amber's Boardwalk — DOM rendering, animations & event playback.
 * Plain script; exposes window.MPUI. No game logic lives here.
 */
(function (global) {
  'use strict';

  var D = global.MPData;

  var el = {};
  var state = null;
  var tokenEls = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    el.board = $('board'); el.tokens = $('tokens'); el.players = $('players');
    el.log = $('log'); el.round = $('round-num'); el.status = $('status');
    el.turnChip = $('turn-chip'); el.dieA = $('die-a'); el.dieB = $('die-b');
    el.btnRoll = $('btn-roll'); el.hint = $('hint');
  }

  function setState(s) {
    if (!state && s) { /* first time */ }
    state = s;
  }
  function getState() { return state; }

  // ---------- board construction ----------
  function buildBoard() {
    Array.prototype.slice.call(el.board.querySelectorAll('.tile')).forEach(function (n) { n.remove(); });
    for (var i = 0; i < D.BOARD.length; i++) {
      var sp = D.BOARD[i];
      var t = document.createElement('div');
      t.className = 'tile' + (isCorner(sp) ? ' corner' : '');
      t.dataset.pos = sp.id;
      t.style.gridRow = String(sp.r + 1);
      t.style.gridColumn = String(sp.c + 1);
      var html = '<div class="t-emoji">' + sp.emoji + '</div>' +
                 '<div class="t-name">' + sp.name + '</div>';
      if (sp.type === 'property') {
        html = '<div class="strip" style="background:' + D.GROUPS[sp.group].color + '"></div>' +
               '<div class="t-emoji">' + sp.emoji + '</div>' +
               '<div class="t-name">' + sp.name + '</div>' +
               '<div class="t-price">$' + sp.price + '</div>' +
               '<div class="stars"></div>';
      } else if (sp.type === 'oops') {
        html += '<div class="t-price">-$' + sp.fine + '</div>';
      }
      t.innerHTML = html;
      el.board.appendChild(t);
    }
  }

  function isCorner(sp) {
    return (sp.r % (D.GRID - 1) === 0) && (sp.c % (D.GRID - 1) === 0);
  }

  function tileEl(pos) { return el.board.querySelector('.tile[data-pos="' + pos + '"]'); }

  function renderTiles(s) {
    var i, sp;
    for (i = 0; i < D.BOARD.length; i++) {
      sp = D.BOARD[i];
      if (sp.type !== 'property') continue;
      var t = tileEl(i); if (!t) continue;
      var o = s.owned[i];
      var starsEl = t.querySelector('.stars');
      var priceEl = t.querySelector('.t-price');
      if (o) {
        t.classList.add('owned');
        var color = D.GROUPS[sp.group].color;
        t.style.boxShadow = 'inset 0 0 0 2px ' + color;
        priceEl.textContent = '$' + sp.price;
        starsEl.textContent = o.stars > 0 ? '\u2B50'.repeat(o.stars) : '';
      } else {
        t.classList.remove('owned');
        t.style.boxShadow = '';
        starsEl.textContent = '';
      }
    }
  }

  // ---------- tokens ----------
  function buildTokens(s) {
    el.tokens.innerHTML = '';
    tokenEls = {};
    s.players.forEach(function (p) {
      var t = document.createElement('div');
      t.className = 'token';
      t.textContent = p.emoji;
      t.title = p.name;
      el.tokens.appendChild(t);
      tokenEls[p.id] = t;
    });
    placeAllTokens();
  }

  function placeToken(p, idx, count) {
    var sp = D.BOARD[p.pos];
    var xBase = (sp.c + 0.5) / D.GRID * 100;
    var yBase = (sp.r + 0.5) / D.GRID * 100;
    var dx = count > 1 ? (idx - (count - 1) / 2) * 4.4 : 0;
    var dy = count > 2 ? (idx % 2 === 0 ? -2.6 : 2.6) : 0;
    var tk = tokenEls[p.id]; if (!tk) return;
    tk.style.left = 'calc(' + xBase + '% + ' + dx + '%)';
    tk.style.top = 'calc(' + yBase + '% + ' + dy + '%)';
  }

  function placeAllTokens() {
    if (!state) return;
    var byPos = {};
    state.players.forEach(function (p) {
      (byPos[p.pos] = byPos[p.pos] || []).push(p);
    });
    Object.keys(byPos).forEach(function (pos) {
      byPos[pos].forEach(function (p, idx) { placeToken(p, idx, byPos[pos].length); });
    });
  }

  function hopToken(pid, pos) {
    return new Promise(function (resolve) {
      var sp = D.BOARD[pos];
      var tk = tokenEls[pid]; if (!tk) return resolve();
      var xBase = (sp.c + 0.5) / D.GRID * 100;
      tk.style.left = 'calc(' + xBase + '%)';
      tk.style.top = ((sp.r + 0.5) / D.GRID * 100) + '%';
      tk.classList.remove('hop'); void tk.offsetWidth; tk.classList.add('hop');
      setTimeout(resolve, 170);
    });
  }

  // ---------- panel / top ----------
  function renderPlayers(s) {
    el.players.innerHTML = '';
    var curId = s.phase === 'over' ? -1 : currentPlayerId(s);
    s.players.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'player-row' + (p.id === curId ? ' active' : '') + (p.alive ? '' : ' out');
      row.dataset.pid = p.id;
      var dots = '';
      for (var key in s.owned) {
        if (s.owned[key].owner !== p.id) continue;
        var osp = D.BOARD[+key];
        var st = s.owned[key].stars;
        dots += '<span class="prop-dot" style="background:' + D.GROUPS[osp.group].color + '">' +
                (st > 0 ? '<i>\u2B50</i>' : '') + '</span>';
      }
      row.innerHTML =
        '<span class="face">' + p.emoji + '</span>' +
        '<span class="pname">' + p.name + (p.isBot ? '' : ' (you)') + '</span>' +
        '<span class="props-mini">' + dots + '</span>' +
        '<span class="cash">$' + p.cash + '</span>';
      el.players.appendChild(row);
    });
  }

  function currentPlayerId(s) { return s.order[s.ptr]; }

  function pulseCash(pid, up) {
    var row = el.players.querySelector('.player-row[data-pid="' + pid + '"] .cash');
    if (!row) return;
    row.classList.remove('pulse-up', 'pulse-down'); void row.offsetWidth;
    row.classList.add(up ? 'pulse-up' : 'pulse-down');
  }

  function renderTop(s) {
    el.round.textContent = String(Math.min(s.round, D.ROUND_LIMIT));
    var cur = s.players[currentPlayerId(s)];
    if (s.phase === 'over') {
      var w = s.players[s.winner];
      el.turnChip.innerHTML = '<span class="face">' + w.emoji + '</span> ' + w.name + ' wins!';
      setStatus(w.name + ' wins the Boardwalk! \uD83C\uDF89');
    } else {
      el.turnChip.innerHTML = '<span class="face">' + cur.emoji + '</span> ' +
        (cur.isBot ? cur.name + "'s turn…" : 'Your turn!');
    }
    if (s.dice) {
      el.dieA.textContent = dieFace(s.dice.d1);
      el.dieB.textContent = dieFace(s.dice.d2);
    }
  }

  function dieFace(n) { return '\u2680\u2681\u2682\u2683\u2684\u2685'.charAt(n - 1); }

  function setStatus(txt) { el.status.textContent = txt; }
  function setHint(txt) { el.hint.textContent = txt || ''; }
  function setRollEnabled(v, label) {
    el.btnRoll.disabled = !v;
    if (label) el.btnRoll.innerHTML = label;
  }
  function shakeDice(on) {
    el.dieA.classList.toggle('shake', !!on);
    el.dieB.classList.toggle('shake', !!on);
  }

  function addLog(msg) {
    var p = document.createElement('p');
    p.textContent = msg;
    el.log.insertBefore(p, el.log.firstChild);
    while (el.log.children.length > 40) el.log.removeChild(el.log.lastChild);
  }

  function flashTile(pos) {
    var t = tileEl(pos); if (!t) return;
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
  }
  function starPop(pos) {
    var t = tileEl(pos); if (!t) return;
    t.classList.remove('star-pop'); void t.offsetWidth; t.classList.add('star-pop');
  }

  function toast(msg) {
    var layer = $('toast-layer');
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    layer.appendChild(t);
    setTimeout(function () { t.remove(); }, 1500);
  }

  function confettiBurst(host) {
    var emojis = ['\u2B50', '\uD83C\uDF89', '\uD83C\uDF86', '\uD83C\uDF87', '\uD83E\uDD73'];
    for (var i = 0; i < 24; i++) {
      var c = document.createElement('span');
      c.className = 'confetti';
      c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      c.style.left = Math.random() * 100 + '%';
      c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      host.appendChild(c);
      (function (node) { setTimeout(function () { node.remove(); }, 3600); })(c);
    }
  }

  function renderAll(s) {
    setState(s);
    renderTiles(s);
    renderPlayers(s);
    renderTop(s);
    placeAllTokens();
  }

  // ---------- event playback ----------
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function playEvents(evs, opts) {
    opts = opts || {};
    var fast = !!opts.fast;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      switch (e.type) {
        case 'roll':
          shakeDice(true);
          global.MPAudio.play('dice');
          await sleep(fast ? 350 : 550);
          shakeDice(false);
          el.dieA.textContent = dieFace(e.d1);
          el.dieB.textContent = dieFace(e.d2);
          break;
        case 'hop':
          global.MPAudio.play(e.pos % 2 === 0 ? 'hop' : 'click');
          await hopToken(e.pid, e.pos);
          break;
        case 'passStart':
          global.MPAudio.play('coin');
          toast('+$' + e.amount + ' lap bonus!');
          pulseCash(e.pid, true);
          break;
        case 'money':
          if (state) renderPlayers(state);
          if (e.delta < 0) global.MPAudio.play(e.reason === 'rent' ? 'sad' : 'click');
          else global.MPAudio.play('coin');
          break;
        case 'rentPaid':
          toast('$' + e.amount + ' rent \u2192 ' + state.players[e.to].name);
          break;
        case 'card':
          global.MPAudio.play('card');
          showCardPopup(e.icon, e.text, opts.botTurn);
          await waitOverlayClose('card-overlay');
          break;
        case 'star':
          global.MPAudio.play('star');
          starPop(e.pos);
          toast('\u2B50 added at ' + D.BOARD[e.pos].name + '!');
          if (state) renderTiles(state);
          break;
        case 'buy':
          global.MPAudio.play('buy');
          if (state) renderTiles(state);
          toast(D.BOARD[e.pos].emoji + ' ' + D.BOARD[e.pos].name + ' bought!');
          break;
        case 'timeout':
          global.MPAudio.play('thud');
          break;
        case 'eliminated':
          global.MPAudio.play('sad');
          toast(state.players[e.pid].name + ' went home \uD83E\uDD72');
          if (state) { renderTiles(state); renderPlayers(state); }
          break;
        case 'extraRoll':
          toast('Doubles! Roll again! \u2684');
          break;
        case 'winner':
          global.MPAudio.play('fanfare');
          break;
        default:
          break;
      }
      if (e.type !== 'log') continue;
      addLog(e.msg);
    }
  }

  function showCardPopup(icon, text, botTurn) {
    $('card-icon').textContent = icon;
    $('card-text').textContent = text;
    $('btn-card-ok').textContent = botTurn ? "Nice! 😊" : 'OK! 😊';
    $('card-overlay').classList.remove('hidden');
  }
  function hideOverlay(id) { $(id).classList.add('hidden'); }

  function waitOverlayClose(id) {
    return new Promise(function (resolve) {
      var ov = $(id);
      var btn = ov.querySelector('button');
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        btn.removeEventListener('click', finish);
        ov.classList.add('hidden');
        resolve();
      }
      btn.addEventListener('click', finish);
      setTimeout(finish, 2400); // never block the game on a tap
    });
  }
  global.MPUI = {
    init: init,
    setState: setState,
    getState: getState,
    buildBoard: buildBoard,
    buildTokens: buildTokens,
    renderAll: renderAll,
    renderTiles: renderTiles,
    renderPlayers: renderPlayers,
    renderTop: renderTop,
    setStatus: setStatus,
    setHint: setHint,
    setRollEnabled: setRollEnabled,
    shakeDice: shakeDice,
    addLog: addLog,
    flashTile: flashTile,
    toast: toast,
    confettiBurst: confettiBurst,
    playEvents: playEvents,
    showCardPopup: showCardPopup,
    hideOverlay: hideOverlay
  };
})(typeof window !== 'undefined' ? window : globalThis);
