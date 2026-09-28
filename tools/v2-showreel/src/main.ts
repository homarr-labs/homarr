import { LogoGL, defaultLogoState } from "./three/logo";
import { hydrateIcons } from "./lib/dom";
import { noise, rand } from "./lib/anim";
import { timeWarp, type Ctx, type Cue, type Scene } from "./lib/scene";
import { intro } from "./scenes/intro";
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
const bg = document.getElementById("bg")!;
const fg = document.getElementById("fg")!;
const world = document.getElementById("world")!;
const flash = document.getElementById("flash")!;
const fade = document.getElementById("fade")!;
const grain = document.getElementById("grain")!;
const vignette = document.getElementById("vignette")!;
const caR = document.getElementById("ca-r")!;
const caB = document.getElementById("ca-b")!;

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
  const glCanvas = document.getElementById("gl") as HTMLCanvasElement;
  const gl = new LogoGL(glCanvas, svg);
  (window as unknown as { __gl: LogoGL }).__gl = gl;

  const scenes: Scene[] = [intro(), customWidgets(), workshop(), frontDoor(), ntfy(), assistant(), board(), advanced(), rest(), stats(), outro()];
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

  // Scenes play back to back; each one's authored length is stretched by its reading holds.
  const warps = scenes.map((s) => timeWarp(s.warp));
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
  w.__scenes = scenes.map((s) => ({ name: s.name, start: s.start, end: s.end }));
  // Authored scene time → global output time, for stills and debugging.
  w.__at = (name, t) => {
    const i = scenes.findIndex((s) => s.name === name);
    return scenes[i]!.start + warps[i]!.toOut(t);
  };

  window.__seek = (T: number) => {
    const ctx: Ctx = {
      logo: defaultLogoState(),
      fx: { flash: 0, flashColor: "#fff", shake: 0, ca: 0, fade: 0, zoom: 1, grain: 0.075, vignette: 1, glBlur: 0 },
      frame: Math.round(T * FPS),
    };
    ctx.logo.t = T;
    scenes.forEach((s, i) => {
      const on = T >= s.start && T < s.end;
      s.fg.style.display = on ? "" : "none";
      if (s.bg) s.bg.style.display = on ? "" : "none";
      if (on) s.update(warps[i]!.toLocal(T - s.start), ctx);
    });
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
