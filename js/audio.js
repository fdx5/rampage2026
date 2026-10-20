// Web Audio player for the original Rampage sound board recordings.
// Every file is one original sound code (snd_XX), recorded from the Sounds Good board.
import { SFX_CODES, SFX_WAV } from './data.js';

// Game event -> original sound code(s). Mapping derived from gameplay traces
// (code timing vs. on-screen events); arrays pick one at random.
export const SFX = {
  coin: '6a',
  join: '22',
  cityStart: '68',
  newsMusic: '1b',
  newsSting: '1f',
  punchWhiff: '38',
  punchHit: '3b',
  wallHit: '4f',
  debris: '51',
  hole: '2a',
  eat: '62',
  gulp: '63',
  scream: '37',
  roar: ['60', '61', '63'],
  hurt: '5b',
  gunshot: '3c',
  tankShot: '40',
  explode: '65',
  crush: '37',
  heliLoop: '10',
  engineLoop: '11',
  collapseStart: '4e',
  collapse: '4c',
  collapseEnd: ['29', '2f'],
  transform: '5c',
  humanFlee: '5d',
  zap: '6d',
  bonus: '6c',
  food: '64',
  poison: '5e',
  land: '33',
  cityClear: '1e',
  gameOver: '1d',
};

export const LOOP_CODES = new Set(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '68']);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.loops = new Map();
    this.volume = 0.8;
    this.muted = false;
    this.lastPlay = new Map();
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      for (const code of SFX_CODES) this.load(code);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  load(code) {
    if (this.buffers.has(code)) return Promise.resolve(this.buffers.get(code));
    if (this.loading.has(code)) return this.loading.get(code);
    const ext = SFX_WAV.includes(code) ? 'wav' : 'mp3';
    const p = fetch(`assets/sfx/snd_${code}.${ext}`)
      .then((r) => r.arrayBuffer())
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => { this.buffers.set(code, buf); return buf; })
      .catch(() => null);
    this.loading.set(code, p);
    return p;
  }

  resolve(name) {
    const v = SFX[name] ?? name;
    return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
  }

  // Plays a one-shot. `gap` throttles rapid repeats of the same event.
  play(name, { vol = 1, rate = 1, gap = 0.04 } = {}) {
    if (!this.ctx || this.muted) return null;
    const code = this.resolve(name);
    const now = this.ctx.currentTime;
    if (now - (this.lastPlay.get(code) ?? -1) < gap) return null;
    this.lastPlay.set(code, now);
    const buf = this.buffers.get(code);
    if (!buf) { this.load(code); return null; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
    return src;
  }

  loop(name, vol = 0.7) {
    if (!this.ctx || this.loops.has(name)) return;
    const code = this.resolve(name);
    const buf = this.buffers.get(code);
    if (!buf) { this.load(code); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = this.ctx.createGain(); g.gain.value = this.muted ? 0 : vol;
    src.connect(g).connect(this.master);
    src.start();
    this.loops.set(name, { src, g });
  }

  stop(name) {
    const l = this.loops.get(name);
    if (!l) return;
    const t = this.ctx.currentTime;
    l.g.gain.setTargetAtTime(0, t, 0.08);
    l.src.stop(t + 0.4);
    this.loops.delete(name);
  }

  stopAll() { for (const k of [...this.loops.keys()]) this.stop(k); }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }
}

export const audio = new AudioEngine();
