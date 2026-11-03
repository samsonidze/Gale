export interface Palette {
  id: string;
  name: string;
  ramp: string[]; // slow -> fast
  background: [string, string];
}

export const PALETTES: Palette[] = [
  {
    id: "frost",
    name: "Frost",
    ramp: ["#4c6a8a", "#7fa6c9", "#b9d6ee", "#f2f8ff"],
    background: ["#0d1520", "#05080d"],
  },
  {
    id: "ember",
    name: "Ember",
    ramp: ["#6b2d1a", "#b4532a", "#f0964a", "#ffe0a8"],
    background: ["#170d0a", "#070404"],
  },
  {
    id: "aurora",
    name: "Aurora",
    ramp: ["#1b5e57", "#2fa38a", "#7fe0b5", "#e2fff0"],
    background: ["#06141a", "#020709"],
  },
  {
    id: "ink",
    name: "Ink",
    ramp: ["#9aa3ad", "#5d6772", "#2c333b", "#0b0e12"],
    background: ["#f4f1ea", "#e4dfd4"],
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}
