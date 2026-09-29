import { E, seg, lerp, env, noise, pulse, spring, clamp, BEAT } from "../lib/anim";
import { h, tf } from "../lib/dom";
import { Headline } from "../lib/kit";
import type { Scene } from "../lib/scene";
import logoSvg from "../../assets/homarr.svg";

export const LOGO_D = /d="([^"]+)"/.exec(logoSvg)![1]!;
export const LOGO_VB = "0 82.9 512 346.2";

// 3D logo scale 1 spans 5.15 world units; camera fov 30 at z=12 shows 6.43 units over 1080 px.
export const PX_PER_UNIT = 1080 / (2 * 12 * Math.tan((15 * Math.PI) / 180));

// "NOW IN Homarr v2": the lobster spins in on the opening crash, slides left for the lockup, then waves and winks.
export function intro(): Scene {
  const bg = h("div", { class: "scene", style: "background:#070708" });
  const fg = h("div", { class: "scene" });

  const glow = h("div", {
    class: "abs",
    style: "inset:0;background:radial-gradient(ellipse 48% 46% at 50% 52%,rgba(250,82,82,.42),rgba(250,82,82,0) 70%)",
  });
  const rays = h("div", {
    class: "abs",
    style:
      "left:-540px;top:-960px;width:3000px;height:3000px;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,130,130,.08) 0deg 3deg,rgba(255,130,130,0) 3deg 12deg);-webkit-mask-image:radial-gradient(circle at 50% 50%,#000 0%,rgba(0,0,0,.4) 18%,transparent 42%)",
  });
  bg.append(glow, rays);

  const now = h(
    "div",
    {
      class: "abs mono",
      style: "left:1004px;top:318px;font-size:28px;font-weight:600;color:#ff8787;white-space:nowrap",
    },
    "NOW IN",
  );
  const name = new Headline("Homarr", { size: 172, weight: 830 });
  name.el.style.letterSpacing = "-0.045em";
  const nameWrap = h("div", { class: "abs", style: "left:996px;top:340px;white-space:nowrap" }, name.el);
  const v2 = h(
    "div",
    {
      class: "abs display",
      style:
        "left:986px;top:470px;font-size:440px;font-weight:900;letter-spacing:-0.07em;line-height:1;color:#fa5352;white-space:nowrap;transform-origin:25% 65%;text-shadow:0 30px 80px rgba(250,82,82,.35)",
    },
    "v2",
  );
  const sub = h(
    "div",
    {
      class: "abs mono",
      style: "left:1004px;top:912px;font-size:22px;letter-spacing:.3em;color:#cfcfd6;white-space:nowrap",
    },
    "THE BIGGEST HOMARR UPDATE",
  );
  const txt = h("div", { class: "abs", style: "inset:0" }, now, nameWrap, v2, sub);
  const rings = [0, 1].map((i) =>
    h("div", {
      class: "abs",
      style: `left:1250px;top:640px;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:${[4, 1.5][i]}px solid ${["#ff8787", "#fff"][i]}`,
    }),
  );
  const flash = h("div", {
    class: "abs",
    style:
      "inset:0;background:radial-gradient(circle at 50% 50%,#fff 0%,rgba(255,170,170,.7) 30%,rgba(250,82,82,0) 70%);mix-blend-mode:screen",
  });
  fg.append(txt, ...rings, flash);

  const SLIDE = 0.75; // lobster moves left for the lockup
  const SLAM = 2 * BEAT; // "v2" lands on the second kick
  const HEY = 3 * BEAT; // wave, pinch and wink
  const END = 6 * BEAT;
  const LOGO_X = -2.9; // world units: centred at x ≈ 474 px
  const tap = (t: number, a: number, d: number) => Math.sin(clamp((t - a) / d) * Math.PI);

  return {
    name: "intro",
    start: 0,
    end: END,
    bg,
    fg,
    cues: [
      { t: 0.05, kind: "riser", dur: SLAM - 0.05, gain: 0.7 },
      { t: 0.3, kind: "whoosh", gain: 0.9 },
      { t: 0.05, kind: "swish", gain: 0.5 },
      { t: 0.55, kind: "tick", gain: 0.5 },
      { t: SLAM, kind: "reverse", gain: 0.8 },
      { t: SLAM, kind: "boom", gain: 1 },
      { t: SLAM, kind: "hit", gain: 0.5 },
      { t: SLAM + 0.4, kind: "swish", gain: 0.45 },
      { t: HEY + 0.3, kind: "click", gain: 0.5 },
      { t: HEY + 0.48, kind: "click", gain: 0.5 },
      { t: HEY + 0.58, kind: "pop", gain: 0.5, pitch: 8 },
      { t: END, kind: "whoosh", gain: 0.7 },
    ],
    update(t, ctx) {
      const L = ctx.logo;
      L.visible = true;
      const slide = E.inOutCubic(seg(t, SLIDE, SLIDE + 0.45));
      const turn = -Math.PI * 4 * (1 - E.outExpo(seg(t, 0, 1.05)));
      L.x = lerp(0, LOGO_X, slide);
      L.y = 0.1;
      L.scale = lerp(0.05, 0.8, spring(t, 1.25, 0.55)) * lerp(1, 0.78, slide);
      L.ry = turn + 0.42 * slide + 0.12 * Math.sin(t * 1.6) * seg(t, 1, 2);
      L.rx = -0.06;
      L.dust = 0.5 * seg(t, 0, 1.2);
      L.sparks = t >= SLAM ? (t - SLAM) / 1.3 : -1;

      // Wave hello with the right claw, pinch twice, perk the antennae and wink.
      const hey = env(t, HEY, END - 0.1, 0.25, 0.4, E.outBack, E.inCubic);
      const wave = Math.sin((t - HEY) * 2 * Math.PI * 2.6);
      L.waveR = hey * (-0.02 + wave * 0.11);
      L.waveL = hey * 0.06 * Math.sin((t - HEY) * 2 * Math.PI * 1.3 + 1);
      L.rz = hey * (-0.06 + wave * 0.015);
      L.y += hey * 0.05 * Math.abs(Math.sin((t - HEY) * Math.PI * 2.6));
      L.antennaLift = -hey * 0.06;
      L.antenna = t * 3 + hey * (t - HEY) * 14;
      L.antennaAmp = 0.12 + hey * 0.1;
      const pinch = Math.max(tap(t, HEY + 0.25, 0.2), tap(t, HEY + 0.43, 0.2));
      const clack = Math.max(tap(t, 0.55, 0.22), tap(t, SLAM, 0.22));
      L.clawL = Math.max(clack, pinch * 0.6) + 0.12 * (0.5 + 0.5 * Math.sin(t * 5));
      L.clawR = Math.max(clack, pinch * 0.5) + 0.12 * (0.5 + 0.5 * Math.sin(t * 5 + 1));
      const wink = HEY + 0.58;
      L.blinkL = E.outCubic(seg(t, wink, wink + 0.07)) * (1 - E.inOutCubic(seg(t, wink + 0.22, wink + 0.32)));

      glow.style.opacity = String(clamp(0.7 + 0.6 * pulse(t, [0], 4) + 0.5 * pulse(t, [SLAM, 4 * BEAT], 5)));
      tf(rays, { r: t * 10, s: lerp(0.6, 1, E.outExpo(seg(t, 0, 1))), o: E.outCubic(seg(t, 0, 0.5)) });

      // Lockup on the right.
      const np = E.outExpo(seg(t, SLIDE + 0.1, SLIDE + 0.55));
      now.style.opacity = String(np);
      now.style.letterSpacing = `${lerp(1.3, 0.5, np).toFixed(3)}em`;
      name.update(t, SLIDE + 0.12, Infinity, 0, 0.5);
      const vp = seg(t, SLAM, SLAM + 0.38);
      v2.style.opacity = t < SLAM ? "0" : "1";
      v2.style.transform = `scale(${lerp(2.8, 1, E.outExpo(vp)).toFixed(3)}) rotate(${((1 - E.outExpo(vp)) * -8).toFixed(2)}deg)`;
      v2.style.filter = vp < 1 ? `blur(${((1 - E.outExpo(vp)) * 18).toFixed(1)}px)` : "";
      const sp = E.outExpo(seg(t, SLAM + 0.22, SLAM + 0.65));
      tf(sub, { y: (1 - sp) * 14, o: sp });
      const sh = t > SLAM ? 16 * Math.exp(-9 * (t - SLAM)) : 0;
      tf(txt, { x: noise(t * 35, 3) * sh, y: noise(t * 35, 4) * sh });

      // Shockwave from the "v2" on the slam.
      rings.forEach((r, i) => {
        const a = SLAM + i * 0.06;
        const p = seg(t, a, a + 0.9);
        tf(r, { s: lerp(0.6, 14 - i * 4, E.outExpo(p)), o: t < a ? 0 : (1 - E.outQuad(p)) * [0.9, 0.7][i]! });
      });
      flash.style.opacity = String(0.9 * pulse(t, [0], 9) + 0.45 * pulse(t, [SLAM], 16));

      ctx.fx.fade = 1 - seg(t, 0, 0.06);
      ctx.fx.shake = sh * 0.6;
      ctx.fx.ca = t > SLAM ? 7 * Math.exp(-(t - SLAM) * 6) : 0;
    },
  };
}
