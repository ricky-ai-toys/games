'use strict';
const OdysseyAudio = (() => {
  let actx = null;
  let master = null;
  let musicTimer = null;
  let currentScene = 'title';

  function ensure() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.5;
        master.connect(actx.destination);
      } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(function(){});
    return actx;
  }

  function tone(freq, dur, type, vol, when) {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function pluck(freq, when, vol) {
    tone(freq, 0.35, 'triangle', vol || 0.2, when);
    tone(freq * 2, 0.18, 'sine', (vol || 0.2) * 0.3, when);
  }

  const MODES = {
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
  };

  function lyreNote(i, mode, octave) {
    const base = 220 * Math.pow(2, (octave || 0));
    const scale = MODES[mode] || MODES.dorian;
    const deg = scale[i % scale.length] + 12 * Math.floor(i / scale.length);
    return base * Math.pow(2, deg / 12);
  }

  function seaBed(dur) {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    const len = (dur || 4) + 0.2;
    const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < d.length; i++) {
      phase += 0.35 + Math.sin(i / 5000) * 0.2;
      d[i] = (Math.sin(phase) * 0.4 + Math.sin(phase * 0.5 + 1) * 0.3) * 0.12;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    src.connect(g); g.connect(master);
    src.start(t0);
  }

  function storm() {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    for (let i = 0; i < 8; i++) {
      tone(70 + Math.random() * 40, 0.6, 'sawtooth', 0.05, i * 0.14);
      tone(150 + Math.random() * 200, 0.3, 'triangle', 0.06, i * 0.14);
    }
    tone(55, 2.2, 'sine', 0.25, 0);
  }

  function fanfare() {
    const base = 392;
    [0, 4, 7, 12].forEach((s, i) => pluck(base * Math.pow(2, s / 12), i * 0.13, 0.22));
    [12, 16, 19].forEach((s, i) => pluck(base * Math.pow(2, s / 12), 0.6 + i * 0.12, 0.2));
  }

  function sirenWarbles() {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    for (let i = 0; i < 5; i++) {
      const f = 700 + i * 120;
      tone(f, 0.7, 'sine', 0.12, i * 0.32);
      tone(f * 1.5, 0.7, 'sine', 0.06, i * 0.32 + 0.16);
    }
  }

  function error() { tone(180, 0.25, 'square', 0.1); tone(140, 0.3, 'square', 0.1, 0.12); }
  function success() { pluck(523, 0, 0.18); pluck(659, 0.1, 0.18); pluck(784, 0.2, 0.18); }
  function click() { tone(880, 0.06, 'square', 0.06); }
  function coin() { pluck(1174, 0, 0.16); pluck(1568, 0.07, 0.12); }

  function startMusic(scene) {
    currentScene = scene;
    stopMusic();
    if (!ensure()) return;
    let idx = 0;
    musicTimer = setInterval(() => {
      if (currentScene !== scene) return;
      if (scene === 'title') {
        pluck(lyreNote(idx, 'phrygian', 0), 0, 0.12);
        if (idx % 4 === 3) tone(lyreNote(idx - 3, 'phrygian', -1), 0.9, 'sine', 0.05);
      } else if (scene === 'ship') {
        pluck(lyreNote(idx, 'dorian', 0), 0, 0.1);
        if (idx % 2 === 1) pluck(lyreNote(idx, 'dorian', -1), 0.12, 0.08);
      } else if (scene === 'episode') {
        pluck(lyreNote(idx, 'phrygian', -1), 0, 0.07);
      } else {
        pluck(lyreNote(idx, 'dorian', -1), 0, 0.09);
      }
      idx++;
    }, 380);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  // audit M-6 fix: pause music + suspend audio when the tab is hidden
  let musicWasPlaying = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      musicWasPlaying = !!musicTimer;
      stopMusic();
      if (actx) actx.suspend().catch(function () {});
    } else {
      if (actx) actx.resume().catch(function () {});
      if (musicWasPlaying) startMusic(currentScene);
    }
  });

  return {
    ensure, tone, pluck, seaBed, storm, fanfare, sirenWarbles, error, success, click, coin,
    startMusic, stopMusic,
  };
})();
