/* ========================================
   Amber's Big Two — Soft Web Audio SFX
   Named Sfx (not Audio) so we never shadow the browser Audio constructor.
   ======================================== */

const Sfx = {
  ctx: null,
  enabled: true,
  musicEnabled: false,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(function(){});
    }
  },

  setEnabled(on) {
    this.enabled = !!on;
  },

  _beep(freq, dur, type = 'sine', gain = 0.08, slide = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  playClick() {
    this._beep(520, 0.06, 'triangle', 0.05);
  },

  playDeal() {
    this._beep(320, 0.05, 'square', 0.03);
    setTimeout(() => this._beep(400, 0.05, 'square', 0.03), 40);
  },

  /** Human or buddy card hit */
  playCard() {
    this._beep(660, 0.08, 'triangle', 0.07, 40);
  },

  /** Buddy play — slightly lower / woodier */
  playBuddyPlay() {
    this._beep(520, 0.09, 'triangle', 0.07, 30);
    setTimeout(() => this._beep(640, 0.06, 'sine', 0.04), 50);
  },

  playPass() {
    this._beep(280, 0.1, 'sine', 0.04, -40);
  },

  /** Your turn chime */
  playYourTurn() {
    this._beep(587, 0.08, 'sine', 0.06);
    setTimeout(() => this._beep(784, 0.12, 'sine', 0.07), 70);
  },

  /** Trick cleared — soft whoosh up */
  playTrickClear() {
    this._beep(300, 0.08, 'sine', 0.04, 80);
    setTimeout(() => this._beep(450, 0.1, 'triangle', 0.05, 60), 60);
  },

  playWin() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      setTimeout(() => this._beep(f, 0.18, 'sine', 0.07), i * 90);
    });
  },

  playLose() {
    this._beep(400, 0.15, 'sine', 0.05, -80);
    setTimeout(() => this._beep(300, 0.2, 'sine', 0.05, -60), 120);
  },

  playError() {
    this._beep(180, 0.12, 'sawtooth', 0.03);
  },

  playHint() {
    this._beep(880, 0.07, 'sine', 0.05);
    setTimeout(() => this._beep(1100, 0.08, 'sine', 0.04), 70);
  },
};
