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
  private keepAlive: HTMLAudioElement | null = null;
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

    // iOS suspends the context when you leave the tab or get a call; pick it back up
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.started) {
        this.keepAlive?.play().catch(() => {});
        this.ctx.resume();
      }
    });
  }

  // has to be called from a click/keypress, browsers block audio otherwise.
  // the iphone stuff below must happen before the first await, while we're still
  // inside the click
  async start() {
    playThroughSilentSwitch(true);
    if (!hasAudioSession()) {
      this.keepAlive ??= silentLoop();
      this.keepAlive.play().catch(() => {});
    }
    await this.ctx.resume();
    this.started = true;
  }

  async stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.started = false;
    setTimeout(() => {
      if (this.started) return;
      this.ctx.suspend();
      this.keepAlive?.pause();
      playThroughSilentSwitch(false);
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

// On iPhone, web audio is muted by the silent switch unless the page is in
// "playback" mode, like a video or music player. Newer Safari lets you ask for
// that directly (navigator.audioSession). Older versions switch to it when a real
// <audio> element is playing, so there we loop a tiny silent file.
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

function hasAudioSession() {
  return "audioSession" in navigator;
}

function playThroughSilentSwitch(on: boolean) {
  const nav = navigator as AudioSessionNav;
  if (nav.audioSession) nav.audioSession.type = on ? "playback" : "auto";
}

function silentLoop(): HTMLAudioElement {
  const el = new Audio(silentWav());
  el.loop = true;
  el.setAttribute("playsinline", "");
  el.setAttribute("x-webkit-airplay", "deny"); // otherwise it shows up as something to AirPlay
  el.disableRemotePlayback = true;
  return el;
}

// half a second of silence as a wav data url, so there's no file to ship
function silentWav(): string {
  const rate = 8000;
  const samples = rate / 2;
  const bytes = new Uint8Array(44 + samples * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // pcm
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "data:audio/wav;base64," + btoa(bin);
}

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
