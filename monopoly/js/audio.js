/* Amber's Boardwalk — tiny WebAudio synth (no asset files).
 * Exposes window.MPAudio.play(name). Safe when audio is unavailable.
 */
(function (global) {
  'use strict';

  var ctx = null;
  var enabled = true;

  function ensure() {
    try {
      if (!ctx && global.AudioContext) ctx = new global.AudioContext();
      if (ctx && ctx.state === 'suspended' && global.AmberHardening) {
        global.AmberHardening.safeResume(ctx);
      }
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, opts) {
    opts = opts || {};
    var c = ensure(); if (!c) return;
    try {
      var t0 = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(opts.vol || 0.12, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  function noiseBurst(dur, vol, delay) {
    var c = ensure(); if (!c) return;
    try {
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource();
      src.buffer = buf;
      var g = c.createGain();
      var t0 = c.currentTime + (delay || 0);
      g.gain.setValueAtTime(vol || 0.08, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(g).connect(c.destination);
      src.start(t0);
    } catch (e) {}
  }

  var SFX = {
    dice:   function () { for (var i = 0; i < 4; i++) noiseBurst(0.05, 0.09, i * 0.09); },
    hop:    function () { tone(520, 0.06, { vol: 0.05, type: 'triangle' }); },
    coin:   function () { tone(880, 0.09, { vol: 0.11 }); tone(1318, 0.14, { vol: 0.11, delay: 0.07 }); },
    buy:    function () { tone(660, 0.08); tone(990, 0.12, { delay: 0.08 }); },
    sad:    function () { tone(300, 0.32, { type: 'sawtooth', slideTo: 150, vol: 0.09 }); },
    star:   function () { tone(1046, 0.09); tone(1568, 0.16, { delay: 0.08 }); },
    card:   function () { tone(740, 0.07, { type: 'triangle' }); tone(554, 0.1, { delay: 0.09, type: 'triangle' }); },
    thud:   function () { tone(180, 0.18, { type: 'square', vol: 0.07, slideTo: 90 }); },
    fanfare:function () {
      var seq = [523, 659, 784, 1046];
      for (var i = 0; i < seq.length; i++) tone(seq[i], 0.16, { delay: i * 0.13, vol: 0.13 });
    },
    click:  function () { tone(400, 0.04, { type: 'triangle', vol: 0.06 }); }
  };

  var MPAudio = {
    play: function (name) {
      if (!enabled) return;
      var fn = SFX[name];
      if (fn) { try { fn(); } catch (e) {} }
    },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; }
  };

  if (global.AmberHardening && global.AmberHardening.installAudioGestureUnlock) {
    global.AmberHardening.installAudioGestureUnlock();
  }

  global.MPAudio = MPAudio;
})(typeof window !== 'undefined' ? window : globalThis);
