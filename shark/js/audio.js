/* Amber's Shark Hunt — tiny WebAudio synth. No asset files.
 * Exposes window.SHAudio. Safe when audio is unavailable, muted, or blocked.
 * The context is created lazily on the first user gesture, never before.
 */
(function (global) {
  'use strict';

  var H = global.AmberHardening;
  var ctx = null;
  var master = null;
  var muted = false;
  var mutedLoaded = false;
  var unlocked = false;

  var MUTE_KEY = 'shark_muted';

  function loadMute() {
    if (mutedLoaded) return muted;
    mutedLoaded = true;
    try {
      if (H && H.getInt) muted = !!H.getInt(MUTE_KEY, 0);
      else muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) { muted = false; }
    return muted;
  }

  function saveMute(v) {
    if (H && H.setInt) { H.setInt(MUTE_KEY, v ? 1 : 0); return; }
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ }
  }

  function ensure() {
    if (muted) return null;
    try {
      if (!ctx && global.AudioContext) {
        ctx = new global.AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
      }
      if (ctx && ctx.state === 'suspended') {
        if (H && H.safeResume) H.safeResume(ctx);
        else if (ctx.resume) ctx.resume().catch(function () {});
      }
    } catch (e) { ctx = null; }
    return ctx;
  }

  /* One oscillator, one gain envelope. slideTo sweeps the pitch. */
  function tone(freq, dur, o) {
    o = o || {};
    var c = ensure();
    if (!c || muted) return;
    try {
      var t0 = c.currentTime + (o.delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);
      }
      var vol = (o.vol == null ? 1 : o.vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3 * vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* never let audio break the game */ }
  }

  function noise(dur, vol, delay) {
    var c = ensure();
    if (!c || muted) return;
    try {
      var t0 = c.currentTime + (delay || 0);
      var frames = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, frames, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < frames; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      }
      var src = c.createBufferSource();
      var g = c.createGain();
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1400;
      g.gain.value = (vol == null ? 0.5 : vol);
      src.buffer = buf;
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(t0);
    } catch (e) { /* ignore */ }
  }

  /* Cue palette. `drift` and `slow` are pitch-shifted variants rather than new
   * cues, so the whole set stays small. */
  var CUES = {
    eat:     function () { tone(520, 0.07, { slideTo: 380, type: 'triangle' }); },
    big:     function () { tone(300, 0.11, { slideTo: 180, type: 'triangle', vol: 1.2 }); },
    chomp:   function () { tone(320, 0.16, { slideTo: 70, type: 'square' }); noise(0.14, 0.4); },
    dash:    function () { tone(180, 0.2, { slideTo: 1100, type: 'sawtooth' }); },
    bite:    function () { tone(660, 0.06, { type: 'square', vol: 0.5 }); },
    bad:     function () { tone(180, 0.22, { slideTo: 45, type: 'square' }); noise(0.2, 0.5); },
    grow:    function () {
      tone(523, 0.1, { type: 'triangle' });
      tone(784, 0.1, { type: 'triangle', delay: 0.06 });
      tone(1046, 0.14, { type: 'triangle', delay: 0.12 });
    },
    combo:   function () {
      tone(660, 0.07, { type: 'square', vol: 0.7 });
      tone(880, 0.07, { type: 'square', vol: 0.7, delay: 0.05 });
      tone(1100, 0.1, { type: 'square', vol: 0.7, delay: 0.1 });
    },
    near:    function () { tone(880, 0.08, { slideTo: 1320, type: 'sine' }); },
    relic:   function () {
      tone(784, 0.1, { type: 'sine' });
      tone(1175, 0.16, { type: 'sine', delay: 0.07 });
    },
    /* The growl is the player's cue to dash, so it has to cut through. */
    growl:   function () {
      tone(90, 0.5, { slideTo: 55, type: 'sawtooth', vol: 1.3 });
      noise(0.45, 0.6);
    },
    lunge:   function () { tone(140, 0.28, { slideTo: 900, type: 'sawtooth', vol: 1.2 }); noise(0.25, 0.5); },
    tail:    function () {
      tone(392, 0.09, { type: 'square' });
      tone(587, 0.09, { type: 'square', delay: 0.05 });
      tone(880, 0.18, { type: 'square', delay: 0.1 });
      noise(0.16, 0.45);
    },
    drift:   function () { tone(700, 0.5, { slideTo: 300, type: 'sine' }); },
    win:     function () {
      tone(523, 0.14, { type: 'triangle' });
      tone(659, 0.14, { type: 'triangle', delay: 0.09 });
      tone(784, 0.14, { type: 'triangle', delay: 0.18 });
      tone(1047, 0.34, { type: 'triangle', delay: 0.27 });
    },
    lose:    function () {
      tone(392, 0.18, { type: 'sine' });
      tone(311, 0.18, { type: 'sine', delay: 0.14 });
      tone(233, 0.4, { type: 'sine', delay: 0.28 });
    },
    click:   function () { tone(440, 0.05, { type: 'square', vol: 0.5 }); }
  };

  function play(name) {
    var fn = CUES[name];
    if (fn && !muted) { try { fn(); } catch (e) { /* ignore */ } }
  }

  function isMuted() { loadMute(); return muted; }

  function setMuted(v) {
    muted = !!v;
    mutedLoaded = true;
    saveMute(muted);
    if (muted && ctx) {
      try { if (ctx.state === 'suspended') { if (H && H.safeResume) H.safeResume(ctx); } } catch (e) { /* ignore */ }
    }
  }

  function toggleMute() { setMuted(!isMuted()); return isMuted(); }

  /* Called from the first real user gesture so the context is never created
   * before one — required by the repo's audio hardening gate. */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensure();
    if (H && H.installAudioGestureUnlock) H.installAudioGestureUnlock();
  }

  var SHAudio = {
    play: play,
    tone: tone,
    noise: noise,
    unlock: unlock,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMute: toggleMute,
    CUES: Object.keys(CUES)
  };

  global.SHAudio = SHAudio;
})(typeof window !== 'undefined' ? window : globalThis);
