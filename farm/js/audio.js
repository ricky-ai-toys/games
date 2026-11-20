/* ========================================
   Amber's Farm — Web Audio SFX + cozy music
   BIG-8 audio pass
   ======================================== */

const FarmAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let muted = false;
  let sfxEnabled = true;
  let musicEnabled = true;
  let initialized = false;
  let musicTimer = null;
  let seasonNotes = null;

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.45;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.1;
      musicGain.connect(masterGain);
      initialized = true;
      // Restore prefs
      try {
        const pref = JSON.parse(localStorage.getItem('ambers_farm_audio') || '{}');
        if (pref.muted != null) muted = !!pref.muted;
        if (pref.sfx != null) sfxEnabled = !!pref.sfx;
        if (pref.music != null) musicEnabled = !!pref.music;
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  function persist() {
    try {
      localStorage.setItem('ambers_farm_audio', JSON.stringify({ muted, sfx: sfxEnabled, music: musicEnabled }));
    } catch (e) { /* ignore */ }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function(){});
  }

  function setMuted(v) { muted = v; persist(); if (v) stopMusic(); else if (musicEnabled) startMusic(); }
  function setSfx(v) { sfxEnabled = v; persist(); }
  function setMusic(v) {
    musicEnabled = v;
    persist();
    if (!v) stopMusic();
    else if (initialized) startMusic();
  }

  function playTone(type, freq, duration, volume = 0.25, freqEnd = null, delay = 0) {
    if (!ctx || muted || !sfxEnabled) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd != null) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function click() { playTone('sine', 660, 0.06, 0.15); }
  function hoe() { playTone('triangle', 180, 0.08, 0.2, 90); }
  function water() {
    playTone('sine', 800, 0.12, 0.12, 400);
    playTone('sine', 600, 0.1, 0.08, 300, 0.05);
  }
  function plant() {
    playTone('sine', 420, 0.1, 0.15);
    playTone('sine', 520, 0.12, 0.12, null, 0.08);
  }
  function harvest() {
    playTone('sine', 523, 0.1, 0.18);
    playTone('sine', 659, 0.1, 0.18, null, 0.08);
    playTone('sine', 784, 0.18, 0.22, null, 0.16);
  }
  function coins() {
    playTone('square', 880, 0.08, 0.1);
    playTone('square', 1100, 0.1, 0.1, null, 0.07);
  }
  function sleep() {
    playTone('sine', 392, 0.3, 0.15, 300);
    playTone('sine', 330, 0.4, 0.12, 250, 0.2);
  }
  function talk() { playTone('sine', 350 + Math.random() * 80, 0.07, 0.12); }
  function success() {
    playTone('sine', 523, 0.1, 0.2);
    playTone('sine', 659, 0.1, 0.2, null, 0.1);
    playTone('sine', 784, 0.12, 0.22, null, 0.2);
    playTone('sine', 1046, 0.2, 0.2, null, 0.32);
  }
  function pet() { playTone('sine', 600, 0.1, 0.12, 800); }
  function error() { playTone('triangle', 200, 0.15, 0.12, 120); }

  function footstep() {
    playTone('triangle', 90 + Math.random() * 30, 0.04, 0.05);
  }

  function door() {
    playTone('triangle', 200, 0.1, 0.12, 120);
    playTone('sine', 300, 0.08, 0.08, null, 0.05);
  }

  function setSeason(season) {
    // C major / A minor / G mix / soft winter
    if (season === 'fall') seasonNotes = [220, 262, 294, 330, 392];
    else if (season === 'winter') seasonNotes = [196, 233, 262, 311, 349];
    else if (season === 'summer') seasonNotes = [294, 330, 370, 440, 523];
    else seasonNotes = [262, 294, 330, 392, 440, 523];
  }

  function startMusic() {
    if (!ctx || !musicEnabled || muted) return;
    stopMusic();
    if (!seasonNotes) setSeason('spring');
    function tick() {
      if (!musicEnabled || muted || !ctx) return;
      const notes = seasonNotes || [262, 294, 330, 392];
      const n = notes[Math.floor(Math.random() * notes.length)];
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 1.7);
      // soft fifth harmony occasionally
      if (Math.random() < 0.35) {
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = n * 1.5;
        g2.gain.setValueAtTime(0.0001, t + 0.05);
        g2.gain.linearRampToValueAtTime(0.05, t + 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc2.connect(g2);
        g2.connect(musicGain);
        osc2.start(t + 0.05);
        osc2.stop(t + 1.3);
      }
      musicTimer = setTimeout(tick, 1000 + Math.random() * 1400);
    }
    tick();
  }

  function stopMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  // audit M-6 fix: pause the music scheduler when the tab is hidden so it
  // doesn't keep playing (and burning CPU) in a background tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (musicEnabled && !muted) startMusic();
  });

  return {
    init, resume, setMuted, setSfx, setMusic, setSeason,
    click, hoe, water, plant, harvest, coins, sleep, talk, success, pet, error,
    footstep, door, startMusic, stopMusic,
  };
})();
