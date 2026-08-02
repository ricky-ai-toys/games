/* ========================================
   Amber's Farm — Real quest tracking (Iteration 3)
   ======================================== */

const Quests = (() => {
  const POOL = [
    { id: 'ship_any', desc: 'Put 3 items in the shipping bin', type: 'ship', need: 3, reward: 45, emoji: '📦' },
    { id: 'harvest_any', desc: 'Harvest 4 crops', type: 'harvest', need: 4, reward: 50, emoji: '🌾' },
    { id: 'water_crops', desc: 'Water crops 6 times', type: 'water', need: 6, reward: 35, emoji: '💧' },
    { id: 'feed_animals', desc: 'Feed animals 2 times', type: 'feed', need: 2, reward: 40, emoji: '🐔' },
    { id: 'talk_friend', desc: 'Talk to a friend', type: 'talk', need: 1, reward: 25, emoji: '💬' },
    { id: 'cook_once', desc: 'Cook 1 recipe', type: 'cook', need: 1, reward: 55, emoji: '🍳' },
    { id: 'forage_two', desc: 'Pick 2 wildflowers', type: 'forage', need: 2, reward: 30, emoji: '🌸' },
    { id: 'gift_once', desc: 'Gift something nice', type: 'gift', need: 1, reward: 40, emoji: '🎁' },
  ];

  function ensure(state) {
    // Only roll a new quest when missing or already claimed
    if (!state.quest || state.quest.claimed) {
      const pick = POOL[state.day % POOL.length];
      // Avoid immediately repeating same type if possible
      let idx = state.day % POOL.length;
      if (state.quest && state.quest.type === POOL[idx].type) {
        idx = (idx + 1) % POOL.length;
      }
      const p = POOL[idx];
      state.quest = {
        id: p.id,
        desc: p.desc,
        type: p.type,
        need: p.need,
        reward: p.reward,
        emoji: p.emoji,
        progress: 0,
        done: false,
        claimed: false,
      };
    }
    return state.quest;
  }

  function progress(state, type, amount) {
    if (!state || !state.quest || state.quest.done) return;
    if (state.quest.type !== type) return;
    state.quest.progress = Math.min(state.quest.need, (state.quest.progress || 0) + (amount || 1));
    if (state.quest.progress >= state.quest.need) {
      state.quest.done = true;
      UI.toast(`${state.quest.emoji} Quest ready — claim at the board!`);
      FarmAudio.success();
    }
  }

  function claim(state) {
    ensure(state);
    const q = state.quest;
    if (!q.done) {
      UI.toast(`Progress: ${q.progress || 0}/${q.need}`);
      FarmAudio.error();
      return false;
    }
    if (q.claimed) {
      UI.toast('Already claimed — check back tomorrow!');
      return false;
    }
    q.claimed = true;
    state.coins += q.reward;
    FarmAudio.success();
    Particles.confetti(CONST.VIEW_W / 2, CONST.VIEW_H / 3);
    UI.toast(`Quest complete! +${q.reward}🪙`);
    Game.tryAchieve('first_quest');
    // Roll next (claimed quest stays set so ensure() avoids re-rolling the same type)
    ensure(state);
    return true;
  }

  return { ensure, progress, claim, POOL };
})();
