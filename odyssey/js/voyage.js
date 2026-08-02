'use strict';
const Voyage = (() => {
  function detourFor() {
    const s = Game.state;
    const fromIdx = s.current - 1;
    if (fromIdx < 0 || fromIdx >= VOYAGE_DATA.nodes.length) return null;
    const cur = VOYAGE_DATA.nodes[fromIdx];
    return VOYAGE_DATA.detours.find(d => d.after === cur.id) || null;
  }

  function legCost() {
    let c = LEG_FOOD;
    if (Game.state.boon === 'hermes') c -= 1;
    return Math.max(1, c);
  }

  function clamp(k, v) {
    const s = Game.state;
    const max = k === 'hull' ? MAX_HULL : k === 'morale' ? MAX_MORALE : MAX_FOOD;
    s[k] = Utils.clamp(s[k] + v, 0, max);
  }

  function applyEvent(ev, choiceKey) {
    const eff = ev[choiceKey].effect;
    switch (eff) {
      case 'storm':
        clamp('hull', -(Game.state.boon === 'zeus' ? 1 : STORM_HULL));
        clamp('morale', -1);
        OdysseyAudio.storm();
        break;
      case 'reef': clamp('hull', -1); clamp('morale', 1); break;
      case 'morale': clamp('morale', 2); break;
      case 'morale2': clamp('morale', 2); break;
      case 'food': clamp('food', 2); break;
      case 'trade1': clamp('food', -3); clamp('morale', 3); break;
      case 'fogA': clamp('food', -1); clamp('morale', -1); clamp('hull', -1); break;
      case 'fogB': clamp('food', -2); clamp('morale', -2); break;
      case 'none': break;
    }
  }

  function takeDetour(det) {
    const s = Game.state;
    s.food = Math.max(0, s.food - 3);
    if (det.id === 'cove') s.hull = Math.min(MAX_HULL, s.hull + 4);
    if (det.id === 'muses') s.glory += 5;
    OdysseyAudio.coin();
    Save.write(s);
    UI.open('dialogue', {
      title: det.name,
      lines: [{ who: 'Crew', text: det.note }],
      onDone: () => {},
    });
  }

  function afterEvent() {
    const s = Game.state;
    if (s.hull <= 0 && s.food >= 3) {
      s.food -= 3;
      s.hull = Math.min(MAX_HULL, s.hull + 4);
    }
    s.day += 1;
    if (s.boon === 'aphrodite') s.morale = Math.min(MAX_MORALE, s.morale + 2);
    Save.write(s);
    if (s.current >= EPISODES.length) {
      Game.scene = 'epilogue';
      Game.epiPage = 0;
      OdysseyAudio.startMusic('title');
      return;
    }
    const ep = EPISODES[s.current];
    const node = VOYAGE_DATA.nodes[s.current];
    OdysseyAudio.seaBed(2);
    const lines = [{ who: 'Crew', text: 'Land ho! ' + ep.island + '. ' + (node ? node.note : '') }];
    UI.open('dialogue', {
      title: '⛵ ' + ep.island,
      lines: lines.concat(ep.intro),
      onDone: () => Game.startEpisode(ep),
    });
  }

  function startLeg() {
    const s = Game.state;
    s.food = Math.max(0, s.food - legCost());
    if (s.food <= 0) s.morale = Math.max(0, s.morale - 2);
    Save.write(s);
    if (Math.random() < 0.45) {
      const ev = Utils.pick(VOYAGE_DATA.events);
      UI.open('event', {
        ev,
        onChoice: (key) => { applyEvent(ev, key); afterEvent(); },
      });
    } else {
      afterEvent();
    }
  }

  function update(dt) {
    const s = Game.state;
    if (Game.tapAt(8, 52, 120, 40)) {
      Game.scene = 'ship';
      OdysseyAudio.startMusic('ship');
      return;
    }
    const det = detourFor();
    if (det && Game.tapAt(300, 410, 360, 50)) {
      takeDetour(det);
      return;
    }
    if (Game.tapAt(300, 470, 360, 54)) {
      startLeg();
      return;
    }
  }

  function render(ctx) {
    const s = Game.state;
    Render.topBar(ctx, s);
    ctx.fillStyle = C.sea;
    ctx.fillRect(0, 46, VIEW_W, VIEW_H - 46);
    ctx.fillStyle = 'rgba(201,185,153,0.35)';
    ctx.fillRect(0, 46, VIEW_W, 90);
    const nodes = VOYAGE_DATA.nodes;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    nodes.forEach((n, i) => {
      if (s.completed.includes(EPISODES[i].id)) {
        if (!started) { ctx.moveTo(n.x, n.y); started = true; }
        else ctx.lineTo(n.x, n.y);
      }
    });
    ctx.stroke();
    nodes.forEach((n, i) => {
      const done = s.completed.includes(EPISODES[i].id);
      ctx.globalAlpha = done ? 1 : 0.85;
      Atlas.island(ctx, n.x, n.y, done ? 26 : 20);
      ctx.globalAlpha = 1;
      ctx.fillStyle = done ? C.green : C.black;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText((done ? '✓ ' : '') + n.name, n.x, n.y > 415 ? n.y - 38 : n.y + 34);
      ctx.textAlign = 'left';
    });
    if (s.current < nodes.length) {
      const n = nodes[s.current];
      const r = 30 + Math.sin(Game.time * 3) * 4;
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(n.x, n.y - 28);
      ctx.rotate(Math.sin(Game.time * 2) * 0.08);
      Atlas.ship(ctx, 0, 0, 0.55);
      ctx.restore();
    }
    const det = detourFor();
    if (det) {
      const from = nodes[s.current - 1];
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(det.x, det.y);
      ctx.lineTo(from.x, from.y);
      ctx.stroke();
      Atlas.island(ctx, det.x, det.y, 14);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(det.name, det.x, det.y + 26);
      ctx.textAlign = 'left';
    }
    Render.btn(ctx, 8, 52, 120, 40, '↩ Ship', { size: 14, fill: C.terracottaDark });
    if (s.current < EPISODES.length) {
      const ep = EPISODES[s.current];
      if (det) {
        Render.btn(ctx, 300, 410, 360, 50, det.icon + ' Detour: ' + det.name + ' (3 food)', { size: 14, fill: C.terracottaDark });
      }
      Render.btn(ctx, 300, 470, 360, 54, '⛵ Sail to ' + ep.island + '  (🍎' + legCost() + ')', { size: 16, hot: true });
    }
    ctx.fillStyle = C.black;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏛 Troy — the war is over. The long way home begins here.', 480, 62);
    ctx.font = '12px Georgia, serif';
    ctx.fillText('Gold line: islands already visited. Sailing costs food; watch the weather!', 480, 80);
    ctx.textAlign = 'left';
  }

  return { update, render };
})();
