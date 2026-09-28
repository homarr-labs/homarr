import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo, offsetWithin, tf } from "../lib/dom";
import { Headline, countTo } from "../lib/kit";
import type { Scene } from "../lib/scene";
import ALL from "../../assets/integrations-all.json";

const MEDIA: [string, string][] = [
  ["autobrr", "Autobrr"],
  ["fileflows", "FileFlows"],
  ["jackett", "Jackett"],
  ["jellystat", "Jellystat"],
  ["komga", "Komga"],
  ["maintainerr", "Maintainerr"],
  ["romm", "RomM"],
  ["stash", "Stash"],
  ["tubearchivist", "Tube Archivist"],
  ["unmanic", "Unmanic"],
  ["xteve", "xTeVe"],
  ["yourSpotify", "Your Spotify"],
];
const MONITORING: [string, string][] = [
  ["caddy", "Caddy"],
  ["changedetection", "Changedetection.io"],
  ["frigate", "Frigate"],
  ["gatus", "Gatus"],
  ["healthchecks", "Healthchecks"],
  ["netalertx", "NetAlertX"],
  ["netdata", "Netdata"],
  ["prometheus", "Prometheus"],
  ["scrutiny", "Scrutiny"],
  ["syncthingRelay", "Syncthing Relay"],
];
const COLLECTIONS: [string, string][] = [
  ["homebox", "Homebox"],
  ["karakeep", "Karakeep"],
  ["linkwarden", "Linkwarden"],
  ["mealie", "Mealie"],
  ["miniflux", "Miniflux"],
  ["plantit", "Plant-it"],
  ["spoolman", "Spoolman"],
  ["tandoor", "Tandoor"],
  ["trilium", "Trilium"],
];

// Globe of every integration kind (from @homarr/definitions); the 31 new ones are highlighted.
const R = 330;
const CX = 960;
const CY = 560;
const FOCAL = 1400;

