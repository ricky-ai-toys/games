/* ========================================
   Amber's Big Two — Entry point
   ======================================== */

window.addEventListener('load', () => {
  Game.init();
  UI.init();
  UI.showMenu();
  UI.refreshBests();

  let audioReady = false;
  function ensureAudio() {
    if (!audioReady) {
      Sfx.init();
      audioReady = true;
    }
    Sfx.resume();
  }

  // Remember last difficulty (E)
  const lastDiff = Game.getLastDifficulty();
  document.querySelectorAll('.diff-card').forEach((card) => {
    if (card.dataset.difficulty === lastDiff) {
      card.classList.add('last-played');
    }
    card.addEventListener('click', () => {
      ensureAudio();
      Sfx.playClick();
      const diff = card.dataset.difficulty;
      document.querySelectorAll('.diff-card').forEach((c) => c.classList.remove('last-played'));
      card.classList.add('last-played');
      Game.startMatch(diff);
      UI.showTable();
      UI.render();
      Sfx.playDeal();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Settings
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudio();
    Sfx.playClick();
    settingsPanel.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
    }
  });

  const toggleSfx = document.getElementById('toggle-sfx');
  const toggleConfetti = document.getElementById('toggle-confetti');
  function syncToggles() {
    toggleSfx.classList.toggle('on', Game.settings.sfx);
    toggleConfetti.classList.toggle('on', Game.settings.confetti);
  }
  syncToggles();
  toggleSfx.addEventListener('click', () => {
    Game.settings.sfx = !Game.settings.sfx;
    Game.saveSettings();
    syncToggles();
    Sfx.playClick();
  });
  toggleConfetti.addEventListener('click', () => {
    Game.settings.confetti = !Game.settings.confetti;
    Game.saveSettings();
    syncToggles();
    Sfx.playClick();
  });

  // Rules
  document.getElementById('btn-how-to').addEventListener('click', () => {
    ensureAudio();
    Sfx.playClick();
    UI.showRules();
  });
  document.getElementById('btn-close-rules').addEventListener('click', () => {
    Sfx.playClick();
    UI.hideRules();
  });

  // Table controls
  document.getElementById('btn-play').addEventListener('click', () => {
    ensureAudio();
    const res = Game.humanPlay();
    if (!res.ok) {
      UI.shakePlayButton();
      UI.els.tip.textContent = res.error || 'Cannot play that';
    }
  });
  document.getElementById('btn-pass').addEventListener('click', () => {
    ensureAudio();
    const res = Game.humanPass();
    if (!res.ok) UI.els.tip.textContent = res.error || 'Cannot skip now';
  });
  document.getElementById('btn-hint').addEventListener('click', () => {
    ensureAudio();
    const h = Game.hint();
    if (!h) return;
    if (h.type === 'pass') {
      UI.els.tip.textContent = 'Hint: Skip is OK! \uD83D\uDCA1';
    } else {
      UI.els.tip.textContent = `Hint: try ${Combos.shortName(h.play)} \uD83D\uDCA1`;
    }
  });
  document.getElementById('btn-sort').addEventListener('click', () => {
    ensureAudio();
    Sfx.playClick();
    Game.toggleSortMode();
    UI.els.tip.textContent = Game.sortMode === 'rank' ? 'Sorted by rank' : 'Sorted by suit';
  });

  document.getElementById('btn-menu-ingame').addEventListener('click', () => {
    ensureAudio();
    Sfx.playClick();
    Game.quitToMenu();
    UI.showMenu();
  });

  // Round end
  document.getElementById('btn-next-hand').addEventListener('click', () => {
    ensureAudio();
    Sfx.playDeal();
    UI.els.roundEnd.classList.add('hidden');
    Game.nextHand();
  });
  document.getElementById('btn-round-menu').addEventListener('click', () => {
    ensureAudio();
    Sfx.playClick();
    UI.els.roundEnd.classList.add('hidden');
    Game.quitToMenu();
    UI.showMenu();
  });

  // Keyboard: Space play, P pass, H hint
  document.addEventListener('keydown', (e) => {
    if (!Game.match || UI.els.menu && !UI.els.menu.classList.contains('hidden')) return;
    if (e.key === ' ' && document.activeElement?.classList?.contains('card')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (Rules.isHumanTurn(Game.match) && !Game.busy) {
        e.preventDefault();
        document.getElementById('btn-play').click();
      }
    } else if (e.key === 'p' || e.key === 'P') {
      document.getElementById('btn-pass').click();
    } else if (e.key === 'h' || e.key === 'H') {
      document.getElementById('btn-hint').click();
    }
  });

  // Expose for debugging
  window.Game = Game;
  window.Combos = Combos;
  window.runComboSelfTests = runComboSelfTests;
});
