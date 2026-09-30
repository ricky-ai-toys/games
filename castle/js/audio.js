/* Amber's Candy Castle — tiny WebAudio synth. No asset files.
 * Exposes window.CCAudio. Safe when audio is unavailable, muted, or blocked.
 * The context is created lazily on the first user gesture, never before.
 */
(function (global) {
  'use strict';

  var H = global.AmberHardening;
  var Save = global.CCSave;
  var ctx = null;
  var master = null;
  var unlocked = false;

  function muted() { return Save ? Save.isMuted() : false; }

  function ensure() {
    if (muted()) return null;
    try {
      if (!ctx && global.AudioContext) {
        ctx = new global.AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.2;
        master.connect(ctx.destination);
      }
      if (ctx && ctx.state === 'suspended') {
        if (H && H.safeResume) H.safeResume(ctx);
        else if (ctx.resume) ctx.resume().catch(function () {});
      }
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, o) {
    o = o || {};
    var c = ensure();
    if (!c) return;
    try {
      var t0 = c.currentTime + (o.delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);
      var vol = (o.vol == null ? 1 : o.vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3 * vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* audio must never break the game */ }
  }

  function noise(dur, vol, delay) {
    var c = ensure();
    if (!c) return;
    try {
      var t0 = c.currentTime + (delay || 0);
      var frames = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, frames, c.sampleRate);
      var ch = buf.getChannelData(0);
      for (var i = 0; i < frames; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      var src = c.createBufferSource();
      var g = c.createGain();
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1200;
      g.gain.value = (vol == null ? 0.4 : vol);
      src.buffer = buf;
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(t0);
    } catch (e) { /* ignore */ }
  }

  var CUES = {
    place:  function () { tone(660, 0.05, { type: 'square', vol: 0.5 }); },
    wall:   function () { tone(300, 0.06, { slideTo: 210, type: 'triangle' }); },
    tower:  function () { tone(420, 0.07, { slideTo: 700, type: 'triangle' }); },
    deny:   function () { tone(200, 0.14, { slideTo: 120, type: 'square', vol: 0.6 }); },
    sell:   function () { tone(500, 0.08, { slideTo: 800, type: 'sine' }); },
    upgrade:function () {
      tone(523, 0.08, { type: 'triangle' });
      tone(784, 0.12, { type: 'triangle', delay: 0.06 });
    },
    fire:   function () { tone(900, 0.03, { type: 'square', vol: 0.18 }); },
    boom:   function () { tone(120, 0.16, { slideTo: 50, type: 'sawtooth', vol: 0.7 }); noise(0.14, 0.35); },
    chain:  function () { tone(1200, 0.05, { slideTo: 600, type: 'sawtooth', vol: 0.35 }); },
    frost:  function () { tone(1500, 0.09, { slideTo: 2200, type: 'sine', vol: 0.3 }); },
    kill:   function () { tone(700, 0.05, { slideTo: 1000, type: 'sine', vol: 0.4 }); },
    leak:   function () { tone(240, 0.2, { slideTo: 80, type: 'square' }); noise(0.18, 0.4); },
    wave:   function () {
      tone(392, 0.12, { type: 'triangle' });
      tone(523, 0.16, { type: 'triangle', delay: 0.1 });
    },
    clear:  function () {
      tone(523, 0.1, { type: 'triangle' });
      tone(659, 0.1, { type: 'triangle', delay: 0.08 });
      tone(784, 0.2, { type: 'triangle', delay: 0.16 });
    },
    win:    function () {
      tone(523, 0.14, { type: 'triangle' });
      tone(659, 0.14, { type: 'triangle', delay: 0.12 });
      tone(784, 0.14, { type: 'triangle', delay: 0.24 });
      tone(1047, 0.4, { type: 'triangle', delay: 0.36 });
    },
    lose:   function () {
      tone(392, 0.18, { type: 'sine' });
      tone(311, 0.18, { type: 'sine', delay: 0.16 });
      tone(233, 0.45, { type: 'sine', delay: 0.32 });
    },
    click:  function () { tone(440, 0.05, { type: 'square', vol: 0.5 }); }
  };

  function play(name) {
    var fn = CUES[name];
    if (fn) { try { fn(); } catch (e) { /* ignore */ } }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensure();
    if (H && H.installAudioGestureUnlock) H.installAudioGestureUnlock();
  }

  function setMuted(v) { if (Save) Save.setMuted(v); }

  function toggleMute() {
    var m = !muted();
    setMuted(m);
    return m;
  }

  global.CCAudio = {
    play: play,
    tone: tone,
    noise: noise,
    unlock: unlock,
    isMuted: muted,
    setMuted: setMuted,
    toggleMute: toggleMute
  };
})(typeof window !== 'undefined' ? window : globalThis);
