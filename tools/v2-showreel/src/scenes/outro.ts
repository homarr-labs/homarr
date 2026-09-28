import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon } from "../lib/dom";
import { CharPop, Headline } from "../lib/kit";
import type { Scene } from "../lib/scene";

// How the headline features feed each other, in the blog's terms.
const CHAIN: [string, string, string, string][] = [
  ["#fa5352", "code", "Custom Widgets v2", "Build almost any widget"],
  ["#4fb3ff", "door-enter", "Integration requests", "Any endpoint on a saved integration"],
  ["#ffb547", "sparkles", "Assistant", "Builds Custom Widgets for you"],
  ["#3ddc97", "building-store", "Workshop", "Share widgets and Custom CSS"],
];

export function outro(): Scene {
  const fg = h("div", { class: "scene" });
  const glowBg = h("div", { class: "abs", style: "inset:0;background:radial-gradient(ellipse 50% 45% at 50% 42%,rgba(250,83,82,.22),transparent 70%)" });
  const ring = h("div", { class: "abs", style: "left:960px;top:400px;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:3px solid rgba(250,83,82,.8)" });

  const title = new CharPop("Homarr 2.0", 170);
  const titleWrap = h("div", { class: "abs", style: "left:0;right:0;top:600px;text-align:center;white-space:nowrap" }, title.el);
  const sub = new Headline("Workshop, Custom Widgets and a rebuilt board.", { size: 40, weight: 650, color: "#c9cad2" });
  const subWrap = h("div", { class: "abs", style: "left:0;right:0;top:800px;text-align:center;white-space:nowrap" }, sub.el);

  // Feature chain
  const nodes = CHAIN.map(([color, ic, name, line]) =>
    h(
      "div",
      { class: "card col", style: `width:360px;height:250px;padding:30px 28px;gap:14px;border-color:${color}55` },
      h("div", { class: "center", style: `width:64px;height:64px;border-radius:18px;background:${color}22;color:${color}` }, icon(ic, 34, 2)),
      h("div", { style: "font-size:30px;font-weight:850;letter-spacing:-.02em;white-space:nowrap" }, name),
      h("div", { style: "font-size:21px;line-height:1.35;color:#b9bbc6" }, line),
    ),
  );
  const chainRow = h("div", { class: "abs row", style: "left:0;right:0;top:420px;justify-content:center;gap:60px" }, ...nodes);
  const beams = [0, 1, 2].map((i) => h("div", { class: "abs", style: `left:${960 - 2 * 360 - 1.5 * 60 + (i + 1) * 360 + i * 60}px;top:544px;width:60px;height:3px;transform-origin:0 50%;background:linear-gradient(90deg,${CHAIN[i]![0]},${CHAIN[i + 1]![0]})` }));
  const chainHead = new Headline("How it fits together.", { size: 58 });
  const chainHeadWrap = h("div", { class: "abs", style: "left:0;right:0;top:250px;text-align:center;white-space:nowrap" }, chainHead.el);

  // Links + thanks
  const link = (ic: string, label: string, url: string) =>
    h(
      "div",
      { class: "card row", style: "gap:18px;padding:22px 30px;border-color:rgba(250,83,82,.35)" },
      h("div", { style: "color:var(--coral)" }, icon(ic, 34, 2)),
      h("div", { class: "col", style: "gap:4px" }, h("div", { class: "label", style: "font-size:14px;color:#8f919d" }, label), h("div", { class: "mono", style: "font-size:30px;font-weight:700" }, url)),
    );
  const links = [link("player-play", "Try the live demo", "demo.homarr.dev"), link("building-store", "Browse Workshop", "homarr.dev/workshop")];
  const linkRow = h("div", { class: "abs row", style: "left:0;right:0;top:600px;justify-content:center;gap:40px" }, ...links);
  const thanks = new Headline("Thank you.", { size: 92, accent: ["thank", "you."] });
  const thanksWrap = h("div", { class: "abs", style: "left:0;right:0;top:790px;text-align:center" }, thanks.el);
  const thanksSub = new Headline("To everyone who tested, translated and contributed.", { size: 30, weight: 550, color: "#b9bbc6" });
  const thanksSubWrap = h("div", { class: "abs", style: "left:0;right:0;top:905px;text-align:center;white-space:nowrap" }, thanksSub.el);

  fg.append(glowBg, ring, titleWrap, subWrap, chainHeadWrap, beams[0]!, beams[1]!, beams[2]!, chainRow, linkRow, thanksWrap, thanksSubWrap);

  // ---------- Timeline ----------
  const CH = 2.1;
  const LK = CH + 2.7;
  const END = LK + 2.5;

  const cues: Scene["cues"] = [
    { t: 0.02, kind: "boom", gain: 1 },
    { t: 0.05, kind: "hit", gain: 0.8 },
    { t: 0.55, kind: "swish", gain: 0.5 },
    { t: 1.0, kind: "chime", gain: 0.6 },
    { t: CH - 0.15, kind: "whoosh", gain: 0.7 },
    ...nodes.map((_, i) => ({ t: CH + 0.2 + i * 0.25, kind: "pop" as const, gain: 0.55, pitch: i * 2 })),
    ...beams.map((_, i) => ({ t: CH + 0.35 + i * 0.25, kind: "zap" as const, dur: 0.2, gain: 0.3 })),
    { t: LK - 0.15, kind: "whoosh", gain: 0.7 },
    { t: LK + 0.3, kind: "hit", gain: 0.5 },
    { t: LK + 0.55, kind: "chime", gain: 0.8, pitch: 3 },
  ];

  return {
    name: "outro",
    start: 0,
    end: END,
    fg,
    cues,
    update(t, ctx) {
      // Burst: the lobster assembles out of the converged logos.
      ctx.fx.flash = (1 - E.outCubic(seg(t, 0, 0.5))) * 0.9;
      ctx.fx.fade = E.inCubic(seg(t, END - 0.6, END));
      const L = ctx.logo;
      L.visible = true;
      const toChain = E.inOutQuart(seg(t, CH - 0.4, CH + 0.3));
      const toLinks = E.inOutQuart(seg(t, LK - 0.4, LK + 0.3));
      const pop = spring(t, 2.0, 0.5);
      const y0 = lerp(lerp(400, 150, toChain), 330, toLinks);
      L.x = 0;
      L.y = (540 - y0) / 168;
      L.scale = clamp(pop, 0, 1.3) * lerp(lerp(0.62, 0.28, toChain), 0.5, toLinks);
      L.explode = 1 - E.outExpo(seg(t, 0, 1.1));
      L.sparks = t < 1.4 ? seg(t, 0, 1.4) : -1;
      L.dust = 0.6;
      L.ry = (1 - E.outQuart(seg(t, 0, 1.8))) * Math.PI * 4 + Math.sin(t * 0.9) * 0.3;
      L.rx = 0.12 + Math.sin(t * 0.7) * 0.05;
      L.antenna = t * 3;
      L.antennaAmp = 0.14;
      const clack = (at: number) => (t > at ? Math.exp(-(t - at) * 6) : 0);
      L.clawL = 0.25 + 0.75 * Math.max(clack(1.0), clack(1.2), clack(LK + 0.55));
      L.clawR = 0.25 + 0.75 * Math.max(clack(1.1), clack(1.3), clack(LK + 0.65));

      const rp = seg(t, 0, 0.9);
      ring.style.transform = `scale(${(0.3 + E.outCubic(rp) * 9).toFixed(3)})`;
      ring.style.opacity = String((1 - rp) * 0.9);
      glowBg.style.opacity = String(E.outCubic(seg(t, 0, 1)) * (1 - 0.5 * toChain * (1 - toLinks)));

      title.update(t, 0.3, CH - 0.4, 0.03, "center");
      titleWrap.style.display = t < CH + 0.2 ? "" : "none";
      sub.update(t, 0.7, CH - 0.35, 0.03, 0.5);
      subWrap.style.display = t < CH + 0.2 ? "" : "none";

      const cOn = t > CH - 0.2 && t < LK + 0.3;
      chainRow.style.display = chainHeadWrap.style.display = cOn ? "" : "none";
      chainHead.update(t, CH, LK - 0.4, 0.04, 0.5);
      const cOut = E.inCubic(seg(t, LK - 0.4, LK));
      nodes.forEach((n, i) => {
        const at = CH + 0.2 + i * 0.25;
        const p = spring(t - at, 2.4, 0.55);
        const lit = t > at ? Math.exp(-(t - at) * 3) : 0;
        n.style.transform = `perspective(1400px) translateY(${((1 - clamp(p, 0, 1.15)) * 120 - cOut * 60).toFixed(1)}px) rotateY(${((1 - clamp(p)) * -35).toFixed(2)}deg)`;
        n.style.opacity = String((t >= at ? 1 : 0) * (1 - cOut));
        n.style.boxShadow = `0 0 ${(lit * 70).toFixed(0)}px ${CHAIN[i]![0]}${Math.round(lit * 160).toString(16).padStart(2, "0")}`;
      });
      beams.forEach((b, i) => {
        const p = E.outCubic(seg(t, CH + 0.35 + i * 0.25, CH + 0.55 + i * 0.25));
        b.style.transform = `scaleX(${p.toFixed(3)})`;
        b.style.opacity = String(1 - cOut);
        b.style.display = cOn ? "" : "none";
      });

      const lOn = t > LK - 0.2;
      linkRow.style.display = thanksWrap.style.display = thanksSubWrap.style.display = lOn ? "" : "none";
      links.forEach((l, i) => {
        const at = LK + 0.15 + i * 0.12;
        const p = spring(t - at, 2.4, 0.55);
        l.style.transform = `translateY(${((1 - clamp(p, 0, 1.15)) * 80).toFixed(1)}px)`;
        l.style.opacity = t >= at ? "1" : "0";
      });
      thanks.update(t, LK + 0.45, Infinity, 0.06, 0.55);
      thanksSub.update(t, LK + 0.7, Infinity, 0.02, 0.5);
    },
  };
}
