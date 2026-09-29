import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, tf, icon, logo } from "../lib/dom";
import { Chapter, CodeType, Headline, type Tok } from "../lib/kit";
import type { Scene } from "../lib/scene";
import { SLOT, WORKSHOP_BG, publishedCard } from "./workshop";

// Code shown in the editor: a real homarr-custom-widget-v2 shape.
const K = (s: string): Tok => [s, "k"];
const S = (s: string): Tok => [s, "s"];
const P = (s: string): Tok => [s];
const N = (s: string): Tok => [s, "n"];
const T = (s: string): Tok => [s, "t"];
const code: Tok[][] = [
  [P("{")],
  [P("  "), K('"$schema"'), P(": "), S('"homarr-custom-widget-v2"'), P(",")],
  [P("  "), K('"name"'), P(": "), S('"Sonarr queue"'), P(",")],
  [P("  "), K('"sources"'), P(": {")],
  [P("    "), K('"default"'), P(": {")],
  [P("      "), K('"type"'), P(": "), S('"integration"'), P(",")],
  [P("      "), K('"integrationKind"'), P(": "), S('"sonarr"')],
  [P("    }")],
  [P("  },")],
  [P("  "), K('"requests"'), P(": {")],
  [P("    "), K('"queue"'), P(": { "), K('"path"'), P(": "), S('"/api/v3/queue"'), P(" },")],
  [P("    "), K('"search"'), P(": {")],
  [P("      "), K('"kind"'), P(": "), S('"action"'), P(", "), K('"method"'), P(": "), S('"POST"'), P(",")],
  [P("      "), K('"path"'), P(": "), S('"/api/v3/command"')],
  [P("    }")],
  [P("  },")],
  [P("  "), K('"options"'), P(": {")],
  [
    P("    "),
    K('"limit"'),
    P(": { "),
    K('"control"'),
    P(": "),
    S('"number"'),
    P(", "),
    K('"default"'),
    P(": "),
    N("4"),
    P(" }"),
  ],
  [P("  },")],
  [P("  "), K('"templateLines"'), P(": [")],
  [P("    "), S('"'), T("<Stack>"), S('",')],
  [P("    "), S('"  {data.queue.records.map(item =>"'), P(",")],
  [P("    "), S('"    '), T("<Progress"), S(" value={item.progress} "), T("/>"), S(')}"'), P(",")],
  [
    P("    "),
    S('"  '),
    T("<ActionButton"),
    S(' requestId=\\"search\\"'),
    T(">"),
    S("Search"),
    T("</ActionButton>"),
    S('",'),
  ],
  [P("    "), S('"'), T("</Stack>"), S('"')],
  [P("  ]")],
  [P("}")],
];
// Line index at which each preview feature becomes available.
const L_SOURCE = 8;
const L_QUEUE = 11;
const L_ACTION = 15;
const L_OPTIONS = 18;
const L_JSX = 25;

const shows = [
  { t: "Severance", e: "S02E10 · 2.4 GB", p: 0.86, c: ["#3b82f6", "#1e3a8a"] },
  { t: "Andor", e: "S02E09 · 3.1 GB", p: 0.61, c: ["#f59e0b", "#7c2d12"] },
  { t: "Slow Horses", e: "S05E02 · 1.8 GB", p: 0.37, c: ["#10b981", "#064e3b"] },
  { t: "The Last of Us", e: "S02E07 · 4.2 GB", p: 0.14, c: ["#ef4444", "#450a0a"] },
];

