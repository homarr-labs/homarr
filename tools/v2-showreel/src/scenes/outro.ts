import { E, seg, lerp, pulse, spring, clamp } from "../lib/anim";
import { h, tf } from "../lib/dom";
import { Headline } from "../lib/kit";
import type { Scene } from "../lib/scene";

const PILLS = ["Open source", "Self-hosted", "v2 out now", "homarr.dev"];

// End card on the track's final hit: the lobster assembles centre stage, then winks.
export function outro(): Scene {
  const bg = h("div", { class: "scene", style: "background:#070708" });
  const fg = h("div", { class: "scene" });
  const CY = 440; // centre of the lockup in px

  const glow = h("div", {
    class: "abs",
    style: `inset:0;background:radial-gradient(ellipse 50% 44% at 50% ${((CY / 1080) * 100).toFixed(1)}%,rgba(250,82,82,.36),rgba(250,82,82,0) 70%)`,
  });
  const rays = h("div", {
    class: "abs",
    style: `left:-540px;top:${CY - 1500}px;width:3000px;height:3000px;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,130,130,.08) 0deg 3deg,rgba(255,130,130,0) 3deg 12deg);-webkit-mask-image:radial-gradient(circle at 50% 50%,#000 0%,rgba(0,0,0,.4) 18%,transparent 42%)`,
  });
  bg.append(glow, rays);

  const tag = new Headline("A simple, yet powerful dashboard for your server.", {
    size: 40,
    weight: 500,
    color: "#d5d5dc",
  });
  const tagWrap = h(
    "div",
    { class: "abs", style: "left:0;right:0;top:768px;text-align:center;white-space:nowrap" },
    tag.el,
  );
  const pills = PILLS.map((p, i) =>
    h(
      "span",
      {
        class: "chip",
        style: `font-size:21px;padding:11px 24px;letter-spacing:.12em;${i === 3 ? "background:#fa5252;border-color:#fa5252;color:#fff" : i === 2 ? "color:#ff8787;border-color:rgba(250,82,82,.55)" : "color:#cfcfd6;border-color:rgba(255,255,255,.22)"}`,
      },
      p,
    ),
  );
  const pillRow = h(
    "div",
    { class: "abs row", style: "left:0;right:0;top:856px;justify-content:center;gap:16px" },
    ...pills,
  );
  const content = h("div", { class: "abs", style: `inset:0;transform-origin:50% ${CY}px` }, tagWrap, pillRow);
  const rings = [0, 1].map((i) =>
    h("div", {
      class: "abs",
      style: `left:960px;top:${CY}px;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:${[4, 1.5][i]}px solid ${["#ff8787", "#fff"][i]}`,
    }),
  );
  const flash = h("div", {
    class: "abs",
    style: `inset:0;background:radial-gradient(circle at 50% ${((CY / 1080) * 100).toFixed(1)}%,#fff 0%,rgba(255,170,170,.7) 30%,rgba(250,82,82,0) 70%);mix-blend-mode:screen`,
  });
  fg.append(content, ...rings, flash);

  const WINK = 1.75;
  const END = 4.0;
  const px = (y: number) => (540 - y) / 168;

  return {
    name: "outro",
    start: 0,
    end: END,
    bg,
    fg,
    cues: [
      { t: 0.02, kind: "boom", gain: 0.8 },
      { t: 0.9, kind: "tick", gain: 0.45 },
      { t: 1.0, kind: "tick", gain: 0.45 },
      { t: WINK, kind: "pop", gain: 0.5, pitch: 8 },
    ],
    update(t, ctx) {
      // Lobster: reassembles from the collapsed globe, settles in the centre and winks.
      const L = ctx.logo;
      L.visible = true;
      L.x = 0;
      L.y = px(CY);
      L.scale = clamp(spring(t, 2.0, 0.5), 0, 1.3) * 0.5;
      L.explode = 1 - E.outExpo(seg(t, 0, 1.1));
      L.sparks = t < 1.4 ? seg(t, 0, 1.4) : -1;
      L.dust = 0.5;
      L.ry = (1 - E.outQuart(seg(t, 0, 1.5))) * Math.PI * 4 + 0.3 + Math.sin(t * 1.1) * 0.12;
      L.rx = 0.08 + Math.sin(t * 0.7) * 0.04;
      const perk = t > WINK - 0.1 ? Math.exp(-(t - WINK + 0.1) * 2.5) : 0;
      L.antennaLift = -perk * 0.06;
      L.antenna = t * 3 + perk * 4;
      L.antennaAmp = 0.12 + perk * 0.1;
      const clack = (at: number) => (t > at ? Math.exp(-(t - at) * 6) : 0);
      L.clawL = 0.2 + 0.7 * Math.max(clack(0.9), clack(WINK + 0.05));
      L.clawR = 0.2 + 0.7 * Math.max(clack(1.0), clack(WINK + 0.15));
      L.blinkL = E.outCubic(seg(t, WINK, WINK + 0.07)) * (1 - E.inOutCubic(seg(t, WINK + 0.24, WINK + 0.34)));

      L.wm.on = false;

      glow.style.opacity = String(clamp(0.75 + 0.6 * pulse(t, [0], 4)));
      tf(rays, { r: t * 9, s: lerp(0.6, 1, E.outExpo(seg(t, 0, 1))), o: E.outCubic(seg(t, 0, 0.6)) });
      tag.update(t, 0.55, Infinity, 0.035, 0.5);
      pills.forEach((p, i) => {
        const a = 0.9 + i * 0.07;
        tf(p, { s: clamp(spring(t - a, 2.4, 0.5), 0, 1.2), o: seg(t, a, a + 0.08) });
      });
      tf(content, { s: 1 + 0.03 * E.outQuad(seg(t, 0, END)) });
      rings.forEach((r, i) => {
        const a = i * 0.05;
        const p = seg(t, a, a + 0.9);
        tf(r, { s: lerp(0.6, 12, E.outExpo(p)), o: (1 - E.outQuad(p)) * [0.9, 0.7][i]! });
      });
      flash.style.opacity = String(0.95 * pulse(t, [0], 8));
      ctx.fx.fade = E.inCubic(seg(t, END - 0.7, END));
    },
  };
}
