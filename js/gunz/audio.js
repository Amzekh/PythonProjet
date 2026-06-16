// audio.js — procedural sound effects via WebAudio (no external files).
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noise = null;
  }
  // must be called from a user gesture
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._noise = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  _makeNoise() {
    const ctx = this.ctx, len = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _now() { return this.ctx.currentTime; }
  _gain(v) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.master); return g; }

  _noiseBurst(dur, vol, freq, q, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this._now();
    const src = this.ctx.createBufferSource(); src.buffer = this._noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this._gain(0);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); src.start(t); src.stop(t + dur + 0.02);
  }
  _tone(freq, dur, vol, type = 'sine', glideTo = null) {
    if (!this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = this._gain(0);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  }

  // ---- gameplay sounds ----
  shot(kind = 'mg') {
    if (!this.ctx) return;
    if (kind === 'shotgun') { this._noiseBurst(0.26, 0.9, 700, 0.7, 'lowpass'); this._tone(120, 0.18, 0.5, 'square', 60); }
    else if (kind === 'revolver') { this._noiseBurst(0.16, 0.8, 1400, 1.2); this._tone(180, 0.12, 0.4, 'square', 70); }
    else if (kind === 'rocket') { this._noiseBurst(0.4, 0.7, 500, 0.5, 'lowpass'); this._tone(90, 0.4, 0.4, 'sawtooth', 50); }
    else { this._noiseBurst(0.09, 0.55, 1800, 1.4); this._tone(240, 0.06, 0.28, 'square', 110); } // mg/smg
  }
  swing() { this._noiseBurst(0.18, 0.5, 2600, 0.8, 'bandpass'); this._tone(900, 0.14, 0.18, 'triangle', 300); }
  swordHit() { this._noiseBurst(0.12, 0.6, 3200, 2.2); this._tone(1400, 0.1, 0.35, 'square', 500); }
  block() { this._tone(2000, 0.16, 0.4, 'square', 900); this._noiseBurst(0.1, 0.4, 4000, 3); }
  hitFlesh() { this._noiseBurst(0.12, 0.5, 500, 0.6, 'lowpass'); this._tone(160, 0.1, 0.3, 'sine', 70); }
  hitWall() { this._noiseBurst(0.08, 0.35, 2200, 1.5); }
  explosion() {
    this._noiseBurst(0.7, 1.0, 320, 0.4, 'lowpass'); this._tone(70, 0.6, 0.6, 'sawtooth', 30);
    this._noiseBurst(0.5, 0.6, 900, 0.6, 'bandpass');
  }
  jump() { this._tone(420, 0.12, 0.22, 'sine', 760); }
  dbljump() { this._tone(620, 0.14, 0.26, 'triangle', 1100); }
  dash() { this._noiseBurst(0.16, 0.4, 1600, 1.1, 'bandpass'); this._tone(700, 0.12, 0.2, 'sawtooth', 1500); }
  wall() { this._noiseBurst(0.2, 0.4, 800, 0.7, 'lowpass'); }
  reload() { this._tone(300, 0.06, 0.2, 'square'); setTimeout(() => this._tone(220, 0.08, 0.22, 'square'), 130); }
  hurt() { this._tone(300, 0.18, 0.32, 'sawtooth', 120); }
  die() { this._tone(400, 0.5, 0.4, 'sawtooth', 60); this._noiseBurst(0.5, 0.4, 400, 0.5, 'lowpass'); }
  frag() { this._tone(700, 0.1, 0.3, 'square', 1100); setTimeout(() => this._tone(1100, 0.12, 0.3, 'square', 1500), 90); }
  ui() { this._tone(660, 0.07, 0.25, 'sine', 880); }
  spawn() { this._tone(300, 0.3, 0.3, 'sine', 700); this._tone(450, 0.3, 0.2, 'triangle', 900); }
}
