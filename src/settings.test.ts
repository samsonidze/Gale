import { describe, expect, it } from "vitest";
import { DEFAULTS, readHash, writeHash } from "./settings";

describe("hash", () => {
  it("round trip", () => {
    const s = { ...DEFAULTS, strength: 4.5, palette: "ember" };
    const hash = writeHash(s);
    expect(hash).toBe("#strength=4.5&palette=ember");
    expect({ ...DEFAULTS, ...readHash(hash) }).toEqual(s);
  });

  it("defaults -> empty, junk ignored", () => {
    expect(writeHash(DEFAULTS)).toBe("");
    expect(readHash("#strength=abc&nope=1&count=500")).toEqual({ count: 500 });
  });
});
