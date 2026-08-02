/* ========================================
   Amber's Big Two — Game orchestrator
   ======================================== */

const Game = {
  match: null,
  selectedIds: new Set(),
  busy: false,
  thinkingSeat: null, // AI seat currently "thinking"
  sortMode: 'rank', // rank | suit
  settings: {
    sfx: true,
    confetti: true,
  },
  listeners: [],
  _thinkTimer: null,
  _lastHumanTurnChime: 0,

  on(fn) {
    this.listeners.push(fn);
  },

  emit(event, data) {
    for (const fn of this.listeners) fn(event, data);
  },

  init() {
    this.settings = Utils.loadJSON(STORAGE_KEYS.settings, { sfx: true, confetti: true });
    Sfx.setEnabled(this.settings.sfx);
  },

  saveSettings() {
    Utils.saveJSON(STORAGE_KEYS.settings, this.settings);
    Sfx.setEnabled(this.settings.sfx);
  },

  getLastDifficulty() {
    try {
      return localStorage.getItem(STORAGE_KEYS.lastDifficulty) || 'easy';
    } catch {
      return 'easy';
    }
  },

  setLastDifficulty(id) {
    try {
      localStorage.setItem(STORAGE_KEYS.lastDifficulty, id);
    } catch {
      /* ignore */
    }
  },

  getBests() {
    return Utils.loadJSON(STORAGE_KEYS.bests, {
      easy: 0,
      normal: 0,
      hard: 0,
      expert: 0,
    });
  },

  saveBestIfNeeded() {
    if (!this.match) return;
    const bests = this.getBests();
    const d = this.match.difficulty;
    const stars = this.match.stars[SEAT.SOUTH];
    if (stars > (bests[d] || 0)) {
      bests[d] = stars;
      Utils.saveJSON(STORAGE_KEYS.bests, bests);
      return true;
    }
    return false;
  },

  startMatch(difficultyId) {
    this.setLastDifficulty(difficultyId);
    this.match = Rules.createMatch(difficultyId);
    this.selectedIds.clear();
    this.busy = false;
    this.thinkingSeat = null;
    this.startHand();
  },

  startHand() {
    if (this._thinkTimer) {
      clearTimeout(this._thinkTimer);
      this._thinkTimer = null;
    }
    Rules.startHand(this.match);
    this.selectedIds.clear();
    this.busy = false;
    this.thinkingSeat = null;
    this.emit('handStart');
    this.emit('update');
    // If AI starts
    this._scheduleTurn();
  },

  _scheduleTurn() {
    if (!this.match || !this.match.hand || this.match.hand.finished) return;
    const turn = this.match.hand.turn;
    if (this._thinkTimer) {
      clearTimeout(this._thinkTimer);
      this._thinkTimer = null;
    }
    if (turn === SEAT.SOUTH) {
      this.busy = false;
      this.thinkingSeat = null;
      this.emit('update');
      // Your-turn chime (debounce rapid re-schedules)
      const now = Date.now();
      if (now - this._lastHumanTurnChime > 400) {
        this._lastHumanTurnChime = now;
        Sfx.playYourTurn();
        this.emit('yourTurn');
      }
      return;
    }
    this.busy = true;
    this.thinkingSeat = turn;
    this.emit('thinking', { seat: turn });
    this.emit('update');
    const delay = AI.thinkDelay(this.match);
    this._thinkTimer = setTimeout(() => {
      this._thinkTimer = null;
      this._aiTurn();
    }, delay);
  },

  /** Last-resort: play lowest legal (or lowest single when leading) */
  _aiForcePlay(seat) {
    const h = this.match.hand;
    const hand = h.hands[seat];
    let play = Combos.lowestBeatingPlay(hand, h.currentPlay, h.mustInclude3D);
    if (!play && hand.length && !h.currentPlay) {
      play = Combos.analyze([hand[0]]);
    }
    if (!play) {
      if (h.currentPlay) Rules.applyPass(this.match, seat);
      this.emit('update');
      this._scheduleTurn();
      return;
    }
    const res = Rules.applyPlay(this.match, seat, play.cards);
    if (res.ok) {
      Sfx.playCard();
      this.emit('play', { seat, play });
      if (res.won) {
        this._onHandEnd(res.score);
        return;
      }
    }
    this.emit('update');
    this._scheduleTurn();
  },

  async _aiTurn() {
    if (!this.match?.hand || this.match.hand.finished) return;
    const seat = this.match.hand.turn;
    if (seat === SEAT.SOUTH) {
      this.busy = false;
      this.thinkingSeat = null;
      this.emit('update');
      return;
    }

    this.thinkingSeat = null;
    const decision = AI.decide(this.match, seat);
    const leading = !this.match.hand.currentPlay;

    if (decision.action === 'pass' && !leading) {
      const res = Rules.applyPass(this.match, seat);
      if (!res.ok) {
        console.warn('AI pass rejected', res.error);
        this._aiForcePlay(seat);
        return;
      }
      Sfx.playPass();
      this.emit('pass', { seat });
      if (res.trickCleared) {
        Sfx.playTrickClear();
        this.emit('trickClear');
      }
    } else {
      const cards = (decision.play && decision.play.cards)
        || Combos.lowestBeatingPlay(
          this.match.hand.hands[seat],
          this.match.hand.currentPlay,
          this.match.hand.mustInclude3D
        )?.cards;
      if (!cards || !cards.length) {
        if (!leading) {
          Rules.applyPass(this.match, seat);
          Sfx.playPass();
          this.emit('pass', { seat });
        } else {
          console.warn('AI had no lead cards', seat);
        }
      } else {
        const res = Rules.applyPlay(this.match, seat, cards);
        if (!res.ok) {
          console.warn('AI illegal, recovering', res.error, decision.play);
          if (leading) {
            this._aiForcePlay(seat);
            return;
          }
          Rules.applyPass(this.match, seat);
          Sfx.playPass();
          this.emit('pass', { seat });
        } else {
          Sfx.playBuddyPlay();
          this.emit('play', { seat, play: Combos.analyze(cards) });
          if (res.won) {
            this._onHandEnd(res.score);
            return;
          }
        }
      }
    }
    this.emit('update');
    this._scheduleTurn();
  },

  toggleSelect(cardId) {
    if (this.busy || !Rules.isHumanTurn(this.match)) return;
    if (this.selectedIds.has(cardId)) this.selectedIds.delete(cardId);
    else this.selectedIds.add(cardId);
    this.emit('update');
  },

  clearSelection() {
    this.selectedIds.clear();
    this.emit('update');
  },

  getSelectedCards() {
    const hand = this.match.hand.hands[SEAT.SOUTH];
    return hand.filter((c) => this.selectedIds.has(c.id));
  },

  humanPlay() {
    if (this.busy || !Rules.isHumanTurn(this.match)) return { ok: false, error: 'Not your turn' };
    const cards = this.getSelectedCards();
    if (!cards.length) return { ok: false, error: 'Pick some cards first!' };

    const res = Rules.applyPlay(this.match, SEAT.SOUTH, cards);
    if (!res.ok) {
      Sfx.playError();
      return res;
    }
    Sfx.playCard();
    this.selectedIds.clear();
    this.emit('play', { seat: SEAT.SOUTH, play: Combos.analyze(cards) });
    this.emit('update');
    if (res.won) {
      this._onHandEnd(res.score);
      return res;
    }
    this._scheduleTurn();
    return res;
  },

  humanPass() {
    if (this.busy || !Rules.isHumanTurn(this.match)) return { ok: false, error: 'Not your turn' };
    if (!Rules.canPass(this.match)) {
      Sfx.playError();
      return { ok: false, error: 'You lead — play any combo!' };
    }
    const res = Rules.applyPass(this.match, SEAT.SOUTH);
    if (!res.ok) {
      Sfx.playError();
      return res;
    }
    Sfx.playPass();
    this.selectedIds.clear();
    this.emit('pass', { seat: SEAT.SOUTH });
    if (res.trickCleared) {
      Sfx.playTrickClear();
      this.emit('trickClear');
    }
    this.emit('update');
    this._scheduleTurn();
    return res;
  },

  hint() {
    if (this.busy || !Rules.isHumanTurn(this.match)) return null;
    const h = this.match.hand;
    const hand = h.hands[SEAT.SOUTH];
    const play = Combos.lowestBeatingPlay(hand, h.currentPlay, h.mustInclude3D);
    if (!play) {
      // Suggest pass
      Sfx.playHint();
      return { type: 'pass' };
    }
    this.selectedIds = new Set(play.cards.map((c) => c.id));
    Sfx.playHint();
    this.emit('update');
    return { type: 'play', play };
  },

  sortHand() {
    if (!this.match?.hand) return;
    const hand = this.match.hand.hands[SEAT.SOUTH];
    if (this.sortMode === 'rank') {
      Cards.sortHand(hand);
    } else {
      hand.sort((a, b) => {
        if (a.suitRank !== b.suitRank) return a.suitRank - b.suitRank;
        return a.rankValue - b.rankValue;
      });
    }
    this.emit('update');
  },

  toggleSortMode() {
    this.sortMode = this.sortMode === 'rank' ? 'suit' : 'rank';
    this.sortHand();
  },

  _onHandEnd(score) {
    this.busy = true;
    const humanWon = score.winner === SEAT.SOUTH;
    if (humanWon) Sfx.playWin();
    else Sfx.playLose();
    const isRecord = this.saveBestIfNeeded();
    // update first (table refresh with keepRoundEnd), then handEnd shows overlay
    this.emit('update');
    this.emit('handEnd', { score, isRecord });
  },

  nextHand() {
    if (!this.match) return;
    this.startHand();
  },

  quitToMenu() {
    this.match = null;
    this.selectedIds.clear();
    this.busy = false;
    this.emit('menu');
  },
};
