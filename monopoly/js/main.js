/* Amber's Boardwalk — bootstrapping, setup screen & turn driver.
 * Driver contract (mirrors js/rules.test.js):
 *   needsChoice -> resolve it; else canRoll -> roll; else endTurn.
 */
(function (global) {
  'use strict';

  var D = global.MPData, R = global.MPRules, B = global.MPBots,
      UI = global.MPUI, SFX = global.MPAudio, H = global.AmberHardening;

  var state = null;
  var busy = false;
  var pickedBuddies = { maple: true, finn: true, pip: false };

  function $(id) { return document.getElementById(id); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- stats ----------
  function loadStats() {
    return (H && H.getJSON('amber_monopoly_stats', null)) || { wins: 0, games: 0 };
  }
  function saveStats(s) { if (H) H.setJSON('amber_monopoly_stats', s); }
  function refreshStatLine() {
    var s = loadStats();
    $('stat-line').textContent = 'Wins: ' + s.wins + ' \u00B7 Games: ' + s.games;
  }

  // ---------- setup screen ----------
  function buildSetup() {
    var row = $('buddy-row');
    row.innerHTML = '';
    ['maple', 'finn', 'pip'].forEach(function (key) {
      var per = D.PERSONAS[key];
      var b = document.createElement('button');
      b.className = 'buddy' + (pickedBuddies[key] ? ' selected' : '');
      b.type = 'button';
      b.dataset.key = key;
      b.innerHTML = '<span class="face">' + per.emoji + '</span><span class="bname">' + per.name + '</span>';
      b.addEventListener('click', function () {
        pickedBuddies[key] = !pickedBuddies[key];
        b.classList.toggle('selected', pickedBuddies[key]);
        var n = buddyCount();
        if (n === 0) {
          pickedBuddies[key] = true;
          b.classList.add('selected');
        }
        SFX.play('click');
      });
      row.appendChild(b);
    });
    refreshStatLine();
  }

  function buddyCount() {
    var n = 0;
    for (var k in pickedBuddies) if (pickedBuddies[k]) n++;
    return n;
  }

  // ---------- game lifecycle ----------
  function newGame() {
    var seats = [{ key: 'amber', isBot: false }];
    ['maple', 'finn', 'pip'].forEach(function (k) {
      if (pickedBuddies[k]) seats.push({ key: k, isBot: true });
    });
    state = R.createGame(seats, Date.now() % 2147483647);
    UI.setState(state);
    UI.buildBoard();
    UI.buildTokens(state);
    UI.renderAll(state);
    UI.setStatus('Roll to start!');
    UI.setHint('');
    $('log').innerHTML = '';
    UI.addLog('Welcome to the Boardwalk! \uD83C\uDF89');
    $('setup-screen').classList.add('hidden');
    $('over-overlay').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    drive();
  }

  function goHome() {
    state = null;
    $('game-screen').classList.add('hidden');
    $('over-overlay').classList.add('hidden');
    $('setup-screen').classList.remove('hidden');
    buildSetup();
  }

  function showGameOver() {
    var w = state.players[state.winner];
    var humanWon = w && !w.isBot;
    var stats = loadStats();
    stats.games++;
    if (humanWon) stats.wins++;
    saveStats(stats);

    $('over-emoji').textContent = humanWon ? '\uD83C\uDFC6' : (w ? w.emoji : '\uD83C\uDFC6');
    $('over-title').textContent = humanWon ? 'You win!' : w.name + ' wins!';
    $('over-msg').textContent = state.winReason === 'richest'
      ? 'Richest after ' + D.ROUND_LIMIT + ' rounds!'
      : 'Last kid standing on the Boardwalk!';
    $('over-stat').textContent = 'Wins: ' + stats.wins + ' \u00B7 Games: ' + stats.games;
    UI.confettiBurst($('over-overlay'));
    $('over-overlay').classList.remove('hidden');
  }

  // ---------- turn driver ----------
  function isBotTurn() { return R.currentPlayer(state).isBot; }

  async function drive() {
    if (busy || !state) return;
    busy = true;
    try {
      while (state && state.phase !== 'over') {
        var need = R.needsChoice(state);
        var cur = R.currentPlayer(state);

        if (need === 'timeout') {
          UI.renderTop(state);
          if (cur.isBot) {
            await sleep(800);
            if (B.decideTimeout(state, cur.id) === 'leave') {
              await UI.playEvents(R.leaveTimeout(state), { fast: true });
              if (cur.skipTurns > 0) { // couldn't afford after all
                R.sitOut(state);
                R.endTurn(state);
              }
            } else {
              await UI.playEvents(R.sitOut(state), { fast: true });
              await sleep(400);
              R.endTurn(state);
            }
          } else {
            UI.setStatus('Time-out! What will you do?');
            showTimeoutModal();
            return; // resume from modal buttons
          }
          continue;
        }

        if (need === 'buy') {
          if (cur.isBot) {
            await sleep(900);
            if (B.wantsBuy(state, cur.id)) await UI.playEvents(R.buy(state));
            else await UI.playEvents(R.pass(state));
          } else {
            showBuyModal();
            return;
          }
          continue;
        }

        if (need === 'star') {
          if (cur.isBot) {
            await sleep(700);
            if (B.wantsStar(state, cur.id)) await UI.playEvents(R.buildStar(state));
            else R.skipStar(state);
          } else {
            showStarModal();
            return;
          }
          continue;
        }

        // No pending choice. First roll of the turn, or an earned bonus roll?
        var freshTurn = state.extraRollsUsed === 0;
        if (freshTurn || state.awaitingExtraRoll) {
          if (!cur.isBot) {
            UI.renderTop(state);
            UI.setStatus(freshTurn ? 'Your turn \u2014 roll the dice!' : 'Doubles! Roll again!');
            UI.setRollEnabled(true, freshTurn ? 'Roll the Dice 🎲' : 'Roll Again! 🎲');
            return; // wait for tap
          }
          await sleep(650);
          UI.setRollEnabled(false);
          var evs = R.roll(state);
          await UI.playEvents(evs);
          UI.renderAll(state);
          continue;
        }

        // Rolls done and resolved — pass the dice.
        R.endTurn(state);
        UI.renderAll(state);
      }
      if (state && state.phase === 'over') {
        UI.renderTop(state);
        await sleep(600);
        showGameOver();
      }
    } finally {
      busy = false;
    }
  }

  // ---------- modals ----------
  function fillBuyModal() {
    var pos = state.pending.pos, sp = D.BOARD[pos];
    $('buy-emoji').textContent = sp.emoji;
    $('buy-name').textContent = sp.name;
    $('buy-price').textContent = '$' + sp.price +
      '  (you have $' + R.currentPlayer(state).cash + ')';
  }
  function showBuyModal() {
    fillBuyModal();
    UI.setRollEnabled(false);
    $('buy-overlay').classList.remove('hidden');
  }

  function fillStarModal() {
    var pos = state.pending.pos, sp = D.BOARD[pos];
    var o = state.owned[pos];
    $('star-desc').innerHTML = 'Add a star to <b>' + sp.name + '</b>? Rent goes up to <b>$' +
      sp.rent[Math.min(o.stars + 1, D.MAX_STARS)] + '</b>.';
    $('star-price').textContent = '$' + state.pending.cost +
      '  (you have $' + R.currentPlayer(state).cash + ')';
  }
  function showStarModal() {
    fillStarModal();
    UI.setRollEnabled(false);
    $('star-overlay').classList.remove('hidden');
  }

  function showTimeoutModal() {
    var p = R.currentPlayer(state);
    $('btn-pay-out').disabled = p.cash < D.TIMEOUT_LEAVE_COST;
    $('timeout-overlay').classList.remove('hidden');
  }

  async function resolveHumanChoice(fnApply) {
    busy = true;
    try {
      await UI.playEvents(fnApply());
    } finally {
      busy = false;
    }
    UI.renderAll(state);
    drive();
  }

  // ---------- wiring ----------
  function wire() {
    $('btn-start').addEventListener('click', function () { SFX.play('click'); newGame(); });

    $('btn-howto').addEventListener('click', function () { SFX.play('click'); $('howto-overlay').classList.remove('hidden'); });
    $('btn-close-howto').addEventListener('click', function () { $('howto-overlay').classList.add('hidden'); });

    $('btn-roll').addEventListener('click', async function () {
      if (!state || busy) return;
      busy = true;
      try {
        UI.setRollEnabled(false);
        UI.setHint('');
        var evs = R.roll(state);
        await UI.playEvents(evs);
        UI.renderAll(state);
      } finally {
        busy = false;
      }
      drive(); // handles pending choices / extra rolls / next players
    });

    $('btn-confirm-buy').addEventListener('click', function () {
      $('buy-overlay').classList.add('hidden');
      resolveHumanChoice(function () { R.buy(state); });
    });
    $('btn-skip-buy').addEventListener('click', function () {
      $('buy-overlay').classList.add('hidden');
      resolveHumanChoice(function () { R.pass(state); });
    });

    $('btn-build-star').addEventListener('click', function () {
      $('star-overlay').classList.add('hidden');
      resolveHumanChoice(function () { R.buildStar(state); });
    });
    $('btn-skip-star').addEventListener('click', function () {
      $('star-overlay').classList.add('hidden');
      resolveHumanChoice(function () { R.skipStar(state); });
    });

    $('btn-pay-out').addEventListener('click', function () {
      $('timeout-overlay').classList.add('hidden');
      resolveHumanChoice(function () { R.leaveTimeout(state); });
    });
    $('btn-sit-out').addEventListener('click', function () {
      $('timeout-overlay').classList.add('hidden');
      resolveHumanChoice(function () {
        R.sitOut(state);
        R.endTurn(state);
      });
    });

    $('btn-card-ok').addEventListener('click', function () {
      $('card-overlay').classList.add('hidden');
    });

    $('btn-again').addEventListener('click', function () {
      $('over-overlay').classList.add('hidden');
      newGame();
    });
    $('btn-over-menu').addEventListener('click', goHome);
    $('btn-home').addEventListener('click', function () {
      if (state && state.phase !== 'over' && !confirm('Leave the boardwalk? Your game will be lost.')) return;
      goHome();
    });

    var sndBtn = $('btn-sound');
    var applySound = function () {
      sndBtn.textContent = SFX.isEnabled() ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      if (H) H.setInt('mp_sfx', SFX.isEnabled() ? 1 : 0);
    };
    sndBtn.addEventListener('click', function () {
      SFX.setEnabled(!SFX.isEnabled());
      applySound();
    });
    if (H) SFX.setEnabled(H.getInt('mp_sfx', 1) === 1);
    applySound();
  }

  function boot() {
    UI.init();
    UI.buildBoard(); // decorative board behind setup? keep hidden screen simple
    buildSetup();
    wire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
