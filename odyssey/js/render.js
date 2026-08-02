'use strict';
const Render = (() => {
  function vasePanel(ctx, x, y, w, h) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.terracotta;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = C.terracottaDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    Atlas.meander(ctx, x + 14, y + h - 26, w - 28, 10, 3);
  }

  function btn(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    ctx.fillStyle = opts.fill || C.terracotta;
    ctx.fillRect(x, y, w, h);
    if (opts.hot) {
      ctx.fillStyle = C.gold;
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = opts.fill || C.terracotta;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = opts.text || C.white;
    ctx.font = (opts.bold === false ? '' : 'bold ') + (opts.size || 15) + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = String(label).split('\n');
    const lh = (opts.size || 15) + 6;
    const y0 = y + h / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, y0 + i * lh + (opts.dy || 0)));
    ctx.textAlign = 'left';
  }

  function topBar(ctx, state) {
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, VIEW_W, 46);
    ctx.fillStyle = C.cream;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Day ' + state.day, 12, 22);
    const bars = [
      { label: '🍎 Food', v: state.food, max: MAX_FOOD, c: C.green, x: 90 },
      { label: '💚 Morale', v: state.morale, max: MAX_MORALE, c: C.pink, x: 250 },
      { label: '🚢 Hull', v: state.hull, max: MAX_HULL, c: C.blue, x: 420 },
    ];
    bars.forEach(b => {
      ctx.fillStyle = C.creamDark;
      ctx.fillRect(b.x, 14, 130, 18);
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, 14, 130 * (b.v / b.max), 18);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, 14, 130, 18);
      ctx.fillStyle = C.white;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(b.label, b.x + 4, 23);
    });
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('⭐ Glory ' + state.glory, VIEW_W - 170, 22);
    ctx.fillStyle = C.white;
    ctx.fillText('🌟 ' + state.scholar + ' Scholar', VIEW_W - 60, 22);
    ctx.textAlign = 'left';
  }

  function title(ctx, state, hasSave) {
    ctx.fillStyle = C.sea;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = C.seaDark;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H - 130);
    Atlas.wave(ctx, -20, 420, VIEW_W + 40);
    Atlas.wave(ctx, -60, 460, VIEW_W + 80);
    Atlas.wave(ctx, -100, 500, VIEW_W + 120);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(0, 520, VIEW_W, 20);
    Atlas.island(ctx, 120, 470, 60);
    Atlas.island(ctx, 840, 460, 45);
    vasePanel(ctx, 150, 55, 660, 160);
    ctx.fillStyle = C.terracotta;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("AMBER'S", 480, 125);
    ctx.fillStyle = C.black;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('ODYSSEY', 480, 175);
    ctx.fillStyle = C.terracottaDark;
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('The Long Way Home', 480, 205);
    Atlas.ship(ctx, 480, 425, 1.5);
    btn(ctx, 330, 230, 300, 50, '⚓ New Voyage', { size: 19, hot: true });
    if (hasSave) btn(ctx, 330, 290, 300, 50, '📜 Continue', { size: 19, fill: C.terracottaDark });
    btn(ctx, 330, 350, 300, 46, '🎓 How to Play', { size: 15, fill: '#6E5434' });
    ctx.fillStyle = C.black;
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('A tale of Troy, monsters, gods, and one very clever man — tap to sail.', 480, 465);
    if (hasSave) ctx.fillText('Voyage so far: ' + state.completed.length + '/12 islands · Day ' + state.day, 480, 488);
    ctx.textAlign = 'left';
  }

  function result(ctx, state, sd) {
    const ep = sd.ep;
    const y0 = 90;
    ctx.fillStyle = 'rgba(20,12,6,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    vasePanel(ctx, 140, y0, 680, 340);
    ctx.textAlign = 'center';
    if (sd.win) {
      ctx.fillStyle = C.gold;
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText('⚡ VICTORY! ⚡', 480, y0 + 70);
      ctx.fillStyle = C.black;
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText(ep.name + ' — ' + ep.island, 480, y0 + 120);
      ctx.font = '16px Georgia, serif';
      ctx.fillText('You earned ⭐ Glory +' + (ep.glory + (sd.perfect ? GLORY_PERFECT : 0)) + (sd.perfect ? '  (perfect run bonus +' + GLORY_PERFECT + '!)' : ''), 480, y0 + 165);
      if (!sd.already) {
        ctx.fillText('Memento added to your chest: ' + ep.mementoIcon + ' ' + ep.memento, 480, y0 + 195);
        ctx.fillText('🌟 Scholar +1 — your Codex entry on ' + ep.island + ' is unlocked!', 480, y0 + 225);
      }
      ctx.fillText('The crew cheers. The tale grows.', 480, y0 + 260);
      btn(ctx, 340, y0 + 285, 280, 50, 'Continue ▶', { size: 18, hot: true });
    } else {
      ctx.fillStyle = C.red;
      ctx.font = 'bold 40px Georgia, serif';
      ctx.fillText('✗ Not this time…', 480, y0 + 70);
      ctx.fillStyle = C.black;
      ctx.font = 'italic 17px Georgia, serif';
      ctx.fillText('"' + ep.failText + '"', 480, y0 + 120);
      ctx.font = '15px Georgia, serif';
      ctx.fillText('The crew pats your back. Heroes try twice.', 480, y0 + 165);
      btn(ctx, 170, y0 + 260, 260, 50, '🔄 Try Again', { size: 18, fill: C.terracottaDark });
      btn(ctx, 530, y0 + 260, 260, 50, '⛵ Sail On', { size: 18, fill: '#6E5434' });
    }
    ctx.textAlign = 'left';
  }

  function epilogue(ctx, state, page) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    Atlas.island(ctx, 480, 300, 120);
    ctx.fillStyle = C.black;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOME', 480, 90);
    ctx.fillStyle = C.terracotta;
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText('Ithaca at last', 480, 140);
    const pages = [
      [
        'Twenty years the tale took. Your crew is small, your ship is scarred —',
        'and the great hall is full of suitors eating YOUR honey and YOUR goats.',
        'But the beggar in the corner knows this house. He asks to try the bow.',
      ],
      [
        'One smooth pull. One arrow. Twelve axe-handles, twelve clean shots.',
        'The suitors stare. The beggar stands in his own door, no longer a beggar.',
        'Argos the dog wags his tail once — and goes to sleep, at peace.',
      ],
      [
        'Penelope still tests him: "Move our bed." But the bed is rooted in',
        'the olive tree she planted. Only her husband could know. "Wife," he says,',
        '"no man alive could move it. Not without first cutting the tree."',
      ],
    ];
    pages[page].forEach((line, i) => {
      ctx.fillStyle = C.black;
      ctx.font = '17px Georgia, serif';
      ctx.fillText(line, 480, 200 + i * 30);
    });
    if (page < 2) {
      btn(ctx, 370, 430, 220, 48, 'Next ▶', { size: 17, hot: true });
    } else {
      ctx.fillStyle = C.terracotta;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText('⭐ Final Glory: ' + state.glory + '  ·  🌟 Scholar: ' + state.scholar + '  ·  📅 Days: ' + state.day, 480, 380);
      ctx.fillText('Voyage complete: ' + state.completed.length + '/12', 480, 410);
      btn(ctx, 300, 430, 360, 48, '🏺 Sail the Tale Again', { size: 17, hot: true });
    }
    ctx.textAlign = 'left';
  }

  return { vasePanel, btn, topBar, title, result, epilogue };
})();
