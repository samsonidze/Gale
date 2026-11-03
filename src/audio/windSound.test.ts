import { describe, expect, it } from "vitest";
import { windLevel } from "./windSound";

describe("windLevel", () => {
  it("louder wind = higher level", () => {
    expect(windLevel(0.4, 0.8, 0)).toBeLessThan(windLevel(2.2, 1.4, 0));
    expect(windLevel(2.2, 1.4, 0)).toBeLessThan(windLevel(4.5, 2.5, 0));
  });

  it("gusts push it up", () => {
    expect(windLevel(1, 1, 0.5)).toBeGreaterThan(windLevel(1, 1, 0));
  });

  it("stays in 0..1", () => {
    expect(windLevel(0, 0, 0)).toBe(0);
    expect(windLevel(100, 100, 10)).toBe(1);
  });
});
