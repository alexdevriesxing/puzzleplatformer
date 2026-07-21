const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class AudioDirector {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfxBus = null;
    this.enabled = true;
    this.musicVolume = 0.72;
    this.sfxVolume = 0.9;
    this.timer = null;
    this.world = null;
    this.step = 0;
    this.danger = 0;
  }

  async unlock() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      this.music.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.applyMix(true);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.world && !this.timer) this.startMusic(this.world);
  }

  applyMix(immediate = false) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const set = (gainNode, value) => {
      if (immediate) gainNode.gain.setValueAtTime(value, now);
      else gainNode.gain.setTargetAtTime(value, now, 0.035);
    };
    set(this.master, this.enabled ? 0.48 : 0);
    set(this.music, 0.18 * this.musicVolume);
    set(this.sfxBus, 0.5 * this.sfxVolume);
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.applyMix();
    if (!this.enabled) this.stopMusic();
    else if (this.world && this.ctx) this.startMusic(this.world);
  }

  setMix(musicVolume, sfxVolume) {
    this.musicVolume = Math.max(0, Math.min(1, Number(musicVolume) || 0));
    this.sfxVolume = Math.max(0, Math.min(1, Number(sfxVolume) || 0));
    this.applyMix();
  }

  setDanger(value) {
    this.danger = Math.max(0, Math.min(1, value));
  }

  tone(frequency, duration = 0.1, type = 'sine', gain = 0.08, delay = 0, slide = 0, bus = 'sfx') {
    if (!this.ctx || !this.enabled) return;
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.08);
    oscillator.connect(envelope);
    envelope.connect(bus === 'music' ? this.music : this.sfxBus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.1);
  }

  noise(duration = 0.08, gain = 0.035, frequency = 800) {
    if (!this.ctx || !this.enabled) return;
    const samples = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < samples; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / samples);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const envelope = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    envelope.gain.value = gain;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.sfxBus);
    source.start();
  }

  sfx(name) {
    const bank = {
      move: () => this.tone(165, 0.04, 'triangle', 0.04, 0, 22),
      bump: () => { this.tone(85, 0.07, 'square', 0.06, 0, -18); this.noise(0.05, 0.025, 500); },
      spark: () => [660, 880, 1100].forEach((frequency, index) => this.tone(frequency, 0.12, 'sine', 0.09, index * 0.045, 80)),
      key: () => [523, 784].forEach((frequency, index) => this.tone(frequency, 0.16, 'triangle', 0.09, index * 0.06)),
      unlock: () => [220, 330, 494].forEach((frequency, index) => this.tone(frequency, 0.16, 'sawtooth', 0.055, index * 0.055, 35)),
      push: () => { this.tone(105, 0.09, 'square', 0.07, 0, -18); this.noise(0.08, 0.03, 720); },
      collapse: () => { this.noise(0.16, 0.04, 1050); this.tone(120, 0.12, 'triangle', 0.045, 0, -70); },
      teleport: () => [240, 370, 500, 720].forEach((frequency, index) => this.tone(frequency, 0.12, 'sine', 0.07, index * 0.025, 160)),
      undo: () => [520, 390, 290].forEach((frequency, index) => this.tone(frequency, 0.08, 'triangle', 0.05, index * 0.03)),
      danger: () => { this.tone(76, 0.22, 'sawtooth', 0.12, 0, -20); this.noise(0.18, 0.05, 400); },
      win: () => [60, 64, 67, 72, 76].forEach((note, index) => this.tone(hz(note), 0.24, index < 3 ? 'triangle' : 'sine', 0.1, index * 0.08, 24)),
      click: () => this.tone(420, 0.045, 'square', 0.045, 0, 35),
      page: () => { this.noise(0.14, 0.025, 1800); this.tone(310, 0.08, 'triangle', 0.04); },
    };
    bank[name]?.();
  }

  startMusic(world) {
    this.world = world;
    if (!this.ctx || !this.enabled) return;
    this.stopMusic();
    this.step = 0;
    const beat = 60 / world.music.tempo / 2;
    const tick = () => {
      if (!this.ctx || !this.enabled || !this.world) return;
      const step = this.step++;
      const { root, scale } = this.world.music;
      const degree = scale[(step * 3 + (step >> 2)) % scale.length];
      if (step % 2 === 0) this.tone(hz(root - 12 + (step % 8 === 0 ? 0 : 7)), beat * 0.72, 'triangle', 0.04, 0, 0, 'music');
      if ([0, 3, 6].includes(step % 8)) this.tone(hz(root + degree), beat * 0.55, 'square', 0.022 + 0.018 * this.danger, 0, 0, 'music');
      if (step % 8 === 4) this.tone(hz(root + 12 + scale[(step >> 1) % scale.length]), beat * 1.4, 'sine', 0.024, 0, 0, 'music');
      if (this.danger > 0.55 && step % 2 === 1) this.tone(hz(root - 5), beat * 0.18, 'sawtooth', 0.015, 0, 0, 'music');
    };
    tick();
    this.timer = setInterval(tick, beat * 1000);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
