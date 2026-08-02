'use strict';
const MINIGAMES = (() => {
  const TAP = (S, x, y, w, h) => {
    const I = Game.input;
    for (let i = 0; i < I.taps.length; i++) {
      const t = I.taps[i];
      if (!t.used && t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h) { t.used = true; return true; }
    }
    return false;
  };
  const ANY_TAP = () => {
    const I = Game.input;
    if (I.spaceEdge) return true;
    for (let i = 0; i < I.taps.length; i++) {
      if (!I.taps[i].used) { I.taps[i].used = true; return true; }
    }
    return false;
  };
  const KEY = (S, name) => Game.input[name] === true;

  function gauge(ctx, x, y, w, h, marker, lo, hi) {
    ctx.fillStyle = C.creamDark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.green;
    ctx.fillRect(x + w * lo, y, w * (hi - lo), h);
    ctx.fillStyle = C.black;
    ctx.fillRect(x + marker * w - 2, y - 4, 4, h + 8);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function buttons(ctx, items) {
    items.forEach(it => {
      ctx.fillStyle = C.terracotta;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 2;
      ctx.strokeRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = C.white;
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.label, it.x + it.w / 2, it.y + it.h / 2);
    });
  }

  function fishAt(ctx, x, y, w, h, t) {
    ctx.fillStyle = C.red;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✋', x + w / 2, y + h / 2);
  }

  const DRIVERS = {};

  DRIVERS.raft = {
    start() {
      const mg = Game.state.mg = { phase: 0, item: 0, t: 0, speed: 1.4, mistakes: 0, done: false };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      mg.t += dt * mg.speed;
      mg.t %= 1;
      if (ANY_TAP()) {
        if (mg.t > 0.4 && mg.t < 0.6) {
          mg.item++;
          OdysseyAudio.pluck(660, 0, 0.15);
          if (mg.item >= 4) { mg.done = true; return 'win'; }
          mg.speed += 0.25;
        } else {
          mg.mistakes++;
          OdysseyAudio.error();
          if (mg.mistakes >= 3) return 'lose';
        }
      }
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.sea;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      Atlas.wave(ctx, 0, 300, VIEW_W);
      Atlas.wave(ctx, 20, 330, VIEW_W);
      Atlas.wave(ctx, -40, 360, VIEW_W);
      const labels = ['Wood', 'Linen', 'Pitch', 'Tie the Raft!'];
      ctx.fillStyle = C.black;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[mg.item] || 'Tie!', VIEW_W / 2, 120);
      gauge(ctx, 200, 180, 560, 30, mg.t, 0.4, 0.6);
      ctx.fillStyle = C.black;
      ctx.font = '15px Georgia, serif';
      ctx.fillText(mg.item < 3 ? 'Tap in the green zone!' : 'One last tap — tie the raft!', VIEW_W / 2, 240);
      Atlas.raftGather(ctx, mg.item, 470, 420);
      ctx.fillStyle = C.black;
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Materials: ' + Math.min(mg.item, 3) + '/3', VIEW_W / 2, 500);
    },
  };

  DRIVERS.lotus = {
    start() {
      const mg = Game.state.mg = { px: VIEW_W / 2, items: [], spawnT: 0, forget: 0, caught: 0, mistakes: 0, t: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      mg.t += dt;
      if (KEY(Game.state, 'left')) mg.px -= 320 * dt;
      if (KEY(Game.state, 'right')) mg.px += 320 * dt;
      mg.px = Utils.clamp(mg.px, 40, VIEW_W - 40);
      mg.spawnT -= dt;
      if (mg.spawnT <= 0) {
        mg.spawnT = Utils.rand(0.4, 0.7);
        mg.items.push({ x: VIEW_W + 20, y: 400, type: Math.random() < 0.55 ? 'supply' : 'lotus', vy: 0 });
      }
      for (const it of mg.items) {
        it.x -= (180 + mg.caught * 12) * dt;
        if (Math.abs(it.x - mg.px) < 34 && Math.abs(it.y - 430) < 40) {
          it.dead = true;
          if (it.type === 'supply') {
            mg.caught++;
            OdysseyAudio.coin();
          } else {
            mg.forget += 1;
            mg.mistakes++;
            OdysseyAudio.error();
          }
        }
      }
      mg.items = mg.items.filter(it => !it.dead && it.x > -40);
      if (mg.caught >= 8) return 'win';
      if (mg.forget >= 4) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.cream;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.creamDark;
      ctx.fillRect(0, 420, VIEW_W, 120);
      for (const it of mg.items) {
        if (it.type === 'supply') Atlas.amphora(ctx, it.x, 400, 0.9);
        else Atlas.plant(ctx, it.x, 400, 'lotus');
      }
      Atlas.crewman(ctx, mg.px, 430, 1);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Supplies: ' + mg.caught + '/8   ·   Forgetting: ' + '🌸'.repeat(Math.min(mg.forget, 4)), VIEW_W / 2, 60);
      ctx.fillStyle = C.pink;
      ctx.fillRect(VIEW_W / 2 - 80, 80, 160 * Math.min(mg.forget, 4) / 4, 10);
      ctx.fillStyle = C.black;
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Collect the jars! Dodge the lotus flowers!', VIEW_W / 2, 520);
    },
  };

  DRIVERS.cyclops = {
    start() {
      const mg = Game.state.mg = { phase: 0, t: 0, rock: 1, sweep: 0, dir: 1, mistakes: 0, seq: [], seqStep: 0 };
      mg.sweep = 0;
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase < 3) mg.t += dt * (0.5 + mg.phase * 0.12);
      if (mg.phase === 0) {
        if (KEY(Game.state, 'left')) mg.rock = Math.max(0, mg.rock - 1);
        if (KEY(Game.state, 'right')) mg.rock = Math.min(2, mg.rock + 1);
        const rocks = [200, 480, 760];
        const eyeX = 480 + Math.sin(mg.t * Math.PI * 2) * 380;
        if (Math.abs(eyeX - rocks[mg.rock]) < 46) {
          mg.mistakes++;
          mg.t = 0;
          OdysseyAudio.error();
          if (mg.mistakes >= 3) return 'lose';
        }
        if (mg.t > 1) { mg.phase = 1; mg.t = 0; }
      } else if (mg.phase === 1) {
        if (ANY_TAP()) {
          if (mg.t > 0.4 && mg.t < 0.6) { mg.phase = 2; mg.t = 0; OdysseyAudio.pluck(700, 0, 0.15); }
          else { mg.mistakes++; OdysseyAudio.error(); if (mg.mistakes >= 3) return 'lose'; }
        }
      } else if (mg.phase === 2) {
        if (ANY_TAP()) {
          if (mg.t > 0.4 && mg.t < 0.6) {
            mg.phase = 3; mg.t = 0;
            OdysseyAudio.pluck(700, 0, 0.15);
            mg.seq = [];
            const colors = ['white', 'black', 'brown', 'gold', 'spot'];
            for (let i = 0; i < 4; i++) mg.seq.push(Utils.pick(colors));
          } else { mg.mistakes++; OdysseyAudio.error(); if (mg.mistakes >= 3) return 'lose'; }
        }
      } else {
        if (mg.seqStep >= mg.seq.length) return 'win';
        const colors = ['white', 'black', 'brown', 'gold', 'spot'];
        for (let i = 0; i < 5; i++) {
          if (TAP(Game.state, 130 + i * 145, 300, 110, 90)) {
            if (colors[i] === mg.seq[mg.seqStep]) { mg.seqStep++; OdysseyAudio.pluck(660, 0, 0.14); }
            else { mg.mistakes++; OdysseyAudio.error(); if (mg.mistakes >= 3) return 'lose'; }
          }
        }
      }
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = '#241812';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#3A2A1E';
      ctx.fillRect(0, 300, VIEW_W, 240);
      if (mg.phase === 0) {
        const rocks = [200, 480, 760];
        const eyeX = 480 + Math.sin(mg.t * Math.PI * 2) * 380;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === mg.rock ? C.terracotta : '#5A4A3A';
          ctx.beginPath();
          ctx.arc(rocks[i], 380, 60, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,200,0.16)';
        ctx.beginPath();
        ctx.arc(eyeX, 200, 120, 0, Math.PI * 2);
        ctx.fill();
        Atlas.cyclops(ctx, eyeX, 180, 0.5);
        ctx.fillStyle = C.white;
        ctx.font = 'bold 16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hide behind a rock! ◀ ▶ (or tap)', VIEW_W / 2, 50);
      } else if (mg.phase === 1 || mg.phase === 2) {
        ctx.fillStyle = C.black;
        ctx.font = 'bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(mg.phase === 1 ? 'Pour the sweet wine!' : 'Strike the ember stake!', VIEW_W / 2, 100);
        gauge(ctx, 200, 150, 560, 30, mg.t, 0.4, 0.6);
        ctx.fillStyle = C.white;
        ctx.font = '15px Georgia, serif';
        ctx.fillText('Tap in the green zone!', VIEW_W / 2, 210);
        if (mg.phase === 1) {
          Atlas.bowl(ctx, 480, 330, 2);
        } else {
          ctx.fillStyle = C.black;
          ctx.fillRect(450, 340, 60, 120);
          ctx.fillStyle = C.gold;
          ctx.beginPath();
          ctx.arc(480, 400, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        Atlas.cyclops(ctx, 480, 420, 1.1);
      } else {
        const colors = ['white', 'black', 'brown', 'gold', 'spot'];
        ctx.fillStyle = C.white;
        ctx.font = 'bold 17px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('The sheep file out — hide under the right one!', VIEW_W / 2, 60);
        ctx.fillStyle = C.white;
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillText(mg.seqStep < mg.seq.length ? colors.indexOf(mg.seq[mg.seqStep]) + 1 + '!' : 'GO!', VIEW_W / 2, 130);
        colors.forEach((c, i) => {
          ctx.fillStyle = { white: C.white, black: '#3A3A3A', brown: '#8B6B4D', gold: C.gold, spot: C.creamDark }[c];
          ctx.beginPath();
          ctx.arc(185 + i * 145, 350, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = C.black;
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        ctx.fillStyle = C.white;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('Tap the sheep in the same order (1–5)', VIEW_W / 2, 500);
      }
    },
  };

  DRIVERS.winds = {
    start() {
      const mg = Game.state.mg = { phase: 0, band: 0, dir: 1, caught: 0, streams: 0, t: 0, hold: 0, released: false, mistakes: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase === 0) {
        mg.band += mg.dir * (240 + mg.caught * 30) * dt;
        if (mg.band > 700) { mg.band = 700; mg.dir = -1; }
        if (mg.band < 200) { mg.band = 200; mg.dir = 1; }
        if (ANY_TAP()) {
          if (Math.abs(mg.band - 620) < 90) { mg.caught++; OdysseyAudio.coin(); }
          else { mg.mistakes++; OdysseyAudio.error(); }
          mg.streams++;
          if (mg.streams >= 6) {
            if (mg.caught >= 5) { mg.phase = 1; mg.hold = 0; mg.t = 0; }
            else return 'lose';
          }
        }
      } else {
        mg.hold += dt;
        mg.t += dt;
        if (mg.hold > 0.3 && !Game.input.tapHeld) { mg.released = true; mg.mistakes++; OdysseyAudio.error(); }
        if (mg.hold >= 4) {
          if (mg.released) Game.state.flags.windsOpened = true;
          return 'win';
        }
      }
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.blue;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(mg.phase === 0 ? mg.band : 620, 0, 90, VIEW_H);
      Atlas.ship(ctx, 480, 400, 1.4);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      if (mg.phase === 0) {
        ctx.fillText('Catch the winds! Tap when the stream hits the bag (' + mg.caught + '/5)', VIEW_W / 2, 50);
      } else {
        ctx.fillText(mg.released ? 'The bag burst open!!' : 'HOLD to keep the bag tied…', VIEW_W / 2, 50);
        ctx.font = '15px Georgia, serif';
        ctx.fillText(['…', 'It\'s just a bag of air.', 'Is it gold? Let\'s peek!', 'The captain won\'t mind…', 'SO CLOSE TO HOME!'][Math.min(mg.hold | 0, 4)], VIEW_W / 2, 90);
        ctx.fillStyle = C.gold;
        ctx.fillRect(VIEW_W / 2 - 160, 200, 320 * Math.min(mg.hold / 4, 1), 16);
        ctx.fillStyle = C.black;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('Hold the tap (or Space) — resist the crew\'s whispers!', VIEW_W / 2, 250);
      }
    },
  };

  DRIVERS.boulders = {
    start() {
      const mg = Game.state.mg = { px: VIEW_W / 2, rocks: [], t: 0, spawn: 0, hits: 0, passed: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (KEY(Game.state, 'left')) mg.px -= 360 * dt;
      if (KEY(Game.state, 'right')) mg.px += 360 * dt;
      mg.px = Utils.clamp(mg.px, 60, VIEW_W - 60);
      mg.spawn -= dt;
      if (mg.spawn <= 0) {
        mg.spawn = Utils.rand(0.5, 0.9);
        mg.rocks.push({ x: Utils.rand(40, VIEW_W - 40), y: -30, vy: Utils.rand(180, 300) });
      }
      for (const r of mg.rocks) {
        r.y += r.vy * dt;
        if (r.y > 420 && r.y < 500 && Math.abs(r.x - mg.px) < 46) { r.dead = true; mg.hits++; OdysseyAudio.error(); }
        if (r.y > 540) { r.dead = true; mg.passed++; }
      }
      mg.rocks = mg.rocks.filter(r => !r.dead);
      if (mg.passed >= 18) return 'win';
      if (mg.hits >= 3) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.sea;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      Atlas.wave(ctx, 0, 150, VIEW_W);
      Atlas.wave(ctx, -20, 400, VIEW_W);
      for (const r of mg.rocks) Atlas.boulder(ctx, r.x, r.y, 1);
      Atlas.ship(ctx, mg.px, 460, 1.3);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dodge the boulders! ' + mg.passed + '/18   ·   Hits: ' + mg.hits + '/3', VIEW_W / 2, 50);
      ctx.fillText('◀ ▶ to steer', VIEW_W / 2, 80);
    },
  };

  DRIVERS.circe = {
    start() {
      const mg = Game.state.mg = { phase: 0, round: 0, roundShown: -1, grid: [], seq: [], step: 0, mistakes: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase === 0) {
        if (mg.round !== mg.roundShown) {
          mg.roundShown = mg.round;
          const types = ['plain', 'plain', 'plain', 'plain', 'plain'];
          const pos = Utils.shuffle([0, 1, 2, 3, 4]);
          types[pos[0]] = 'moly';
          mg.grid = types.map((t, i) => ({ t, x: 170 + i * 130, y: 300 }));
        }
        for (const g of mg.grid) {
          if (TAP(Game.state, g.x - 40, g.y - 50, 80, 100)) {
            if (g.t === 'moly') { mg.round++; OdysseyAudio.pluck(700, 0, 0.15); }
            else { mg.mistakes++; OdysseyAudio.error(); }
          }
        }
        if (mg.round >= 3) { mg.phase = 1; mg.seq = []; const cols = ['pink', 'brown', 'gold', 'grey', 'black']; for (let i = 0; i < 4; i++) mg.seq.push(Utils.pick(cols)); }
      } else {
        if (mg.step >= mg.seq.length) return 'win';
        const cols = ['pink', 'brown', 'gold', 'grey', 'black'];
        for (let i = 0; i < 5; i++) {
          if (TAP(Game.state, 130 + i * 145, 300, 110, 90)) {
            if (cols[i] === mg.seq[mg.step]) { mg.step++; OdysseyAudio.pluck(660, 0, 0.14); }
            else { mg.mistakes++; OdysseyAudio.error(); if (mg.mistakes >= 3) return 'lose'; }
          }
        }
      }
      if (mg.mistakes >= 3) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.cream;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      if (mg.phase === 0) {
        ctx.fillText('Find the MOLY — it has a tiny star! (' + mg.round + '/3)', VIEW_W / 2, 60);
        for (const g of mg.grid) Atlas.plant(ctx, g.x, g.y, g.t);
        ctx.fillStyle = C.black;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('Look carefully — only ONE plant is the magic herb.', VIEW_W / 2, 420);
      } else {
        ctx.fillText('Cure the pigs! Repeat the potion order', VIEW_W / 2, 60);
        const cols = ['pink', 'brown', 'gold', 'grey', 'black'];
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillText(mg.step < mg.seq.length ? cols.indexOf(mg.seq[mg.step]) + 1 + '!' : 'GO!', VIEW_W / 2, 130);
        cols.forEach((c, i) => {
          ctx.fillStyle = { pink: C.pink, brown: '#8B6B4D', gold: C.gold, grey: '#9A9A9A', black: '#3A3A3A' }[c];
          ctx.beginPath();
          ctx.arc(185 + i * 145, 350, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = C.black;
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        ctx.fillStyle = C.black;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('Tap the potion bottles in order (1–5)', VIEW_W / 2, 500);
      }
    },
  };

  const UNDER_QS = [
    { q: 'What must I guard on the last island?', hint: 'The prophet knows the sun-god\'s herd…', opts: ['The cattle of Helios', 'The golden fleece', 'The bag of winds'], ans: 0 },
    { q: 'Who waits faithfully for me at home?', hint: 'The queen who unravels her work each night…', opts: ['Penelope at her loom', 'The Sirens', 'King Aeolus'], ans: 0 },
    { q: 'How will my journey end?', hint: 'Home, at last, after twenty years…', opts: ['In peace, at Ithaca', 'Drowned in the strait', 'King of the Cyclopes'], ans: 0 },
  ];

  DRIVERS.underworld = {
    start() {
      const mg = Game.state.mg = { phase: 0, round: 0, shades: [], t: 0, spawn: 0, px: VIEW_W / 2, mistakes: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase === 0) {
        const q = UNDER_QS[mg.round];
        for (let i = 0; i < 3; i++) {
          if (TAP(Game.state, 160, 300 + i * 70, 640, 55)) {
            if (i === q.ans) { mg.round++; OdysseyAudio.pluck(700, 0, 0.15); }
            else { mg.mistakes++; OdysseyAudio.error(); }
          }
        }
        if (mg.round >= 3) { mg.phase = 1; mg.t = 0; }
      } else {
        mg.t += dt;
        if (KEY(Game.state, 'left')) mg.px -= 330 * dt;
        if (KEY(Game.state, 'right')) mg.px += 330 * dt;
        mg.px = Utils.clamp(mg.px, 50, VIEW_W - 50);
        mg.spawn -= dt;
        if (mg.spawn <= 0 && mg.t < 18) {
          mg.spawn = Utils.rand(0.6, 1.1);
          mg.shades.push({ x: Utils.rand(0, VIEW_W), y: -30, vy: Utils.rand(60, 140) });
        }
        for (const s of mg.shades) {
          s.y += s.vy * dt;
          if (s.y > 420 && s.y < 490 && Math.abs(s.x - mg.px) < 40) { s.dead = true; mg.mistakes++; OdysseyAudio.error(); }
        }
        mg.shades = mg.shades.filter(s => !s.dead && s.y < 560);
        if (mg.t >= 18) return 'win';
      }
      if (mg.mistakes >= 3) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = '#1B1526';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      if (mg.phase === 0) {
        const q = UNDER_QS[mg.round];
        ctx.fillStyle = C.cream;
        ctx.fillText('Ask Tiresias the right question…', VIEW_W / 2, 60);
        ctx.font = 'italic 16px Georgia, serif';
        ctx.fillText('Hint: ' + q.hint, VIEW_W / 2, 120);
        ctx.font = 'bold 20px Georgia, serif';
        ctx.fillText(q.q, VIEW_W / 2, 220);
        q.opts.forEach((o, i) => {
          ctx.fillStyle = C.terracotta;
          ctx.fillRect(160, 300 + i * 70, 640, 55);
          ctx.strokeStyle = C.black;
          ctx.strokeRect(160, 300 + i * 70, 640, 55);
          ctx.fillStyle = C.white;
          ctx.font = 'bold 16px Georgia, serif';
          ctx.fillText(o, VIEW_W / 2, 327 + i * 70);
        });
      } else {
        ctx.fillStyle = C.cream;
        ctx.fillText('Dodge the shades! ' + Math.max(0, 18 - (mg.t | 0)) + 's', VIEW_W / 2, 50);
        for (const s of mg.shades) Atlas.ghost(ctx, s.x, s.y, 1);
        ctx.fillStyle = C.terracotta;
        ctx.beginPath();
        ctx.arc(mg.px, 450, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.black;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('◀ ▶ to move — don\'t let the shades touch you!', VIEW_W / 2, 520);
      }
    },
  };

  DRIVERS.sirens = {
    start() {
      const mg = Game.state.mg = { phase: 0, beat: 0, next: 0.8, notes: [], mistakes: 0, t: 0 };
      for (let i = 0; i < 8; i++) mg.notes.push({ t: 0.8 + i * 0.7, tempt: false });
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      mg.t += dt;
      const window = 0.2;
      const press = ANY_TAP();
      if (press && mg.notes.length) {
        const note = mg.notes[0];
        if (Math.abs(note.t - mg.t) < window) {
          if (!note.tempt) { mg.notes.shift(); OdysseyAudio.pluck(660, 0, 0.15); }
          else { mg.mistakes++; mg.notes.shift(); OdysseyAudio.error(); }
        } else { mg.mistakes++; OdysseyAudio.error(); }
      }
      if (mg.notes.length && mg.notes[0].t < mg.t - window) {
        if (!mg.notes[0].tempt) { mg.mistakes++; OdysseyAudio.error(); }
        mg.notes.shift();
      }
      if (!mg.notes.length) {
        if (mg.phase === 0) {
          mg.phase = 1;
          mg.t = 0;
          mg.notes = [];
          for (let i = 0; i < 8; i++) mg.notes.push({ t: 0.8 + i * 0.7, tempt: (i === 2 || i === 5 || i === 7) });
        } else return 'win';
      }
      if (mg.mistakes >= 4) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = '#14263A';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      Atlas.ship(ctx, 480, 380, 1.5);
      Atlas.sirenBird(ctx, 240, 150, 1.2);
      Atlas.sirenBird(ctx, 720, 120, 1.2);
      const note = mg.notes[0];
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(mg.phase === 0 ? 'Row to the beat!' : 'Resist the song — DON\'T tap the pink notes!', VIEW_W / 2, 60);
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(480, 200, 42, 0, Math.PI * 2);
      ctx.stroke();
      if (note) {
        const frac = Utils.clamp(1 - (note.t - mg.t) / 0.7, 0, 1);
        ctx.fillStyle = note.tempt ? C.pink : C.gold;
        ctx.beginPath();
        ctx.arc(480, 200, 8 + frac * 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = C.black;
      ctx.font = '15px Georgia, serif';
      ctx.fillText('Tap on the beat! (Space or tap)', VIEW_W / 2, 280);
    },
  };

  DRIVERS.scylla = {
    start() {
      const mg = Game.state.mg = { lane: 0, t: 0, warn: 0.9, danger: 'scylla', resolves: 0, mistakes: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      mg.t += dt;
      if (Game.input.up && mg.lane > 0) mg.lane--;
      if (Game.input.down && mg.lane < 1) mg.lane++;
      const I = Game.input;
      for (let i = 0; i < I.taps.length; i++) {
        const t = I.taps[i];
        if (!t.used) {
          t.used = true;
          if (t.x < VIEW_W / 2) { if (mg.lane > 0) mg.lane--; }
          else { if (mg.lane < 1) mg.lane++; }
        }
      }
      mg.warn -= dt;
      if (mg.warn <= 0) {
        mg.warn = 1.8;
        const bad = mg.danger === 'scylla' ? mg.lane === 0 : mg.lane === 1;
        if (bad) {
          mg.mistakes++;
          OdysseyAudio.error();
          if (mg.mistakes >= 3) return 'lose';
        } else {
          mg.resolves++;
          OdysseyAudio.pluck(700, 0, 0.15);
          if (mg.resolves >= 6) return 'win';
        }
        mg.danger = mg.danger === 'scylla' ? 'charybdis' : 'scylla';
      }
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.blue;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.seaDark;
      ctx.fillRect(0, 300, VIEW_W, 240);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(480, 470, 70 + Math.sin(mg.t * 3) * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.black;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(480, 470, 44 + Math.sin(mg.t * 5) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌀', 480, 482);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = C.black;
        ctx.beginPath();
        ctx.arc(100 + i * 152, 80, 18, 0, Math.PI * 2);
        ctx.fill();
        if (mg.danger === 'scylla') {
          ctx.fillStyle = C.white;
          ctx.beginPath();
          ctx.arc(100 + i * 152, 80, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      Atlas.ship(ctx, 480, mg.lane === 0 ? 210 : 380, 1.2);
      if (mg.danger === 'scylla') {
        ctx.fillStyle = 'rgba(200,60,40,0.28)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = C.red;
        ctx.font = 'bold 30px Georgia, serif';
        ctx.fillText('⚠ SCYLLA STRIKES THE TOP LANE! MOVE DOWN!', VIEW_W / 2, 110);
      } else {
        ctx.fillStyle = 'rgba(60,120,220,0.25)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = C.white;
        ctx.font = 'bold 26px Georgia, serif';
        ctx.fillText('🌀 CHARYBDIS PULLS THE BOTTOM LANE! MOVE UP!', VIEW_W / 2, 110);
      }
      ctx.fillStyle = C.white;
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText('You are in the ' + (mg.lane === 0 ? 'TOP lane' : 'BOTTOM lane'), VIEW_W / 2, 40);
      ctx.fillText('When it flashes, switch lanes! ⬆⬇ or tap left/right half', VIEW_W / 2, 505);
      ctx.fillText('Dodged: ' + mg.resolves + '/6   ·   Mistakes: ' + mg.mistakes + '/3', VIEW_W / 2, 528);
    },
  };

  DRIVERS.cattle = {
    start() {
      const mg = Game.state.mg = { wave: 0, t: 0, hunger: 0, creep: null, misses: 0, creepT: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      mg.t += dt;
      mg.hunger = Utils.clamp(mg.hunger + dt * 0.14, 0, 1);
      if (mg.t > 22) {
        mg.wave++;
        mg.t = 0;
        mg.hunger = 0;
        if (mg.wave >= 3) return 'win';
      }
      if (!mg.creep) {
        mg.creepT -= dt;
        if (mg.creepT <= 0 && mg.t > 3) {
          mg.creep = { x: 80, target: Utils.rand(260, 420), speed: Utils.rand(26, 42) };
          mg.creepT = Utils.rand(3, 6);
        }
      }
      if (mg.creep) {
        mg.creep.x += mg.creep.speed * dt;
        if (mg.creep.x > 800 || TAP(Game.state, 780, 440, 160, 70)) {
          if (mg.creep.x > 800) {
            mg.misses++;
            OdysseyAudio.error();
            if (mg.misses >= 3) return 'lose';
          } else OdysseyAudio.pluck(700, 0, 0.15);
          mg.creep = null;
        }
      }
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = '#2E2418';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.terracottaDark;
      ctx.fillRect(0, 420, VIEW_W, 120);
      for (let i = 0; i < 5; i++) Atlas.cattle(ctx, 160 + i * 130, 380, 0.9);
      if (mg.creep) {
        Atlas.crewman(ctx, mg.creep.x, 420, 0.9);
        ctx.fillStyle = C.white;
        ctx.font = '13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('So hungry… just one cow…', mg.creep.x, 400);
      }
      ctx.fillStyle = C.white;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Wave ' + (mg.wave + 1) + '/3 — guard the sacred cattle!', VIEW_W / 2, 50);
      ctx.fillStyle = C.pink;
      ctx.fillRect(VIEW_W / 2 - 120, 70, 240 * mg.hunger, 12);
      ctx.fillStyle = C.white;
      ctx.fillText('Crew hunger', VIEW_W / 2, 100);
      ctx.fillStyle = C.terracotta;
      ctx.fillRect(780, 440, 160, 70);
      ctx.strokeStyle = C.black;
      ctx.strokeRect(780, 440, 160, 70);
      ctx.fillStyle = C.white;
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText('HALT!', 860, 478);
      ctx.fillText('Misses: ' + mg.misses + '/3', VIEW_W / 2, 130);
    },
  };

  DRIVERS.phaeacia = {
    start() {
      const mg = Game.state.mg = { phase: 0, t: 0, throws: 0, power: 0, angle: 0, counters: 0, lungeT: 0, nextLunge: 1.0, mistakes: 0, kind: 0 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase === 0) {
        mg.t += dt * 1.1;
        mg.t %= 1;
        if (ANY_TAP()) {
          mg.power = mg.t;
          mg.phase = 1;
          mg.t = 0;
        }
      } else if (mg.phase === 1) {
        mg.t += dt * 1.3;
        mg.t %= 1;
        const angle = Math.sin(mg.t * Math.PI * 2) * 2;
        if (ANY_TAP()) {
          if (mg.power > 0.55 && Math.abs(angle) < 0.9) { mg.throws++; OdysseyAudio.coin(); }
          else { mg.mistakes++; OdysseyAudio.error(); }
          mg.phase = 0;
          if (mg.throws >= 3) { mg.phase = 2; mg.counterT = 1.2; }
        }
      } else if (mg.phase === 2) {
        if (mg.lungeT > 0) {
          mg.lungeT -= dt;
          if (ANY_TAP()) {
            mg.counters++;
            mg.lungeT = 0;
            mg.nextLunge = 1.4;
            OdysseyAudio.pluck(700, 0, 0.15);
            if (mg.counters >= 3) { mg.phase = 3; mg.kind = 0; }
          } else if (mg.lungeT <= 0) {
            mg.mistakes++;
            mg.nextLunge = 1.4;
            OdysseyAudio.error();
          }
        } else {
          mg.nextLunge -= dt;
          if (mg.nextLunge <= 0) mg.lungeT = 0.6;
        }
      } else if (mg.phase === 3) {
        const opts = [
          { text: 'Offer Nausicaa a flower', best: true },
          { text: 'Demand her clothes', best: false },
        ];
        if (mg.kind === 0) {
          for (let i = 0; i < 2; i++) {
            if (TAP(Game.state, 240, 300 + i * 80, 480, 60)) {
              if (opts[i].best) OdysseyAudio.pluck(700, 0, 0.15);
              else { mg.mistakes++; OdysseyAudio.error(); }
              mg.kind = 1;
            }
          }
        } else {
          const opts2 = [
            { text: 'Thank them with a story of Troy', best: true },
            { text: 'Take the gifts and leave', best: false },
          ];
          for (let i = 0; i < 2; i++) {
            if (TAP(Game.state, 240, 380 + i * 80, 480, 60)) {
              if (opts2[i].best) OdysseyAudio.pluck(700, 0, 0.15);
              else { mg.mistakes++; OdysseyAudio.error(); }
              return 'win';
            }
          }
        }
      }
      if (mg.mistakes >= 3) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = C.cream;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      if (mg.phase === 0) {
        ctx.fillText('Discus throw ' + (mg.throws + 1) + '/3 — tap for POWER!', VIEW_W / 2, 80);
        gauge(ctx, 200, 140, 560, 30, mg.t, 0.55, 1);
      } else if (mg.phase === 1) {
        ctx.fillText('Tap for ANGLE!', VIEW_W / 2, 80);
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(480, 300, 30, 0, Math.PI * 2);
        ctx.fill();
        const angle = Math.sin(mg.t * Math.PI * 2) * 2;
        ctx.strokeStyle = C.black;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(480, 300);
        ctx.lineTo(480 + angle * 80, 240);
        ctx.stroke();
        ctx.fillStyle = C.black;
        ctx.fillText(Math.abs(angle) < 0.9 ? 'Good angle!' : 'Too crooked!', VIEW_W / 2, 400);
      } else if (mg.phase === 2) {
        ctx.fillText('Wrestling — counter when he lunges! (' + mg.counters + '/3)', VIEW_W / 2, 80);
        Atlas.crewman(ctx, 480, 320, 1.4);
        if (mg.lungeT > 0) {
          ctx.fillStyle = 'rgba(200,60,40,0.2)';
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
          ctx.fillStyle = C.red;
          ctx.font = 'bold 32px Georgia, serif';
          ctx.fillText('LUNGE! TAP NOW!', VIEW_W / 2, 200);
        } else {
          ctx.fillStyle = C.black;
          ctx.font = '15px Georgia, serif';
          ctx.fillText('He circles… watch for the lunge!', VIEW_W / 2, 200);
        }
      } else {
        ctx.fillText(mg.kind === 0 ? 'Nausicaa offers her help — how do you reply?' : 'The king asks for a story — how do you thank them?', VIEW_W / 2, 80);
        const opts = mg.kind === 0
          ? ['Offer Nausicaa a flower', 'Demand her clothes']
          : ['Thank them with a story of Troy', 'Take the gifts and leave'];
        opts.forEach((o, i) => {
          ctx.fillStyle = C.terracotta;
          ctx.fillRect(240, (mg.kind === 0 ? 300 : 380) + i * 80, 480, 60);
          ctx.strokeStyle = C.black;
          ctx.strokeRect(240, (mg.kind === 0 ? 300 : 380) + i * 80, 480, 60);
          ctx.fillStyle = C.white;
          ctx.font = 'bold 16px Georgia, serif';
          ctx.fillText(o, VIEW_W / 2, (mg.kind === 0 ? 300 : 380) + i * 80 + 38);
        });
      }
      ctx.fillStyle = C.black;
      ctx.font = '14px Georgia, serif';
      ctx.fillText('Mistakes: ' + mg.mistakes + '/3', VIEW_W / 2, 520);
    },
  };

  const SUITOR_CLAIMS = [
    { claim: 'I am the best spearman in the hall!', truth: false, reply: 'Bluff!' },
    { claim: 'I have brought gifts every single day for years!', truth: true, reply: 'Truth!' },
    { claim: 'My lineage is nobler than the king\'s!', truth: false, reply: 'Bluff!' },
  ];

  DRIVERS.bow = {
    start() {
      const mg = Game.state.mg = { phase: 0, t: 0, shots: 0, power: 0, target: 0, dir: 1, mistakes: 0, round: 0, riddle: 0, dogT: 0, dogHit: 0, dogX: -60 };
      return mg;
    },
    update(dt) {
      const mg = Game.state.mg;
      if (mg.phase === 0) {
        mg.t += dt * 1.2;
        mg.t %= 1;
        if (ANY_TAP()) { mg.power = mg.t; mg.phase = 1; mg.t = 0; mg.target = 200; mg.dir = 1; }
      } else if (mg.phase === 1) {
        mg.target += mg.dir * 180 * dt;
        if (mg.target > 760) { mg.target = 760; mg.dir = -1; }
        if (mg.target < 200) { mg.target = 200; mg.dir = 1; }
        if (ANY_TAP()) {
          if (mg.power > 0.55 && Math.abs(mg.target - 480) < 50) { mg.shots++; OdysseyAudio.coin(); }
          else { mg.mistakes++; OdysseyAudio.error(); }
          mg.phase = 0;
          if (mg.shots >= 3) { mg.phase = 2; }
        }
      } else if (mg.phase === 2) {
        const c = SUITOR_CLAIMS[mg.round];
        for (let i = 0; i < 2; i++) {
          if (TAP(Game.state, 240, 300 + i * 80, 480, 60)) {
            const isTruth = i === 0;
            if (isTruth === c.truth) { mg.round++; OdysseyAudio.pluck(700, 0, 0.15); }
            else { mg.mistakes++; OdysseyAudio.error(); }
          }
        }
        if (mg.round >= 3) { mg.phase = 3; }
      } else if (mg.phase === 3) {
        for (let i = 0; i < 3; i++) {
          if (TAP(Game.state, 180, 300 + i * 80, 600, 60)) {
            if (i === 0) { mg.phase = 4; OdysseyAudio.pluck(700, 0, 0.15); }
            else { mg.mistakes++; OdysseyAudio.error(); }
          }
        }
      } else if (mg.phase === 4) {
        mg.dogT += dt;
        mg.dogX += 60 * dt;
        if (TAP(Game.state, mg.dogX - 60, 380, 120, 120)) { mg.dogHit++; OdysseyAudio.pluck(660, 0, 0.15); }
        if (mg.dogT > 7) return 'win';
      }
      if (mg.mistakes >= 3) return 'lose';
      return 'running';
    },
    render(ctx) {
      const mg = Game.state.mg;
      ctx.fillStyle = '#2E2418';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      if (mg.phase === 0) {
        ctx.fillText('String the great bow — tap for POWER! (' + mg.shots + '/3)', VIEW_W / 2, 80);
        gauge(ctx, 200, 140, 560, 30, mg.t, 0.55, 1);
        ctx.fillStyle = C.white;
        ctx.font = '14px Georgia, serif';
        ctx.fillText('No suitor could string it. You will.', VIEW_W / 2, 500);
      } else if (mg.phase === 1) {
        ctx.fillText('Release at the target!', VIEW_W / 2, 80);
        ctx.fillStyle = C.gold;
        ctx.fillRect(mg.target - 30, 200, 60, 12);
        ctx.fillStyle = C.white;
        ctx.beginPath();
        ctx.arc(480, 300, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.white;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(500, 300);
        ctx.lineTo(mg.target, 206);
        ctx.stroke();
      } else if (mg.phase === 2) {
        const c = SUITOR_CLAIMS[mg.round];
        ctx.fillText('The suitor claims: "' + c.claim + '"', VIEW_W / 2, 140);
        ctx.fillText('Truth or Bluff?', VIEW_W / 2, 200);
        ['Truth!', 'Bluff!'].forEach((o, i) => {
          ctx.fillStyle = C.terracotta;
          ctx.fillRect(240, 300 + i * 80, 480, 60);
          ctx.strokeStyle = C.black;
          ctx.strokeRect(240, 300 + i * 80, 480, 60);
          ctx.fillStyle = C.white;
          ctx.font = 'bold 18px Georgia, serif';
          ctx.fillText(o, VIEW_W / 2, 330 + i * 80);
        });
      } else if (mg.phase === 3) {
        ctx.fillText('Penelope\'s riddle: "Move our bed outside!"', VIEW_W / 2, 100);
        ctx.font = '15px Georgia, serif';
        ctx.fillText('Only her husband knows why it can\'t move…', VIEW_W / 2, 140);
        ['The bed is rooted in a living olive tree', 'The bed is made of ship timber', 'The bed floats on water'].forEach((o, i) => {
          ctx.fillStyle = C.terracotta;
          ctx.fillRect(180, 300 + i * 80, 600, 60);
          ctx.strokeStyle = C.black;
          ctx.strokeRect(180, 300 + i * 80, 600, 60);
          ctx.fillStyle = C.white;
          ctx.font = 'bold 15px Georgia, serif';
          ctx.fillText(o, VIEW_W / 2, 330 + i * 80);
        });
      } else {
        ctx.fillText('Argos! Your old dog — pet him before it\'s too late!', VIEW_W / 2, 60);
        Atlas.crewman(ctx, mg.dogX, 420, 1);
        ctx.fillStyle = C.white;
        ctx.font = '13px Georgia, serif';
        ctx.fillText('Woof!', mg.dogX, 400);
        if (mg.dogT > 6.5) {
          ctx.fillStyle = C.gold;
          ctx.font = 'bold 20px Georgia, serif';
          ctx.fillText('He wagged once, and was at peace. ' + (mg.dogHit > 0 ? 'You were there.' : 'He knew you. He always knew.'), VIEW_W / 2, 120);
        }
      }
    },
  };

  return DRIVERS;
})();
