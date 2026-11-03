import { useCallback, useEffect, useRef, useState } from "react";
import { WindSound } from "./audio/windSound";
import { Controls } from "./components/Controls";
import { WindCanvas } from "./components/WindCanvas";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { DEFAULTS, readHash, writeHash, type Settings } from "./settings";
import { paletteById } from "./sim/palettes";

export default function App() {
  const reducedMotion = useReducedMotion();
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULTS,
    ...(reducedMotion ? { count: 800, timeScale: 0.3, strength: 0.5 } : {}),
    ...readHash(window.location.hash),
  }));
  // TODO: read the hash again on hashchange, right now only on load
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(1);
  const [clearSignal, setClearSignal] = useState(0);
  // closed by default on phones, it covers half the screen
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 600);
  const [photo, setPhoto] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const sound = useRef<WindSound | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  // AudioContext can only start after a click, so it's created here and not on load
  const toggleSound = useCallback(async () => {
    sound.current ??= new WindSound();
    if (sound.current.playing) {
      await sound.current.stop();
      setSoundOn(false);
    } else {
      await sound.current.start();
      setSoundOn(true);
    }
  }, []);

  const change = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  useEffect(() => {
    const id = setTimeout(() => {
      const url = window.location.pathname + window.location.search + writeHash(settings);
      window.history.replaceState(null, "", url);
    }, 300);
    return () => clearTimeout(id);
  }, [settings]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " ") {
        e.preventDefault();
        setPaused((v) => !v);
      } else if (e.key === "h" || e.key === "H") setPanelOpen((v) => !v);
      else if (e.key === "r" || e.key === "R") newWind();
      else if (e.key === "c" || e.key === "C") setClearSignal((n) => n + 1);
      else if (e.key === "m" || e.key === "M") toggleSound();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSound]);

  function newWind() {
    setSeed(Math.floor(Math.random() * 1e9));
    setClearSignal((n) => n + 1);
  }

  function loadPhoto(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  const pal = paletteById(settings.palette);
  const bg = photo
    ? { backgroundImage: `url(${photo})` }
    : { backgroundImage: `radial-gradient(ellipse at 50% 30%, ${pal.background[0]}, ${pal.background[1]})` };

  return (
    <main
      className={`stage ${photo ? "has-photo" : ""} ${dragOver ? "drag-over" : ""}`}
      style={bg}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) loadPhoto(f);
      }}
    >
      <WindCanvas settings={settings} paused={paused} seed={seed} clearSignal={clearSignal} sound={sound} onFps={setFps} />

      <button
        type="button"
        className="panel-toggle"
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
      >
        {panelOpen ? "Hide" : "Controls"}
      </button>

      {panelOpen && (
        <Controls
          settings={settings}
          onChange={change}
          paused={paused}
          onPause={() => setPaused((v) => !v)}
          soundOn={soundOn}
          onSound={toggleSound}
          onReseed={newWind}
          onPhoto={loadPhoto}
          hasPhoto={photo !== null}
          onClearPhoto={clearPhoto}
          fps={fps}
        />
      )}

      {dragOver && <div className="drop-hint">Drop a photo to put the wind over it</div>}
    </main>
  );
}
