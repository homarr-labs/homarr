import { LogoGL, defaultLogoState } from "./three/logo";
import { hydrateIcons } from "./lib/dom";
import { BAR, E, lerp, noise, rand } from "./lib/anim";
import { timeWarp, type Ctx, type Cue, type Scene } from "./lib/scene";
import { intro, PX_PER_UNIT } from "./scenes/intro";
import { customWidgets } from "./scenes/custom-widgets";
import { workshop } from "./scenes/workshop";
import { frontDoor } from "./scenes/front-door";
import { ntfy } from "./scenes/ntfy";
import { assistant } from "./scenes/assistant";
import { board } from "./scenes/board";
import { advanced } from "./scenes/advanced";
import { rest } from "./scenes/rest";
import { stats } from "./scenes/stats";
import { outro } from "./scenes/outro";

declare global {
  interface Window {
    __seek: (t: number) => void;
    __ready: Promise<void>;
    __duration: number;
    __cues: Cue[];
    __fps: number;
  }
}

const FPS = 60;
// Scene lengths in soundtrack bars. The soundtrack starts on a phrase crash; the assistant lands on the drop, and
// the edits in audio.py put the board and the globe on crashes and the end card on the final hit.
const CRASH_BARS = [0, 8, 22, 30, 34];
const BARS: Record<string, number> = {
  intro: 1.5,
  "custom-widgets": 3.5,
  workshop: 3,
  assistant: 4,
  "front-door": 5,
  ntfy: 5,
  board: 4,
  advanced: 1.5,
  rest: 2.5,
  stats: 4,
};
const bg = document.getElementById("bg")!;
const fg = document.getElementById("fg")!;
const world = document.getElementById("world")!;
const flash = document.getElementById("flash")!;
const fade = document.getElementById("fade")!;
const grain = document.getElementById("grain")!;
const vignette = document.getElementById("vignette")!;
const caR = document.getElementById("ca-r")!;
const caB = document.getElementById("ca-b")!;
const blurStd = { up: document.getElementById("vblur-std")!, left: document.getElementById("hblur-std")! };

function makeGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 384;
  const g = c.getContext("2d")!;
  const img = g.createImageData(384, 384);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand(i * 0.37 + 1.3) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

