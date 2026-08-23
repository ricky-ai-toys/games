/* Minimal WebAudio beeps + soft hum */

const OfficeAudio = (() => {
  let ctx = null;
  let enabled = true;
  let humNode = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(on) {
    enabled = on;
    if (!on) stopHum();
    else if (ctx) startHum();
  }

  function isEnabled() {
    return enabled;
  }

  function beep(freq, dur, type, gain) {
    if (!enabled || !ctx) return;
    resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  function click() {
    beep(680, 0.05, 'square', 0.03);
  }

  function talk() {
    beep(420 + Math.random() * 80, 0.06, 'triangle', 0.025);
  }

  function bubble() {
    beep(520 + Math.random() * 40, 0.04, 'sine', 0.018);
  }

  function success() {
    beep(520, 0.06, 'square', 0.03);
    setTimeout(() => beep(720, 0.08, 'square', 0.03), 60);
  }

  function coffee() {
    beep(180, 0.1, 'sine', 0.04);
    setTimeout(() => beep(240, 0.12, 'sine', 0.03), 80);
  }

  function startHum() {
    if (!enabled || !ctx || humNode) return;
    resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 90;
    g.gain.value = 0.008;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    humNode = { o, g };
  }

  function stopHum() {
    if (!humNode) return;
    try {
      humNode.o.stop();
    } catch (e) {}
    humNode = null;
  }

  return {
    init,
    resume,
    setEnabled,
    isEnabled,
    click,
    talk,
    bubble,
    success,
    coffee,
    startHum,
    stopHum,
  };
})();
