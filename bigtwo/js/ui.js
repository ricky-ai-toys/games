/* ========================================
   Amber's Big Two — DOM UI
   ======================================== */

const UI = {
  els: {},

  init() {
    this.els = {
      menu: document.getElementById('menu-screen'),
      table: document.getElementById('table-screen'),
      roundEnd: document.getElementById('round-end-screen'),
      rules: document.getElementById('rules-screen'),
      status: document.getElementById('status-text'),
      tip: document.getElementById('tip-text'),
      trick: document.getElementById('trick-area'),
      hand: document.getElementById('player-hand'),
      btnPlay: document.getElementById('btn-play'),
      btnPass: document.getElementById('btn-pass'),
      btnHint: document.getElementById('btn-hint'),
      btnSort: document.getElementById('btn-sort'),
      scoreboard: document.getElementById('scoreboard'),
      seats: {
        0: document.getElementById('seat-south'),
        1: document.getElementById('seat-east'),
        2: document.getElementById('seat-north'),
        3: document.getElementById('seat-west'),
      },
      roundTitle: document.getElementById('round-title'),
      roundMsg: document.getElementById('round-msg'),
      roundBreakdown: document.getElementById('round-breakdown'),
      roundStars: document.getElementById('round-stars'),
      confetti: document.getElementById('confetti-layer'),
      highScores: document.getElementById('high-scores'),
    };

    Game.on((event, data) => this.onEvent(event, data));
  },

  onEvent(event, data) {
    if (event === 'update' || event === 'handStart') this.render();
    if (event === 'handEnd') this.showRoundEnd(data);
    if (event === 'menu') this.showMenu();
    if (event === 'play' && data) {
      this.flashCheer(data, false);
      this.animatePlayFromSeat(data.seat);
    }
    if (event === 'pass' && data) this.flashCheer(data, true);
    if (event === 'trickClear') {
      this.flashCheer(null, false, true);
    }
    if (event === 'yourTurn') {
      this.pulseYourTurn();
    }
    if (event === 'thinking') {
      this.render(); // refresh thinking bubble + dots
    }
  },

  flashCheer(data, isPass, isClear) {
    const el = document.getElementById('table-cheer');
    if (!el) return;
    if (isClear) {
      el.textContent = 'New trick! Who leads? \uD83C\uDF1F';
      return;
    }
    if (!data || data.seat == null) return;
    const b = BUDDIES[data.seat];
    if (!b) return;
    if (isPass) {
      const line = (b.skipLines && Utils.pick(b.skipLines)) || Utils.pick(BUDDY_SKIP_LINES);
      el.textContent = `${b.emoji} ${b.name}: ${line}`;
    } else {
      const line = (b.playLines && Utils.pick(b.playLines)) || Utils.pick(BUDDY_PLAY_LINES);
      const sticker = Utils.pick(KID_STICKERS);
      el.textContent = `${sticker} ${b.emoji} ${b.name}: ${line}`;
    }
  },

  /** Fly a ghost card from seat into the trick area */
  animatePlayFromSeat(seat) {
    try {
      const seatEl = this.els.seats[seat];
      const trickEl = this.els.trick;
      if (!seatEl || !trickEl || typeof document.createElement !== 'function') return;
      if (typeof seatEl.getBoundingClientRect !== 'function') return;
      const from = seatEl.getBoundingClientRect();
      const to = trickEl.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'fly-card';
      ghost.textContent = '\uD83C\uDCCF';
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      const endX = to.left + to.width / 2;
      const endY = to.top + to.height / 2;
      ghost.style.left = `${startX}px`;
      ghost.style.top = `${startY}px`;
      document.body.appendChild(ghost);
      const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
      raf(() => {
        ghost.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.6)`;
        ghost.style.opacity = '0.15';
      });
      setTimeout(() => {
        if (typeof ghost.remove === 'function') ghost.remove();
      }, 420);
    } catch {
      /* animation is cosmetic */
    }
  },

  pulseYourTurn() {
    if (this.els.status) {
      this.els.status.classList.remove('your-turn-pulse');
      // reflow to restart animation
      void this.els.status.offsetWidth;
      this.els.status.classList.add('your-turn-pulse');
    }
    const table = document.getElementById('table-screen');
    if (table) {
      table.classList.add('human-turn');
      setTimeout(() => table.classList.remove('human-turn'), 900);
    }
  },

  showMenu() {
    this.els.menu.classList.remove('hidden');
    this.els.table.classList.add('hidden');
    this.els.roundEnd.classList.add('hidden');
    this.els.rules.classList.add('hidden');
    this.refreshBests();
  },

  showTable(opts = {}) {
    this.els.menu.classList.add('hidden');
    this.els.table.classList.remove('hidden');
    // Keep round-end overlay up when a hand just finished (render runs after handEnd)
    if (!opts.keepRoundEnd) {
      this.els.roundEnd.classList.add('hidden');
    }
    this.els.rules.classList.add('hidden');
  },

  showRules() {
    this.els.rules.classList.remove('hidden');
  },

  hideRules() {
    this.els.rules.classList.add('hidden');
  },

  refreshBests() {
    const bests = Game.getBests();
    if (!this.els.highScores) return;
    this.els.highScores.innerHTML = ['easy', 'normal', 'hard', 'expert']
      .map((d) => {
        const label = DIFFICULTY[d].label;
        return `<span>${label}: <strong>${bests[d] || 0}\u2B50</strong></span>`;
      })
      .join(' \u00B7 ');
  },

  render() {
    const match = Game.match;
    if (!match || !match.hand) return;
    // Do not hide the round-end screen while the finished-hand overlay is active
    this.showTable({ keepRoundEnd: !!match.hand.finished });

    const h = match.hand;
    this.els.status.textContent = Rules.statusText(match);

    // Table spotlight: dim everyone except active seat
    const tableScreen = document.getElementById('table-screen');
    if (tableScreen) {
      tableScreen.classList.toggle('has-active-turn', !h.finished);
      tableScreen.classList.toggle('is-human-turn', h.turn === SEAT.SOUTH && !h.finished && !Game.busy);
    }

    // Seats
    for (let s = 0; s < 4; s++) {
      const el = this.els.seats[s];
      if (!el) continue;
      const buddy = BUDDIES[s];
      const count = h.hands[s].length;
      const active = h.turn === s && !h.finished;
      const thinking = Game.thinkingSeat === s && Game.busy && !h.finished;
      el.classList.toggle('active-turn', active || thinking);
      el.classList.toggle('seat-dimmed', !h.finished && !active && !thinking);
      el.classList.toggle('winner-seat', h.finished && h.winner === s);
      el.classList.toggle('is-thinking', thinking);
      const nameEl = el.querySelector('.seat-name');
      if (nameEl) {
        nameEl.textContent = s === SEAT.SOUTH ? `${buddy.name} (you!)` : buddy.name;
      }
      const avatarEl = el.querySelector('.seat-avatar');
      if (avatarEl) avatarEl.textContent = buddy.emoji;
      el.querySelector('.seat-count').textContent = s === SEAT.SOUTH
        ? `${count} cards`
        : `${count} left`;
      // Speech bubble for last action by this seat in current trick (stable across re-renders)
      let bubble = el.querySelector('.seat-bubble');
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'seat-bubble hidden';
        el.appendChild(bubble);
      }
      const lastAct = (h.currentTrick || []).filter((e) => e.seat === s).pop();
      const actIdx = lastAct ? (h.currentTrick || []).lastIndexOf(lastAct) : -1;
      if (thinking) {
        const key = 'thinking';
        if (bubble.dataset.key !== key) {
          bubble.dataset.key = key;
          bubble.innerHTML = `${buddy.name} is thinking<span class="think-dots"></span>`;
        }
        bubble.classList.remove('hidden');
      } else if (lastAct && !h.finished && !active) {
        const key = `act-${actIdx}-${lastAct.pass ? 'p' : 'c'}`;
        if (bubble.dataset.key !== key) {
          bubble.dataset.key = key;
          if (!lastAct.line) {
            if (lastAct.pass) {
              lastAct.line = (buddy.skipLines && Utils.pick(buddy.skipLines))
                || Utils.pick(BUDDY_SKIP_LINES);
            } else {
              lastAct.line = (buddy.playLines && Utils.pick(buddy.playLines))
                || Utils.pick(BUDDY_PLAY_LINES);
            }
          }
          bubble.textContent = lastAct.line;
        }
        bubble.classList.remove('hidden');
      } else if (active && !h.finished && s === SEAT.SOUTH) {
        const key = 'your-turn';
        if (bubble.dataset.key !== key) {
          bubble.dataset.key = key;
          bubble.textContent = 'Your turn!';
        }
        bubble.classList.remove('hidden');
      } else if (!thinking) {
        bubble.classList.add('hidden');
        bubble.dataset.key = '';
        bubble.textContent = '';
      }
      const backs = el.querySelector('.seat-backs');
      if (backs) {
        // North/south hide via CSS; sides show a compact strip (max 8) so backs don't pile up
        if (s === SEAT.SOUTH || s === SEAT.NORTH) {
          backs.innerHTML = '';
        } else {
          const n = Math.min(count, 8);
          backs.innerHTML = Array.from({ length: n }, () => '<span class="card-back mini"></span>').join('');
        }
      }
    }

    // Trick
    this.renderTrick(h);

    // Player hand
    this.renderHand(h.hands[SEAT.SOUTH]);

    // Scoreboard
    this.els.scoreboard.innerHTML = BUDDIES.map((b, i) => {
      return `<div class="score-chip ${i === SEAT.SOUTH ? 'you' : ''}">${b.emoji} ${match.stars[i]}\u2B50</div>`;
    }).join('');

    // Buttons
    const human = Rules.isHumanTurn(match) && !Game.busy;
    const selected = Game.getSelectedCards();
    const analyzed = Combos.analyze(selected);
    let canPlay = false;
    if (human && analyzed) {
      if (h.mustInclude3D && !selected.some(Cards.isThreeDiamonds)) canPlay = false;
      else if (h.currentPlay) canPlay = Combos.beats(analyzed, h.currentPlay);
      else canPlay = true;
    }

    this.els.btnPlay.disabled = !human || !canPlay;
    this.els.btnPass.disabled = !human || !Rules.canPass(match);
    this.els.btnHint.disabled = !human;
    this.els.btnSort.disabled = !match.hand;

    // Status emphasis on your turn
    if (this.els.status) {
      this.els.status.classList.toggle(
        'status-your-turn',
        human && !h.finished
      );
    }

    // Selection tip (kid-friendly, context-aware)
    if (!human) {
      if (Game.thinkingSeat != null) {
        const b = BUDDIES[Game.thinkingSeat];
        this.els.tip.textContent = b
          ? `${b.emoji} ${b.name} is thinking\u2026 (${b.styleNote || 'planning a move'})`
          : 'Buddies are thinking\u2026';
      } else {
        this.els.tip.textContent = Game.busy ? 'Buddies are thinking\u2026' : '';
      }
    } else if (!h.currentPlay) {
      // Leading — Skip is disabled
      if (h.mustInclude3D) {
        if (!selected.length) {
          this.els.tip.textContent = 'You lead! Play any combo that includes the glowing 3\u2666.';
        } else if (!selected.some(Cards.isThreeDiamonds)) {
          this.els.tip.textContent = 'First lead must include the 3\u2666 \u2014 it is glowing!';
        } else if (!analyzed) {
          this.els.tip.textContent = 'Include 3\u2666 in a real combo!';
        } else {
          this.els.tip.textContent = `Ready: ${Combos.shortName(analyzed)} (includes 3\u2666) \u2728`;
        }
      } else if (!selected.length) {
        this.els.tip.textContent = 'You lead \u2014 play any combo! (Skip is only for following.)';
      } else if (!analyzed) {
        this.els.tip.textContent = 'Hmm, that is not a valid combo yet.';
      } else {
        this.els.tip.textContent = `Ready: ${Combos.shortName(analyzed)} \u2728`;
      }
    } else if (!selected.length) {
      this.els.tip.textContent = 'Tap cards to beat the trick \u2014 or Skip if you cannot!';
    } else if (!analyzed) {
      this.els.tip.textContent = 'Hmm, that is not a valid combo yet.';
    } else if (!Combos.beats(analyzed, h.currentPlay)) {
      this.els.tip.textContent = `Need a higher ${Combos.shortName(h.currentPlay)} \u2014 or Skip!`;
    } else {
      this.els.tip.textContent = `Ready: ${Combos.shortName(analyzed)} \u2728`;
    }
  },

  renderTrick(h) {
    const area = this.els.trick;
    const trick = h.currentTrick || [];

    if (!trick.length && !h.currentPlay) {
      const emptyMsg = h.mustInclude3D
        ? '\u2728 Who has the magic 3\u2666? \u2728'
        : '\uD83C\uDF89 New trick \u2014 play anything!';
      area.innerHTML = `<div class="trick-label empty-trick">${emptyMsg}</div>`;
      return;
    }

    // Clean vertical list: each buddy's cards spaced, older plays quieter
    const rows = trick.map((entry, idx) => {
      const buddy = entry.seat >= 0 ? BUDDIES[entry.seat] : null;
      const isLatest = idx === trick.length - 1;
      const who = buddy ? `${buddy.emoji} ${buddy.name}` : '?';
      if (entry.pass) {
        return `
          <div class="trick-row pass-row ${isLatest ? 'latest' : 'older'}">
            <div class="trick-meta"><span class="trick-who">${who}</span></div>
            <div class="skip-badge">skipped</div>
          </div>`;
      }
      const cards = (entry.play && entry.play.cards) || [];
      // One card face per slot — never join without gaps
      const cardHtml = cards.map((c) => (
        `<div class="trick-card-slot">${UI.cardHTML(c, false, false)}</div>`
      )).join('');
      return `
        <div class="trick-row play-row ${isLatest ? 'latest' : 'older'}">
          <div class="trick-meta"><span class="trick-who">${who}</span></div>
          <div class="trick-cards">${cardHtml}</div>
        </div>`;
    }).join('');

    area.innerHTML = `<div class="trick-stack">${rows}</div>`;
  },

  renderHand(hand) {
    const el = this.els.hand;
    const n = hand.length || 1;
    el.innerHTML = hand.map((c, i) => {
      const sel = Game.selectedIds.has(c.id);
      return UI.cardHTML(c, sel, true, i, n);
    }).join('');

    el.querySelectorAll('.card[data-id]').forEach((node) => {
      node.addEventListener('click', () => {
        Sfx.playClick();
        Game.toggleSelect(node.dataset.id);
      });
    });
  },

  cardHTML(card, selected, interactive, index = 0, total = 1) {
    const color = SUIT_COLOR[card.suit];
    const sym = SUIT_SYMBOL[card.suit];
    const mustGlow = interactive
      && Game.match?.hand?.mustInclude3D
      && Rules.isHumanTurn(Game.match)
      && Cards.isThreeDiamonds(card);
    const cls = [
      'card',
      color,
      selected ? 'selected' : '',
      interactive ? 'interactive' : '',
      mustGlow ? 'must-lead' : '',
    ].filter(Boolean).join(' ');
    const style = interactive
      ? `style="--i:${index};--n:${total}"`
      : '';
    return `
      <div class="${cls}" data-id="${card.id}" ${style} role="button" tabindex="0" aria-label="${card.rank} of ${SUIT_NAME[card.suit]}">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit">${sym}</span>
        <span class="card-suit corner">${sym}</span>
      </div>
    `;
  },

  showRoundEnd({ score, isRecord }) {
    const humanWon = score.winner === SEAT.SOUTH;
    this.els.roundEnd.classList.remove('hidden');
    this.els.roundTitle.textContent = humanWon
      ? 'You win the hand! \uD83C\uDF89'
      : `${BUDDIES[score.winner].name} wins the hand`;
    const msgs = humanWon ? ENCOURAGE_WIN : ENCOURAGE_LOSE;
    this.els.roundMsg.textContent = Utils.pick(msgs) + (isRecord ? ' \uD83C\uDFC6 New best stars!' : '');

    this.els.roundBreakdown.innerHTML = score.breakdown
      .map((row) => {
        const b = BUDDIES[row.seat];
        if (row.seat === score.winner) {
          return `<div class="bd-row win">${b.emoji} ${b.name} wins +${row.stars}\u2B50</div>`;
        }
        const plural = row.cards === 1 ? '' : 's';
        return `<div class="bd-row">${b.emoji} ${b.name} still had ${row.cards} card${plural} (${row.stars}\u2B50 for the winner)</div>`;
      })
      .join('');

    this.els.roundStars.textContent = `Your total: ${Game.match.stars[SEAT.SOUTH]}\u2B50`;

    if (humanWon && Game.settings.confetti) this.burstConfetti();
  },

  burstConfetti() {
    const layer = this.els.confetti;
    if (!layer) return;
    layer.innerHTML = '';
    const colors = ['#FFB347', '#FFB7C5', '#7EC8E3', '#7ED957', '#FFE566', '#c9a0ff'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-bit';
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = Utils.pick(colors);
      p.style.animationDelay = `${Math.random() * 0.3}s`;
      p.style.setProperty('--x', `${Utils.randInt(-80, 80)}px`);
      layer.appendChild(p);
    }
    setTimeout(() => { layer.innerHTML = ''; }, 2000);
  },

  shakePlayButton() {
    this.els.btnPlay.classList.add('shake');
    setTimeout(() => this.els.btnPlay.classList.remove('shake'), 400);
  },
};
