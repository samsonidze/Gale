import { describe, expect, it } from "vitest";
import { createNoise3D } from "./noise";
import { curl, decayGusts, windAt, type Gust, type WindSettings } from "./field";

const calm: WindSettings = { direction: 0, strength: 0, turbulence: 0, scale: 300 };

describe("curl", () => {
  it("has zero divergence", () => {
    const noise = createNoise3D(11);
    const h = 1; // has to match EPS in field.ts
    let worst = 0;
    for (let i = 0; i < 50; i++) {
      const x = 37 + i * 23;
      const y = 91 + i * 17;
      const [ax] = curl(noise, x + h, y, 0.4, 300);
      const [bx] = curl(noise, x - h, y, 0.4, 300);
      const [, ay] = curl(noise, x, y + h, 0.4, 300);
      const [, by] = curl(noise, x, y - h, 0.4, 300);
      const div = (ax - bx) / (2 * h) + (ay - by) / (2 * h);
      worst = Math.max(worst, Math.abs(div));
    }
    expect(worst).toBeLessThan(1e-3);
  });
});

describe("windAt", () => {
  const noise = createNoise3D(1);

  it("follows direction with no turbulence", () => {
    const [vx, vy] = windAt(noise, 10, 10, 0, { ...calm, strength: 2, direction: 90 }, []);
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(2);
  });

  it("gust is strongest at the centre", () => {
    const gust: Gust = { x: 100, y: 100, vx: 5, vy: 0, radius: 50, life: 1 };
    expect(windAt(noise, 100, 100, 0, calm, [gust])[0]).toBeCloseTo(5);
    expect(windAt(noise, 300, 100, 0, calm, [gust])[0]).toBe(0);
    const mid = windAt(noise, 150, 100, 0, calm, [gust])[0];
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(5);
  });
});

describe("decayGusts", () => {
  it("decays and drops dead gusts", () => {
    const gusts: Gust[] = [{ x: 0, y: 0, vx: 1, vy: 0, radius: 10, life: 1 }];
    const after = decayGusts(gusts, 0.6, 0.6);
    expect(after[0]!.life).toBeCloseTo(0.5);
    expect(decayGusts(after, 10, 0.6)).toHaveLength(0);
  });
});
