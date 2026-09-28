import { E, seg, lerp, env, pulse, spring, clamp, BEAT } from "../lib/anim";
import { h, tf } from "../lib/dom";
import { CharPop, svg } from "../lib/kit";
import type { Scene } from "../lib/scene";
import logoSvg from "../../assets/homarr.svg";

export const LOGO_D = /d="([^"]+)"/.exec(logoSvg)![1]!;
export const LOGO_VB = "0 82.9 512 346.2";

// 3D logo scale 1 spans 5.15 world units; camera fov 30 at z=12 shows 6.43 units over 1080 px.
export const PX_PER_UNIT = 1080 / (2 * 12 * Math.tan((15 * Math.PI) / 180));

export function intro(): Scene {
  const start = 0;
  const bgEl = h("div", { class: "scene" });
  const fgEl = h("div", { class: "scene" });

  // Perspective floor grid.
  const floor = h("div", {
    class: "abs",
    style: `left:-1600px;right:-1600px;top:560px;height:1600px;transform-origin:50% 0;
      background-image:linear-gradient(rgba(250,83,82,.55) 2px,transparent 2px),linear-gradient(90deg,rgba(250,83,82,.55) 2px,transparent 2px);
      background-size:120px 120px;-webkit-mask-image:linear-gradient(180deg,#000 0%,transparent 70%);mask-image:linear-gradient(180deg,rgba(0,0,0,.9),transparent 65%)`,
  });
  const floorWrap = h("div", { class: "abs", style: "inset:0;perspective:700px;perspective-origin:50% 40%" }, floor);
  const glow = h("div", {
    class: "abs",
    style:
      "left:960px;top:470px;width:1400px;height:1000px;margin:-500px 0 0 -700px;border-radius:50%;background:radial-gradient(closest-side,rgba(250,83,82,.42),rgba(250,83,82,.1) 55%,transparent)",
  });
  bgEl.append(floorWrap, glow);

  // Opening scan line.
  const line = h("div", {
    class: "abs",
    style:
      "left:0;right:0;top:539px;height:2px;background:linear-gradient(90deg,transparent,#ff8a80 20%,#fff 50%,#ff8a80 80%,transparent);box-shadow:0 0 24px 4px rgba(250,83,82,.8);transform-origin:50% 50%",
  });

  // Stroke-drawn logo outline, sized to match the 3D model at scale 0.62.
  const logoW = 5.15 * PX_PER_UNIT * 0.62;
  const logoH = (logoW * 346.2) / 512;
  const outline = svg("svg", { viewBox: LOGO_VB, width: logoW, height: logoH });
  outline.setAttribute("style", `position:absolute;left:${960 - logoW / 2}px;top:${540 - logoH / 2}px;overflow:visible`);
  const glowPath = svg("path", { d: LOGO_D, pathLength: 1, fill: "none", stroke: "#fa5352", "stroke-width": 6 });
  glowPath.setAttribute("style", "filter:blur(6px)");
  const crisp = svg("path", { d: LOGO_D, pathLength: 1, fill: "none", stroke: "#ffd2cc", "stroke-width": 1.6 });
  const fill = svg("path", { d: LOGO_D, fill: "#fa5352" });
  outline.append(fill, glowPath, crisp);

  // Giant outlined "2.0" behind the logo.
  const two = h(
    "div",
    {
      class: "abs display center",
      style:
        "left:0;right:0;top:0;bottom:0;font-size:640px;font-weight:900;letter-spacing:-0.06em;color:transparent;-webkit-text-stroke:3px rgba(250,83,82,.9)",
    },
    "2.0",
  );
  const twoFill = h(
    "div",
    {
      class: "abs display center",
      style:
        "left:0;right:0;top:0;bottom:0;font-size:640px;font-weight:900;letter-spacing:-0.06em;color:rgba(250,83,82,.1)",
    },
    "2.0",
  );
  const ring = h("div", {
    class: "abs",
    style: "left:960px;top:540px;width:200px;height:200px;margin:-100px;border-radius:50%;border:3px solid #ffb0a8",
  });
  const ring2 = h("div", {
    class: "abs",
    style: "left:960px;top:540px;width:200px;height:200px;margin:-100px;border-radius:50%;border:1.5px solid #fa5352",
  });

  const title = new CharPop("Homarr", 150);
  title.el.style.fontWeight = "850";
  const titleWrap = h("div", { class: "abs center", style: "left:0;right:0;top:748px" }, title.el);
  const tag = h(
    "div",
    { class: "abs center label", style: "left:0;right:0;top:930px;font-size:22px;color:#fff;letter-spacing:.32em" },
    "Workshop · Custom Widgets · A rebuilt board",
  );
  const ver = h(
    "div",
    { class: "abs center mono", style: "left:0;right:0;top:110px;font-size:18px;letter-spacing:.5em;color:var(--muted)" },
    "HOMARR  ·  VERSION 2.0.0",
  );

  // Coral takeover used to fly through into the next scene.
  const takeover = h("div", { class: "abs", style: "inset:0;background:#fa5352" });
  const streaks = h("div", {
    class: "abs",
    style:
      "left:960px;top:540px;width:2600px;height:2600px;margin:-1300px;background:repeating-conic-gradient(from 3deg,rgba(255,190,180,.55) 0deg .35deg,transparent .35deg 4.5deg);-webkit-mask-image:radial-gradient(closest-side,transparent 18%,#000 60%);mask-image:radial-gradient(closest-side,transparent 18%,#000 60%)",
  });

  fgEl.append(line, outline, ring, ring2, titleWrap, tag, ver, streaks, takeover);
  bgEl.prepend(twoFill, two);

  // The flat logo lifts out of its outline facing forward, then whips round twice straight into the slam.
  const EMERGE = 1.62;
  const SPIN0 = 1.9;
  const SLAM = 2.8;
  const HEY = SLAM + 0.5; // claw wave, antennae perk, wink
  const FLY = 4.95;
  const end = FLY + 0.8;
  const beats = Array.from({ length: 6 }, (_, i) => SLAM + i * BEAT);
  // Spin reaches SLAM at full speed; a damped spring carries that speed into the last half turn.
  const SPIN_TURNS = 3 * Math.PI;
  const v0 = (2 * SPIN_TURNS) / (SLAM - SPIN0);
  const spinAfter = (u: number) => {
    const w = 15;
    const z = 0.5;
    const wd = w * Math.sqrt(1 - z * z);
    const b = (v0 / Math.PI - z * w) / wd;
    return 4 * Math.PI - Math.PI * Math.exp(-z * w * u) * (Math.cos(wd * u) - b * Math.sin(wd * u));
  };
  // A single tap: 0 → 1 → 0 over `d` seconds.
  const tap = (t: number, a: number, d: number) => Math.sin(clamp((t - a) / d) * Math.PI);

  return {
    name: "intro",
    start,
    end,
    bg: bgEl,
    fg: fgEl,
    cues: [
      { t: 0.05, kind: "riser", dur: SLAM - 0.05, gain: 0.8 },
      { t: 0.12, kind: "swish", gain: 0.5 },
      { t: 0.5, kind: "zap", dur: 1.0, gain: 0.35 },
      { t: EMERGE, kind: "whoosh", gain: 0.7 },
      { t: SLAM, kind: "reverse", gain: 0.8 },
      { t: SLAM, kind: "boom", gain: 1 },
      { t: SLAM + 0.4, kind: "swish", gain: 0.45 },
      { t: HEY + 0.3, kind: "click", gain: 0.55 },
      { t: HEY + 0.48, kind: "click", gain: 0.55 },
      { t: HEY + 0.62, kind: "pop", gain: 0.6 },
      { t: FLY - 0.3, kind: "riser", dur: 0.75, gain: 0.6 },
      { t: FLY + 0.25, kind: "whoosh", gain: 1 },
    ],
    update(t, ctx) {
      // Scan line: grows, then collapses into the logo.
      const lg = E.outExpo(seg(t, 0.1, 0.55));
      const lc = E.inExpo(seg(t, 0.42, 0.66));
      tf(line, { sx: lg * (1 - lc) + 0.001, o: seg(t, 0.06, 0.14) * (1 - seg(t, 0.6, 0.66)) });

      // Outline draw, then a quick fill. The trace stays behind as the logo lifts off it.
      const d = E.inOutCubic(seg(t, 0.5, 1.5));
      glowPath.style.strokeDasharray = `${d} 1`;
      crisp.style.strokeDasharray = `${d} 1`;
      const fillP = E.outCubic(seg(t, 1.35, EMERGE));
      fill.setAttribute("fill-opacity", String(fillP * (t < EMERGE ? 1 : 0)));
      const trace = seg(t, EMERGE + 0.04, EMERGE + 0.3);
      outline.style.opacity = String(1 - trace);
      tf(outline, { s: 1 - trace * 0.08, o: 1 - trace });
      outline.style.filter = `drop-shadow(0 0 ${(18 * fillP).toFixed(1)}px rgba(250,83,82,.8))`;

      const L = ctx.logo;
      L.visible = t >= EMERGE;
      // Forward push: facing the camera, so it still reads as the flat mark.
      const push = E.outExpo(seg(t, EMERGE, EMERGE + 0.45));
      const back = E.inOutCubic(seg(t, SPIN0 + 0.2, SLAM));
      L.z = 2.2 * push * (1 - back);
      const sp = seg(t, SPIN0, SLAM);
      L.ry = t < SLAM ? SPIN_TURNS * sp * sp : spinAfter(t - SLAM);
      L.rx = t < SLAM ? -0.3 * Math.sin(sp * Math.PI) : Math.sin((t - SLAM) * 1.4) * 0.05 * seg(t, SLAM, SLAM + 0.6);
      L.y = lerp(0, 0.75, E.inOutCubic(seg(t, SPIN0, SLAM)));
      const settle = spring(t - SLAM, 2.4, 0.35);
      const kick = pulse(t, beats, 9) * (t > SLAM ? 1 : 0);
      L.scale = 0.62 * (1 + (1 - settle) * 0.22 * (t > SLAM ? 1 : 0)) + kick * 0.012;

      // "Hey": the right claw swings up and waves, both claws pinch, the antennae perk up and the left eye winks.
      const hey = env(t, HEY, FLY - 0.15, 0.25, 0.35, E.outBack, E.inCubic);
      const wave = Math.sin((t - HEY) * 2 * Math.PI * 2.6);
      L.waveR = hey * (-0.02 + wave * 0.11);
      L.waveL = hey * 0.06 * Math.sin((t - HEY) * 2 * Math.PI * 1.3 + 1);
      L.rz = hey * (-0.06 + wave * 0.015);
      L.y += hey * 0.05 * Math.abs(Math.sin((t - HEY) * Math.PI * 2.6));
      L.antennaLift = -hey * 0.06;
      L.antenna = t * 3 + hey * (t - HEY) * 14;
      L.antennaAmp = 0.12 + hey * 0.1;
      const pinch = Math.max(tap(t, HEY + 0.25, 0.2), tap(t, HEY + 0.43, 0.2));
      const slamClack = tap(t, SLAM, 0.22);
      L.clawL = Math.max(slamClack, pinch * 0.6) + 0.12 * (0.5 + 0.5 * Math.sin(t * 5));
      L.clawR = Math.max(tap(t, SLAM + 0.05, 0.22), pinch * 0.5) + 0.12 * (0.5 + 0.5 * Math.sin(t * 5 + 1));
      const wink = HEY + 0.58;
      L.blinkL = E.outCubic(seg(t, wink, wink + 0.07)) * (1 - E.inOutCubic(seg(t, wink + 0.22, wink + 0.32)));
      L.sparks = t >= SLAM ? (t - SLAM) / 1.3 : -1;
      L.dust = 0.55 * seg(t, 0.4, 1.8);

      // Fly-through: logo rushes at the camera, coral fills the frame.
      const fly = E.inQuart(seg(t, FLY, FLY + 0.75));
      L.scale *= (1 - Math.sin(seg(t, FLY - 0.3, FLY) * Math.PI) * 0.06) * (1 + fly * 14);
      L.y = lerp(L.y, 0.2, fly);
      L.ry += fly * 0.5;
      ctx.fx.glBlur = seg(t, FLY, FLY + 0.75) ** 2 * 22;
      tf(streaks, { s: 0.6 + fly * 2.2, r: t * 8, o: seg(t, FLY + 0.05, FLY + 0.25) * (1 - seg(t, FLY + 0.6, FLY + 0.75)) });
      takeover.style.opacity = String(E.inCubic(seg(t, FLY + 0.5, FLY + 0.75)));
      takeover.style.display = t > FLY + 0.45 ? "" : "none";

      // "2.0" slam.
      const s = seg(t, SLAM - 0.02, SLAM + 0.28);
      const sc = lerp(2.6, 1, E.outExpo(s));
      const twoO = t < SLAM - 0.02 ? 0 : 1;
      const twoOut = E.inCubic(seg(t, FLY - 0.1, FLY + 0.35));
      tf(two, { s: sc * (1 + twoOut * 0.3), y: 40, o: twoO * (1 - twoOut), blur: (1 - E.outExpo(s)) * 20 });
      tf(twoFill, { s: sc * 1.02 * (1 + twoOut * 0.3), y: 40, o: twoO * (0.8 + kick * 0.6) * (1 - twoOut) });
      two.style.opacity = String(Number(two.style.opacity) * lerp(1, 0.45, seg(t, SLAM + 0.5, SLAM + 1.1)));

      // Shockwave rings.
      const r1 = seg(t, SLAM, SLAM + 1.0);
      tf(ring, { s: 0.2 + E.outExpo(r1) * 14, o: (1 - r1) * (t >= SLAM ? 1 : 0) });
      const r2 = seg(t, SLAM + 0.08, SLAM + 1.25);
      tf(ring2, { s: 0.2 + E.outExpo(r2) * 9, o: (1 - r2) * (t >= SLAM ? 1 : 0) });

      title.update(t, SLAM + 0.4, FLY - 0.1, 0.035, "center");
      tag.style.opacity = t > SLAM + 0.85 && t < FLY ? "1" : "0";
      tag.style.letterSpacing = `${lerp(0.6, 0.32, E.outExpo(seg(t, SLAM + 0.85, SLAM + 1.6)))}em`;
      tf(ver, { o: env(t, 0.5, FLY, 0.6, 0.25), y: 0 });
      ver.style.color = "#b8bac4";

      // Floor + glow.
      const fl = E.outExpo(seg(t, SLAM, SLAM + 1.0));
      floor.style.transform = `rotateX(78deg) translateY(${(-((t * 180) % 120)).toFixed(1)}px)`;
      floor.style.opacity = String(fl * 0.6 * (1 - seg(t, FLY, FLY + 0.4)));
      tf(glow, { s: 0.6 + fl * 0.5 + kick * 0.08, o: seg(t, 1.0, 2.2) * 0.7 + fl * 0.3 });

      // Global FX.
      const hit = t >= SLAM ? Math.exp(-(t - SLAM) * 5) : 0;
      ctx.fx.flash = Math.max(Math.exp(-(t - SLAM) * 9) * (t >= SLAM ? 0.55 : 0), E.inCubic(seg(t, FLY + 0.62, FLY + 0.75)) * 0.2);
      ctx.fx.flashColor = "#ffe9e6";
      ctx.fx.shake = hit * 22 + fly * 6;
      ctx.fx.ca = hit * 9 + fly * 6;
      ctx.fx.zoom = 1 + hit * 0.04;
      ctx.fx.fade = 1 - seg(t, 0, 0.25);
    },
  };
}
