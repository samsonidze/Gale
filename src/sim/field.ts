import type { Noise3D } from "./noise";

export interface WindSettings {
  direction: number; // degrees, 0 = right
  strength: number;
  turbulence: number;
  scale: number;
}

export interface Gust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number; // 1 -> 0
}

const EPS = 1;

// curl instead of noise-as-angle: no sinks, so particles don't bunch up into lines
export function curl(noise: Noise3D, x: number, y: number, t: number, scale: number): [number, number] {
  const nx = x / scale;
  const ny = y / scale;
  const e = EPS / scale;
  const dPdy = (noise(nx, ny + e, t) - noise(nx, ny - e, t)) / (2 * e);
  const dPdx = (noise(nx + e, ny, t) - noise(nx - e, ny, t)) / (2 * e);
  return [dPdy, -dPdx];
}

export function windAt(
  noise: Noise3D,
  x: number,
  y: number,
  t: number,
  s: WindSettings,
  gusts: readonly Gust[],
): [number, number] {
  const rad = (s.direction * Math.PI) / 180;
  let vx = Math.cos(rad) * s.strength;
  let vy = Math.sin(rad) * s.strength;

  if (s.turbulence > 0) {
    const [cx, cy] = curl(noise, x, y, t, s.scale);
    vx += cx * s.turbulence;
    vy += cy * s.turbulence;
  }

  for (const g of gusts) {
    const dx = x - g.x;
    const dy = y - g.y;
    const d2 = dx * dx + dy * dy;
    const r2 = g.radius * g.radius;
    if (d2 > r2 * 4) continue;
    const k = Math.exp(-d2 / r2) * g.life;
    vx += g.vx * k;
    vy += g.vy * k;
  }

  return [vx, vy];
}

export function decayGusts(gusts: Gust[], dt: number, halfLife = 0.6): Gust[] {
  const f = Math.pow(0.5, dt / halfLife);
  for (const g of gusts) g.life *= f;
  return gusts.filter((g) => g.life > 0.02);
}
