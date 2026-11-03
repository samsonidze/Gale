import { useRef, type ReactNode } from "react";
import { PALETTES } from "../sim/palettes";
import { PRESETS, type Settings } from "../settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  paused: boolean;
  onPause: () => void;
  soundOn: boolean;
  onSound: () => void;
  onReseed: () => void;
  onPhoto: (file: File) => void;
  hasPhoto: boolean;
  onClearPhoto: () => void;
  fps: number | null;
}

export function Controls(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const s = p.settings;

  return (
    <aside className="panel" aria-label="Wind controls">
      <div className="presets" role="group" aria-label="Presets">
        {PRESETS.map((preset) => (
          <button key={preset.name} type="button" onClick={() => p.onChange(preset.settings)}>
            {preset.name}
          </button>
        ))}
      </div>

      <div className="row-dial">
        <Dial value={s.direction} onChange={(direction) => p.onChange({ direction })} />
        <div className="stack">
          <Slider label="Strength" value={s.strength} min={0} max={8} step={0.1} onChange={(strength) => p.onChange({ strength })} />
          <Slider label="Turbulence" value={s.turbulence} min={0} max={6} step={0.1} onChange={(turbulence) => p.onChange({ turbulence })} />
        </div>
      </div>

      <Slider label="Eddy size" value={s.scale} min={80} max={1200} step={10} onChange={(scale) => p.onChange({ scale })} />
      <Slider label="Changes" hint="how fast the swirls evolve" value={s.timeScale} min={0} max={4} step={0.1} onChange={(timeScale) => p.onChange({ timeScale })} />
      <Slider label="Trails" value={s.trail} min={0} max={0.99} step={0.01} onChange={(trail) => p.onChange({ trail })} />
      <Slider label="Particles" value={s.count} min={200} max={8000} step={100} onChange={(count) => p.onChange({ count })} format={(v) => v.toLocaleString("en")} />

      <div className="swatches" role="radiogroup" aria-label="Colours">
        {PALETTES.map((pal) => (
          <button
            key={pal.id}
            type="button"
            role="radio"
            aria-checked={pal.id === s.palette}
            title={pal.name}
            onClick={() => p.onChange({ palette: pal.id })}
            style={{ background: `linear-gradient(90deg, ${pal.ramp.join(", ")})` }}
          >
            <span className="sr-only">{pal.name}</span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button type="button" onClick={p.onPause}>{p.paused ? "Play" : "Pause"}</button>
        <button type="button" onClick={p.onSound} aria-pressed={p.soundOn}>
          {p.soundOn ? "Sound off" : "Sound on"}
        </button>
        <button type="button" onClick={p.onReseed} title="New random wind (R)">New wind</button>
        {p.hasPhoto ? (
          <button type="button" onClick={p.onClearPhoto}>Remove photo</button>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}>Add photo…</button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) p.onPhoto(f);
            e.target.value = "";
          }}
        />
      </div>

      <p className="keys">
        Drag on the wind to push it. <kbd>Space</kbd> pause · <kbd>R</kbd> new wind · <kbd>C</kbd> clear · <kbd>M</kbd> sound ·{" "}
        <kbd>H</kbd> hide panel{p.fps !== null && <span className="fps"> · {p.fps} fps</span>}
      </p>
    </aside>
  );
}

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}): ReactNode {
  const shown = props.format ? props.format(props.value) : String(props.value);
  return (
    <label className="slider" title={props.hint}>
      <span className="label">{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <output>{shown}</output>
    </label>
  );
}

function Dial({ value, onChange }: { value: number; onChange: (deg: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);

  function fromPointer(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const deg = (Math.round((Math.atan2(dy, dx) * 180) / Math.PI / 5) * 5 + 360) % 360;
    onChange(deg);
  }

  const rad = (value * Math.PI) / 180;
  const x2 = 32 + Math.cos(rad) * 22;
  const y2 = 32 + Math.sin(rad) * 22;

  return (
    <svg
      ref={ref}
      className="dial"
      viewBox="0 0 64 64"
      role="slider"
      aria-label="Wind direction"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={value}
      aria-valuetext={`${value} degrees`}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) fromPointer(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange((value + 5) % 360);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange((value + 355) % 360);
      }}
    >
      <circle cx="32" cy="32" r="29" className="dial-ring" />
      <line x1="32" y1="32" x2={x2} y2={y2} className="dial-needle" />
      <circle cx={x2} cy={y2} r="3.5" className="dial-tip" />
    </svg>
  );
}