export function stats(): Scene {
  const fg = h("div", { class: "scene" });

  // ---------- Statistics + wall of 31 ----------
  const statHead = new Headline("Statistics and 31 new integrations.", { size: 66, accent: ["31"] });
  const statHeadWrap = h("div", { class: "abs", style: "left:96px;top:140px;white-space:nowrap" }, statHead.el);
  const METRICS: [string, string, string, number][] = [
    ["sonarr", "Sonarr", "Series", 214],
    ["paperless-ngx", "Paperless-ngx", "Documents", 3481],
    ["navidrome", "Navidrome", "Songs", 12904],
    ["homebox", "Homebox", "Items", 318],
  ];
  const metricVals: HTMLElement[] = [];
  const metricCards = METRICS.map(([k, name, label]) => {
    const v = h("div", { class: "display", style: "font-size:52px" }, "0");
    metricVals.push(v);
    return h(
      "div",
      { class: "col", style: "gap:8px;padding:18px 20px;border-radius:14px;background:#121318;border:1px solid var(--line2)" },
      h("div", { class: "row", style: "gap:10px;font-size:16px;font-weight:700;color:#b9bbc6" }, logo(k, 26), name),
      v,
      h("div", { class: "mono", style: "font-size:13px;letter-spacing:.14em;color:#8f919d" }, label.toUpperCase()),
    );
  });
  const statsCard = h(
    "div",
    { class: "abs card col", style: "left:96px;top:270px;width:640px;padding:24px;gap:18px" },
    h("div", { class: "row", style: "gap:12px;font-size:22px;font-weight:800" }, h("div", { style: "color:#fa5352" }, icon("chart-bar", 24, 2.2)), "Statistics", h("div", { class: "chip", style: "margin-left:auto;font-size:14px;padding:6px 12px" }, "Cards")),
    h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:14px" }, ...metricCards),
  );
  const statCap = h("div", { class: "abs", style: "left:96px;top:760px;width:640px;font-size:24px;line-height:1.4;color:#b9bbc6" }, "Fields from different services, in one grid.");
  const groups: [string, string, [string, string][]][] = [
    ["Media and libraries", "#fa5352", MEDIA],
    ["Monitoring and networking", "#4fb3ff", MONITORING],
    ["Collections and home", "#3ddc97", COLLECTIONS],
  ];
  const wallRows: { el: HTMLElement; lg: HTMLElement; key: string }[] = [];
  const groupHeads: HTMLElement[] = [];
  const wall = h("div", { class: "abs row", style: "left:800px;top:258px;gap:26px;align-items:flex-start" });
  groups.forEach(([gname, color, items]) => {
    const head = h("div", { class: "col", style: "gap:6px;margin-bottom:10px" }, h("div", { class: "label", style: `font-size:13px;color:${color};letter-spacing:.16em` }, gname), h("div", { style: `height:2px;width:100%;background:${color};transform-origin:0 50%` }));
    groupHeads.push(head);
    const col = h("div", { class: "col", style: "width:320px;gap:4px" }, head);
    items.forEach(([k, n]) => {
      const lg = logo(k, 26);
      const el = h("div", { class: "row", style: "gap:14px;height:35px;padding:0 12px;border-radius:9px;background:rgba(255,255,255,.035);font-size:19px;font-weight:650;white-space:nowrap" }, lg, n);
      wallRows.push({ el, lg, key: k });
      col.append(el);
    });
    wall.append(col);
  });
  const counter = h("span", {}, "0");
  const counterEl = h("div", { class: "abs row", style: "left:800px;top:800px;gap:16px;font-size:26px;font-weight:700;color:#b9bbc6" }, h("div", { class: "display", style: "font-size:72px;color:#fff;min-width:86px" }, counter), "new integrations");

  // ---------- Globe ----------
  const newKeys = new Set(wallRows.map((r) => r.key));
  // New integrations first so their wall rows map to indices 0..30.
  const kinds = [...wallRows.map((r) => r.key), ...Object.keys(ALL).filter((k) => !newKeys.has(k))];
  const golden = Math.PI * (3 - Math.sqrt(5));
  // Spread the new ones evenly over the sphere instead of clustering them at one pole.
  const order = kinds.map((_, i) => (i * 37) % kinds.length);
  const chips = kinds.map((k, i) => {
    const n = order[i]!;
    const y = 1 - ((n + 0.5) / kinds.length) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = n * golden;
    const isNew = newKeys.has(k);
    const bgEl = h("div", {
      class: "abs",
      style: `inset:0;border-radius:50%;background:${isNew ? "radial-gradient(circle at 50% 35%,#3a1d20,#1a1013)" : "#1e1f26"};border:${isNew ? "2px solid rgba(250,83,82,.9)" : "1.5px solid rgba(255,255,255,.22)"};${isNew ? "box-shadow:0 0 22px rgba(250,83,82,.55)" : ""}`,
    });
    const file = (ALL as Record<string, { file: string }>)[k]!.file;
    const img = h("img", { class: "svc", src: `assets/icons/${file}`, width: 33, height: 33, alt: "", style: "position:relative" });
    const el = h("div", { class: "abs center", style: "left:0;top:0;width:56px;height:56px" }, bgEl, img);
    return { el, bgEl, isNew, p: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number] };
  });
  const glow = h("div", { class: "abs", style: `left:${CX - 520}px;top:${CY - 520}px;width:1040px;height:1040px;border-radius:50%;background:radial-gradient(circle,rgba(250,83,82,.18),rgba(250,83,82,.05) 45%,transparent 68%)` });
  const shell = h("div", { class: "abs", style: `left:${CX - R}px;top:${CY - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;border:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.04),transparent 60%)` });
  const globeLayer = h("div", { class: "abs", style: "inset:0" }, glow, shell, ...chips.map((c) => c.el));
  const globeHead = new Headline("Every integration in Homarr 2.0.", { size: 56, accent: ["every"] });
  const globeHeadWrap = h("div", { class: "abs", style: "left:0;right:0;top:92px;text-align:center;white-space:nowrap" }, globeHead.el);
  const legendItem = (bg: string, border: string, label: string) =>
    h("div", { class: "row", style: "gap:12px;font-size:22px;font-weight:650;color:#d7d8de" }, h("div", { style: `width:22px;height:22px;border-radius:50%;background:${bg};border:${border}` }), label);
  const legend = h(
    "div",
    { class: "abs row", style: "left:0;right:0;top:960px;justify-content:center;gap:48px" },
    legendItem("#3a1d20", "2px solid #fa5352", "New in 2.0"),
    legendItem("#1e1f26", "1.5px solid rgba(255,255,255,.3)", "Already supported"),
  );
  const core = h("div", { class: "abs", style: `left:${CX}px;top:${CY}px;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fff;box-shadow:0 0 60px 30px rgba(250,83,82,.8)` });

  fg.append(statHeadWrap, statsCard, statCap, wall, counterEl, globeLayer, globeHeadWrap, legend, core);

  // ---------- Timeline ----------
  const WALL = 0.45;
  const rowAt = (i: number) => WALL + i * 0.028;
  const GL = 3.2; // wall lifts off into the globe
  const CONV = GL + 3.7; // globe collapses into the outro
  const END = CONV + 0.85;

  const cues: Scene["cues"] = [
    { t: 0.02, kind: "whoosh", gain: 0.6 },
    { t: 0.25, kind: "hit", gain: 0.5 },
    ...wallRows.map((_, i) => ({ t: rowAt(i), kind: "tick" as const, gain: 0.2, pitch: i % 8 })),
    { t: GL - 0.1, kind: "whoosh", gain: 0.8 },
    { t: GL + 0.75, kind: "hit", gain: 0.6 },
    ...chips.filter((c) => !c.isNew).map((_, j) => ({ t: GL + 0.45 + j * 0.012, kind: "tick" as const, gain: 0.1, pitch: j % 8 })),
    { t: GL + 1.3, kind: "chime", gain: 0.6, pitch: 2 },
    { t: CONV - 0.9, kind: "riser", dur: 1.0, gain: 0.6 },
    { t: CONV + 0.1, kind: "reverse", gain: 0.6 },
    { t: END - 0.05, kind: "boom", gain: 0.9 },
  ];

  let wallXY: [number, number][] | null = null;

  return {
    name: "stats",
    start: 0,
    end: END,
    fg,
    cues,
    update(t, ctx) {
      ctx.fx.fade = 1 - E.outCubic(seg(t, 0, 0.15));

      // Statistics + wall
      const wallOn = t < GL + 0.9;
      [statHeadWrap, statsCard, statCap, wall, counterEl].forEach((el) => (el.style.display = wallOn ? "" : "none"));
      statHead.update(t, 0.02, GL - 0.55, 0.03, 0.35);
      const lift = E.inCubic(seg(t, GL - 0.25, GL + 0.2));
      const stIn = spring(t - 0.15, 2.4, 0.6);
      tf(statsCard, { y: (1 - clamp(stIn, 0, 1.15)) * 120 + lift * 60, rx: (1 - clamp(stIn)) * 30, o: (t > 0.15 ? 1 : 0) * (1 - lift) });
      METRICS.forEach(([, , , v], i) => countTo(metricVals[i]!, t, 0.45 + i * 0.1, 1.4 + i * 0.1, v, 0, (x) => Math.round(x).toLocaleString("en-US")));
      statCap.style.clipPath = `inset(-10px ${((1 - E.outExpo(seg(t, 0.9, 1.4))) * 100).toFixed(1)}% -10px 0)`;
      statCap.style.opacity = String(1 - lift);
      groupHeads.forEach((gh, i) => {
        const p = E.outExpo(seg(t, WALL - 0.2 + i * 0.1, WALL + 0.3 + i * 0.1));
        gh.style.visibility = t > WALL - 0.2 + i * 0.1 ? "visible" : "hidden";
        gh.style.opacity = String(1 - lift);
        (gh.lastElementChild as HTMLElement).style.transform = `scaleX(${p.toFixed(3)})`;
      });
      wallXY ??= wallRows.map((r) => {
        const [ox, oy] = offsetWithin(r.lg, fg);
        return [ox + 13, oy + 13];
      });
      wallRows.forEach((r, i) => {
        const at = rowAt(i);
        const p = E.outBack(seg(t, at, at + 0.3), 1.6);
        const flash = t > at ? Math.exp(-(t - at) * 5) : 0;
        tf(r.el, { x: (1 - clamp(p)) * 60, o: (t >= at ? 1 : 0) * (1 - lift) });
        r.el.style.background = `rgba(255,255,255,${(0.035 + flash * 0.12).toFixed(3)})`;
        // The logo leaves its row when it flies to the globe.
        r.lg.style.visibility = t < GL - 0.1 + i * 0.006 ? "visible" : "hidden";
      });
      countTo(counter, t, WALL, rowAt(30) + 0.2, 31);
      counterEl.style.visibility = t > WALL ? "visible" : "hidden";
      counterEl.style.opacity = String(1 - lift);

      // Globe: rotate, tilt and project every chip.
      const gOn = t > GL - 0.05 && t < END;
      globeLayer.style.display = globeHeadWrap.style.display = legend.style.display = gOn ? "" : "none";
      if (gOn) {
        const conv = E.inQuad(seg(t, CONV, END - 0.05));
        const spin = (t - GL) * 0.55 + E.inQuad(seg(t, CONV, END)) * 5;
        const tilt = -0.32 + Math.sin((t - GL) * 0.6) * 0.06;
        const grow = lerp(0.92, 1.06, E.inOutSine(seg(t, GL + 0.5, CONV)));
        const rad = R * grow * (1 - conv);
        const cs = Math.cos(spin);
        const sn = Math.sin(spin);
        const ct = Math.cos(tilt);
        const st = Math.sin(tilt);
        chips.forEach((c, i) => {
          const [x0, y0, z0] = c.p;
          const x1 = x0 * cs + z0 * sn;
          const z1 = -x0 * sn + z0 * cs;
          const y2 = y0 * ct - z1 * st;
          const z2 = y0 * st + z1 * ct;
          const persp = FOCAL / (FOCAL - z2 * rad);
          const gx = CX + x1 * rad * persp;
          const gy = CY + y2 * rad * persp;
          const depth = (z2 + 1) / 2; // 0 back → 1 front
          let x = gx;
          let y = gy;
          let s = persp * lerp(0.62, 1.05, depth);
          let o = lerp(0.28, 1, depth);
          let bgO = 1;
          if (c.isNew) {
            // Fly from the wall row to the globe spot.
            const fp = E.inOutQuart(seg(t, GL - 0.1 + i * 0.006, GL + 0.6 + i * 0.006));
            const [wx, wy] = wallXY![i]!;
            x = lerp(wx, gx, fp);
            y = lerp(wy, gy, fp) - Math.sin(fp * Math.PI) * 60;
            s = lerp(26 / 33, s * 1.1, fp);
            o = lerp(1, Math.max(o, 0.55), fp);
            bgO = fp;
          } else {
            const at = GL + 0.45 + (i - 31) * 0.012;
            const pp = spring(t - at, 3, 0.5);
            s *= clamp(pp, 0, 1.3);
            o *= t >= at ? 1 : 0;
          }
          o *= 1 - seg(conv, 0.9, 1);
          tf(c.el, { x: x - 28, y: y - 28, s, o });
          c.bgEl.style.opacity = bgO.toFixed(3);
          c.el.style.zIndex = String(Math.round(depth * 100) + (c.isNew ? 2 : 0));
          c.el.style.filter = depth < 0.35 ? `blur(${((0.35 - depth) * 5).toFixed(1)}px)` : "";
        });
        const shellIn = E.outExpo(seg(t, GL + 0.3, GL + 1.0));
        tf(shell, { s: lerp(0.6, 1, shellIn) * grow * (1 - conv), o: shellIn * (1 - conv) });
        tf(glow, { s: grow * (1 + conv * 0.3), o: shellIn * (1 - seg(conv, 0.6, 1)) });
        globeHead.update(t, GL + 0.55, CONV - 0.35, 0.04, 0.5);
        const lg = E.outExpo(seg(t, GL + 1.1, GL + 1.5));
        legend.style.clipPath = `inset(-10px ${((1 - lg) * 50).toFixed(1)}% -10px ${((1 - lg) * 50).toFixed(1)}%)`;
        legend.style.opacity = String(1 - seg(t, CONV - 0.3, CONV));
        ctx.fx.ca = conv * 5;
        ctx.fx.zoom = 1 + conv * 0.08;
      }
      const coreP = seg(t, CONV + 0.25, END);
      core.style.display = coreP > 0 ? "" : "none";
      core.style.transform = `scale(${(0.2 + coreP ** 3 * 5).toFixed(3)})`;
      ctx.fx.flash = seg(t, END - 0.12, END) * 0.9;
    },
  };
}
