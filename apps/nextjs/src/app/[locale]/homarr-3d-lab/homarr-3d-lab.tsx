"use client";

import { useEffect, useMemo, useState } from "react";
import { IconBox, IconPlayerPause, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { HomarrScene } from "./homarr-scene";
import { initialConfig } from "./lab-types";
import type { LabConfig } from "./lab-types";
import { defaultWordmarkMotion } from "./wordmark-rig";
import type { WordmarkMotion } from "./wordmark-rig";
import classes from "./lab.module.scss";

const variants = ["classic", "chunky", "rounded", "metal", "full"] as const;
const materials = ["red", "matte", "glossy", "metal", "chrome", "plastic", "glass"] as const;

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={classes.toggle}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={classes.range}>
      <span>{label}</span>
      <output>{value.toFixed(step < 0.1 ? 2 : 1)}</output>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className={classes.select}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value as T)}>
        {values.map((item) => (
          <option value={item} key={item}>
            {item.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionTitle({
  number,
  eyebrow,
  title,
  copy,
}: {
  number: string;
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className={classes.sectionTitle}>
      <span>{number}</span>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <small>{copy}</small>
      </div>
    </header>
  );
}

const presetConfig: Record<string, Partial<LabConfig>> = {
  Still: { autoRotate: false, idleFloat: false, idleBody: false, claws: false, antennae: false, eyes: false },
  Showcase: {
    autoRotate: true,
    rotationSpeed: 0.25,
    idleFloat: true,
    claws: true,
    clawFrequency: 0.55,
    antennae: true,
  },
  Living: { autoRotate: false, idleFloat: true, idleBody: true, claws: true, antennae: true, eyes: true },
  Loader: { autoRotate: true, rotationSpeed: 0.75, idleFloat: false, idleBody: false, claws: false, antennae: false },
  Chaos: {
    autoRotate: true,
    rotationSpeed: 0.9,
    idleFloat: true,
    idleBody: true,
    claws: true,
    clawSpeed: 1.8,
    antennae: true,
    antennaSpeed: 1.7,
    eyes: true,
  },
};

export function Homarr3dLab() {
  const [config, setConfig] = useState(initialConfig);
  const [clackSignal, setClackSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [loaderStyle, setLoaderStyle] = useState("spin");
  const [progress, setProgress] = useState(true);
  const [label, setLabel] = useState(true);
  const [explosion, setExplosion] = useState(0.62);
  const [wordmarkMotion, setWordmarkMotion] = useState(defaultWordmarkMotion);
  const wordmarkConfig = useMemo(() => ({ ...config, autoRotate: false, idleFloat: false }), [config]);
  const update = <K extends keyof LabConfig>(key: K, value: LabConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));
  const updateWordmarkMotion = (key: keyof WordmarkMotion, value: boolean) =>
    setWordmarkMotion((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setConfig((current) => ({ ...current, autoRotate: false, claws: false, antennae: false, idleFloat: false }));
      setWordmarkMotion({
        cursor: false,
        arrow: false,
        panels: false,
        letters: false,
        kana: false,
        beam: false,
        breathe: false,
      });
    }
  }, []);

  return (
    <main className={classes.lab}>
      <nav className={classes.nav}>
        <a href="#top" className={classes.brand}>
          <img src="/logo/homarr.svg" alt="" /> HOMARR <b>3D LAB</b>
        </a>
        <div>
          <a href="#loader">Loader</a>
          <a href="#living">Living logo</a>
          <a href="#wordmark">Wordmark</a>
        </div>
        <span>WEBGL / 01</span>
      </nav>
      <section id="top" className={classes.hero}>
        <div className={classes.heroCopy}>
          <p>INTERACTIVE BRAND SYSTEM / 2026</p>
          <h1>
            THE LOBSTER,
            <br />
            <em>IN DIMENSION.</em>
          </h1>
          <small>
            A tactile study of the Homarr mark. Drag to orbit, scroll to inspect, then tune every moving part.
          </small>
        </div>
        <div className={classes.heroStage}>
          <HomarrScene config={config} clackSignal={clackSignal} resetSignal={resetSignal} />
          <div className={classes.dragHint}>
            <span>↗</span> DRAG TO ORBIT
          </div>
          <div className={classes.coordinates}>
            X 0.00
            <br />Y 0.00
            <br />Z 0.00
          </div>
        </div>
        <aside className={classes.panel}>
          <div className={classes.panelHead}>
            <div>
              <small>LIVE CONTROLS</small>
              <strong>MODEL / MOTION</strong>
            </div>
            <IconBox size={18} />
          </div>
          <details open>
            <summary>MODEL</summary>
            <Select
              label="Variant"
              value={config.variant}
              values={variants}
              onChange={(value) => update("variant", value)}
            />
            <Select
              label="Surface"
              value={config.material}
              values={materials}
              onChange={(value) => update("material", value)}
            />
            <Range
              label="Depth"
              value={config.depth}
              min={0.18}
              max={1.2}
              onChange={(value) => update("depth", value)}
            />
            <Range
              label="Bevel"
              value={config.bevel}
              min={0.01}
              max={0.2}
              onChange={(value) => update("bevel", value)}
            />
          </details>
          <details open>
            <summary>ANIMATION</summary>
            <div className={classes.presets}>
              {Object.keys(presetConfig).map((name) => (
                <button key={name} onClick={() => setConfig((current) => ({ ...current, ...presetConfig[name] }))}>
                  {name}
                </button>
              ))}
            </div>
            <Toggle label="Auto rotate" checked={config.autoRotate} onChange={(value) => update("autoRotate", value)} />
            <Select
              label="Rotation axis"
              value={config.rotationAxis}
              values={["x", "y", "z", "free"]}
              onChange={(value) => update("rotationAxis", value)}
            />
            <Range
              label="Rotation speed"
              value={config.rotationSpeed}
              min={0}
              max={2}
              onChange={(value) => update("rotationSpeed", value)}
            />
            <Toggle label="Idle float" checked={config.idleFloat} onChange={(value) => update("idleFloat", value)} />
            <Toggle
              label="Idle body motion"
              checked={config.idleBody}
              onChange={(value) => update("idleBody", value)}
            />
            <Range
              label="Idle strength"
              value={config.idleStrength}
              min={0}
              max={0.3}
              onChange={(value) => update("idleStrength", value)}
            />
          </details>
          <details open>
            <summary>CLAWS</summary>
            <Toggle label="Animate claws" checked={config.claws} onChange={(value) => update("claws", value)} />
            <div className={classes.twocol}>
              <Toggle label="Left" checked={config.leftClaw} onChange={(value) => update("leftClaw", value)} />
              <Toggle label="Right" checked={config.rightClaw} onChange={(value) => update("rightClaw", value)} />
            </div>
            <Select
              label="Synchronization"
              value={config.clawMode}
              values={["synchronized", "alternating", "offset"]}
              onChange={(value) => update("clawMode", value)}
            />
            <Range
              label="Speed"
              value={config.clawSpeed}
              min={0.2}
              max={3}
              onChange={(value) => update("clawSpeed", value)}
            />
            <Range
              label="Amplitude"
              value={config.clawStrength}
              min={0}
              max={0.45}
              onChange={(value) => update("clawStrength", value)}
            />
            <Range
              label="Frequency"
              value={config.clawFrequency}
              min={0.2}
              max={2}
              onChange={(value) => update("clawFrequency", value)}
            />
            <button className={classes.action} onClick={() => setClackSignal(Date.now())}>
              CLACK ONCE <span>↗</span>
            </button>
          </details>
          <details open>
            <summary>ANTENNAE</summary>
            <Toggle
              label="Animate antennae"
              checked={config.antennae}
              onChange={(value) => update("antennae", value)}
            />
            <div className={classes.twocol}>
              <Toggle label="Left" checked={config.leftAntenna} onChange={(value) => update("leftAntenna", value)} />
              <Toggle label="Right" checked={config.rightAntenna} onChange={(value) => update("rightAntenna", value)} />
            </div>
            <Range
              label="Speed"
              value={config.antennaSpeed}
              min={0.1}
              max={2.5}
              onChange={(value) => update("antennaSpeed", value)}
            />
            <Range
              label="Strength"
              value={config.antennaStrength}
              min={0}
              max={0.3}
              onChange={(value) => update("antennaStrength", value)}
            />
            <Toggle
              label="Secondary motion"
              checked={config.secondaryMotion}
              onChange={(value) => update("secondaryMotion", value)}
            />
          </details>
          <details>
            <summary>SCENE + DEBUG</summary>
            <Toggle label="Animate eyes" checked={config.eyes} onChange={(value) => update("eyes", value)} />
            <Toggle label="Body pulse" checked={config.bodyPulse} onChange={(value) => update("bodyPulse", value)} />
            <Toggle label="Ground shadow" checked={config.ground} onChange={(value) => update("ground", value)} />
            <Toggle label="Wireframe" checked={config.wireframe} onChange={(value) => update("wireframe", value)} />
            <Toggle label="XYZ axes + origin" checked={config.axes} onChange={(value) => update("axes", value)} />
            <Toggle label="Calculated bounds" checked={config.bounds} onChange={(value) => update("bounds", value)} />
            <Toggle label="Rig pivots" checked={config.pivots} onChange={(value) => update("pivots", value)} />
            <Range
              label="Field of view"
              value={config.fov}
              min={22}
              max={60}
              step={1}
              onChange={(value) => update("fov", value)}
            />
          </details>
          <div className={classes.panelActions}>
            <button onClick={() => update("paused", !config.paused)}>
              <IconPlayerPause size={15} /> {config.paused ? "Resume all" : "Pause all"}
            </button>
            <button onClick={() => setResetSignal(Date.now())}>
              <IconRefresh size={15} /> Reset view
            </button>
          </div>
        </aside>
      </section>

      <section id="loader" className={classes.playground}>
        <SectionTitle
          number="02"
          eyebrow="PRODUCT MOTION"
          title="Loader lab"
          copy="Production-minded loading studies using the same cached vector geometry."
        />
        <div className={classes.loaderGrid}>
          <div className={classes.loaderStage}>
            <HomarrScene
              config={{
                ...config,
                autoRotate: loaderStyle === "spin",
                clawStrength: config.clawStrength * 0.35,
                antennaStrength: config.antennaStrength * 0.5,
              }}
              mode="loader"
              loaderStyle={loaderStyle}
            />
            {label && <strong>Loading Homarr</strong>}
            {progress && <span>72%</span>}
          </div>
          <div className={classes.miniPanel}>
            <Select
              label="Motion study"
              value={loaderStyle}
              values={["spin", "tumble", "flip", "spring", "pulse"]}
              onChange={setLoaderStyle}
            />
            <Toggle label="Show progress" checked={progress} onChange={setProgress} />
            <Toggle label="Show label" checked={label} onChange={setLabel} />
            <Toggle label="Reduced claws" checked={config.claws} onChange={(value) => update("claws", value)} />
            <Toggle
              label="Reduced antennae"
              checked={config.antennae}
              onChange={(value) => update("antennae", value)}
            />
          </div>
        </div>
      </section>

      <section id="living" className={classes.playground}>
        <SectionTitle
          number="03"
          eyebrow="RIG INSPECTION"
          title="Living lobster"
          copy="A deep-bodied designer object with inspectable pivots, rear surfaces and independent articulation."
        />
        <div className={classes.wideStage}>
          <HomarrScene config={{ ...config, variant: "full" }} />
          <div className={classes.techLabels}>
            <span>01 / CLAW JOINTS</span>
            <span>02 / ANTENNA BONES</span>
            <span>03 / BODY VOLUME</span>
          </div>
        </div>
      </section>

      <section id="wordmark" className={classes.playground}>
        <SectionTitle
          number="04"
          eyebrow="SECONDARY MARK"
          title="Rigged wordmark"
          copy="Hover the panels, letters, kana, or chain links. The bottom beam travels from right to left; focus the scene and use arrow keys for keyboard control."
        />
        <div className={classes.wordmarkGrid}>
          <div className={classes.wordmarkStage}>
            <HomarrScene config={wordmarkConfig} mode="wordmark" wordmarkMotion={wordmarkMotion} />
          </div>
          <div className={classes.miniPanel}>
            <Toggle
              label="Cursor click motion"
              checked={wordmarkMotion.cursor}
              onChange={(value) => updateWordmarkMotion("cursor", value)}
            />
            <Toggle
              label="Bottom arrow wave"
              checked={wordmarkMotion.arrow}
              onChange={(value) => updateWordmarkMotion("arrow", value)}
            />
            <Toggle
              label="Top panels hover"
              checked={wordmarkMotion.panels}
              onChange={(value) => updateWordmarkMotion("panels", value)}
            />
            <Toggle
              label="Letters hover pop"
              checked={wordmarkMotion.letters}
              onChange={(value) => updateWordmarkMotion("letters", value)}
            />
            <Toggle
              label="Kana hover pop"
              checked={wordmarkMotion.kana}
              onChange={(value) => updateWordmarkMotion("kana", value)}
            />
            <Toggle
              label="Right-to-left chain beam"
              checked={wordmarkMotion.beam}
              onChange={(value) => updateWordmarkMotion("beam", value)}
            />
            <Toggle
              label="Sequential breathing"
              checked={wordmarkMotion.breathe}
              onChange={(value) => updateWordmarkMotion("breathe", value)}
            />
            <Range
              label="Layer depth"
              value={config.depth}
              min={0.18}
              max={1.2}
              onChange={(value) => update("depth", value)}
            />
          </div>
        </div>
      </section>

      <section className={classes.playground}>
        <SectionTitle
          number="05"
          eyebrow="EXPERIMENT"
          title="Exploded lobster"
          copy="Pull the authored pieces apart along their own vectors, then magnetically return to the exact mark."
        />
        <div className={classes.wideStage}>
          <HomarrScene config={{ ...config, autoRotate: false }} mode="exploded" explosion={explosion} />
          <div className={classes.explosion}>
            <IconSparkles size={18} />
            <Range label="ASSEMBLED / EXPLODED" value={explosion} min={0} max={2.6} onChange={setExplosion} />
          </div>
        </div>
      </section>
      <footer className={classes.footer}>
        <img src="/logo/homarr.svg" alt="Homarr" />
        <div>
          <strong>HOMARR 3D LAB</strong>
          <span>Built from the original marks. No texture planes. No impostors.</span>
        </div>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
