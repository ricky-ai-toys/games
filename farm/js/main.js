/* ========================================
   Amber's Farm — Entry / Input Wiring
   ======================================== */

if(window.AmberHardening) AmberHardening.installErrorOverlay('Farm hit a snag. Reload to continue!');

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  Game.init(canvas);
  UI.bindGlobal();

  let audioReady = false;
  function ensureAudio() {
    if (!audioReady) {
      FarmAudio.init();
      audioReady = true;
    }
    FarmAudio.resume();
  }

  // Title buttons
  document.getElementById('btn-new').addEventListener('click', () => {
    ensureAudio();
    FarmAudio.click();
    const name = document.getElementById('farm-name-input').value.trim() || "Amber's Sunny Acres";
    Game.newGame(name);
  });

  document.getElementById('btn-continue').addEventListener('click', () => {
    ensureAudio();
    FarmAudio.click();
    Game.continueGame();
  });

  // Beginner's guide on the title screen
  document.getElementById('btn-guide')?.addEventListener('click', () => {
    ensureAudio();
    FarmAudio.click();
    document.getElementById('modal-guide')?.classList.remove('hidden');
  });

  // Settings
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudio();
    FarmAudio.click();
    settingsPanel.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
    }
  });

  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      ensureAudio();
      FarmAudio.click();
      toggle.classList.toggle('on');
      const setting = toggle.dataset.setting;
      const isOn = toggle.classList.contains('on');
      if (setting === 'sfx') FarmAudio.setSfx(isOn);
      if (setting === 'music') FarmAudio.setMusic(isOn);
      if (setting === 'particles') Particles.setEnabled(isOn);
    });
  });

  // Keyboard
  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.repeat) return;
    ensureAudio();
    if (keyMap[e.code]) {
      Game.setInput(keyMap[e.code], true);
      e.preventDefault();
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (typeof Fishing !== 'undefined' && Fishing.isActive()) {
        Fishing.setHold(true);
      } else {
        Game.pressInteract();
      }
      e.preventDefault();
    }
    if (e.code === 'Escape') {
      UI.closeModals();
    }
    // Hotbar 1-9
    if (e.code.startsWith('Digit')) {
      const n = parseInt(e.code.replace('Digit', ''), 10);
      if (n >= 1 && n <= 9) Game.selectSlot(n - 1);
    }
    if (e.code === 'KeyJ') {
      UI.openJournal();
    }
    if (e.code === 'KeyI' || e.code === 'KeyB') {
      UI.openInventory('items');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keyMap[e.code]) {
      Game.setInput(keyMap[e.code], false);
      e.preventDefault();
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (typeof Fishing !== 'undefined') Fishing.setHold(false);
    }
  });

  // Touch D-pad
  function bindPad(id, dir) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => {
      e.preventDefault();
      ensureAudio();
      Game.setInput(dir, true);
      el.classList.add('active');
    };
    const end = (e) => {
      e.preventDefault();
      Game.setInput(dir, false);
      el.classList.remove('active');
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('pointercancel', end);
  }
  bindPad('pad-up', 'up');
  bindPad('pad-down', 'down');
  bindPad('pad-left', 'left');
  bindPad('pad-right', 'right');

  document.getElementById('btn-a').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    if (typeof Fishing !== 'undefined' && Fishing.isActive()) Fishing.setHold(true);
    else Game.pressInteract();
  });
  document.getElementById('btn-a').addEventListener('pointerup', () => {
    if (typeof Fishing !== 'undefined') Fishing.setHold(false);
  });
  document.getElementById('btn-a').addEventListener('pointerleave', () => {
    if (typeof Fishing !== 'undefined') Fishing.setHold(false);
  });

  document.getElementById('btn-sleep-yes').addEventListener('click', () => {
    ensureAudio();
    Game.doSleep();
  });

  document.getElementById('btn-open-inv-pause')?.addEventListener('click', () => {
    ensureAudio();
    FarmAudio.click();
    UI.closeModals();
    UI.openInventory('items');
  });

  const verEl = document.getElementById('title-version');
  if (verEl && typeof CONST !== 'undefined') {
    verEl.textContent = 'v' + (CONST.GAME_VERSION || '1.0.0');
  }

  // Mute on HUD
  document.getElementById('hud-mute')?.addEventListener('click', () => {
    ensureAudio();
    const btn = document.getElementById('hud-mute');
    const muted = btn.dataset.muted === '1';
    FarmAudio.setMuted(!muted);
    btn.dataset.muted = muted ? '0' : '1';
    btn.textContent = muted ? '🔊' : '🔇';
  });

  // Click canvas to face + interact (Iteration 1)
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // Ignore if clicking UI
    ensureAudio();
    if (Game.state && Game.state.scene !== 'title' && !Game.state.paused) {
      Game.clickWorld(e.clientX, e.clientY, canvas);
    }
  });

  // Scroll wheel hotbar (Iteration 1)
  canvas.addEventListener('wheel', (e) => {
    if (Game.state && Game.state.scene !== 'title') {
      e.preventDefault();
      Game.cycleSlot(e.deltaY > 0 ? 1 : -1);
    }
  }, { passive: false });

  // Q / Z cycle tools
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'KeyZ') {
      Game.cycleSlot(-1);
    }
    if (e.code === 'KeyC') {
      Game.cycleSlot(1);
    }
  });

  // Resize canvas CSS (leave room for wooden bezel ~24px)
  function fit() {
    const c = document.getElementById('gameCanvas');
    const bezel = 28;
    const scale = Math.min(
      (window.innerWidth - bezel * 2) / CONST.VIEW_W,
      (window.innerHeight - bezel * 2) / CONST.VIEW_H
    );
    const w = Math.floor(CONST.VIEW_W * scale);
    const h = Math.floor(CONST.VIEW_H * scale);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  // Auto-save on leave
  window.addEventListener('beforeunload', () => {
    if (Game.state && Game.state.scene !== 'title') {
      Save.write(Game.state);
    }
  });

  // iOS pagehide autosave (iOS Safari often skips beforeunload)
  window.addEventListener('pagehide', () => {
    if (Game.state && Game.state.scene !== 'title') {
      Save.write(Game.state);
    }
  });
});
