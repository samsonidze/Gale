import { describe, expect, it } from "vitest";
import { createNoise3D } from "./noise";
import { Particles } from "./particles";
import type { WindSettings } from "./field";

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

const settings: WindSettings = { direction: 0, strength: 3, turbulence: 2, scale: 200 };

describe("Particles", () => {
  it("stays on screen", () => {
    const p = new Particles(2000, 400, 300, seeded(5));
    p.setCount(2000);
    const noise = createNoise3D(2);
    for (let f = 0; f < 300; f++) p.step(noise, f / 60, 1 / 60, settings, []);
    for (let i = 0; i < p.count; i++) {
      expect(p.x[i]).toBeGreaterThanOrEqual(-40);
      expect(p.x[i]).toBeLessThanOrEqual(440);
      expect(p.y[i]).toBeGreaterThanOrEqual(-40);
      expect(p.y[i]).toBeLessThanOrEqual(340);
    }
  });

  it("respects capacity", () => {
    const p = new Particles(100, 10, 10);
    p.setCount(500);
    expect(p.count).toBe(100);
    p.setCount(20);
    expect(p.count).toBe(20);
  });

  it("fades in and out", () => {
    const p = new Particles(1, 10, 10, () => 0.5);
    p.setCount(1);
    p.age[0] = 0;
    expect(p.opacity(0)).toBe(0);
    p.age[0] = p.maxAge[0]! / 2;
    expect(p.opacity(0)).toBe(1);
    p.age[0] = p.maxAge[0]!;
    expect(p.opacity(0)).toBeCloseTo(0);
  });
});
