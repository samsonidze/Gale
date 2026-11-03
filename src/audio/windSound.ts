// wind sound made from filtered noise, no audio files.
// two layers: a low rumble and a band-passed "whistle". the louder the wind
// the higher the whistle goes, which is what makes it sound like wind and not static.

export function windLevel(strength: number, turbulence: number, gustPower: number): number {
  const base = (strength + turbulence * 0.5) / 7;
  return Math.max(0, Math.min(1, base * 0.7 + gustPower));
}

export class WindSound {
  private ctx: AudioContext;
  private master: GainNode;
  private rumbleGain: GainNode;
  private whistle: BiquadFilterNode;
  private whistleGain: GainNode;
  private started = false;

  constructor() {
    this.ctx = new AudioContext();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    const noise = this.ctx.createBufferSource();
    noise.buffer = brownNoise(this.ctx, 5);
    noise.loop = true;
    noise.loopEnd = noise.buffer.duration - FADE; // see brownNoise

    // low rumble
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 350;
    this.rumbleGain = this.ctx.createGain();
    noise.connect(low).connect(this.rumbleGain).connect(this.master);

    // whistle
    this.whistle = this.ctx.createBiquadFilter();
    this.whistle.type = "bandpass";
    this.whistle.Q.value = 6;
    this.whistle.frequency.value = 500;
    this.whistleGain = this.ctx.createGain();
    this.whistleGain.gain.value = 0;
    noise.connect(this.whistle).connect(this.whistleGain).connect(this.master);

    // slow wobble on the whistle pitch so steady wind still sounds alive
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.value = 120;
    lfo.connect(lfoDepth).connect(this.whistle.frequency);

    noise.start();
    lfo.start();
  }

  // has to be called from a click/keypress, browsers block audio otherwise
  async start() {
    await this.ctx.resume();
    this.started = true;
  }

  async stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.started = false;
    setTimeout(() => {
      if (!this.started) this.ctx.suspend();
    }, 800);
  }

  get playing() {
    return this.started;
  }

  // level 0..1, called a few times a second from the animation loop
  setLevel(level: number) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const l = Math.max(0, Math.min(1, level));
    this.master.gain.setTargetAtTime(0.15 + l * 0.6, now, 0.25);
    this.rumbleGain.gain.setTargetAtTime(0.6 + l * 0.6, now, 0.3);
    this.whistleGain.gain.setTargetAtTime(l * l * 1.4, now, 0.2);
    this.whistle.frequency.setTargetAtTime(380 + l * 1100, now, 0.3);
  }

  // when the animation is paused
  quiet() {
    if (this.started) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }
}

const FADE = 0.05;

// brown noise is deeper than white noise, closer to real wind
function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  // blend the start into the tail and loop before the tail, so the loop point doesn't click
  const fade = Math.floor(ctx.sampleRate * FADE);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    data[i] = data[i]! * k + data[len - fade + i]! * (1 - k);
  }
  return buf;
}
