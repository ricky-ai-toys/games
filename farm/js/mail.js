/* ========================================
   Amber's Farm — Morning mail generator (BIG-4)
   ======================================== */

const Mail = (() => {
  const NPC_NOTES = {
    maple: [
      'Ms. Maple: "Your radishes made me smile. Keep watering!"',
      'Ms. Maple: "Try gifting a dish — cooks make the best friends."',
      'Ms. Maple: "Fall pumpkins are my favorite. See you at the shop!"',
    ],
    finn: [
      'Finn: "Did you pet the chickens today? They notice!"',
      'Finn: "Happy animals = better eggs. You\'re doing great."',
      'Finn: "When you\'re ready for a cow, I\'ll be at the coop."',
    ],
    bea: [
      'Bea: "New stock every season. Swing by the stall!"',
      'Bea: "Fertilizer is on sale in my heart, if not on the sign."',
      'Bea: "Decor makes a farm feel like home. 🌸"',
    ],
  };

  function buildMorningLetter(state, extras) {
    const season = TimeSys.seasonName(state);
    const dayS = TimeSys.dayInSeason(state);
    const tips = [
      'Tip: Hand tool (1) auto-farms — till, plant, water, harvest.',
      'Tip: Pet and feed animals every day for ★ products.',
      'Tip: Festival day is the last day of each season!',
      'Tip: Place a scarecrow to shoo rare hungry crows.',
      'Tip: Open inventory with I — check Seeds & Map tabs.',
      'Tip: Low energy only slows you down. Sleep restores all.',
      'Tip: Gift loved dishes for extra friendship hearts.',
      'Tip: Crack geodes at Rori\'s bench — always a gem!',
      'Tip: Send a letter at the village postbox for +1 heart.',
      'Tip: Winter roots grow even when snowflakes fall.',
    ];

    let letter = `Good morning, Amber!\n\n`;
    letter += `Day ${state.day} — ${Utils.seasonName(season)} ${dayS}/7 · Year ${state.year || 1}\n`;
    letter += state.weather === 'rain'
      ? '🌧️ Soft rain on the roof. Crops are watered!\n\n'
      : state.weather === 'snow'
        ? '❄️ A quiet snowy morning. Bundle up!\n\n'
        : '☀️ Sunshine on the valley.\n\n';

    if (extras.earnings > 0) {
      letter += `📦 Shipping: +${extras.earnings}g\n`;
    } else {
      letter += `📦 Shipping bin was empty.\n`;
    }
    letter += `⚡ Energy fully restored.\n`;

    if (extras.ready > 0) letter += `✨ ${extras.ready} crop(s) ready to harvest!\n`;
    if (extras.crowMsg) letter += `\n${extras.crowMsg}\n`;
    if (extras.roosterMsg) letter += `\n${extras.roosterMsg}\n`;

    // NPC note by friendship
    const friend = pickFriendNote(state);
    if (friend) letter += `\n💌 ${friend}\n`;

    // Free gift mail occasionally
    if (extras.giftLine) letter += `\n🎁 ${extras.giftLine}\n`;

    // Season change
    if (dayS === 1 && state.day > 1) {
      letter += `\n${seasonGreeting(season)}\n`;
    }

    // Amber's "birthday" — day 3 of year 1 spring, and yearly anniversary of day 3
    if (isAmberDay(state)) {
      letter += `\n🎂 Happy Farmer's Day, Amber! The valley made you a cake of kindness (+50g, +3 fertilizer).\n`;
    }

    letter += `\n${tips[state.day % tips.length]}\n`;
    letter += `\nHave a wonderful day! 🦊`;
    return letter;
  }

  function pickFriendNote(state) {
    const ids = Object.keys(NPC_NOTES).filter(id => (state.npcHearts[id] || 0) >= 1);
    if (!ids.length) {
      // still sometimes maple intro
      if (state.day % 3 === 0) return NPC_NOTES.maple[0];
      return null;
    }
    const id = ids[state.day % ids.length];
    const lines = NPC_NOTES[id];
    return lines[(state.day + (state.npcHearts[id] || 0)) % lines.length];
  }

  function seasonGreeting(season) {
    return {
      spring: '🌸 Spring blooms! Radish & potato love this weather.',
      summer: '🌻 Summer heat! Corn, tomatoes, blueberries & melons.',
      fall: '🍂 Fall colors! Pumpkins & cranberries at the shop.',
      winter: '❄️ Winter hush. Winter roots still grow underground.',
    }[season] || '';
  }

  function isAmberDay(state) {
    // Day 3 each year (day 3, 31, 59...) roughly every 28 days: day % 28 === 3
    return state.day >= 3 && ((state.day - 3) % 28 === 0);
  }

  function applyAmberDayGifts(state) {
    if (!isAmberDay(state)) return null;
    state.coins += 50;
    state.inventory.fertilizer = (state.inventory.fertilizer || 0) + 3;
    Game.tryAchieve('amber_day');
    return 'Farmer\'s Day gifts applied!';
  }

  /** Random small mail gift (~20% non-festival) */
  function maybeMailGift(state) {
    if (TimeSys.isFestivalDay(state)) return null;
    if (Math.random() > 0.22) return null;
    const roll = Math.random();
    if (roll < 0.4) {
      state.inventory.seeds.radish = (state.inventory.seeds.radish || 0) + 2;
      return 'A neighbor left 2 radish seeds in your mailbox.';
    }
    if (roll < 0.7) {
      state.inventory.feed = (state.inventory.feed || 0) + 2;
      return 'Finn dropped off 2 bags of feed. How kind!';
    }
    state.coins += 15;
    return 'You found 15g tucked in a thank-you note.';
  }

  /** Send a letter via the village postbox — 10g, +1 heart, once per day */
  function sendLetter(state, npcId) {
    const n = NPCS[npcId];
    if (!n) return { ok: false, msg: 'Who?' };
    if (state.letterSentDay === state.day) return { ok: false, msg: 'One letter a day is plenty.' };
    if (state.coins < 10) return { ok: false, msg: 'Stamps cost 10g.' };
    state.coins -= 10;
    state.letterSentDay = state.day;
    state.npcHearts[npcId] = Math.min(10, (state.npcHearts[npcId] || 0) + 1);
    FarmAudio.success();
    Game.tryAchieve('pen_pal');
    if (typeof Quests !== 'undefined') Quests.progress(state, 'gift', 1);
    UI.refreshHUD();
    return { ok: true, msg: `Letter delivered to ${n.name}! 💌` };
  }

  return { buildMorningLetter, applyAmberDayGifts, maybeMailGift, isAmberDay, sendLetter };
})();
