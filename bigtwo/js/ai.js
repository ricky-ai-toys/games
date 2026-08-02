/* ========================================
   Amber's Big Two — Sophisticated AI
   ======================================== */

const AI = {
  /**
   * Choose a play or pass for seat.
   * Returns { action: 'play'|'pass', play?: Play }
   */
  decide(match, seat) {
    const h = match.hand;
    const hand = h.hands[seat];
    const diff = DIFFICULTY[match.difficulty] || DIFFICULTY.normal;
    const personality = BUDDIES[seat].personality || 'patient';
    const require3D = h.mustInclude3D;
    const current = h.currentPlay;

    const legal = Combos.findAllLegalPlays(hand, current, require3D);

    // Leading — never pass; always play something if cards remain
    if (!current) {
      if (!legal.length) {
        // Safety: any single (should be unreachable if hand non-empty)
        if (hand.length) {
          return { action: 'play', play: Combos.analyze([hand[0]]) };
        }
        return { action: 'pass' };
      }
      const play = AI._chooseLead(legal, hand, h, seat, diff, personality);
      if (!play) {
        return { action: 'play', play: legal[0] };
      }
      return { action: 'play', play };
    }

    // Following
    if (!legal.length) {
      return { action: 'pass' };
    }

    // Easy: sometimes pass even with legal (weak play) unless can go out
    const canOut = legal.some((p) => p.length === hand.length);
    if (diff.id === 'easy' && !canOut && Math.random() < 0.18) {
      return { action: 'pass' };
    }

    const scored = legal.map((play) => ({
      play,
      score: AI._scoreFollow(play, hand, h, seat, diff, personality),
    }));

    // Maybe pass if all plays are terrible overkill
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    const passThreshold = AI._passThreshold(diff, personality, h, seat);
    if (!canOut && best.score < passThreshold) {
      return { action: 'pass' };
    }

    const temperature = 0.35 + diff.noise * 2.5;
    const k = diff.id === 'easy' ? Math.max(3, legal.length) : diff.id === 'normal' ? 3 : 2;
    const pick = Utils.topKPick(
      scored,
      (x) => x.score,
      k,
      diff.noise
    );
    // Softmax blend for extra variety on easy/normal
    let chosen = pick;
    if (diff.noise > 0.05) {
      chosen = Utils.softmaxPick(scored, (x) => x.score, temperature) || pick;
    }

    return { action: 'play', play: chosen.play };
  },

  _chooseLead(legal, hand, handState, seat, diff, personality) {
    const features = HandEval.analyze(hand);
    const threat = HandEval.minOpponentCards(handState.hands, seat);
    const canOut = legal.filter((p) => p.length === hand.length);
    if (canOut.length) {
      // Prefer going out
      canOut.sort((a, b) => Combos._strengthCmp(a, b));
      return canOut[0];
    }

    const scored = legal.map((play) => ({
      play,
      score: AI._scoreLead(play, hand, features, threat, handState, seat, diff, personality),
    }));

    // Expert 1-ply: boost leads that leave a flexible rest
    if (diff.onePly) {
      for (const row of scored) {
        row.score += AI._onePlyLeadBonus(row.play, hand) * 2;
      }
    }

    const k = diff.id === 'easy' ? 5 : 3;
    return Utils.topKPick(scored, (x) => x.score, k, diff.noise).play;
  },

  _scoreLead(play, hand, features, threat, handState, seat, diff, personality) {
    let s = 0;

    // Dump value — longer often better when clean
    s += play.length * 4;

    // Prefer low power when leading mid-game
    const power = HandEval.powerNorm(play);
    const midGame = hand.length > 6;
    if (midGame) {
      s += (1 - power) * 6 * diff.overkillPenalty;
    } else {
      s += (1 - power) * 2;
    }

    // Split cost
    s -= HandEval.splitCost(hand, play.cards) * (personality === 'conservative' ? 1.4 : 1.0);

    // Don't lead bombs early
    const isBomb = play.type === 'fourKind' || play.type === 'straightFlush';
    if (isBomb && hand.length > 5) {
      s -= 12 * diff.bombSave;
    }

    // Don't lead pure high 2 single early
    if (play.type === 'single' && play.powerCard.rank === '2' && hand.length > 4) {
      s -= 10 * diff.overkillPenalty;
    }

    // Free orphans
    if (play.type === 'single' && features.lowestOrphan
      && play.powerCard.id === features.lowestOrphan.id) {
      s += 5;
    }

    // Threat: if someone has few cards, lead longer to race
    if (threat <= 2) {
      s += play.length * 3 * diff.stopThreat;
      if (personality === 'aggressive') s += 3;
    }

    // Personality
    if (personality === 'aggressive') s += play.length * 0.8;
    if (personality === 'patient' && power > 0.75) s -= 2;
    if (personality === 'conservative' && play.length === 1) s += 1;

    // Prefer 5-card shapes that clean hand structure
    if (play.length === 5) s += 3;

    // Clean pairs/triples as leads are good dumps (after fixed splitCost)
    if (play.type === 'pair' || play.type === 'triple') s += 2.5;
    if (play.type === 'fullHouse') s += 3;

    // Noise already applied at pick time
    return s;
  },

  _scoreFollow(play, hand, handState, seat, diff, personality) {
    let s = 0;
    const remaining = hand.length - play.length;
    const threat = HandEval.minOpponentCards(handState.hands, seat);
    const power = HandEval.powerNorm(play);
    const currentPower = HandEval.powerNorm(handState.currentPlay);

    // Going out is best
    if (remaining === 0) return 1000;

    // Minimal overkill: prefer just-above current
    const overkill = power - currentPower;
    s -= overkill * 10 * diff.overkillPenalty;

    // Dump cards
    s += play.length * 2.5;

    // Split penalty
    const splitPen = personality === 'conservative' ? 1.5 : personality === 'aggressive' ? 0.7 : 1.0;
    s -= HandEval.splitCost(hand, play.cards) * splitPen;

    // Save bombs
    if (play.type === 'fourKind' || play.type === 'straightFlush') {
      if (remaining > 2) s -= 15 * diff.bombSave;
      else s += 8;
    }

    // Save 2s unless threat or last cards
    const twos = play.cards.filter((c) => c.rank === '2').length;
    if (twos && remaining > 3 && threat > 2) {
      s -= twos * 8 * diff.overkillPenalty;
    }

    // Stop threat: someone nearly out
    if (threat <= 2) {
      s += 6 * diff.stopThreat;
      if (twos) s += 4 * diff.stopThreat; // OK to burn control
      if (personality === 'aggressive') s += 3;
    }
    if (threat === 1) {
      s += 10 * diff.stopThreat;
    }

    // If next player has few cards, prefer stronger play slightly
    const next = (seat + 1) % PLAYERS;
    if (handState.hands[next].length <= 2) {
      s += power * 4 * diff.endgameAware;
    }

    // Pass memory: if many passed on this length, weaker play may hold
    const passes = HandEval.countPassedOnLength(handState.passMemory, play.length);
    if (passes >= 2 && overkill < 0.15) s += 2;

    // Patient holds high cards
    if (personality === 'patient' && power > 0.85 && remaining > 4) s -= 3;

    // Endgame empty race
    if (hand.length <= 4) {
      s += play.length * 5 * diff.endgameAware;
      s += (1 - Math.abs(overkill)) * 2;
    }

    return s;
  },

  _passThreshold(diff, personality, handState, seat) {
    // Base: if score below this, prefer pass
    let t = -6;
    if (diff.id === 'easy') t = 0;
    if (diff.id === 'normal') t = -5;
    if (diff.id === 'hard') t = -8;
    if (diff.id === 'expert') t = -10;

    const threat = HandEval.minOpponentCards(handState.hands, seat);
    if (threat <= 2) t -= 8 * diff.stopThreat; // pass less when threat
    if (personality === 'patient') t += 1;
    if (personality === 'aggressive') t -= 2;

    const myCards = handState.hands[seat].length;
    if (myCards <= 3) t -= 5 * diff.endgameAware;

    return t;
  },

  /**
   * Light 1-ply: after playing, does remainder look "connected"?
   */
  _onePlyLeadBonus(play, hand) {
    const rest = Cards.removeFromHand(hand, play.cards);
    if (!rest.length) return 20;
    const f = HandEval.analyze(rest);
    let b = 0;
    // Prefer remaining with pairs/structure
    b += f.pairs * 1.5;
    b += f.triples * 2;
    b += f.fiveCount * 1.2;
    b -= f.orphans * 1.5;
    b -= f.singles * 0.3;
    // If rest is a single legal combo, big bonus (can finish next)
    const leads = Combos.findAllLegalPlays(rest, null, false);
    if (leads.some((p) => p.length === rest.length)) b += 12;
    return b;
  },

  thinkDelay(match) {
    const diff = DIFFICULTY[match.difficulty] || DIFFICULTY.normal;
    const [lo, hi] = diff.thinkMs;
    return Utils.randInt(lo, hi);
  },
};
