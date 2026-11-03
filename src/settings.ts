import type { WindSettings } from "./sim/field";

export interface Settings extends WindSettings {
  count: number;
  trail: number;
  timeScale: number;
  palette: string;
}

export const DEFAULTS: Settings = {
  count: 3000,
  direction: 0,
  strength: 2.2,
  turbulence: 1.4,
  scale: 420,
  trail: 0.9,
  timeScale: 1,
  palette: "frost",
};

export const PRESETS: { name: string; settings: Partial<Settings> }[] = [
  { name: "Breeze", settings: { strength: 2.2, turbulence: 1.4, scale: 420, trail: 0.9, timeScale: 1 } },
  { name: "Gale", settings: { strength: 4.5, turbulence: 2.5, scale: 520, trail: 0.85, timeScale: 2 } },
  { name: "Eddies", settings: { strength: 0.2, turbulence: 3.5, scale: 220, trail: 0.95, timeScale: 0.6 } },
  { name: "Calm", settings: { strength: 0.4, turbulence: 0.8, scale: 700, trail: 0.97, timeScale: 0.3 } },
];

// settings go in the url hash so you can share a link
const KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];

export function readHash(hash: string): Partial<Settings> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const out: Partial<Settings> = {};
  for (const key of KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;
    if (key === "palette") {
      out.palette = raw;
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) (out as Record<string, number>)[key] = n;
    }
  }
  return out;
}

export function writeHash(s: Settings): string {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    if (s[key] !== DEFAULTS[key]) params.set(key, String(s[key]));
  }
  const str = params.toString();
  return str ? `#${str}` : "";
}
