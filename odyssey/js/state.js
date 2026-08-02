'use strict';
const Save = (() => {
  function defaults() {
    return {
      version: SAVE_VERSION,
      name: 'Odysseus',
      day: 1,
      scene: 'ship',
      food: 14,
      morale: 12,
      hull: 15,
      glory: 0,
      scholar: 0,
      boon: null,
      suitors: 0,
      current: 0,
      completed: [],
      attempted: {},
      mementos: [],
      codex: [],
      quizDone: [],
      epithets: [],
      loomPlays: 0,
      flags: {},
      crewTalk: {},
      epilogueSeen: false,
      started: true,
    };
  }

  function write(state) {
    try {
      const blob = Object.assign({}, state);
      blob.version = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
      return true;
    } catch (e) {
      return false;
    }
  }

  function migrate(data) {
    const def = defaults();
    const out = Object.assign(def, data);
    out.version = SAVE_VERSION;
    out.completed = Array.isArray(out.completed) ? out.completed : [];
    out.mementos = Array.isArray(out.mementos) ? out.mementos : [];
    out.codex = Array.isArray(out.codex) ? out.codex : [];
    out.quizDone = Array.isArray(out.quizDone) ? out.quizDone : [];
    out.flags = out.flags || {};
    out.crewTalk = out.crewTalk || {};
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version == null) return null;
      return migrate(data);
    } catch (e) {
      return null;
    }
  }

  function reset() {
    localStorage.removeItem(SAVE_KEY);
  }

  return { defaults, write, load, reset, migrate };
})();
