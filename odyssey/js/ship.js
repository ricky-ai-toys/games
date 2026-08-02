'use strict';
const Ship = (() => {
  const DOCK = [
    { id: 'sail', icon: '⛵', label: 'Sail' },
    { id: 'loom', icon: '🧵', label: 'Loom' },
    { id: 'codex', icon: '📜', label: 'Codex' },
    { id: 'museum', icon: '🏺', label: 'Museum' },
    { id: 'quiz', icon: '❓', label: 'Quiz' },
    { id: 'phrases', icon: '📖', label: 'Phrases' },
    { id: 'hexameter', icon: '🎵', label: 'Hexameter' },
    { id: 'boons', icon: '⚡', label: 'Boons' },
    { id: 'chest', icon: '🎁', label: 'Chest' },
  ];
  const lastBase = {};

  function crewReactAvail(crew) {
    const s = Game.state;
    const r = crew.react;
    const out = [];
    const hasFail = Object.keys(s.attempted).some(k => s.attempted[k] > 0);
    if (r.memento && s.mementos.length && !s.crewTalk[crew.id + '_memento']) out.push('memento');
    if (r.fail && hasFail && !s.crewTalk[crew.id + '_fail']) out.push('fail');
    if (r.windsOpened && s.flags.windsOpened && !s.crewTalk[crew.id + '_windsOpened']) out.push('windsOpened');
    if (r.cattleAte && s.flags.cattleAte && !s.crewTalk[crew.id + '_cattleAte']) out.push('cattleAte');
    if (r.cyclopsDone && s.completed.includes('cyclops') && !s.crewTalk[crew.id + '_cyclopsDone']) out.push('cyclopsDone');
    if (r.ithacaDone && s.completed.includes('ithaca') && !s.crewTalk[crew.id + '_ithacaDone']) out.push('ithacaDone');
    if (r.lotusFailed && (s.attempted.lotus || 0) > 0 && !s.crewTalk[crew.id + '_lotusFailed']) out.push('lotusFailed');
    if (r.sirensDone && s.completed.includes('sirens') && !s.crewTalk[crew.id + '_sirensDone']) out.push('sirensDone');
    if (r.underworldDone && s.completed.includes('underworld') && !s.crewTalk[crew.id + '_underworldDone']) out.push('underworldDone');
    if (r.phaeaciaDone && s.completed.includes('phaeacia') && !s.crewTalk[crew.id + '_phaeaciaDone']) out.push('phaeaciaDone');
    if (r.laestrygoniansDone && s.completed.includes('laestrygonians') && !s.crewTalk[crew.id + '_laestrygoniansDone']) out.push('laestrygoniansDone');
    if (r.scyllaDone && s.completed.includes('scylla') && !s.crewTalk[crew.id + '_scyllaDone']) out.push('scyllaDone');
    if (r.calypsoDone && s.completed.includes('calypso') && !s.crewTalk[crew.id + '_calypsoDone']) out.push('calypsoDone');
    return out;
  }

  function talkTo(crew) {
    const s = Game.state;
    const react = crewReactAvail(crew);
    if (react.length) {
      const key = react[0];
      s.crewTalk[crew.id + '_' + key] = true;
      Save.write(s);
      UI.open('dialogue', {
        title: crew.name + ' — ' + crew.role,
        lines: [{ who: crew.name, text: crew.react[key] }],
        onDone: () => {},
      });
      return;
    }
    const base = crew.base;
    let idx = lastBase[crew.id] == null ? Math.floor(Math.random() * base.length) : (lastBase[crew.id] + 1) % base.length;
    if (base.length > 1 && base[idx] === base[lastBase[crew.id]]) idx = (idx + 1) % base.length;
    lastBase[crew.id] = idx;
    UI.open('dialogue', {
      title: crew.name + ' — ' + crew.role,
      lines: [{ who: crew.name, text: base[idx] }],
      onDone: () => {},
    });
  }

  function update(dt) {
    const s = Game.state;
    CREW.forEach((c, i) => {
      const x = 105 + i * 130;
      if (Game.tapAt(x - 55, 320, 110, 130)) talkTo(c);
    });
    const bw = 96;
    for (let i = 0; i < DOCK.length; i++) {
      const x = 8 + i * (bw + 8);
      if (Game.tapAt(x, 470, bw, 60)) {
        const d = DOCK[i];
        if (d.id === 'sail') {
          if (s.completed.length >= EPISODES.length) { Game.scene = 'epilogue'; Game.epiPage = 0; OdysseyAudio.startMusic('title'); }
          else { Game.scene = 'map'; OdysseyAudio.startMusic('map'); }
        } else if (d.id === 'loom') UI.open('loom');
        else if (d.id === 'codex') UI.open('codex');
        else if (d.id === 'museum') UI.open('museum');
        else if (d.id === 'quiz') UI.open('quiz');
        else if (d.id === 'phrases') UI.open('phrases');
        else if (d.id === 'hexameter') UI.open('hexameter');
        else if (d.id === 'boons') UI.open('boons');
        else if (d.id === 'chest') UI.open('chest');
      }
    }
  }

  function render(ctx) {
    const s = Game.state;
    Render.topBar(ctx, s);
    ctx.fillStyle = C.sea;
    ctx.fillRect(0, 46, VIEW_W, VIEW_H - 46);
    ctx.fillStyle = C.creamDark;
    ctx.fillRect(0, 120, VIEW_W, 140);
    Atlas.wave(ctx, -10, 260, VIEW_W + 20);
    Atlas.island(ctx, 130, 190, 46);
    ctx.save();
    ctx.globalAlpha = 0.35;
    Atlas.ship(ctx, 800, 180, 0.9);
    ctx.restore();
    Atlas.ship(ctx, 700, 380, 1.25);
    ctx.fillStyle = C.terracottaDark;
    ctx.fillRect(0, 430, VIEW_W, 40);
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 432);
    ctx.lineTo(VIEW_W, 432);
    ctx.stroke();
    CREW.forEach((c, i) => {
      const x = 105 + i * 130;
      Atlas.crewman(ctx, x, 390, 1.05);
      ctx.font = '22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.icon, x, 340);
      ctx.font = 'bold 12px Georgia, serif';
      ctx.fillText(c.name, x, 425);
      ctx.textAlign = 'left';
    });
    const bw = 96;
    for (let i = 0; i < DOCK.length; i++) {
      const x = 8 + i * (bw + 8);
      const hot = DOCK[i].id === 'sail';
      Render.btn(ctx, x, 470, bw, 60, DOCK[i].icon + '\n' + DOCK[i].label, {
        size: 13, fill: hot ? C.terracotta : C.terracottaDark, hot: hot,
      });
    }
    ctx.fillStyle = C.black;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    if (s.current < EPISODES.length) {
      const next = EPISODES[s.current];
      ctx.fillText('Next: ' + next.icon + ' ' + next.name + ' — ' + next.island + '  (' + next.book + ')', VIEW_W / 2, 452);
    }
    ctx.textAlign = 'left';
  }

  return { update, render };
})();
