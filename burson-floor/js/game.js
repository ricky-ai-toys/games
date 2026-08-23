/* Game state & loop */

const Game = (() => {
  const state = {
    mode: 'title', // title | seat | play | eod
    player: null,
    npcs: [],
    time: null,
    ambient: null,
    tasks: [],
    dialogue: null,
    paused: false,
    clickTarget: null,
    stats: { talkedTo: [], chats: 0, overheard: [] },
    settings: { sfx: true, density: 'normal' },
    _taskRefresh: 0,
    _allCleared: false,
  };

  let canvas;
  let last = 0;
  let keys = {};

  function init(c) {
    canvas = c;
    OfficeMap.build();
    Render.init(canvas);
    loadSettings();
    UI.bind();
    UI.showTitle();
    bindInput();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(CONST.SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.density) state.settings.density = s.density;
        if (typeof s.sfx === 'boolean') state.settings.sfx = s.sfx;
      }
    } catch (e) {}
    OfficeAudio.setEnabled(state.settings.sfx);
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) muteBtn.textContent = state.settings.sfx ? '🔊' : '🔇';
  }

  function saveSettings() {
    try {
      localStorage.setItem(CONST.SAVE_KEY, JSON.stringify(state.settings));
    } catch (e) {}
  }

  function showTitle() {
    state.mode = 'title';
    state.player = null;
    state.npcs = [];
    state.dialogue = null;
    UI.showTitle();
  }

  function showSeatPicker() {
    state.mode = 'seat';
    UI.showSeatPicker();
  }

  function startDay(personId) {
    const person = rosterById(personId);
    if (!person) return;

    OfficeMap.build();
    state.mode = 'play';
    state.player = Player.create(person);
    state.npcs = NPC.spawnAll(personId);
    state.time = DayTime.create();
    state.ambient = Ambient.create();
    state.tasks = Tasks.create();
    state.dialogue = null;
    state.paused = false;
    state.clickTarget = null;
    state.stats = { talkedTo: [], chats: 0, overheard: [] };
    state._taskRefresh = 0;
    state._allCleared = false;

    // Camera snap
    Render.updateCamera(state, 1);

    UI.showPlayHud(state);
    OfficeAudio.init();
    OfficeAudio.resume();
    if (state.settings.sfx) OfficeAudio.startHum();
    UI.toast('You are ' + person.name + '. The floor is already talking.');
  }

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (state.mode !== 'play') return;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        Player.tryInteract(state);
      }
      if (e.key === 'Escape') {
        if (state.dialogue) Dialogue.close(state);
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    canvas.addEventListener('click', (e) => {
      if (state.mode !== 'play' || state.dialogue) return;
      OfficeAudio.init();
      OfficeAudio.resume();
      const w = Render.screenToWorld(e.clientX, e.clientY);
      // Click NPC to talk
      const npc = NPC.nearest(state, w.x, w.y, 28);
      if (npc && Utils.dist(state.player.x, state.player.y, npc.x, npc.y) < CONST.TALK_RANGE + 20) {
        Dialogue.open(state, npc);
        return;
      }
      // Click near self interact
      if (Utils.dist(w.x, w.y, state.player.x, state.player.y) < 24) {
        Player.tryInteract(state);
        return;
      }
      state.clickTarget = w;
    });

    // Prevent arrow scroll
    window.addEventListener(
      'keydown',
      (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          if (state.mode === 'play') e.preventDefault();
        }
      },
      { passive: false }
    );

    // Auto-pause the floor when the tab/window loses focus so the day clock
    // and NPCs don't drift while you're away.
    document.addEventListener('visibilitychange', () => {
      if (state.mode !== 'play') return;
      if (document.hidden) state.paused = true;
      else state.paused = false;
    });
    window.addEventListener('blur', () => {
      if (state.mode === 'play') state.paused = true;
    });
    window.addEventListener('focus', () => {
      if (state.mode === 'play' && !document.hidden) state.paused = false;
    });
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    Render.draw(state);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (state.mode === 'title' || state.mode === 'seat' || state.mode === 'eod') {
      return;
    }

    if (state.mode === 'play') {
      DayTime.update(state, dt);
      if (state.time.ended) {
        endDay();
        return;
      }

      Player.update(state, dt, keys);
      NPC.update(state, dt);
      Ambient.update(state, dt);
      Render.updateCamera(state, dt);

      updatePrompt();

      state._taskRefresh += dt;
      if (state._taskRefresh > 0.4) {
        state._taskRefresh = 0;
        UI.refreshHud(state);
        UI.refreshTasks(state);
        checkAllTasksCleared();
      }
    }
  }

  function updatePrompt() {
    if (state.dialogue) {
      UI.setPrompt(false);
      return;
    }
    const p = state.player;
    const npc = NPC.nearest(state, p.x, p.y, CONST.TALK_RANGE);
    if (npc) {
      UI.setPrompt(true, 'Talk to <b>' + npc.data.name + '</b> · <kbd>E</kbd> / click');
      return;
    }
    const home = OfficeMap.spawnFor(p.data);
    if (Utils.dist(p.x, p.y, home.x, home.y) < CONST.SIT_RANGE + 10) {
      UI.setPrompt(true, p.sitting ? 'Stand up · <kbd>E</kbd>' : 'Sit & focus · <kbd>E</kbd>');
      return;
    }
    const prop = OfficeMap.propNear(p.x, p.y, 36);
    if (prop) {
      UI.setPrompt(true, prop.label || prop.kind + ' · <kbd>E</kbd>');
      return;
    }
    UI.setPrompt(false);
  }

  function checkAllTasksCleared() {
    if (state._allCleared || !Tasks.allDone(state)) return;
    state._allCleared = true;
    // Let the per-task "done" toast show first, then celebrate the clean board.
    setTimeout(() => {
      if (state.mode !== 'play') return;
      OfficeAudio.success();
      UI.toast('All tasks cleared! Coast into wind-down ✨');
    }, 1000);
  }

  function endDay() {
    state.mode = 'eod';
    state.dialogue = null;
    OfficeAudio.stopHum();
    UI.showEndOfDay(state);
  }

  return {
    init,
    state,
    showTitle,
    showSeatPicker,
    startDay,
    saveSettings,
  };
})();
