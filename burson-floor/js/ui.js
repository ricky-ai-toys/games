/* DOM UI */

const UI = (() => {
  let toastTimer = null;

  function bind() {
    document.getElementById('btn-start').addEventListener('click', () => {
      OfficeAudio.init();
      OfficeAudio.resume();
      OfficeAudio.click();
      Game.showSeatPicker();
    });

    document.getElementById('btn-back-title').addEventListener('click', () => {
      OfficeAudio.click();
      Game.showTitle();
    });

    document.getElementById('btn-mute').addEventListener('click', () => {
      const on = !OfficeAudio.isEnabled();
      OfficeAudio.setEnabled(on);
      Game.state.settings.sfx = on;
      document.getElementById('btn-mute').textContent = on ? '🔊' : '🔇';
      if (on) {
        OfficeAudio.init();
        OfficeAudio.startHum();
      }
      OfficeAudio.click();
      Game.saveSettings();
    });

    document.getElementById('btn-density').addEventListener('click', () => {
      const order = ['chill', 'normal', 'chaotic'];
      const cur = Game.state.settings.density || 'normal';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      Game.state.settings.density = next;
      toast('Chat density: ' + next);
      OfficeAudio.click();
      Game.saveSettings();
    });

    document.getElementById('btn-tasks').addEventListener('click', () => {
      document.getElementById('task-panel').classList.toggle('hidden');
      OfficeAudio.click();
    });

    document.getElementById('dlg-close').addEventListener('click', () => {
      Dialogue.close(Game.state);
    });

    document.getElementById('btn-again').addEventListener('click', () => {
      OfficeAudio.click();
      const id = Game.state.player && Game.state.player.id;
      if (id) Game.startDay(id);
    });

    document.getElementById('btn-title').addEventListener('click', () => {
      OfficeAudio.click();
      Game.showTitle();
    });
  }

  function showTitle() {
    hideAllScreens();
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('task-panel').classList.add('hidden');
  }

  function showSeatPicker() {
    hideAllScreens();
    document.getElementById('seat-screen').classList.remove('hidden');
    buildSeatGrid();
  }

  function hideAllScreens() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('seat-screen').classList.add('hidden');
    document.getElementById('eod-screen').classList.add('hidden');
  }

  function buildSeatGrid() {
    const grid = document.getElementById('seat-grid');
    grid.innerHTML = '';

    // 10-column layout matching floor sketch
    // cols: label | 0 | 1 | 2 | 3 | gap | ws | gap | right | right2
    const cells = [
      // Row 1a
      { type: 'label', text: 'R1' },
      { type: 'grey', text: 'X' },
      { type: 'person', id: 'angela' },
      { type: 'person', id: 'ricky' },
      { type: 'person', id: 'ovina' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'grey', text: 'Corp' },
      { type: 'grey', text: 'Corp' },
      // Row 1b
      { type: 'label', text: '' },
      { type: 'grey', text: 'X' },
      { type: 'person', id: 'ada' },
      { type: 'person', id: 'agnes' },
      { type: 'person', id: 'alanis' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'grey', text: 'Corp' },
      { type: 'grey', text: 'Corp' },
      // aisle
      ...Array(10).fill({ type: 'empty' }),
      // Row 2a
      { type: 'label', text: 'R2' },
      { type: 'person', id: 'rachel' },
      { type: 'person', id: 'wing' },
      { type: 'person', id: 'caleb' },
      { type: 'person', id: 'connie' },
      { type: 'empty' },
      { type: 'person', id: 'joyce' },
      { type: 'empty' },
      { type: 'grey', text: 'BBG' },
      { type: 'grey', text: 'Corp' },
      // Row 2b
      { type: 'label', text: '' },
      { type: 'person', id: 'simon' },
      { type: 'person', id: 'alice' },
      { type: 'person', id: 'esther' },
      { type: 'person', id: 'isaac' },
      { type: 'empty' },
      { type: 'person', id: 'chloe' },
      { type: 'empty' },
      { type: 'grey', text: '/' },
      { type: 'grey', text: 'Corp' },
      // aisle
      ...Array(10).fill({ type: 'empty' }),
      // Row 3
      { type: 'label', text: 'R3' },
      { type: 'person', id: 'cynthia' },
      { type: 'person', id: 'oren' },
      { type: 'person', id: 'christy' },
      { type: 'person', id: 'carrie' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      // CPA
      { type: 'label', text: 'CPA' },
      { type: 'grey', text: 'CPA 1' },
      { type: 'grey', text: 'CPA 2' },
      { type: 'grey', text: 'CPA 3' },
      { type: 'grey', text: 'CPA 4' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
      { type: 'empty' },
    ];

    for (const c of cells) {
      const el = document.createElement('div');
      if (c.type === 'empty') {
        el.className = 'seat-cell empty';
      } else if (c.type === 'label') {
        el.className = 'seat-cell label-row';
        el.textContent = c.text || '';
      } else if (c.type === 'grey') {
        el.className = 'seat-cell grey';
        el.textContent = c.text;
      } else if (c.type === 'person') {
        const p = rosterById(c.id);
        el.className = 'seat-cell playable';
        el.textContent = p ? p.name : c.id;
        el.style.background = p ? p.color : '#3a5f7a';
        el.addEventListener('click', () => {
          OfficeAudio.click();
          Game.startDay(c.id);
        });
      }
      grid.appendChild(el);
    }
  }

  function showPlayHud(state) {
    hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('task-panel').classList.remove('hidden');
    document.getElementById('hud-you').textContent = 'You: ' + state.player.data.name;
    refreshTasks(state);
    refreshHud(state);
  }

  function refreshHud(state) {
    if (!state.player) return;
    document.getElementById('hud-time').textContent = Utils.formatTime(state.time.minutes);
    document.getElementById('hud-phase').textContent = DayTime.phase(state).label;
    const pct = Math.round((state.player.focus / CONST.FOCUS_MAX) * 100);
    document.getElementById('focus-fill').style.width = pct + '%';
  }

  function refreshTasks(state) {
    const ul = document.getElementById('task-list');
    ul.innerHTML = '';
    for (const t of state.tasks) {
      const li = document.createElement('li');
      li.textContent = t.text + (t.done ? '' : ` (${t.progress}/${t.need})`);
      if (t.done) li.classList.add('done');
      ul.appendChild(li);
    }
  }

  function showDialogue(d) {
    const box = document.getElementById('dialogue');
    box.classList.remove('hidden');
    document.getElementById('dlg-name').textContent = d.name;
    document.getElementById('dlg-name').style.color = d.color || '#7ec8e3';
    document.getElementById('dlg-text').textContent = d.text;
    const choices = document.getElementById('dlg-choices');
    choices.innerHTML = '';
    for (const c of d.choices) {
      const btn = document.createElement('button');
      btn.textContent = c.text;
      btn.addEventListener('click', () => {
        OfficeAudio.click();
        Dialogue.choose(Game.state, c.id);
      });
      choices.appendChild(btn);
    }
  }

  function hideDialogue() {
    document.getElementById('dialogue').classList.add('hidden');
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
  }

  function setPrompt(show, text) {
    const el = document.getElementById('prompt');
    if (!show) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    if (text) el.innerHTML = text;
  }

  function showEndOfDay(state) {
    document.getElementById('eod-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('task-panel').classList.add('hidden');
    hideDialogue();

    const names = state.stats.talkedTo
      .map((id) => {
        const p = rosterById(id);
        return p ? p.name : id;
      })
      .slice(0, 12);

    document.getElementById('eod-summary').textContent =
      state.player.data.name +
      ' · ' +
      Tasks.summary(state) +
      ' · ' +
      (state.stats.chats || 0) +
      ' chats · focus left ' +
      Math.round(state.player.focus) +
      (Tasks.allDone(state) ? ' · 🏆 all cleared' : '');

    const ul = document.getElementById('eod-list');
    ul.innerHTML = '';
    if (Tasks.allDone(state)) {
      const li = document.createElement('li');
      li.textContent = 'All daily tasks cleared — the floor salutes you!';
      li.classList.add('eod-clear');
      ul.appendChild(li);
    }
    if (names.length) {
      const li = document.createElement('li');
      li.textContent = 'Talked with: ' + names.join(', ');
      ul.appendChild(li);
    }
    const funny = (state.stats.overheard || []).slice(-3);
    for (const line of funny) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    }
    if (!names.length && !funny.length) {
      const li = document.createElement('li');
      li.textContent = 'Quiet day? The floor will still be loud tomorrow.';
      ul.appendChild(li);
    }
  }

  return {
    bind,
    showTitle,
    showSeatPicker,
    showPlayHud,
    refreshHud,
    refreshTasks,
    showDialogue,
    hideDialogue,
    toast,
    setPrompt,
    showEndOfDay,
  };
})();
