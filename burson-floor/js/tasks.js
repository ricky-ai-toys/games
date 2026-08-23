/* Soft daily tasks */

const Tasks = (() => {
  function create() {
    return [
      { id: 'chat5', text: 'Chat with 5 colleagues', need: 5, progress: 0, done: false },
      { id: 'coffee', text: 'Coffee or water run', need: 1, progress: 0, done: false },
      { id: 'desk', text: 'Focus block at your desk', need: 1, progress: 0, done: false },
      { id: 'overhear', text: 'Overhear 8 office bubbles', need: 8, progress: 0, done: false },
      { id: 'bloomberg', text: 'Check the Bloomberg terminal', need: 1, progress: 0, done: false },
      { id: 'booth', text: 'Use a phone / huddle booth', need: 1, progress: 0, done: false },
      { id: 'props', text: 'Use office gear 3 times', need: 3, progress: 0, done: false },
    ];
  }

  function progress(state, id, amount) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t || t.done) return;
    t.progress = Math.min(t.need, t.progress + (amount || 1));
    if (t.progress >= t.need) {
      t.done = true;
      OfficeAudio.success();
      UI.toast('Task done: ' + t.text);
    }
  }

  function allDone(state) {
    return state.tasks.every((t) => t.done);
  }

  function summary(state) {
    const done = state.tasks.filter((t) => t.done).length;
    return done + ' / ' + state.tasks.length + ' tasks';
  }

  return { create, progress, allDone, summary };
})();
