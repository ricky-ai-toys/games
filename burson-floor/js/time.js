/* Day clock 09:00–18:00 */

const DayTime = (() => {
  function phaseFor(mins) {
    if (mins < 11 * 60) return { id: 'morning', label: 'Morning rush', bubbleMul: 1.15 };
    if (mins < 13 * 60) return { id: 'midday', label: 'Midday grind', bubbleMul: 1.0 };
    if (mins < 14 * 60) return { id: 'lunch', label: 'Lunch drift', bubbleMul: 1.35 };
    if (mins < 16 * 60) return { id: 'afternoon', label: 'Afternoon push', bubbleMul: 1.1 };
    if (mins < 17 * 60) return { id: 'late', label: 'Deadline o’clock', bubbleMul: 1.4 };
    return { id: 'wind', label: 'Wind-down', bubbleMul: 0.75 };
  }

  function create() {
    return {
      minutes: CONST.DAY_START,
      ended: false,
    };
  }

  function update(state, dt) {
    if (state.time.ended || state.paused) return;
    // dt in seconds → game minutes
    state.time.minutes += (dt / CONST.SEC_PER_GAME_MIN);
    if (state.time.minutes >= CONST.DAY_END) {
      state.time.minutes = CONST.DAY_END;
      state.time.ended = true;
    }
  }

  function phase(state) {
    return phaseFor(state.time.minutes);
  }

  return { create, update, phase, phaseFor };
})();
