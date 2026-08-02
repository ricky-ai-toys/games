'use strict';
const Game = (() => {
  const ARTIFACT_FOR = {
    calypso: 'comb', lotus: 'lotus', cyclops: 'jar', aeolus: 'winds',
    laestrygonians: 'oar', circe: 'moly', underworld: 'bough', sirens: 'feather',
    scylla: 'medallion', helios: 'rib', phaeacia: 'discus', ithaca: 'bow',
  };
  const input = { taps: [], spaceEdge: false, tapHeld: false, left: false, right: false, up: false, down: false };

  const api = {
    ARTIFACT_FOR,
    input,
    state: null,
    scene: 'title',
    sceneData: null,
    epiPage: 0,
    time: 0,
  };

  function init(canvas) {
    const st = Save.load();
    api.state = st || Save.defaults();
    api.hasSave = !!st;
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      input.taps.push({
        x: (e.clientX - r.left) * (VIEW_W / r.width),
        y: (e.clientY - r.top) * (VIEW_H / r.height),
        used: false,
      });
      input.tapHeld = true;
      OdysseyAudio.ensure();
      OdysseyAudio.click();
    });
    window.addEventListener('pointerup', () => { input.tapHeld = false; });
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); input.spaceEdge = true; input.tapHeld = true; }
      if (e.key === 'ArrowLeft') input.left = true;
      if (e.key === 'ArrowRight') input.right = true;
      if (e.key === 'ArrowUp') input.up = true;
      if (e.key === 'ArrowDown') input.down = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === ' ') input.tapHeld = false;
      if (e.key === 'ArrowLeft') input.left = false;
      if (e.key === 'ArrowRight') input.right = false;
      if (e.key === 'ArrowUp') input.up = false;
      if (e.key === 'ArrowDown') input.down = false;
    });
  }

  function tapAt(x, y, w, h) {
    for (const t of input.taps) {
      if (!t.used && t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h) {
        t.used = true;
        return true;
      }
    }
    return false;
  }

  function tapAny() {
    if (input.spaceEdge) return true;
    for (const t of input.taps) {
      if (!t.used) { t.used = true; return true; }
    }
    return false;
  }

  function newGame() {
    api.state = Save.defaults();
    Save.write(api.state);
    api.hasSave = true;
    api.scene = 'ship';
    api.sceneData = null;
    UI.close();
    OdysseyAudio.startMusic('ship');
  }

  function continueGame() {
    const st = Save.load();
    if (!st) return;
    api.state = st;
    api.hasSave = true;
    api.scene = 'ship';
    api.sceneData = null;
    UI.close();
    OdysseyAudio.startMusic('ship');
  }

  function startEpisode(ep) {
    api.state.mg = MINIGAMES[ep.mechanic].start();
    api.scene = 'episode';
    OdysseyAudio.startMusic('episode');
  }

  function retryEpisode(ep) {
    startEpisode(ep);
  }

  function finishEpisode(ep, win) {
    OdysseyAudio.stopMusic();
    const s = api.state;
    const mg = s.mg || {};
    if (win) {
      const mistakes = mg.mistakes || 0;
      const perfect = mistakes === 0 && (s.attempted[ep.id] || 0) === 0;
      const already = s.completed.includes(ep.id);
      if (!already) {
        s.completed.push(ep.id);
        s.mementos.push(ARTIFACT_FOR[ep.id]);
        s.scholar += 1;
      }
      s.glory += (ep.glory || GLORY_BASE) + (perfect ? GLORY_PERFECT : 0);
      s.morale = Utils.clamp(s.morale + 2, 0, MAX_MORALE);
      if (s.current < EPISODES.length) s.current++;
      api.scene = 'result';
      api.sceneData = { ep, win: true, perfect, already };
    } else {
      s.attempted[ep.id] = (s.attempted[ep.id] || 0) + 1;
      s.morale = Math.max(0, s.morale - 1);
      s.food = Math.max(0, s.food - 1);
      api.scene = 'result';
      api.sceneData = { ep, win: false };
    }
    Save.write(s);
  }

  function skipEpisode(ep) {
    const s = api.state;
    if (s.current < EPISODES.length) s.current++;
    Save.write(s);
    api.scene = 'ship';
    OdysseyAudio.startMusic('ship');
  }

  function restartAll() {
    Save.reset();
    api.state = Save.defaults();
    Save.write(api.state);
    api.hasSave = true;
    api.scene = 'ship';
    api.sceneData = null;
    UI.close();
    OdysseyAudio.startMusic('ship');
  }

  function update(dt) {
    api.time += dt;
    const s = api.state;
    const hasSave = !!Save.load();
    if (api.scene === 'title') {
      if (Game.tapAt(330, 225, 300, 50)) { newGame(); }
      else if (hasSave && Game.tapAt(330, 283, 300, 50)) { continueGame(); }
      else if (Game.tapAt(330, 341, 300, 46)) { UI.open('howto'); }
    } else if (api.scene === 'ship') {
      if (UI.isOpen()) UI.update(dt);
      else Ship.update(dt);
    } else if (api.scene === 'map') {
      if (UI.isOpen()) UI.update(dt);
      else Voyage.update(dt);
    } else if (api.scene === 'episode') {
      if (UI.isOpen()) UI.update(dt);
      else {
        const ep = EPISODES[s.current];
        const res = MINIGAMES[ep.mechanic].update(dt);
        if (res === 'win' || res === 'lose') finishEpisode(ep, res === 'win');
      }
    } else if (api.scene === 'result') {
      if (UI.isOpen()) UI.update(dt);
      else {
        const sd = api.sceneData;
        if (sd.win) {
          if (Game.tapAt(340, 375, 280, 50)) {
            api.scene = 'ship';
            OdysseyAudio.startMusic('ship');
          }
        } else {
          if (Game.tapAt(170, 350, 260, 50)) retryEpisode(sd.ep);
          else if (Game.tapAt(530, 350, 260, 50)) skipEpisode(sd.ep);
        }
      }
    } else if (api.scene === 'epilogue') {
      if (UI.isOpen()) UI.update(dt);
      else {
        if (api.epiPage >= 2 && Game.tapAt(300, 430, 360, 48)) restartAll();
        else if (Game.tapAny()) {
          if (api.epiPage < 2) api.epiPage++;
        }
      }
    }
    input.spaceEdge = false;
    input.taps = input.taps.filter(t => !t.used);
  }

  function render(ctx) {
    const s = api.state;
    if (api.scene === 'title') Render.title(ctx, s, !!Save.load());
    else if (api.scene === 'ship') Ship.render(ctx);
    else if (api.scene === 'map') Voyage.render(ctx);
    else if (api.scene === 'episode') {
      const ep = EPISODES[s.current];
      MINIGAMES[ep.mechanic].render(ctx);
    } else if (api.scene === 'result') Render.result(ctx, s, api.sceneData);
    else if (api.scene === 'epilogue') Render.epilogue(ctx, s, api.epiPage);
    if (UI.isOpen()) UI.render(ctx);
  }

  api.init = init;
  api.tapAt = tapAt;
  api.tapAny = tapAny;
  api.newGame = newGame;
  api.continueGame = continueGame;
  api.startEpisode = startEpisode;
  api.update = update;
  api.render = render;
  return api;
})();
