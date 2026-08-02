/* ========================================
   Amber's Farm — Soft crow event + scarecrow (BIG-3)
   ======================================== */

const Crow = (() => {
  /** Call overnight before growth: maybe pause one unguarded crop */
  function overnight(state) {
    // Winter: no crows
    if (TimeSys.seasonName(state) === 'winter') return null;
    if (Math.random() > 0.18) return null;

    // Scarecrow protects whole farm
    if (hasScarecrow(state)) {
      return '🐦 Crows circled… but your scarecrow shooed them away!';
    }

    // Find a growing non-mature crop
    const keys = Object.keys(state.soil).filter(k => {
      const s = state.soil[k];
      return s.cropId && !s.mature;
    });
    if (!keys.length) return null;

    const k = Utils.pick(keys);
    const s = state.soil[k];
    // Soft: reverse one day of growth (not destroy)
    if (s.growProgress > 0) {
      s.growProgress = Math.max(0, s.growProgress - 1);
      s.mature = false;
      const crop = CROPS[s.cropId];
      if (crop) {
        const ratio = s.growProgress / crop.growDays;
        s.stage = Math.min(crop.stages - 1, Math.floor(ratio * crop.stages));
      }
      Game.tryAchieve('crow_visit');
      return `🐦 A crow snacked on your ${CROPS[s.cropId]?.name || 'crop'}! Growth paused a little. (Scarecrows help!)`;
    }
    return null;
  }

  function hasScarecrow(state) {
    for (const key of Object.keys(state.decor || {})) {
      if (state.decor[key].id === 'scarecrow') return true;
    }
    return false;
  }

  return { overnight, hasScarecrow };
})();
