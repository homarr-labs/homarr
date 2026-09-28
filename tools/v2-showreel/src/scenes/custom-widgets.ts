import { E, seg, lerp, env, spring, clamp } from "../lib/anim";
import { h, tf, icon, logo } from "../lib/dom";
import { Chapter, CodeType, Headline, TypeLine, type Tok } from "../lib/kit";
import type { Scene } from "../lib/scene";

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
  [P("    "), K('"limit"'), P(": { "), K('"control"'), P(": "), S('"number"'), P(", "), K('"default"'), P(": "), N("4"), P(" }")],
  [P("  },")],
  [P("  "), K('"templateLines"'), P(": [")],
  [P("    "), S('"'), T("<Stack>"), S('",')],
  [P("    "), S('"  {data.queue.records.map(item =>"'), P(",")],
  [P("    "), S('"    '), T("<Progress"), S(" value={item.progress} "), T("/>"), S(')}"'), P(",")],
  [P("    "), S('"  '), T('<ActionButton'), S(' requestId=\\"search\\"'), T(">"), S('Search'), T("</ActionButton>"), S('",')],
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
  bg.append(blobA, blobB, dots);

  // Coral bars retracting: continuation of the intro fly-through.
  const bars = Array.from({ length: 6 }, (_, i) =>
    h("div", { class: "abs", style: `top:0;bottom:0;left:${i * 320}px;width:322px;background:#fa5352;transform-origin:50% 0` }),
  );

  const chapter = new Chapter("01", "Custom Widgets v2");
  const kicker = h("div", { class: "abs mono", style: "left:96px;top:300px;font-size:26px;color:var(--muted)" }, "This is the big one.");
  const head = new Headline("Build almost any widget.", { size: 168, accent: ["any"] });
  const headWrap = h("div", { class: "abs", style: "left:92px;top:360px;transform-origin:0 0;white-space:nowrap" }, head.el);
  const sub = new Headline("From JSX, API requests, actions and typed settings.", { size: 44, weight: 600, color: "var(--muted)" });
  sub.el.style.letterSpacing = "-0.02em";
  const subWrap = h("div", { class: "abs", style: "left:98px;top:560px" }, sub.el);

  // Guard heading shares the header slot.
  const head3 = new Headline("Every request is checked.", { size: 64 });
  const head3Wrap = h("div", { class: "abs", style: "left:96px;top:128px;white-space:nowrap" }, head3.el);

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
  const scroller = h("div", { class: "abs", style: "left:0;top:0;right:0" }, lineHi, gutter, h("div", { style: "margin-left:62px" }, codeT.el));
  const codeView = h("div", { class: "abs", style: "left:28px;right:28px;top:76px;bottom:20px;overflow:hidden" }, scroller);
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
    { class: "abs row", style: "left:0;right:0;top:0;height:58px;padding:0 20px;gap:10px;border-bottom:1px solid var(--line)" },
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#ff5f57" }),
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#febc2e" }),
    h("div", { style: "width:12px;height:12px;border-radius:50%;background:#28c840" }),
    h("div", { class: "mono", style: "margin-left:14px;font-size:15px;color:#a6a8b3" }, "sonarr-queue.json"),
    h("div", { class: "row", style: "gap:2px;margin-left:26px" }, ...tabs),
    valid,
  );
  const editor = h("div", { class: "abs card", style: "left:96px;top:262px;width:880px;height:700px;overflow:hidden" }, titleBar, codeView);

  // ---------- Preview widget ----------
  const chipDefs = ["API requests", "Actions", "Typed settings", "JSX"];
  const chips = chipDefs.map((c) => h("div", { class: "chip", style: "font-size:19px;padding:9px 16px" }, c));
  const chipRow = h("div", { class: "abs row", style: "left:1060px;top:262px;gap:12px" }, ...chips);

  const rows = shows.map((s) => {
    const bar = h("div", { style: "height:100%;width:0;background:linear-gradient(90deg,#ff7b70,#fa5352);border-radius:4px" });
    const pct = h("div", { class: "mono", style: "font-size:15px;color:var(--muted);width:48px;text-align:right" }, "0%");
    const el = h(
      "div",
      { class: "row", style: "gap:18px;height:84px;padding:0 4px;border-top:1px solid var(--line)" },
      h("div", { style: `width:46px;height:64px;border-radius:8px;background:linear-gradient(160deg,${s.c[0]},${s.c[1]});flex:none` }),
      h(
        "div",
        { class: "col", style: "flex:1;gap:6px" },
        h("div", { class: "row", style: "justify-content:space-between" }, h("div", { style: "font-size:21px;font-weight:700" }, s.t), pct),
        h("div", { style: "font-size:15px;color:var(--muted)" }, s.e),
        h("div", { style: "height:7px;border-radius:4px;background:rgba(255,255,255,.07);margin-top:2px" }, bar),
      ),
    );
    const skel = h("div", {
      class: "abs",
      style: "inset:10px 0;border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.1),rgba(255,255,255,.04));background-size:200% 100%",
    });
    const wrap = h("div", { style: "position:relative" }, el, skel);
    return { wrap, el, bar, pct, skel, p: s.p };
  });
  const srcBadge = h(
    "div",
    { class: "row mono", style: "gap:8px;font-size:13px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase" },
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
    h("div", { class: "mono", style: "padding:3px 12px;border-radius:6px;background:#1a1b21;border:1px solid var(--line2)" }, "4"),
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
  const wbBar = h("div", { class: "row", style: "gap:4px;padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--line)" }, ...wbTabs);
  const wbBarWrap = h("div", { style: "overflow:hidden" }, wbBar);
  const preview = h(
    "div",
    { class: "abs card", style: "left:1060px;top:330px;width:764px;padding:26px 30px 28px;transform-origin:50% 50%" },
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
  preview.append(publish);

  // ---------- Guardrails ----------
  // The widget's action goes through one Homarr checkpoint whose rows tick off before Sonarr is called.
  const pipeY = 535;
  const CP_L = 740;
  const CP_R = 1180;
  const SN_L = 1420;
  const checks = ["Host checks", "Timeouts", "Size limits", "Permissions", "Rate limits"].map((g) => {
    const dot = h("div", { class: "abs", style: "inset:0;border-radius:50%;border:2.5px solid rgba(255,255,255,.22)" });
    const ok = h("div", { class: "abs center", style: "inset:0;border-radius:50%;background:#3ddc97;color:#07130d" }, icon("check", 18, 3.2));
    const el = h(
      "div",
      { class: "row", style: "gap:16px;height:58px;padding:0 22px;font-size:24px;font-weight:650;border-top:1px solid var(--line)" },
      h("div", { style: "position:relative;width:28px;height:28px;flex:none" }, dot, ok),
      g,
    );
    return { el, ok };
  });
  const checkpoint = h(
    "div",
    { class: "abs card", style: `left:${CP_L}px;width:${CP_R - CP_L}px;top:${pipeY - 206}px;overflow:hidden;border-color:rgba(61,220,151,.28)` },
    h(
      "div",
      { class: "row", style: "gap:14px;height:88px;padding:0 22px;font-size:26px;font-weight:800" },
      h("div", { class: "center", style: "width:46px;height:46px;border-radius:13px;background:rgba(61,220,151,.14);color:#3ddc97" }, icon("shield-check", 26, 2.2)),
      "Homarr",
      h("div", { class: "mono", style: "margin-left:auto;font-size:14px;letter-spacing:.14em;color:var(--muted)" }, "EVERY REQUEST"),
    ),
    ...checks.map((c) => c.el),
  );
  const wireA = h("div", { class: "abs", style: `left:548px;width:${CP_L - 548}px;top:${pipeY - 1}px;height:3px;background:rgba(250,83,82,.55);transform-origin:0 50%` });
  const wireB = h("div", { class: "abs", style: `left:${CP_R}px;width:${SN_L - CP_R}px;top:${pipeY - 1}px;height:3px;background:rgba(250,83,82,.55);transform-origin:0 50%` });
  const packet = h(
    "div",
    {
      class: "abs row mono",
      style:
        "left:0;top:0;gap:8px;padding:9px 15px;border-radius:999px;background:#fa5352;color:#fff;font-weight:700;font-size:16px;white-space:nowrap;box-shadow:0 0 30px rgba(250,83,82,.7)",
    },
    "POST /api/v3/command",
  );
  const sonarrNode = h(
    "div",
    { class: "abs card center col", style: `left:${SN_L}px;top:${pipeY - 110}px;width:220px;height:220px;gap:14px` },
    logo("sonarr", 84),
    h("div", { style: "font-size:24px;font-weight:700" }, "Sonarr"),
  );
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) =>
    h("div", { class: "chip mono", style: `font-size:20px;${m === "DELETE" ? "border-color:rgba(250,83,82,.5);color:#ff8f86" : ""}` }, m),
  );
  const methodRow = h(
    "div",
    { class: "abs row", style: "left:96px;top:830px;gap:12px" },
    h("div", { class: "label", style: "color:var(--muted);margin-right:10px" }, "Actions"),
    ...methods,
  );
  const lockLine = h(
    "div",
    { class: "abs row", style: "left:96px;top:915px;gap:14px;font-size:26px;font-weight:600;color:#d7d8de" },
    h("div", { style: "color:var(--mint)" }, icon("lock", 28, 2)),
    "Credentials are encrypted separately and stay out of exports and Workshop submissions.",
  );
  const guard = h("div", { class: "abs", style: "inset:0" }, wireA, wireB, checkpoint, sonarrNode, methodRow, lockLine);

  fg.append(chapter.el, kicker, headWrap, subWrap, head3Wrap, editor, chipRow, guard, preview, packet, ...bars);

  // Timeline (scene-local seconds)
  const TYPE_A = 2.0;
  const TYPE_B = 4.9;
  const GUARD = 5.5;
  const PUBLISH = 8.5;
  const END = 9.75;
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
  // Guard beats
  const PK0 = GUARD + 0.45; // packet leaves the widget
  const PK_IN = PK0 + 0.3; // enters the checkpoint
  const checkAt = (i: number) => PK_IN + 0.08 + i * 0.1;
  const PK_OUT = checkAt(4) + 0.12;
  const PK_HIT = PK_OUT + 0.28;

  const cues: Scene["cues"] = [
    { t: 0.0, kind: "whoosh", gain: 0.7 },
    { t: 0.45, kind: "hit", gain: 0.8 },
    { t: 1.75, kind: "swish", gain: 0.6 },
    { t: TYPE_A, kind: "type", dur: TYPE_B - TYPE_A, gain: 0.55 },
    ...feature.map((f) => ({ t: f, kind: "pop" as const, gain: 0.7 })),
    { t: tSource, kind: "tick", gain: 0.6 },
    { t: TYPE_B + 0.15, kind: "chime", gain: 0.6 },
    { t: GUARD - 0.15, kind: "whoosh", gain: 0.7 },
    { t: PK0, kind: "swish", gain: 0.4 },
    ...checks.map((_, i) => ({ t: checkAt(i), kind: "tick" as const, gain: 0.5, pitch: i + 2 })),
    { t: PK_HIT, kind: "hit", gain: 0.5 },
    { t: PUBLISH + 0.25, kind: "click", gain: 0.8 },
    { t: PUBLISH + 0.4, kind: "riser", dur: 0.3, gain: 0.5 },
    { t: PUBLISH + 0.72, kind: "whoosh", gain: 0.9 },
  ];

  return {
    name: "custom-widgets",
    start: 0,
    end: END,
    bg,
    fg,
    cues,
    update(t, ctx) {
      // Background drift
      tf(blobA, { x: Math.sin(t * 0.3) * 120, y: Math.cos(t * 0.25) * 80 });
      tf(blobB, { x: Math.cos(t * 0.22) * 140, y: Math.sin(t * 0.3) * 90 });
      tf(dots, { y: -t * 6, o: 0.8 });

      bars.forEach((b, i) => {
        const p = E.inOutQuart(seg(t, 0.02 + i * 0.04, 0.4 + i * 0.04));
        b.style.transform = `scaleY(${(1 - p).toFixed(4)})`;
        b.style.display = p >= 1 ? "none" : "";
      });
      ctx.fx.shake = Math.exp(-t * 6) * 6;

      // Intro title
      chapter.update(t, 0.25, PUBLISH - 0.45);
      kicker.style.opacity = t > 0.3 && t < 1.75 ? "1" : "0";
      head.update(t, 0.4, Infinity, 0.05, 0.6);
      sub.update(t, 0.75, 1.7, 0.025, 0.6);
      const shrink = E.inOutQuart(seg(t, 1.65, 2.2));
      // The small title leaves with the editor instead of dropping word by word.
      const hdOut = E.inOutQuart(seg(t, GUARD - 0.35, GUARD + 0.1));
      headWrap.style.transform = `translate(${(lerp(0, 4, shrink) - hdOut * 1100).toFixed(1)}px,${lerp(0, -232, shrink)}px) scale(${lerp(1, 0.4, shrink)})`;
      headWrap.style.filter = hdOut > 0.01 ? `blur(${(hdOut * 12).toFixed(1)}px)` : "";
      headWrap.style.display = hdOut < 1 ? "" : "none";

      // Editor: slides up with a slight 3D tilt, leaves left for the guard.
      const edIn = E.outExpo(seg(t, 1.75, 2.4));
      const edOut = E.inOutQuart(seg(t, GUARD - 0.35, GUARD + 0.25));
      editor.style.transform = `perspective(1600px) translate(${(-edOut * 1000).toFixed(1)}px,${((1 - edIn) * 160).toFixed(1)}px) rotateY(${((1 - edIn) * 12 + edOut * -25).toFixed(2)}deg)`;
      editor.style.opacity = String(Math.min(seg(t, 1.75, 1.9), 1 - edOut));
      editor.style.display = t > 1.7 && t < GUARD + 0.3 ? "" : "none";
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
      const chipOut = t > GUARD - 0.3;
      chips.forEach((c, i) => {
        const on = t >= feature[i]!;
        const k = on ? Math.exp(-(t - feature[i]!) * 3) : 0;
        c.style.background = on ? `rgba(250,83,82,${(0.18 + k * 0.5).toFixed(3)})` : "rgba(255,255,255,.04)";
        c.style.borderColor = on ? "rgba(250,83,82,.6)" : "var(--line2)";
        c.style.color = on ? "#fff" : "var(--muted)";
        c.style.transform = `translateY(${((1 - chipIn) * 30).toFixed(1)}px) scale(${(1 + k * 0.08).toFixed(3)})`;
        c.style.opacity = chipOut ? "0" : String(chipIn);
      });

      // Preview card: appears with the source, grows features, then shrinks left to become the request's origin.
      const pvIn = E.outExpo(seg(t, tSource - 0.1, tSource + 0.45));
      const toGuard = E.inOutQuart(seg(t, GUARD - 0.3, GUARD + 0.3));
      const pubFly = E.inExpo(seg(t, PUBLISH + 0.45, PUBLISH + 1.05));
      const toPub = E.inOutQuart(seg(t, PUBLISH - 0.4, PUBLISH + 0.05));
      const px = lerp(lerp(0, -1112, toGuard), -482, toPub);
      const py = lerp(lerp((1 - pvIn) * 80, -75, toGuard), -40, toPub) - pubFly * 900;
      const ps = lerp(lerp(1, 0.55, toGuard), 0.9, toPub) * (1 + pubFly * 0.25);
      preview.style.transform = `perspective(1600px) translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${ps.toFixed(4)}) rotateX(${(pubFly * 25).toFixed(2)}deg)`;
      preview.style.opacity = String(Math.min(pvIn * 3, 1));
      preview.style.filter = pubFly > 0.05 ? `blur(${(pubFly * 10).toFixed(1)}px)` : "";
      const flashK = Math.max(...feature.map((f) => (t >= f ? Math.exp(-(t - f) * 4) : 0)), t >= tSource ? Math.exp(-(t - tSource) * 4) : 0);
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
      // The Search action is what fires the guarded request.
      const fire = t > PK0 - 0.1 ? Math.exp(-(t - PK0 + 0.1) * 5) : 0;
      searchBtn.style.boxShadow = `0 0 ${(fire * 30).toFixed(0)}px rgba(250,83,82,${(fire * 0.9).toFixed(2)})`;
      const oIn = spring(t - tOptions, 3, 0.45);
      optPop.style.transform = `scale(${clamp(oIn, 0, 2).toFixed(3)})`;
      optPop.style.opacity = t >= tOptions ? "1" : "0";
      const wb = E.outExpo(seg(t, TYPE_B + 0.1, TYPE_B + 0.5)) * (1 - toGuard);
      wbBarWrap.style.height = `${(wb * 58).toFixed(1)}px`;
      wbBarWrap.style.opacity = String(wb);
      const pub = spring(t - PUBLISH, 3, 0.5);
      const press = t > PUBLISH + 0.25 ? 1 - Math.sin(clamp((t - PUBLISH - 0.25) / 0.18) * Math.PI) * 0.1 : 1;
      publish.style.transform = `translateX(-50%) scale(${(clamp(pub, 0, 2) * press).toFixed(3)})`;
      publish.style.opacity = t >= PUBLISH ? "1" : "0";

      // Guardrails
      const gOn = t > GUARD - 0.1 && t < PUBLISH - 0.1;
      guard.style.display = gOn ? "" : "none";
      head3.update(t, GUARD + 0.08, PUBLISH - 0.5, 0.04, 0.55);
      const gOut = E.inCubic(seg(t, PUBLISH - 0.45, PUBLISH - 0.15));
      const cpIn = E.outBack(seg(t, GUARD + 0.05, GUARD + 0.4), 1.4);
      tf(checkpoint, { s: lerp(0.9, 1, cpIn), y: -gOut * 30, o: (t > GUARD + 0.05 ? 1 : 0) * (1 - gOut) });
      checkpoint.style.clipPath = `inset(0 0 ${((1 - E.outExpo(seg(t, GUARD + 0.05, GUARD + 0.45))) * 100).toFixed(1)}% 0 round 18px)`;
      tf(wireA, { sx: E.outExpo(seg(t, GUARD + 0.2, GUARD + 0.5)), o: 1 - gOut });
      tf(wireB, { sx: E.outExpo(seg(t, PK_OUT - 0.1, PK_OUT + 0.15)), o: 1 - gOut });
      const snIn = E.outExpo(seg(t, GUARD + 0.15, GUARD + 0.5));
      const hitS = t > PK_HIT ? Math.exp(-(t - PK_HIT) * 5) : 0;
      tf(sonarrNode, { x: (1 - snIn) * 160, s: 1 + hitS * 0.1, o: (t > GUARD + 0.15 ? 1 : 0) * (1 - gOut) });
      sonarrNode.style.boxShadow = `0 0 ${(hitS * 60).toFixed(0)}px rgba(250,83,82,${(hitS * 0.8).toFixed(2)})`;
      checks.forEach((c, i) => {
        const at = checkAt(i);
        c.ok.style.transform = `scale(${clamp(E.outBack(seg(t, at, at + 0.2), 2.2), 0, 1.3).toFixed(3)})`;
        c.ok.style.opacity = t >= at ? "1" : "0";
        const k = t >= at ? Math.exp(-(t - at) * 6) : 0;
        c.el.style.background = `rgba(61,220,151,${(k * 0.16).toFixed(3)})`;
      });
      // Packet: widget → checkpoint (hidden inside while checks run) → Sonarr.
      const inA = E.inOutCubic(seg(t, PK0, PK_IN));
      const inB = E.inOutCubic(seg(t, PK_OUT, PK_HIT));
      const pkX = t < PK_OUT ? lerp(520, CP_L - 30, inA) : lerp(CP_R + 30, SN_L - 10, inB);
      const pkW = 222;
      packet.style.transform = `translate(${(pkX - pkW / 2).toFixed(1)}px,${pipeY - 20}px)`;
      packet.style.opacity = (t > PK0 && t < PK_IN) || (t > PK_OUT && t < PK_HIT) ? "1" : "0";
      methods.forEach((m, i) => {
        const at = GUARD + 0.3 + i * 0.05;
        const mi = E.outBack(seg(t, at, at + 0.25), 2);
        m.style.opacity = String((t >= at ? 1 : 0) * (1 - gOut));
        m.style.transform = `scale(${clamp(lerp(0.6, 1, mi), 0, 1.2).toFixed(3)})`;
      });
      (methodRow.firstElementChild as HTMLElement).style.opacity = String((t > GUARD + 0.25 ? 1 : 0) * (1 - gOut));
      const li = E.outQuart(seg(t, PK_HIT - 0.1, PK_HIT + 0.4));
      lockLine.style.opacity = String((t > PK_HIT - 0.1 ? 1 : 0) * (1 - gOut));
      lockLine.style.clipPath = `inset(0 ${((1 - li) * 100).toFixed(1)}% 0 0)`;
    },
  };
}
