import type { Noise3D } from "./noise";
import { windAt, type Gust, type WindSettings } from "./field";

// typed arrays instead of objects. the object version was dropping frames (GC)
export class Particles {
  count = 0;
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  speed: Float32Array;
  age: Float32Array;
  maxAge: Float32Array;

  constructor(
    capacity: number,
    public width: number,
    public height: number,
    private random: () => number = Math.random,
  ) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.px = new Float32Array(capacity);
    this.py = new Float32Array(capacity);
    this.speed = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.maxAge = new Float32Array(capacity);
  }

  get capacity() {
    return this.x.length;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setCount(n: number) {
    const target = Math.max(0, Math.min(this.capacity, Math.floor(n)));
    for (let i = this.count; i < target; i++) {
      this.spawn(i);
      this.age[i] = this.random() * this.maxAge[i]!; // otherwise they all die at once
    }
    this.count = target;
  }

  spawn(i: number) {
    const x = this.random() * this.width;
    const y = this.random() * this.height;
    this.x[i] = this.px[i] = x;
    this.y[i] = this.py[i] = y;
    this.speed[i] = 0;
    this.age[i] = 0;
    this.maxAge[i] = 2 + this.random() * 4;
  }

  step(noise: Noise3D, t: number, dt: number, settings: WindSettings, gusts: readonly Gust[]) {
    const frames = dt * 60;
    const margin = 20;
    for (let i = 0; i < this.count; i++) {
      const x = this.x[i]!;
      const y = this.y[i]!;
      const [vx, vy] = windAt(noise, x, y, t, settings, gusts);

      this.px[i] = x;
      this.py[i] = y;
      this.x[i] = x + vx * frames;
      this.y[i] = y + vy * frames;
      this.speed[i] = Math.hypot(vx, vy);
      this.age[i] = this.age[i]! + dt;

      const nx = this.x[i]!;
      const ny = this.y[i]!;
      const off = nx < -margin || ny < -margin || nx > this.width + margin || ny > this.height + margin;
      if (off || this.age[i]! > this.maxAge[i]!) this.spawn(i);
    }
  }

  // fade in/out so they don't pop
  opacity(i: number): number {
    const a = this.age[i]!;
    const m = this.maxAge[i]!;
    const fade = 0.4;
    return Math.min(1, a / fade, (m - a) / fade);
  }
}
