import { describe, expect, it } from "vitest";
import { createNoise3D } from "./noise";

describe("noise", () => {
  it("same seed same output", () => {
    const a = createNoise3D(42);
    const b = createNoise3D(42);
    const c = createNoise3D(43);
    const pts = [[0.1, 0.2, 0.3], [5.5, -2.1, 9], [100.7, 3.3, 0.01]] as const;
    for (const [x, y, z] of pts) expect(a(x, y, z)).toBe(b(x, y, z));
    expect(pts.some(([x, y, z]) => a(x, y, z) !== c(x, y, z))).toBe(true);
  });

  it("stays in -1..1", () => {
    const n = createNoise3D(7);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 20000; i++) {
      const v = n(i * 0.137, i * 0.071, i * 0.013);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(-1.0001);
    expect(max).toBeLessThanOrEqual(1.0001);
    expect(max - min).toBeGreaterThan(1.2);
  });

  it("is smooth", () => {
    const n = createNoise3D(3);
    for (let i = 0; i < 200; i++) {
      const x = i * 0.31;
      expect(Math.abs(n(x, 1, 2) - n(x + 1e-4, 1, 2))).toBeLessThan(1e-2);
    }
  });
});
