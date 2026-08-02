/* ========================================
   Amber's Farm — Day / Season Clock
   ======================================== */

const TimeSys = (() => {
  function seasonName(state) {
    return CONST.SEASONS[state.seasonIndex % 4];
  }

  function advancePeriod(state) {
    const idx = CONST.DAY_PERIODS.indexOf(state.period);
    if (idx < CONST.DAY_PERIODS.length - 1) {
      state.period = CONST.DAY_PERIODS[idx + 1];
      state.periodTimer = 0;
      return false; // not new day
    }
    return true; // would be new day — but we wait for sleep
  }

  function update(state, dt) {
    if (state.scene === 'title' || state.paused) return;
    // Soft auto-advance periods while outdoors/interior playing
    if (state.period !== 'evening') {
      state.periodTimer += dt * 1000;
      if (state.periodTimer >= CONST.PERIOD_MS) {
        advancePeriod(state);
      }
    }
  }

  function sleep(state) {
    // End of day pipeline handled in Game.doSleep
    state.day += 1;
    state.period = 'morning';
    state.periodTimer = 0;

    // Season turn
    const dayInSeason = ((state.day - 1) % CONST.DAYS_PER_SEASON) + 1;
    if (dayInSeason === 1 && state.day > 1) {
      // We just rolled — actually season changes every DAYS_PER_SEASON days
    }
    // day 1 spring, day 8 summer, etc.
    const totalDays = state.day - 1;
    const newSeasonIndex = Math.floor(totalDays / CONST.DAYS_PER_SEASON) % 4;
    const newYear = Math.floor(totalDays / (CONST.DAYS_PER_SEASON * 4)) + 1;
    const seasonChanged = newSeasonIndex !== state.seasonIndex;
    state.seasonIndex = newSeasonIndex;
    state.year = newYear;

    // Weather by season
    const season = seasonName(state);
    if (season === 'winter') {
      state.weather = Math.random() < 0.45 ? 'snow' : 'sun';
    } else {
      const rainChance = season === 'summer' ? 0.22 : 0.3;
      state.weather = Math.random() < rainChance ? 'rain' : 'sun';
    }
    if (state.weather === 'rain') Game.tryAchieve('rainy_day');
    if (state.weather === 'snow') Game.tryAchieve('snow_day');

    // Season complete achievements
    if (seasonChanged) {
      const prev = CONST.SEASONS[(newSeasonIndex + 3) % 4];
      if (prev === 'spring') Game.tryAchieve('season_spring');
      if (prev === 'summer') Game.tryAchieve('season_summer');
      if (prev === 'fall') Game.tryAchieve('season_fall');
      if (prev === 'winter') Game.tryAchieve('season_winter');
    }

    return { seasonChanged };
  }

  function dayInSeason(state) {
    return ((state.day - 1) % CONST.DAYS_PER_SEASON) + 1;
  }

  function isFestivalDay(state) {
    return dayInSeason(state) === CONST.DAYS_PER_SEASON;
  }

  function lightTint(period, weather) {
    if (weather === 'snow') {
      if (period === 'evening') return 'rgba(60,80,120,0.35)';
      return 'rgba(200,220,240,0.2)';
    }
    if (weather === 'rain') {
      if (period === 'morning') return 'rgba(100,120,150,0.18)';
      if (period === 'afternoon') return 'rgba(80,100,130,0.22)';
      return 'rgba(40,50,80,0.4)';
    }
    if (period === 'morning') return 'rgba(255,200,140,0.12)';
    if (period === 'afternoon') return 'rgba(255,255,255,0.0)';
    return 'rgba(255,120,60,0.22)';
  }

  return { seasonName, update, sleep, dayInSeason, isFestivalDay, lightTint, advancePeriod };
})();
