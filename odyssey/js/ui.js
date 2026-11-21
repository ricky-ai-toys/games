'use strict';
const HEXLINES = [
  { syl: ['TEL-le', 'me', 'MU-se', 'the', 'MAN', 'of', 'man-y', 'TURNS', 'the', 'wan', 'der', 'ER', 'of', 'WILES'], stress: [0, 2, 4, 6, 9, 12] },
  { syl: ['SING', 'to', 'me', 'MU-se', 'of', 'the', 'MAN', 'who', 'SAW', 'so', 'MAN-y', 'CIT-ies', 'and', 'LEARNED'], stress: [0, 3, 5, 7, 9, 13] },
  { syl: ['HOME', 'at', 'LAST', 'the', 'HE-ro', 'WEPT', 'for', 'his', 'SON', 'and', 'his', 'WIFE', 'and', 'DOG'], stress: [0, 2, 4, 6, 8, 13] },
];

const UI = (() => {
  let kind = null;
  let data = null;
  let page = 0;
  let sel = null;
  let tab = 0;

  function open(k, d) {
    kind = k;
    data = d || {};
    page = 0;
    sel = null;
    tab = 0;
    OdysseyAudio.click();
    if (k === 'hexameter') {
      data = { line: 0, t: 0, correct: 0, mistakes: 0, tapped: {}, done: false, beat: 0.32 };
    }
    if (k === 'loom') {
      data = { round: 0, pattern: [], input: [], phase: 0, showT: 1.6, mistakes: 0, done: false };
      data.pattern = genPattern(3);
    }
    if (k === 'mapgame') {
      const nodes = Utils.shuffle(VOYAGE_DATA.nodes.slice()).slice(0, 5);
      data = { nodes, cur: 0, correct: 0, missed: 0, done: false, target: nodes[0] };
    }
    if (k === 'quiz') {
      const s = Game.state;
      const pool = QUIZ.filter(q => s.completed.includes(q.ep) && !s.quizDone.includes(q.id));
      if (!pool.length) data = { none: true, phase: -1 };
      else data = { q: Utils.pick(pool), phase: 0, chosen: null };
    }
  }

  function close() {
    kind = null;
    data = null;
  }

  function isOpen() { return kind !== null; }

  function genPattern(len) {
    const cells = Utils.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    return cells.slice(0, len);
  }

  function wrap(ctx, text, x, y, maxW, lh, size) {
    ctx.font = (size || 15) + 'px Georgia, serif';
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += (lh || 20);
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }

  function panelRect() {
    switch (kind) {
      case 'dialogue': return { x: 90, y: 320, w: 780, h: 200 };
      case 'event': return { x: 150, y: 130, w: 660, h: 260 };
      case 'howto': return { x: 150, y: 60, w: 660, h: 380 };
      case 'quiz': return { x: 150, y: 60, w: 660, h: 420 };
      case 'hexameter': case 'mapgame': return { x: 100, y: 55, w: 760, h: 430 };
      case 'loom': return { x: 60, y: 60, w: 840, h: 440 };
      default: return { x: 60, y: 60, w: 840, h: 420 };
    }
  }

  function hitX() {
    const p = panelRect();
    return Game.tapAt(p.x + p.w - 40, p.y + 8, 32, 32);
  }

  function drawX(ctx) {
    const p = panelRect();
    ctx.fillStyle = C.terracottaDark;
    ctx.beginPath();
    ctx.arc(p.x + p.w - 24, p.y + 24, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', p.x + p.w - 24, p.y + 25);
    ctx.textAlign = 'left';
  }

  function header(ctx, title, x, y, w, h) {
    Render.vasePanel(ctx, x, y, w, h);
    ctx.fillStyle = C.black;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + 34);
    ctx.textAlign = 'left';
  }

  function update(dt) {
    if (!kind) return;
    const s = Game.state;
    if (kind === 'dialogue') {
      if (Game.tapAny()) {
        page++;
        if (page >= data.lines.length) {
          const cb = data.onDone;
          close();
          if (cb) cb();
        } else OdysseyAudio.click();
      }
      return;
    }
    if (kind === 'event') {
      const y0 = 250;
      if (Game.tapAt(150, y0 + 70, 300, 52)) { const cb = data.onChoice; close(); if (cb) cb('a'); }
      if (Game.tapAt(510, y0 + 70, 300, 52)) { const cb = data.onChoice; close(); if (cb) cb('b'); }
      return;
    }
    if (kind === 'howto') {
      const y0 = 440;
      if (Game.tapAt(370, y0, 220, 40)) { if (page < 2) page++; else close(); }
      return;
    }
    if (kind === 'codex') {
      if (hitX()) { close(); return; }
      const unlocked = s.completed;
      const eps = EPISODES;
      for (let i = 0; i < eps.length; i++) {
        const cx = 84 + (i % 6) * 132;
        const cy = 108 + Math.floor(i / 6) * 44;
        if (Game.tapAt(cx, cy, 126, 38)) {
          if (unlocked.includes(eps[i].id)) { sel = eps[i].id; page = 0; tab = 0; OdysseyAudio.click(); }
          else OdysseyAudio.error();
        }
      }
      if (sel) {
        for (let t = 0; t < 4; t++) {
          if (Game.tapAt(150 + t * 160, 206, 140, 36)) { tab = t; page = 0; OdysseyAudio.click(); }
        }
        const entry = CODEX[sel];
        const paras = entry ? entry[['myth', 'history', 'culture', 'fun'][tab]] : null;
        if (paras) {
          if (page > 0 && Game.tapAt(200, 452, 120, 40)) page--;
          if (page < paras.length - 1 && Game.tapAt(640, 452, 120, 40)) page++;
        }
      }
      if (Game.tapAt(370, 452, 220, 40)) { close(); open('timeline'); }
      return;
    }
    if (kind === 'museum' || kind === 'chest') {
      if (hitX()) { close(); return; }
      const keys = ['comb', 'lotus', 'jar', 'winds', 'oar', 'moly', 'bough', 'feather', 'medallion', 'rib', 'discus', 'bow'];
      for (let i = 0; i < 12; i++) {
        const cx = 160 + (i % 4) * 165;
        const cy = 100 + Math.floor(i / 4) * 84;
        if (Game.tapAt(cx, cy, 150, 70)) {
          if (s.mementos.includes(keys[i])) { sel = keys[i]; OdysseyAudio.click(); }
          else if (kind === 'museum') { sel = keys[i]; }
        }
      }
      return;
    }
    if (kind === 'timeline') {
      if (hitX()) { close(); return; }
      if (page > 0 && Game.tapAt(200, 452, 120, 40)) page--;
      if (page < 3 && Game.tapAt(640, 452, 120, 40)) page++;
      if (Game.tapAt(370, 452, 220, 40)) { close(); open('codex'); }
      return;
    }
    if (kind === 'phrases') {
      if (hitX()) { close(); return; }
      const total = Math.ceil(EPITHETS.length / 3);
      if (page > 0 && Game.tapAt(200, 452, 120, 40)) page--;
      if (page < total - 1 && Game.tapAt(640, 452, 120, 40)) page++;
      return;
    }
    if (kind === 'hexameter') {
      hexUpdate(dt);
      return;
    }
    if (kind === 'quiz') {
      if (data.phase === -1) {
        if (Game.tapAt(370, 400, 220, 48)) close();
        return;
      }
      if (data.phase === 0) {
        if (Game.tapAt(180, 330, 280, 56)) { answer(0); }
        if (Game.tapAt(500, 330, 280, 56)) { answer(1); }
      } else {
        if (Game.tapAt(370, 420, 220, 48)) close();
      }
      return;
    }
    if (kind === 'mapgame') {
      mapUpdate(dt);
      return;
    }
    if (kind === 'loom') {
      loomUpdate(dt);
      return;
    }
    if (kind === 'boons') {
      if (hitX()) { close(); return; }
      for (let i = 0; i < BOONS.length; i++) {
        const cx = 110 + (i % 2) * 380;
        const cy = 100 + Math.floor(i / 2) * 170;
        if (Game.tapAt(cx, cy, 350, 150)) {
          const b = BOONS[i];
          if (s.glory >= b.cost) {
            s.glory -= b.cost;
            s.boon = b.id;
            OdysseyAudio.coin();
            Save.write(s);
          } else OdysseyAudio.error();
        }
      }
      return;
    }
  }

  function answer(choice) {
    const q = data.q;
    data.chosen = choice;
    data.phase = 1;
    if (choice === q.ans) {
      const s = Game.state;
      if (!s.quizDone.includes(q.id)) {
        s.quizDone.push(q.id);
        s.scholar += (s.boon === 'athena' ? 2 : 1);
        s.glory += GLORY_QUIZ;
        Save.write(s);
      }
      OdysseyAudio.success();
    } else {
      OdysseyAudio.error();
    }
  }

  function hexUpdate(dt) {
    const d = data;
    if (d.line >= HEXLINES.length) {
      if (Game.tapAt(370, 400, 220, 48)) close();
      return;
    }
    const line = HEXLINES[d.line];
    d.t += dt;
    const slot = Math.floor(d.t / d.beat);
    if (slot >= line.syl.length) {
      for (const si of line.stress) {
        if (!d.tapped[si]) { d.mistakes++; OdysseyAudio.error(); }
      }
      d.line++;
      d.t = 0;
      d.tapped = {};
      if (d.line >= HEXLINES.length) {
        const s = Game.state;
        s.glory += 3;
        s.scholar += 1;
        OdysseyAudio.success();
        Save.write(s);
      }
      return;
    }
    if (Game.tapAny()) {
      const isStress = line.stress.includes(slot);
      if (isStress && !d.tapped[slot]) {
        d.tapped[slot] = true;
        d.correct++;
        OdysseyAudio.pluck(660, 0, 0.15);
      } else {
        d.mistakes++;
        OdysseyAudio.error();
      }
    }
  }

  function mapUpdate(dt) {
    const d = data;
    if (d.done) {
      if (Game.tapAt(370, 420, 220, 48)) close();
      return;
    }
    const t = d.target;
    let hit = false;
    for (const n of VOYAGE_DATA.nodes) {
      const mx = 120 + (n.x / 960) * 720;
      const my = 110 + (n.y / 540) * 250;
      if (Game.tapAt(mx - 42, my - 42, 84, 84)) {
        hit = true;
        if (n.id === t.id) {
          d.correct++;
          OdysseyAudio.coin();
        } else {
          d.missed++;
          OdysseyAudio.error();
        }
        d.cur++;
        if (d.cur >= d.nodes.length) {
          d.done = true;
          const s = Game.state;
          s.scholar += 1;
          s.glory += 2;
          OdysseyAudio.success();
          Save.write(s);
        } else {
          d.target = d.nodes[d.cur];
        }
        break;
      }
    }
  }

  function loomUpdate(dt) {
    const d = data;
    if (d.done) {
      if (Game.tapAt(370, 456, 220, 42)) close();
      return;
    }
    if (d.phase === 0) {
      d.showT -= dt;
      if (d.showT <= 0) { d.phase = 1; d.input = []; }
      return;
    }
    for (let c = 0; c < 16; c++) {
      const cx = 336 + (c % 4) * 64;
      const cy = 114 + Math.floor(c / 4) * 64;
      if (Game.tapAt(cx, cy, 64, 64)) {
        const expected = d.pattern[d.input.length];
        if (c === expected) {
          d.input.push(c);
          OdysseyAudio.pluck(660, 0, 0.15);
          if (d.input.length >= d.pattern.length) {
            if (d.round >= 2) {
              d.done = true;
              const s = Game.state;
              s.morale = Utils.clamp(s.morale + 2, 0, MAX_MORALE);
              s.scholar += 1;
              s.glory += 2;
              s.loomPlays += 1;
              OdysseyAudio.success();
              Save.write(s);
            } else {
              d.round++;
              d.pattern = genPattern(3 + d.round);
              d.phase = 0;
              d.showT = 1.6;
            }
          }
        } else {
          d.mistakes++;
          OdysseyAudio.error();
          if (d.mistakes >= 2) {
            d.done = true;
            d.failed = true;
            d.moraleReward = 0;
            OdysseyAudio.error();
          }
        }
      }
    }
  }

  function render(ctx) {
    if (!kind) return;
    const s = Game.state;
    ctx.fillStyle = 'rgba(20,12,6,0.75)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (kind === 'dialogue') {
      const d = data;
      header(ctx, d.title || '…', 90, 320, 780, 200);
      ctx.fillStyle = C.terracottaDark;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText(d.lines[page].who, 120, 372);
      ctx.fillStyle = C.black;
      ctx.font = 'italic 17px Georgia, serif';
      const yy = wrap(ctx, d.lines[page].text, 120, 400, 700, 24, 17);
      ctx.fillStyle = C.terracotta;
      ctx.font = '14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap to continue ▸', 480, 505);
      ctx.textAlign = 'left';
      ctx.fillStyle = C.gold;
      for (let i = 0; i < d.lines.length; i++) {
        ctx.beginPath();
        ctx.arc(120 + i * 16, 517, i === page ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (kind === 'event') {
      const ev = data.ev;
      header(ctx, ev.name, 150, 130, 660, 260);
      ctx.fillStyle = C.black;
      ctx.font = 'italic 16px Georgia, serif';
      const yy = wrap(ctx, ev.text, 200, 190, 560, 24, 16);
      Render.btn(ctx, 150, 250 + 70, 300, 52, ev.a.label, { size: 16 });
      Render.btn(ctx, 510, 250 + 70, 300, 52, ev.b.label, { size: 16, fill: C.terracottaDark });
      return;
    }
    if (kind === 'howto') {
      header(ctx, 'How to Play', 150, 60, 660, 420);
      const pages = [
        ['Sail from island to island, like the hero Odysseus.',
          'Each island is a mini-game from the Odyssey: build a raft, dodge boulders, resist the Sirens…',
          'Win to earn GLORY ⭐ and mementos for your chest. Lose, and the crew will let you try again.'],
        ['Keep your crew healthy! Food 🍎 feeds them, Morale 💚 keeps them cheerful, and Hull 🚢 keeps the ship afloat.',
          'Talk to your crew on deck — they have stories and advice. Some remember you better than you think.',
          'The Codex, Museum, Timeline and Phrase Book are your knowledge rooms — every completed island unlocks new entries.'],
        ['Earn Scholar Stars 🌟 by learning: answer the Fact-or-Fable quiz, clap the hexameter rhythm, play the Mediterranean map game, and weave on Penelope\'s loom.',
          'Goddesses sell boons for glory — Athena\'s wisdom, Hermes\' sandals, Zeus\'s shield, Aphrodite\'s favor.',
          'Two detours hide on the voyage map: Amphitrite\'s Cove and the Muses\' Isle. Explore everything!'],
      ];
      pages[page].forEach((t, i) => {
        ctx.fillStyle = C.black;
        wrap(ctx, t, 200, 130 + i * 115, 560, 24, 15);
      });
      Render.btn(ctx, 370, 440, 220, 40, page < 2 ? 'Next ▶' : 'Let\'s Sail!', { size: 16, hot: true });
      return;
    }
    if (kind === 'codex') {
      header(ctx, '📜 The Codex — 12 Tales of the Odyssey', 60, 60, 840, 420);
      drawX(ctx);
      const unlocked = s.completed;
      EPISODES.forEach((ep, i) => {
        const cx = 84 + (i % 6) * 132;
        const cy = 108 + Math.floor(i / 6) * 44;
        const open = unlocked.includes(ep.id);
        ctx.fillStyle = sel === ep.id ? C.gold : (open ? C.terracotta : C.creamDark);
        ctx.fillRect(cx, cy, 126, 38);
        ctx.strokeStyle = C.black;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, 126, 38);
        ctx.fillStyle = open ? C.white : '#8A7A62';
        ctx.font = 'bold 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(open ? ep.icon + ' ' + ep.island : '🔒 ' + ep.island, cx + 63, cy + 24);
        ctx.textAlign = 'left';
      });
      if (sel) {
        const ep = EPISODES.find(e => e.id === sel);
        const tabs = ['Myth', 'History', 'Culture', 'Fun'];
        tabs.forEach((t, i) => {
          ctx.fillStyle = tab === i ? C.gold : C.terracottaDark;
          ctx.fillRect(150 + i * 160, 206, 140, 36);
          ctx.strokeStyle = C.black;
          ctx.lineWidth = 2;
          ctx.strokeRect(150 + i * 160, 206, 140, 36);
          ctx.fillStyle = C.white;
          ctx.font = 'bold 14px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText(t, 220 + i * 160, 228);
          ctx.textAlign = 'left';
        });
        ctx.fillStyle = C.black;
        ctx.font = 'bold 16px Georgia, serif';
        ctx.fillText(ep.name + ' — ' + ep.island + ' (' + ep.book + ')', 130, 268);
        const paras = CODEX[sel][['myth', 'history', 'culture', 'fun'][tab]];
        ctx.fillStyle = '#4A3826';
        ctx.font = '15px Georgia, serif';
        wrap(ctx, paras[page], 130, 288, 700, 22, 15);
        ctx.fillStyle = C.terracotta;
        ctx.font = 'bold 14px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('◀ ' + (page + 1) + '/' + paras.length + ' ▶', 480, 466);
        ctx.textAlign = 'left';
        if (page > 0) Render.btn(ctx, 200, 452, 110, 40, '◀', { size: 18, fill: C.terracottaDark });
        if (page < paras.length - 1) Render.btn(ctx, 650, 452, 110, 40, '▶', { size: 18, fill: C.terracottaDark });
      } else {
        ctx.fillStyle = C.black;
        ctx.font = 'italic 16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tap an island above to read its tale.', 480, 300);
        ctx.textAlign = 'left';
      }
      Render.btn(ctx, 370, 452, 220, 40, '⏳ Timeline', { size: 15, fill: C.terracottaDark });
      return;
    }
    if (kind === 'museum' || kind === 'chest') {
      header(ctx, kind === 'museum' ? '🏺 The Museum' : '🎁 Your Chest of Mementos', 60, 60, 840, 420);
      drawX(ctx);
      const keys = ['comb', 'lotus', 'jar', 'winds', 'oar', 'moly', 'bough', 'feather', 'medallion', 'rib', 'discus', 'bow'];
      const ownedCount = keys.filter((k) => s.mementos.includes(k)).length;
      for (let i = 0; i < 12; i++) {
        const cx = 160 + (i % 4) * 165;
        const cy = 100 + Math.floor(i / 4) * 84;
        const owned = s.mementos.includes(keys[i]);
        const art = ARTIFACTS[keys[i]];
        ctx.fillStyle = owned ? C.cream : C.creamDark;
        ctx.fillRect(cx, cy, 150, 70);
        ctx.strokeStyle = sel === keys[i] ? C.gold : C.black;
        ctx.lineWidth = sel === keys[i] ? 3 : 2;
        ctx.strokeRect(cx, cy, 150, 70);
        ctx.textAlign = 'center';
        ctx.font = '24px Georgia, serif';
        ctx.fillText(owned ? art.icon : '❓', cx + 75, cy + 28);
        ctx.fillStyle = C.black;
        ctx.font = 'bold 11px Georgia, serif';
        ctx.fillText(owned ? art.name : 'Not collected yet', cx + 75, cy + 52);
        ctx.textAlign = 'left';
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.fillStyle = ownedCount >= 12 ? C.gold : '#4A3826';
      ctx.fillText(ownedCount >= 12 ? '🏆 Collection complete — a true wanderer!' : ('Collected ' + ownedCount + ' / 12 mementos'), 480, 358);
      ctx.textAlign = 'left';
      const shown = sel || (s.mementos[0] || null);
      if (shown) {
        const art = ARTIFACTS[shown];
        ctx.fillStyle = C.terracottaDark;
        ctx.fillRect(130, 370, 700, 8);
        ctx.fillStyle = C.black;
        ctx.font = 'bold 14px Georgia, serif';
        ctx.fillText(art.name, 140, 400);
        ctx.font = 'italic 13px Georgia, serif';
        ctx.fillStyle = '#4A3826';
        wrap(ctx, art.note, 140, 420, 680, 18, 13);
      }
      return;
    }
    if (kind === 'timeline') {
      header(ctx, '⏳ Timeline — From Troy to the Stars', 60, 60, 840, 420);
      drawX(ctx);
      for (let i = 0; i < 3; i++) {
        const idx = page * 3 + i;
        if (idx >= TIMELINE.length) break;
        const t = TIMELINE[idx];
        const y = 108 + i * 118;
        ctx.fillStyle = C.creamDark;
        ctx.fillRect(120, y, 720, 106);
        ctx.strokeStyle = C.black;
        ctx.lineWidth = 2;
        ctx.strokeRect(120, y, 720, 106);
        ctx.font = '26px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.icon, 155, y + 38);
        ctx.textAlign = 'left';
        ctx.fillStyle = C.terracotta;
        ctx.font = 'bold 15px Georgia, serif';
        ctx.fillText(t.era + ' — ' + t.name, 190, y + 30);
        ctx.fillStyle = C.black;
        ctx.font = '13px Georgia, serif';
        wrap(ctx, t.text, 190, y + 52, 620, 17, 13);
      }
      ctx.fillStyle = C.terracotta;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Page ' + (page + 1) + '/' + Math.ceil(TIMELINE.length / 3), 480, 470);
      ctx.textAlign = 'left';
      if (page > 0) Render.btn(ctx, 200, 452, 110, 40, '◀', { size: 18, fill: C.terracottaDark });
      if (page < 3) Render.btn(ctx, 650, 452, 110, 40, '▶', { size: 18, fill: C.terracottaDark });
      Render.btn(ctx, 370, 452, 220, 40, '◀ Codex', { size: 15, fill: C.terracottaDark });
      return;
    }
    if (kind === 'phrases') {
      header(ctx, '📖 The Phrase Book — Homer\'s Epithets', 60, 60, 840, 420);
      drawX(ctx);
      const unlockedCount = Math.min(EPITHETS.length, 2 + s.completed.length);
      for (let i = 0; i < 3; i++) {
        const idx = page * 3 + i;
        if (idx >= EPITHETS.length) break;
        const e = EPITHETS[idx];
        const y = 108 + i * 118;
        const unlocked = idx < unlockedCount;
        ctx.fillStyle = unlocked ? C.cream : C.creamDark;
        ctx.fillRect(120, y, 720, 106);
        ctx.strokeStyle = C.black;
        ctx.lineWidth = 2;
        ctx.strokeRect(120, y, 720, 106);
        ctx.font = '26px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(unlocked ? e.icon : '🔒', 155, y + 38);
        ctx.textAlign = 'left';
        if (!unlocked) {
          ctx.fillStyle = '#8A7A62';
          ctx.font = 'italic 13px Georgia, serif';
          ctx.fillText('Keep sailing to unlock this word…', 190, y + 40);
          continue;
        }
        ctx.fillStyle = C.terracotta;
        ctx.font = 'bold 15px Georgia, serif';
        ctx.fillText(e.greek + ' (' + e.roman + ')', 190, y + 28);
        ctx.fillStyle = C.black;
        ctx.font = 'italic 13px Georgia, serif';
        ctx.fillText('“' + e.meaning + '”', 190, y + 50);
        ctx.fillStyle = '#4A3826';
        ctx.font = '12px Georgia, serif';
        wrap(ctx, e.line, 190, y + 72, 620, 16, 12);
      }
      ctx.fillStyle = C.terracotta;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Page ' + (page + 1) + '/' + Math.ceil(EPITHETS.length / 3), 480, 470);
      ctx.textAlign = 'left';
      if (page > 0) Render.btn(ctx, 200, 452, 110, 40, '◀', { size: 18, fill: C.terracottaDark });
      if (page < Math.ceil(EPITHETS.length / 3) - 1) Render.btn(ctx, 650, 452, 110, 40, '▶', { size: 18, fill: C.terracottaDark });
      return;
    }
    if (kind === 'hexameter') {
      hexRender(ctx);
      return;
    }
    if (kind === 'quiz') {
      header(ctx, '❓ Fact or Fable?', 150, 60, 660, 420);
      if (data.phase === -1) {
        ctx.fillStyle = C.black;
        ctx.font = 'bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('All answered — wise one! 🌟', 480, 240);
        ctx.font = '15px Georgia, serif';
        ctx.fillText('Sail to new islands to unlock more questions.', 480, 280);
        Render.btn(ctx, 370, 400, 220, 48, 'Close', { size: 16, hot: true });
        ctx.textAlign = 'left';
        return;
      }
      const q = data.q;
      ctx.fillStyle = C.black;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(q.q, 480, 170);
      if (data.phase === 0) {
        ctx.fillText('Fact or Fable?', 480, 220);
        Render.btn(ctx, 180, 330, 280, 56, '✅ Fact', { size: 20 });
        Render.btn(ctx, 500, 330, 280, 56, '❌ Fable', { size: 20, fill: C.terracottaDark });
      } else {
        const ok = data.chosen === q.ans;
        ctx.font = 'bold 30px Georgia, serif';
        ctx.fillText(ok ? '✓ Correct!' : '✗ Not quite', 480, 260);
        ctx.font = 'italic 15px Georgia, serif';
        ctx.fillStyle = C.terracottaDark;
        wrap(ctx, q.fact, 240, 300, 480, 22, 15);
        if (ok) ctx.fillText('🌟 Scholar +' + (s.boon === 'athena' ? 2 : 1) + ' · ⭐ Glory +' + GLORY_QUIZ, 480, 398);
        Render.btn(ctx, 370, 420, 220, 48, 'Continue', { size: 16, hot: true });
      }
      ctx.textAlign = 'left';
      return;
    }
    if (kind === 'mapgame') {
      mapRender(ctx);
      return;
    }
    if (kind === 'loom') {
      loomRender(ctx);
      return;
    }
    if (kind === 'boons') {
      header(ctx, '⚡ Boons of the Gods', 60, 60, 840, 420);
      drawX(ctx);
      BOONS.forEach((b, i) => {
        const cx = 110 + (i % 2) * 380;
        const cy = 100 + Math.floor(i / 2) * 170;
        const owned = s.boon === b.id;
        ctx.fillStyle = owned ? C.cream : C.creamDark;
        ctx.fillRect(cx, cy, 350, 150);
        ctx.strokeStyle = owned ? C.gold : C.black;
        ctx.lineWidth = owned ? 3 : 2;
        ctx.strokeRect(cx, cy, 350, 150);
        ctx.font = '30px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.icon, cx + 50, cy + 38);
        ctx.textAlign = 'left';
        ctx.fillStyle = C.black;
        ctx.font = 'bold 16px Georgia, serif';
        ctx.fillText(b.name, cx + 90, cy + 30);
        ctx.fillStyle = C.terracottaDark;
        ctx.font = 'italic 13px Georgia, serif';
        wrap(ctx, b.desc, cx + 90, cy + 56, 240, 17, 13);
        ctx.fillStyle = C.gold;
        ctx.font = 'bold 15px Georgia, serif';
        ctx.fillText('Cost: ⭐ ' + b.cost, cx + 90, cy + 126);
        ctx.fillStyle = s.boon === b.id ? C.green : C.terracotta;
        ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText(owned ? '✓ Active' : (s.glory >= b.cost ? 'Tap to buy' : 'Need ' + (b.cost - s.glory) + ' more glory'), cx + 220, cy + 126);
      });
      ctx.fillStyle = C.black;
      ctx.font = 'italic 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('One boon at a time — buying a new one replaces the old.', 480, 460);
      ctx.textAlign = 'left';
      return;
    }
  }

  function hexRender(ctx) {
    const d = data;
    header(ctx, '🎵 The Hexameter Clap', 100, 55, 760, 430);
    const line = HEXLINES[d.line];
    if (!line || d.line >= HEXLINES.length) {
      ctx.fillStyle = C.black;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Bravo! You clapped the epic beat! 👏', 480, 220);
      ctx.font = '15px Georgia, serif';
      ctx.fillText('+3 ⭐ Glory · +1 🌟 Scholar', 480, 260);
      Render.btn(ctx, 370, 400, 220, 48, 'Close', { size: 16, hot: true });
      ctx.textAlign = 'left';
      return;
    }
    ctx.fillStyle = C.black;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Line ' + (d.line + 1) + '/3 — clap on the golden beats •', 480, 120);
    ctx.fillText('✓ ' + d.correct + '   ✗ ' + d.mistakes, 480, 150);
    const slot = Math.floor(d.t / d.beat);
    const n = line.syl.length;
    const cellW = 700 / n;
    const x0 = 480 - (cellW * n) / 2;
    for (let i = 0; i < n; i++) {
      const stress = line.stress.includes(i);
      const cx = x0 + i * cellW;
      ctx.fillStyle = stress ? C.gold : C.creamDark;
      if (i === slot) ctx.fillStyle = C.terracotta;
      if (d.tapped[i]) ctx.fillStyle = C.green;
      ctx.fillRect(cx + 2, 190, cellW - 4, 60);
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 2, 190, cellW - 4, 60);
      ctx.fillStyle = i === slot ? C.white : C.black;
      ctx.font = (stress ? 'bold ' : '') + Math.max(10, Math.min(15, 12 + (stress ? 2 : 0))) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(line.syl[i], cx + cellW / 2, 222);
      if (stress) {
        ctx.fillStyle = C.black;
        ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText('•', cx + cellW / 2, 180);
      }
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = C.black;
    ctx.font = 'italic 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tap on the • beats (Space or tap). Watch the red marker!', 480, 300);
    ctx.textAlign = 'left';
  }

  function mapRender(ctx) {
    const d = data;
    header(ctx, '🗺️ Find the Island!', 100, 55, 760, 430);
    ctx.fillStyle = C.sea;
    ctx.fillRect(120, 110, 720, 250);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 3;
    ctx.strokeRect(120, 110, 720, 250);
    VOYAGE_DATA.nodes.forEach((n, i) => {
      const icon = EPISODES[i].icon;
      ctx.globalAlpha = 0.8;
      Atlas.island(ctx, 120 + (n.x / 960) * 720, 110 + (n.y / 540) * 250, 22);
      ctx.globalAlpha = 1;
      ctx.font = '20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, 120 + (n.x / 960) * 720, 108 + (n.y / 540) * 250 - 24);
      ctx.textAlign = 'left';
    });
    if (!d.done) {
      ctx.fillStyle = C.black;
      ctx.font = 'bold 19px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Find: ' + d.target.name + '!  (' + d.cur + '/' + d.nodes.length + ')', 480, 400);
      ctx.fillStyle = C.terracotta;
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Tap the island on the map. ✓ ' + d.correct + '  ✗ ' + d.missed, 480, 425);
    } else {
      ctx.fillStyle = C.black;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('The Mediterranean is yours to know! 🗺️', 480, 400);
      ctx.fillText('+1 🌟 Scholar · +2 ⭐ Glory', 480, 430);
      Render.btn(ctx, 370, 420, 220, 48, 'Close', { size: 16, hot: true });
    }
    ctx.textAlign = 'left';
  }

  function loomRender(ctx) {
    const d = data;
    header(ctx, '🧵 Penelope\'s Loom', 60, 60, 840, 440);
    ctx.fillStyle = C.cream;
    ctx.fillRect(120, 105, 720, 280);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 3;
    ctx.strokeRect(120, 105, 720, 280);
    Atlas.loom(ctx, 160, 230, 2);
    for (let c = 0; c < 16; c++) {
      const cx = 336 + (c % 4) * 64;
      const cy = 114 + Math.floor(c / 4) * 64;
      ctx.fillStyle = C.creamDark;
      ctx.fillRect(cx, cy, 64, 64);
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, 64, 64);
      const inPattern = d.phase === 0 && d.pattern.includes(c);
      const inInput = d.phase === 1 && d.input.includes(c);
      if (inPattern || inInput) {
        ctx.fillStyle = inInput ? C.green : C.terracotta;
        ctx.fillRect(cx + 4, cy + 4, 56, 56);
      }
      ctx.font = '18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = C.black;
      ctx.fillText((c + 1), cx + 32, cy + 41);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = C.black;
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    if (d.done) {
      ctx.fillText(d.failed ? 'The thread tangles — Penelope smiles. "Patience, weaver."' : 'The web is complete! The suitors will wait forever! 👏', 480, 415);
      if (!d.failed) ctx.fillText('+2 ⭐ Glory · +1 🌟 Scholar · +2 💚 Morale', 480, 438);
      Render.btn(ctx, 370, 456, 220, 42, 'Close', { size: 16, hot: true });
    } else if (d.phase === 0) {
      ctx.fillText('Watch the pattern… (' + Math.ceil(d.showT) + ')', 480, 415);
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Round ' + (d.round + 1) + '/3', 480, 438);
    } else {
      ctx.fillText('Repeat the pattern! (' + d.input.length + '/' + d.pattern.length + ')', 480, 415);
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Mistakes: ' + d.mistakes + '/2', 480, 438);
    }
    ctx.textAlign = 'left';
  }

  return { open, close, isOpen, update, render, peek: () => data, getKind: () => kind };
})();
