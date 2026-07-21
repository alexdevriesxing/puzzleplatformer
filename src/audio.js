const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const storage = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const SONGS = {
  march:   { bpm:116, scale:[60,62,64,67,69], bass:[36,36,43,41], wave:'square' },
  grove:   { bpm:104, scale:[57,60,62,64,67], bass:[33,40,36,38], wave:'triangle' },
  crystal: { bpm:96,  scale:[62,64,67,69,71], bass:[38,45,43,40], wave:'sine' },
  forge:   { bpm:128, scale:[55,58,60,62,65], bass:[31,31,34,29], wave:'sawtooth' },
  voltage: { bpm:132, scale:[60,63,65,67,70], bass:[36,39,34,41], wave:'square' },
  mystery: { bpm:88,  scale:[57,59,60,64,65], bass:[33,40,38,35], wave:'triangle' },
  orbit:   { bpm:82,  scale:[62,65,67,69,72], bass:[38,33,36,31], wave:'sine' },
  tide:    { bpm:100, scale:[55,59,60,62,67], bass:[31,38,36,35], wave:'triangle' },
  siege:   { bpm:124, scale:[53,55,56,60,61], bass:[29,29,32,27], wave:'sawtooth' },
  finale:  { bpm:136, scale:[60,62,64,67,71,72], bass:[36,43,41,45], wave:'square' },
};

export class AudioDirector {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.enabled = storage.get('pip.audio', true);
    this.song = 'march';
    this.step = 0;
    this.nextBeat = 0;
    this.timer = null;
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? .72 : 0;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 16;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = .006;
      this.compressor.release.value = .18;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = .29;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = .72;
      this.sfx.connect(this.master);
      this.noiseBuffer = this.createNoiseBuffer();
      this.nextBeat = this.ctx.currentTime + .08;
      this.timer = setInterval(() => this.schedule(), 80);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }


  createNoiseBuffer() {
    if (!this.ctx) return null;
    const length = Math.ceil(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i=0; i<length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * .985 + white * .15;
      data[i] = white * .7 + last * .3;
    }
    return buffer;
  }

  setEnabled(value) {
    this.enabled = value;
    storage.set('pip.audio', value);
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(value ? .72 : 0, this.ctx.currentTime, .03);
  }

  toggle() { this.setEnabled(!this.enabled); return this.enabled; }

  setSong(name) {
    if (!SONGS[name] || name === this.song) return;
    this.song = name;
    this.step = 0;
  }

  schedule() {
    if (!this.ctx || !this.enabled) return;
    const song = SONGS[this.song];
    const beat = 60 / song.bpm / 2;
    while (this.nextBeat < this.ctx.currentTime + .35) {
      const s = this.step++;
      const barStep = s % 16;
      if (barStep % 4 === 0) this.tone(NOTE(song.bass[Math.floor(barStep / 4)]), this.nextBeat, beat * 3.7, 'triangle', .07, this.music, 900);
      if (barStep % 2 === 0) {
        const melodicIndex = (s * 3 + Math.floor(s / 8)) % song.scale.length;
        const octave = (s % 16 === 14) ? 12 : 0;
        this.tone(NOTE(song.scale[melodicIndex] + octave), this.nextBeat, beat * .78, song.wave, .035, this.music, 1800);
      }
      if (barStep === 7 || barStep === 15) this.tone(NOTE(song.scale[(s + 2) % song.scale.length] + 12), this.nextBeat, beat * 1.8, 'sine', .027, this.music, 2400);
      if (barStep % 4 === 0) this.kick(this.nextBeat, .045);
      if (barStep % 4 === 2) this.hat(this.nextBeat, .016);
      if (barStep % 2 === 1 && ['voltage','forge','siege','finale'].includes(this.song)) this.hat(this.nextBeat, .009);
      this.nextBeat += beat;
    }
  }

  tone(freq, when, duration, type='sine', volume=.1, destination=this.sfx, filterFreq=2200) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, when);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    osc.connect(filter); filter.connect(gain); gain.connect(destination);
    osc.start(when); osc.stop(when + duration + .03);
  }

  noise(when, duration, volume=.1, destination=this.sfx, highpass=700) {
    if (!this.ctx) return;
    if (!this.noiseBuffer) this.noiseBuffer = this.createNoiseBuffer();
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = highpass;
    gain.gain.setValueAtTime(Math.max(.0002, volume), when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    src.buffer = this.noiseBuffer; src.connect(filter); filter.connect(gain); gain.connect(destination);
    const maxOffset = Math.max(0, this.noiseBuffer.duration - duration - .02);
    src.start(when, Math.random() * maxOffset, Math.min(duration + .02, this.noiseBuffer.duration));
  }

  kick(when, volume=.06) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, when);
    osc.frequency.exponentialRampToValueAtTime(46, when + .12);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .14);
    osc.connect(gain); gain.connect(this.music); osc.start(when); osc.stop(when + .15);
  }

  hat(when, volume=.02) { this.noise(when, .035, volume, this.music, 4500); }

  play(name) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + .006;
    switch (name) {
      case 'move': this.tone(230, t, .055, 'triangle', .035); break;
      case 'bump': this.tone(118, t, .09, 'square', .045, this.sfx, 500); break;
      case 'push': this.tone(150, t, .11, 'sawtooth', .05, this.sfx, 700); this.noise(t, .07, .025); break;
      case 'crack': this.noise(t, .12, .04, this.sfx, 1800); this.tone(310, t, .08, 'triangle', .025, this.sfx, 1200); break;
      case 'shard': [0,4,7,12].forEach((n,i)=>this.tone(NOTE(72+n), t+i*.045, .18, 'sine', .08)); break;
      case 'key': [0,7].forEach((n,i)=>this.tone(NOTE(67+n), t+i*.07, .2, 'triangle', .07)); break;
      case 'door': this.tone(90, t, .22, 'sawtooth', .08, this.sfx, 450); this.noise(t, .14, .03); break;
      case 'plate': this.tone(196, t, .1, 'square', .055); this.tone(294, t+.07, .14, 'triangle', .045); break;
      case 'teleport': for (let i=0;i<7;i++) this.tone(260+i*80, t+i*.018, .11, 'sine', .035); break;
      case 'undo': this.tone(420, t, .17, 'sine', .04); this.tone(250, t+.05, .18, 'triangle', .04); break;
      case 'hit': this.noise(t, .22, .13, this.sfx, 300); this.tone(72, t, .28, 'sawtooth', .12, this.sfx, 350); break;
      case 'victory': [0,4,7,12,16].forEach((n,i)=>this.tone(NOTE(60+n), t+i*.085, .4, i%2?'triangle':'square', .09)); break;
      case 'defeat': [0,-2,-5,-12].forEach((n,i)=>this.tone(NOTE(52+n), t+i*.12, .35, 'sawtooth', .075, this.sfx, 700)); break;
      case 'ui': this.tone(520, t, .07, 'sine', .045); break;
      case 'start': [0,7,12].forEach((n,i)=>this.tone(NOTE(60+n), t+i*.065, .28, 'square', .07)); break;
      case 'secret': [0,3,7,10,15].forEach((n,i)=>this.tone(NOTE(72+n),t+i*.055,.32,i%2?'triangle':'sine',.07)); this.noise(t+.08,.16,.018,this.sfx,4200); break;
      case 'laser': this.tone(880, t, .12, 'sawtooth', .065, this.sfx, 1700); this.tone(220, t, .16, 'square', .04); break;
    }
  }
}