async function boot() {
  grain.style.backgroundImage = `url(${makeGrain()})`;
  const svg = await (await fetch("assets/homarr.svg")).text();
  const wordmarkSvg = await (await fetch("assets/homarr-wordmark-rig.svg")).text();
  // Kick envelope of the edited soundtrack (written by audio.py); falls back to the bar grid.
  const musicEnv: { rate: number; kick: number[] } | null = await fetch("assets/music-env.json")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const glCanvas = document.getElementById("gl") as HTMLCanvasElement;
  const gl = new LogoGL(glCanvas, svg, wordmarkSvg);
  (window as unknown as { __gl: LogoGL }).__gl = gl;

  const scenes: Scene[] = [
    intro(),
    customWidgets(),
    workshop(),
    assistant(),
    frontDoor(),
    ntfy(),
    board(),
    advanced(),
    rest(),
    stats(),
    outro(),
  ];
  for (const s of scenes) {
    if (s.bg) {
      s.bg.dataset.scene = s.name;
      bg.append(s.bg);
    }
    s.fg.dataset.scene = s.name;
    fg.append(s.fg);
  }
  await hydrateIcons(document);
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))),
  );

  // Scenes play back to back; each one's authored length is stretched by its reading holds, then uniformly
  // retimed to its bar count.
  const warps = scenes.map((s) => {
    const w = timeWarp(s.warp);
    const bars = BARS[s.name];
    const k = bars ? (bars * BAR) / w.toOut(s.end - s.start) : 1;
    return { toOut: (t: number) => w.toOut(t) * k, toLocal: (u: number) => w.toLocal(u / k), k };
  });
  let acc = 0;
  scenes.forEach((s, i) => {
    const len = warps[i]!.toOut(s.end - s.start);
    s.start = acc;
    s.end = acc = acc + len;
  });
  window.__duration = acc;
  window.__cues = scenes
    .flatMap((s, i) =>
      s.cues.map((c) => {
        const w = warps[i]!;
        const t = w.toOut(c.t);
        return { ...c, t: t + s.start, ...(c.dur ? { dur: w.toOut(c.t + c.dur) - t } : {}) };
      }),
    )
    .sort((a, b) => a.t - b.t);
  const w = window as unknown as { __scenes: unknown; __at: (name: string, t: number) => number };
  w.__scenes = scenes.map((s, i) => ({ name: s.name, start: s.start, end: s.end, k: warps[i]!.k }));
  // Authored scene time → global output time, for stills and debugging.
  w.__at = (name, t) => {
    const i = scenes.findIndex((s) => s.name === name);
    return scenes[i]!.start + warps[i]!.toOut(t);
  };

  // Push transitions: the outgoing scene keeps playing past its end while the incoming one (at negative local
  // time for the first half) slides in behind it, with motion blur along the push.
  const whipAt = (T: number) => {
    for (let j = 1; j < scenes.length; j++) {
      const e = scenes[j]!.enter;
      if (e && Math.abs(T - scenes[j]!.start) < e.dur / 2)
        return { j, dir: e.dir, u: (T - scenes[j]!.start + e.dur / 2) / e.dur, dur: e.dur };
    }
    return null;
  };
  const place = (s: Scene, off: number, dir: "up" | "left") => {
    const tr = off === 0 ? "" : dir === "up" ? `translateY(${off.toFixed(1)}px)` : `translateX(${off.toFixed(1)}px)`;
    s.fg.style.transform = tr;
    if (s.bg) s.bg.style.transform = tr;
  };

  window.__seek = (T: number) => {
    const ctx: Ctx = {
      logo: defaultLogoState(),
      fx: { flash: 0, flashColor: "#fff", shake: 0, ca: 0, fade: 0, zoom: 1, grain: 0.075, vignette: 1, glBlur: 0 },
      frame: Math.round(T * FPS),
    };
    const whip = whipAt(T);
    const live = whip ? [whip.j - 1, whip.j] : [scenes.findIndex((s) => T >= s.start && T < s.end)];
    ctx.logo.t = T;
    let logo = ctx.logo;
    scenes.forEach((s, i) => {
      const on = live.includes(i);
      s.fg.style.display = on ? "" : "none";
      if (s.bg) s.bg.style.display = on ? "" : "none";
      if (!on) return;
      ctx.logo = defaultLogoState();
      ctx.logo.t = T;
      let off = 0;
      if (whip) {
        const span = whip.dir === "up" ? 1080 : 1920;
        off = span * ((i === whip.j ? 1 : 0) - E.inOutExpo(whip.u));
      }
      place(s, off, whip?.dir ?? "up");
      s.update(warps[i]!.toLocal(T - s.start), ctx);
      if (ctx.logo.visible || ctx.logo.wm.on) {
        const dx = whip?.dir === "left" ? off / PX_PER_UNIT : 0;
        const dy = whip?.dir === "up" ? -off / PX_PER_UNIT : 0;
        ctx.logo.x += dx;
        ctx.logo.y += dy;
        ctx.logo.wm.x += dx;
        ctx.logo.wm.y += dy;
        logo = ctx.logo;
      }
    });
    ctx.logo = logo;
    // Motion blur from the push velocity; the scenes' own fades would black out the handover.
    for (const s of scenes) {
      s.fg.style.filter = "";
      if (s.bg) s.bg.style.filter = "";
    }
    if (whip) {
      const v = (E.inOutExpo(whip.u + 0.004) - E.inOutExpo(whip.u - 0.004)) / 0.008 / whip.dur;
      const b = Math.min(40, v * (whip.dir === "up" ? 1080 : 1920) * 0.0035);
      if (b > 0.4) {
        blurStd[whip.dir].setAttribute("stdDeviation", whip.dir === "up" ? `0 ${b.toFixed(1)}` : `${b.toFixed(1)} 0`);
        for (const i of live) {
          const s = scenes[i]!;
          s.fg.style.filter = `url(#${whip.dir === "up" ? "vblur" : "hblur"})`;
          if (s.bg) s.bg.style.filter = s.fg.style.filter;
        }
        ctx.fx.glBlur = Math.max(ctx.fx.glBlur, b * 0.5);
      }
      ctx.fx.fade = 0;
    }
    // Soundtrack sync: a small push on every kick and a flash on the phrase crashes.
    const bar = T / BAR;
    let kick: number;
    if (musicEnv) {
      const f = T * musicEnv.rate;
      const i = Math.floor(f);
      kick = lerp(musicEnv.kick[i] ?? 0, musicEnv.kick[i + 1] ?? 0, f - i);
    } else kick = Math.exp(-(bar * 2 - Math.floor(bar * 2)) * (BAR / 2) * 9);
    ctx.fx.zoom *= 1 + 0.004 * kick;
    for (const cb of CRASH_BARS) {
      const since = T - cb * BAR;
      if (since < 0 || since > 1) continue;
      const k = Math.exp(-since * 7);
      ctx.fx.flash = Math.max(ctx.fx.flash, 0.3 * k);
      ctx.fx.ca = Math.max(ctx.fx.ca, 5 * k);
    }
    // Debug hook: render.mjs eval can patch the logo pose to inspect the rig.
    const patch = (window as unknown as { __logoPatch?: Partial<typeof ctx.logo> }).__logoPatch;
    if (patch) Object.assign(ctx.logo, patch);
    gl.render(ctx.logo);
    glCanvas.style.filter = ctx.fx.glBlur > 0.3 ? `blur(${ctx.fx.glBlur.toFixed(1)}px)` : "";
    const { fx } = ctx;
    const sx = noise(T * 38, 1) * fx.shake;
    const sy = noise(T * 41, 2) * fx.shake;
    world.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) scale(${fx.zoom.toFixed(4)})`;
    if (fx.ca > 0.2) {
      caR.setAttribute("dx", (-fx.ca).toFixed(2));
      caB.setAttribute("dx", fx.ca.toFixed(2));
      world.style.filter = "url(#ca)";
    } else world.style.filter = "";
    flash.style.opacity = fx.flash.toFixed(3);
    flash.style.background = fx.flashColor;
    fade.style.opacity = fx.fade.toFixed(3);
    vignette.style.opacity = fx.vignette.toFixed(3);
    grain.style.opacity = fx.grain.toFixed(3);
    const f = ctx.frame;
    grain.style.backgroundPosition = `${Math.floor(rand(f) * 384)}px ${Math.floor(rand(f + 0.5) * 384)}px`;
  };
  window.__fps = FPS;
  window.__seek(0);
}

window.__ready = boot();

// Interactive preview: ?t=12.5 seeks, ?play plays in real time.
const params = new URLSearchParams(location.search);
window.__ready.then(() => {
  if (params.has("t")) window.__seek(Number(params.get("t")));
  if (params.has("play")) {
    const t0 = performance.now() - Number(params.get("from") ?? 0) * 1000;
    const loop = () => {
      window.__seek(((performance.now() - t0) / 1000) % window.__duration);
      requestAnimationFrame(loop);
    };
    loop();
  }
});
