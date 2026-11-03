import { useEffect, useRef } from "react";
import { decayGusts, type Gust } from "../sim/field";
import { createNoise3D } from "../sim/noise";
import { paletteById } from "../sim/palettes";
import { Particles } from "../sim/particles";
import type { Settings } from "../settings";

const MAX_PARTICLES = 8000;
const ALPHA_LEVELS = 3;

interface Props {
  settings: Settings;
  paused: boolean;
  seed: number;
  clearSignal: number; // bump to clear
  onFps?: (fps: number) => void;
}

export function WindCanvas({ settings, paused, seed, clearSignal, onFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  const pausedRef = useRef(paused);
  const noiseRef = useRef(createNoise3D(seed));
  const gustsRef = useRef<Gust[]>([]);
  const clearRef = useRef(false);

  // refs so moving a slider doesn't restart the loop
  settingsRef.current = settings;
  pausedRef.current = paused;

  useEffect(() => {
    noiseRef.current = createNoise3D(seed);
  }, [seed]);

  useEffect(() => {
    clearRef.current = true;
  }, [clearSignal]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = 0;
    let height = 0;

    const particles = new Particles(MAX_PARTICLES, 1, 1);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      particles.resize(width, height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // drag = gust
    let drag: { x: number; y: number; t: number } | null = null;

    function onDown(e: PointerEvent) {
      drag = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      canvas.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!drag) return;
      const now = performance.now();
      const dt = Math.max(16, now - drag.t) / 1000;
      const vx = (e.offsetX - drag.x) / dt / 60;
      const vy = (e.offsetY - drag.y) / dt / 60;
      if (Math.hypot(vx, vy) > 0.5) {
        gustsRef.current.push({
          x: e.offsetX,
          y: e.offsetY,
          vx: clamp(vx, -25, 25),
          vy: clamp(vy, -25, 25),
          radius: 90,
          life: 1,
        });
        if (gustsRef.current.length > 80) gustsRef.current.splice(0, gustsRef.current.length - 80);
      }
      drag = { x: e.offsetX, y: e.offsetY, t: now };
    }
    function onUp() {
      drag = null;
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let frames = 0;
    let fpsSince = last;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const s = settingsRef.current;
      // clamp, otherwise switching tabs and back flings everything
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      frames++;
      if (now - fpsSince > 500) {
        onFps?.(Math.round((frames * 1000) / (now - fpsSince)));
        frames = 0;
        fpsSince = now;
      }

      if (clearRef.current) {
        ctx.clearRect(0, 0, width, height);
        clearRef.current = false;
      }
      if (pausedRef.current) return;

      t += dt * 0.15 * s.timeScale;
      particles.setCount(s.count);
      gustsRef.current = decayGusts(gustsRef.current, dt);
      particles.step(noiseRef.current, t, dt, s, gustsRef.current);

      // trails. destination-out instead of filling with a colour so the photo still shows
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - s.trail})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      draw(ctx, particles, s);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="wind" aria-label="Animated wind. Drag to make a gust." />;
}

function draw(ctx: CanvasRenderingContext2D, p: Particles, s: Settings) {
  const ramp = paletteById(s.palette).ramp;
  const colours = ramp.length;
  const fast = Math.max(1, s.strength + s.turbulence * 2);

  // group by colour+alpha so it's ~12 stroke() calls instead of one per particle
  const buckets: number[][] = Array.from({ length: colours * ALPHA_LEVELS }, () => []);
  for (let i = 0; i < p.count; i++) {
    const op = p.opacity(i);
    if (op <= 0.05) continue;
    const c = Math.min(colours - 1, Math.floor((p.speed[i]! / fast) * colours));
    const a = Math.min(ALPHA_LEVELS - 1, Math.floor(op * ALPHA_LEVELS));
    buckets[c * ALPHA_LEVELS + a]!.push(i);
  }

  ctx.lineWidth = 1.2;
  for (let c = 0; c < colours; c++) {
    for (let a = 0; a < ALPHA_LEVELS; a++) {
      const idx = buckets[c * ALPHA_LEVELS + a]!;
      if (idx.length === 0) continue;
      ctx.strokeStyle = ramp[c]!;
      ctx.globalAlpha = (a + 1) / ALPHA_LEVELS;
      ctx.beginPath();
      for (const i of idx) {
        ctx.moveTo(p.px[i]!, p.py[i]!);
        ctx.lineTo(p.x[i]!, p.y[i]!);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