export function customWidgets(): Scene {
  const bg = h("div", { class: "scene" });
  const fg = h("div", { class: "scene" });

  // Ambient background: dot grid + two drifting colour fields.
  const dots = h("div", {
    class: "abs",
    style:
      "inset:-40px;background-image:radial-gradient(rgba(255,255,255,.09) 1.2px,transparent 1.2px);background-size:36px 36px",
  });
  const blobA = h("div", {
    class: "abs",
    style:
      "width:1300px;height:1300px;border-radius:50%;left:-300px;top:-500px;background:radial-gradient(closest-side,rgba(250,83,82,.22),transparent)",
  });
  const blobB = h("div", {
    class: "abs",
    style:
      "width:1400px;height:1400px;border-radius:50%;left:900px;top:200px;background:radial-gradient(closest-side,rgba(124,140,255,.16),transparent)",
  });
  // The Workshop's background, faded in during the publish so the cut to the next scene doesn't show.
  const bgWs = h("div", { class: "abs", style: `inset:0;background:${WORKSHOP_BG}` });
  bg.append(blobA, blobB, dots, bgWs);

  const chapter = new Chapter("01", "Custom Widgets v2");
  const kicker = h(
    "div",
    { class: "abs mono", style: "left:96px;top:300px;font-size:26px;color:var(--muted)" },
    "This is the big one.",
  );
  const head = new Headline("Build your own widget.", { size: 168, accent: ["own"] });
  const headWrap = h(
    "div",
    { class: "abs", style: "left:92px;top:360px;transform-origin:0 0;white-space:nowrap" },
    head.el,
  );
  const sub = new Headline("Utilize an integration or connect directly.", {
    size: 44,
    weight: 600,
    color: "var(--muted)",
  });
  sub.el.style.letterSpacing = "-0.02em";
  const subWrap = h("div", { class: "abs", style: "left:98px;top:560px" }, sub.el);

  // What the feature is, kept under the small title while the demo runs.
  const desc = h(
    "div",
    {
      class: "abs",
      style: "left:98px;top:200px;font-size:26px;line-height:36px;font-weight:550;color:#b9bbc6;white-space:nowrap",
    },
    h("div", {}, "Build widgets from JSX, API requests, actions and typed settings, or describe one to Assistant."),
    h("div", {}, "Test it in the workbench, then publish it to the Workshop."),
  );

  // ---------- Editor ----------
  const codeT = new CodeType(code);
  codeT.el.style.cssText = "font-size:19px;line-height:28px;font-family:'JetBrains Mono';color:#c9d1d9";
  const gutter = h("div", {
    class: "mono",
    style: "position:absolute;left:0;top:0;width:40px;text-align:right;font-size:15px;line-height:28px;color:#4b4e5a",
  });
  gutter.innerHTML = code.map((_, i) => `<div>${i + 1}</div>`).join("");
  const lineHi = h("div", {
    class: "abs",
    style: "left:-28px;right:-28px;height:28px;background:rgba(250,83,82,.09);border-left:3px solid var(--coral)",
  });
  const scroller = h(
    "div",
    { class: "abs", style: "left:0;top:0;right:0" },
    lineHi,
    gutter,
    h("div", { style: "margin-left:62px" }, codeT.el),
  );
  const codeView = h(
    "div",
    { class: "abs", style: "left:28px;right:28px;top:76px;bottom:20px;overflow:hidden" },
    scroller,
  );
  const tabs = ["General", "API sources", "Requests", "Options", "JSX"].map((t) =>
    h("div", { class: "mono", style: "font-size:14px;color:var(--muted);padding:6px 12px;border-radius:8px" }, t),
  );
  const valid = h(
    "div",
    { class: "row mono", style: "gap:8px;font-size:14px;color:var(--mint);margin-left:auto" },
    icon("circle-check", 18, 2),
    "Valid",
  );
  const titleBar = h(
    "div",
    {
      class: "abs row",
      style: "left:0;right:0;top:0;height:58px;padding:0 20px;gap:10px;border-bottom:1px solid var(--line)",
    },
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#ff5f57" }),
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#febc2e" }),
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#28c840" }),
    h("div", { class: "mono", style: "margin-left:14px;font-size:15px;color:#a6a8b3" }, "sonarr-queue.json"),
    h("div", { class: "row", style: "gap:2px;margin-left:26px" }, ...tabs),
    valid,
  );
  const editor = h(
    "div",
    { class: "abs card", style: "left:96px;top:296px;width:880px;height:690px;overflow:hidden" },
    titleBar,
    codeView,
  );

  // ---------- Preview widget ----------
  const chipDefs = ["API requests", "Actions", "Typed settings", "JSX"];
  const chips = chipDefs.map((c) => h("div", { class: "chip", style: "font-size:19px;padding:9px 16px" }, c));
  const chipRow = h("div", { class: "abs row", style: "left:1060px;top:296px;gap:12px" }, ...chips);

  const rows = shows.map((s) => {
    const bar = h("div", {
      style: "height:100%;width:0;background:linear-gradient(90deg,#ff7b70,#fa5352);border-radius:4px",
    });
    const pct = h(
      "div",
      { class: "mono", style: "font-size:15px;color:var(--muted);width:48px;text-align:right" },
      "0%",
    );
    const el = h(
      "div",
      { class: "row", style: "gap:18px;height:84px;padding:0 4px;border-top:1px solid var(--line)" },
      h("div", {
        style: `width:46px;height:64px;border-radius:8px;background:linear-gradient(160deg,${s.c[0]},${s.c[1]});flex:none`,
      }),
      h(
        "div",
        { class: "col", style: "flex:1;gap:6px" },
        h(
          "div",
          { class: "row", style: "justify-content:space-between" },
          h("div", { style: "font-size:21px;font-weight:700" }, s.t),
          pct,
        ),
        h("div", { style: "font-size:15px;color:var(--muted)" }, s.e),
        h("div", { style: "height:7px;border-radius:4px;background:rgba(255,255,255,.07);margin-top:2px" }, bar),
      ),
    );
    const skel = h("div", {
      class: "abs",
      style:
        "inset:10px 0;border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.1),rgba(255,255,255,.04));background-size:200% 100%",
    });
    const wrap = h("div", { style: "position:relative" }, el, skel);
    return { wrap, el, bar, pct, skel, p: s.p };
  });
  const srcBadge = h(
    "div",
    {
      class: "row mono",
      style: "gap:8px;font-size:13px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase",
    },
    icon("plug-connected", 16, 2),
    "Source · saved Sonarr integration",
  );
  const searchBtn = h(
    "div",
    {
      class: "row",
      style:
        "gap:10px;padding:12px 22px;border-radius:10px;background:rgba(250,83,82,.16);color:#ff8f86;font-weight:700;font-size:19px;border:1px solid rgba(250,83,82,.35)",
    },
    icon("search", 20, 2.2),
    "Search",
  );
  const optPop = h(
    "div",
    {
      class: "row",
      style:
        "gap:12px;padding:10px 14px;border-radius:10px;background:#2a2b33;border:1px solid var(--line2);font-size:17px;color:#d7d8de;margin-left:auto",
    },
    icon("adjustments-horizontal", 20, 2),
    "Items",
    h(
      "div",
      { class: "mono", style: "padding:3px 12px;border-radius:6px;background:#1a1b21;border:1px solid var(--line2)" },
      "4",
    ),
  );
  const header = h(
    "div",
    { class: "row", style: "gap:14px" },
    logo("sonarr", 40),
    h("div", { style: "font-size:27px;font-weight:800;letter-spacing:-.02em" }, "Sonarr queue"),
    h("div", { class: "row", style: "margin-left:auto;gap:8px;color:var(--muted)" }, icon("refresh", 22, 2)),
  );
  const rowsBox = h("div", { class: "col", style: "margin-top:18px" }, ...rows.map((r) => r.wrap));
  const footer = h("div", { class: "row", style: "margin-top:18px;gap:12px" }, searchBtn, optPop);
  const wbTabs = ["Widget", "Data", "Options", "Actions", "Diagnostics"].map((t, i) =>
    h(
      "div",
      {
        class: "mono",
        style: `font-size:14px;padding:8px 14px;border-radius:8px;${i === 0 ? "background:rgba(250,83,82,.16);color:#ff8f86" : "color:var(--muted)"}`,
      },
      t,
    ),
  );
  const wbBar = h(
    "div",
    { class: "row", style: "gap:4px;padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--line)" },
    ...wbTabs,
  );
  const wbBarWrap = h("div", { style: "overflow:hidden" }, wbBar);
  const preview = h(
    "div",
    { class: "abs card", style: "left:1060px;top:364px;width:764px;padding:26px 30px 28px;transform-origin:50% 50%" },
    wbBarWrap,
    header,
    h("div", { style: "margin-top:12px" }, srcBadge),
    rowsBox,
    footer,
  );
  const outlineFlash = h("div", {
    class: "abs",
    style: "inset:-2px;border-radius:19px;border:2px solid var(--coral);box-shadow:0 0 40px rgba(250,83,82,.5)",
  });
  preview.append(outlineFlash);

  // Publish button that sends the widget to the Workshop.
  const publish = h(
    "div",
    {
      class: "abs row",
      style:
        "left:50%;bottom:-78px;transform-origin:50% 50%;gap:10px;padding:14px 26px;border-radius:12px;background:#fa5352;color:#fff;font-weight:800;font-size:22px;white-space:nowrap;box-shadow:0 20px 40px rgba(250,83,82,.35)",
    },
    icon("upload", 22, 2.4),
    "Publish to Workshop",
  );
  const published = h(
    "div",
    {
      class: "abs row center",
      style:
        "inset:0;gap:10px;border-radius:12px;background:#2f9e6b;color:#fff;font-weight:800;font-size:22px;white-space:nowrap",
    },
    icon("check", 22, 2.6),
    "Published",
  );
  publish.style.position = "absolute";
  publish.append(published);
  preview.append(publish);

  // On publish, the preview's card frame (shell) shrinks straight into the widget's catalog slot while the preview
  // content fades out and the Workshop card fades in, both stretched to the shell so the two never ghost.
  const shell = h("div", { class: "abs card", style: "left:0;top:0;box-sizing:border-box" });
  const handoff = publishedCard();
  const landRing = h("div", {
    class: "abs",
    style: `left:${SLOT.x}px;top:${SLOT.y}px;width:${SLOT.w}px;height:${SLOT.h}px;border-radius:16px;border:3px solid #ff8787;box-sizing:border-box`,
  });
  fg.append(chapter.el, kicker, headWrap, subWrap, desc, editor, chipRow, shell, preview, handoff, landRing);

  // Timeline (scene-local seconds)
  const TYPE_A = 2.0;
  const TYPE_B = 4.9;
  const PUBLISH = 6.2;
  const CLICK = PUBLISH + 0.4;
  const MORPH = CLICK + 0.25; // text is already leaving, the shell starts for the slot
  const LANDED = MORPH + 0.6;
  const END = LANDED + 0.4; // last frame: the card alone in its slot on the Workshop background
  const lineStart = codeT.lineStart;
  const charAt = (line: number) => lineStart[line] ?? codeT.total;
  const typed = (t: number) => codeT.total * E.inOutSine(seg(t, TYPE_A, TYPE_B));
  const lineOf = (n: number) => {
    let l = 0;
    lineStart.forEach((s, i) => {
      if (n >= s) l = i + (n - s) / Math.max(1, (lineStart[i + 1] ?? codeT.total) - s);
    });
    return l;
  };
  const tLine = (line: number) => {
    // invert typed(): first t where typed >= charAt(line)
    const target = charAt(line);
    let lo = TYPE_A;
    let hi = TYPE_B;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (typed(m) < target) lo = m;
      else hi = m;
    }
    return hi;
  };
  const tSource = tLine(L_SOURCE);
  const tQueue = tLine(L_QUEUE);
  const tAction = tLine(L_ACTION);
  const tOptions = tLine(L_OPTIONS);
  const tJsx = tLine(L_JSX);
  const feature = [tQueue, tAction, tOptions, tJsx];
  const cues: Scene["cues"] = [
    { t: TYPE_A, kind: "type", dur: TYPE_B - TYPE_A, gain: 0.55 },
    ...feature.map((f) => ({ t: f, kind: "pop" as const, gain: 0.7 })),
    { t: PUBLISH - 0.4, kind: "swish", gain: 0.6 },
    { t: CLICK, kind: "click", gain: 0.8 },
    { t: MORPH + 0.1, kind: "swish", gain: 0.5 },
    { t: LANDED, kind: "pop", gain: 0.6, pitch: 4 },
  ];

  return {
    name: "custom-widgets",
    start: 0,
    end: END,
    enter: { dir: "up", dur: 0.45 },
    bg,
    fg,
    cues,
    update(t, ctx) {
      // Background drift
      tf(blobA, { x: Math.sin(t * 0.3) * 120, y: Math.cos(t * 0.25) * 80 });
      tf(blobB, { x: Math.cos(t * 0.22) * 140, y: Math.sin(t * 0.3) * 90 });
      tf(dots, { y: -t * 6, o: 0.8 });

      // Intro title. After Publish the description clears out of the card's path at once; the title leaves as the
      // card lands, so the scene ends on the card alone.
      const leave = E.inCubic(seg(t, CLICK + 0.1, CLICK + 0.4));
      const leaveHead = E.inCubic(seg(t, LANDED - 0.1, END - 0.1));
      chapter.update(t, 0.25, LANDED - 0.1);
      kicker.style.opacity = t > 0.3 && t < 1.75 ? "1" : "0";
      head.update(t, 0.4, Infinity, 0.05, 0.6);
      sub.update(t, 0.75, 1.7, 0.025, 0.6);
      const shrink = E.inOutQuart(seg(t, 1.65, 2.2));
      headWrap.style.transform = `translate(${lerp(0, 4, shrink) - leaveHead * 80}px,${lerp(0, -232, shrink)}px) scale(${lerp(1, 0.4, shrink)})`;
      headWrap.style.opacity = String(1 - leaveHead);
      const dIn = E.outExpo(seg(t, 1.95, 2.5));
      tf(desc, { x: -leave * 80, y: (1 - dIn) * 16, o: dIn * (1 - leave) });
      desc.style.clipPath = `inset(0 ${((1 - E.outQuart(seg(t, 1.95, 2.7))) * 100).toFixed(1)}% 0 0)`;

      // Editor: slides up with a slight 3D tilt, leaves left once the widget is ready to publish.
      const edIn = E.outExpo(seg(t, 1.75, 2.4));
      const edOut = E.inOutQuart(seg(t, PUBLISH - 0.45, PUBLISH + 0.15));
      editor.style.transform = `perspective(1600px) translate(${(-edOut * 1000).toFixed(1)}px,${((1 - edIn) * 160).toFixed(1)}px) rotateY(${((1 - edIn) * 12 + edOut * -25).toFixed(2)}deg)`;
      editor.style.opacity = String(Math.min(seg(t, 1.75, 1.9), 1 - edOut));
      editor.style.display = t > 1.7 && t < PUBLISH + 0.2 ? "" : "none";
      const n = typed(t);
      const line = codeT.set(Math.floor(n), t < TYPE_B + 0.5);
      const lf = lineOf(n);
      const scrollY = Math.max(0, lf - 15) * 28;
      scroller.style.transform = `translateY(${(-scrollY).toFixed(1)}px)`;
      lineHi.style.transform = `translateY(${(line * 28).toFixed(1)}px)`;
      lineHi.style.opacity = t < TYPE_B + 0.5 ? "1" : "0";
      const activeTab = n < charAt(3) ? 0 : n < charAt(9) ? 1 : n < charAt(16) ? 2 : n < charAt(19) ? 3 : 4;
      tabs.forEach((tb, i) => {
        tb.style.background = i === activeTab ? "rgba(250,83,82,.16)" : "transparent";
        tb.style.color = i === activeTab ? "#ff8f86" : "var(--muted)";
      });
      const v = E.outBack(seg(t, TYPE_B + 0.1, TYPE_B + 0.4));
      valid.style.opacity = t > TYPE_B + 0.1 ? "1" : "0";
      valid.style.transform = `scale(${v.toFixed(3)})`;

      // Chips light up as their code is typed.
      const chipIn = E.outExpo(seg(t, 1.9, 2.4));
      const chipOut = t > PUBLISH - 0.4;
      chips.forEach((c, i) => {
        const on = t >= feature[i]!;
        const k = on ? Math.exp(-(t - feature[i]!) * 3) : 0;
        c.style.background = on ? `rgba(250,83,82,${(0.18 + k * 0.5).toFixed(3)})` : "rgba(255,255,255,.04)";
        c.style.borderColor = on ? "rgba(250,83,82,.6)" : "var(--line2)";
        c.style.color = on ? "#fff" : "var(--muted)";
        c.style.transform = `translateY(${((1 - chipIn) * 30).toFixed(1)}px) scale(${(1 + k * 0.08).toFixed(3)})`;
        c.style.opacity = chipOut ? "0" : String(chipIn);
      });

      // Preview card: appears with the source, grows features, then takes centre stage to be published.
      const pvIn = E.outExpo(seg(t, tSource - 0.1, tSource + 0.45));
      const toPub = E.inOutQuart(seg(t, PUBLISH - 0.4, PUBLISH + 0.05));
      const lift = t > CLICK ? E.outCubic(seg(t, CLICK, CLICK + 0.6)) : 0;
      const pvH = preview.offsetHeight;
      // Preview rect on screen (transform origin is its centre).
      const ps = lerp(1, 0.9, toPub) * (1 + lift * 0.02);
      const pw = 764 * ps;
      const ph = pvH * ps;
      const pcx = 1060 + 382 + lerp(0, -482, toPub);
      const pcy = 364 + pvH / 2 + lerp((1 - pvIn) * 80, -40, toPub) - lift * 14;
      // Shell rect: from the preview to the catalog slot.
      const u = seg(t, MORPH, LANDED);
      const m = E.inOutCubic(u);
      const rw = lerp(pw, SLOT.w, m);
      const rh = lerp(ph, SLOT.h, m);
      const rx = lerp(pcx - pw / 2, SLOT.x, m);
      const ry = lerp(pcy - ph / 2, SLOT.y, m);
      preview.style.transform = `translate(${(rx + rw / 2 - 1442).toFixed(2)}px,${(ry + rh / 2 - 364 - pvH / 2).toFixed(2)}px) scale(${(rw / 764).toFixed(4)},${(rh / pvH).toFixed(4)})`;
      // Quick crossfade to the card content early in the move; visibility (not display) keeps pvH measurable.
      preview.style.opacity = String(Math.min(pvIn * 3, 1) * (1 - E.inOutSine(seg(u, 0.1, 0.3))));
      preview.style.visibility = u < 0.3 ? "" : "hidden";
      shell.style.display = t >= MORPH && u < 1 ? "" : "none";
      Object.assign(shell.style, {
        left: `${rx.toFixed(2)}px`,
        top: `${ry.toFixed(2)}px`,
        width: `${rw.toFixed(2)}px`,
        height: `${rh.toFixed(2)}px`,
        borderRadius: `${lerp(18 * ps, 14, m).toFixed(2)}px`,
        boxShadow: `0 40px 90px -20px rgba(0,0,0,${(0.65 * (1 - m)).toFixed(3)})`,
      });
      handoff.style.display = u > 0.2 ? "" : "none";
      handoff.style.opacity = E.inOutSine(seg(u, 0.2, 0.4)).toFixed(3);
      handoff.style.transform =
        u < 1
          ? `translate(${(rx - SLOT.x).toFixed(2)}px,${(ry - SLOT.y).toFixed(2)}px) scale(${(rw / SLOT.w).toFixed(4)},${(rh / SLOT.h).toFixed(4)})`
          : "";
      const ring = seg(t, LANDED, LANDED + 0.35);
      tf(landRing, { s: lerp(1, 1.1, E.outCubic(ring)), o: t < LANDED ? 0 : (1 - ring) * 0.9 });
      const flashK = Math.max(
        ...feature.map((f) => (t >= f ? Math.exp(-(t - f) * 4) : 0)),
        t >= tSource ? Math.exp(-(t - tSource) * 4) : 0,
      );
      outlineFlash.style.opacity = String(flashK * 0.9);

      rows.forEach((r, i) => {
        const rin = E.outExpo(seg(t, tQueue + i * 0.05, tQueue + 0.35 + i * 0.05));
        r.wrap.style.opacity = String(rin);
        r.wrap.style.transform = `translateY(${((1 - rin) * 20).toFixed(1)}px)`;
        const loaded = seg(t, tQueue + 0.3 + i * 0.06, tQueue + 0.45 + i * 0.06);
        r.skel.style.opacity = String(1 - loaded);
        r.skel.style.backgroundPosition = `${(-t * 300) % 400}px 0`;
        r.el.style.opacity = String(loaded);
        const fillP = E.outExpo(seg(t, tJsx + i * 0.08, tJsx + 0.9 + i * 0.08));
        const live = r.p + Math.max(0, t - tJsx - 0.9) * 0.01 * (i + 1);
        const val = Math.min(0.99, live) * fillP;
        r.bar.style.width = `${(val * 100).toFixed(2)}%`;
        r.pct.textContent = `${Math.round(val * 100)}%`;
      });
      const sIn = spring(t - tAction, 3, 0.45);
      searchBtn.style.transform = `scale(${clamp(sIn, 0, 2).toFixed(3)})`;
      searchBtn.style.opacity = t >= tAction ? "1" : "0";
      const oIn = spring(t - tOptions, 3, 0.45);
      optPop.style.transform = `scale(${clamp(oIn, 0, 2).toFixed(3)})`;
      optPop.style.opacity = t >= tOptions ? "1" : "0";
      const wb = E.outExpo(seg(t, TYPE_B + 0.1, TYPE_B + 0.5));
      wbBarWrap.style.height = `${(wb * 58).toFixed(1)}px`;
      wbBarWrap.style.opacity = String(wb);
      const pub = spring(t - PUBLISH, 3, 0.5);
      const press = 1 - Math.sin(seg(t, CLICK - 0.09, CLICK + 0.09) * Math.PI) * 0.1;
      publish.style.transform = `translateX(-50%) scale(${(clamp(pub, 0, 2) * press).toFixed(3)})`;
      publish.style.opacity = t >= PUBLISH ? "1" : "0";
      published.style.opacity = t >= CLICK ? "1" : "0";
    },
  };
}
