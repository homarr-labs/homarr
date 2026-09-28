import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo, offsetWithin, tf } from "../lib/dom";
import { Chapter, CharPop, Headline, TypeLine, countTo } from "../lib/kit";
import type { Scene } from "../lib/scene";

const kbd = (k: string) => h("div", { class: "kbd", style: "font-size:17px" }, k);

/** Bento card shell; `vis` holds the per-card micro-animation. */
function card(accent: string, ic: string, title: string, line: string, vis: HTMLElement, keys?: HTMLElement) {
  return h(
    "div",
    { class: "abs card col", style: `padding:28px 32px;gap:12px;border-color:${accent}40;overflow:hidden` },
    h(
      "div",
      { class: "row", style: "gap:16px" },
      h("div", { class: "center", style: `width:50px;height:50px;border-radius:15px;background:${accent}22;color:${accent};flex:none` }, icon(ic, 28, 2)),
      h("div", { style: "font-size:30px;font-weight:850;letter-spacing:-.02em;white-space:nowrap" }, title),
      keys ? h("div", { class: "row", style: "margin-left:auto;gap:6px" }, keys) : "",
    ),
    h("div", { style: "font-size:21px;line-height:1.4;color:#b9bbc6" }, line),
    h("div", { style: "flex:1;position:relative;margin-top:6px" }, vis),
  );
}

export function rest(): Scene {
  const fg = h("div", { class: "scene" });

  // ---------- Title ----------
  const big = new CharPop("The rest", 210);
  const bigSub = new Headline("(there is a lot)", { size: 64, weight: 700, color: "var(--coral)" });
  const title = h("div", { class: "abs col center", style: "inset:0;gap:18px" }, big.el, bigSub.el);
  const chapter = new Chapter("06", "The rest (there is a lot)");

  // ---------- Page 1 ----------
  // Onboarding: six stages complete in sequence.
  const STAGES = ["First admin", "Core settings", "Docker discovery", "Apps", "Integrations", "First board"];
  const stageEls = STAGES.map((s, i) => {
    const num = h("div", { class: "center mono", style: "width:30px;height:30px;border-radius:50%;flex:none;font-size:14px;font-weight:800;border:2px solid rgba(255,255,255,.2);color:#8f919d" }, String(i + 1));
    const done = h("div", { class: "abs center", style: "inset:-2px;border-radius:50%;background:#3ddc97;color:#07130d" }, icon("check", 18, 3));
    num.style.position = "relative";
    num.append(done);
    const el = h("div", { class: "row", style: "gap:10px;font-size:17px;font-weight:650;white-space:nowrap" }, num, s);
    return { el, done };
  });
  const visOnb = h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:14px 18px" }, ...stageEls.map((s) => s.el));
  // Board switcher: keyboard focus walks a gallery.
  const BOARDS: [string, string[]][] = [
    ["Homelab", ["#fa5352", "#7c8cff", "#3ddc97"]],
    ["Media", ["#ffb547", "#fa5352", "#4fb3ff"]],
    ["Family", ["#3ddc97", "#ffb547", "#7c8cff"]],
    ["Servers", ["#4fb3ff", "#3ddc97", "#fa5352"]],
  ];
  const thumbs = BOARDS.map(([name, cs]) =>
    h(
      "div",
      { class: "col", style: "flex:1;gap:8px;padding:8px;border-radius:12px;border:2px solid transparent" },
      h(
        "div",
        { style: "height:78px;border-radius:8px;background:#121318;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:5px;padding:6px" },
        h("div", { style: `grid-row:span 2;border-radius:5px;background:${cs[0]}55` }),
        h("div", { style: `border-radius:5px;background:${cs[1]}55` }),
        h("div", { style: `border-radius:5px;background:${cs[2]}55` }),
      ),
      h("div", { style: "font-size:15px;font-weight:700;text-align:center" }, name),
    ),
  );
  const visSwitch = h("div", { class: "row", style: "gap:8px;align-items:stretch" }, ...thumbs);
  // Command menu: a query and its results.
  const query = new TypeLine("se", "", "#4fb3ff");
  const RESULTS: [string, string, string][] = [
    ["settings", "Settings", "Page"],
    ["apps", "Seerr", "App"],
    ["world-search", "Search engines", "Page"],
  ];
  const results = RESULTS.map(([ic, name, kind]) =>
    h(
      "div",
      { class: "row", style: "gap:12px;height:32px;padding:0 12px;border-radius:9px;font-size:17px;font-weight:650" },
      h("div", { style: "color:#8fcfff" }, icon(ic, 19, 2)),
      name,
      h("div", { class: "mono", style: "margin-left:auto;font-size:12px;color:#8f919d;letter-spacing:.1em" }, kind.toUpperCase()),
    ),
  );
  const visCmd = h(
    "div",
    { class: "col", style: "gap:4px" },
    h("div", { class: "row", style: "gap:10px;height:38px;padding:0 14px;border-radius:10px;background:#121318;border:1px solid rgba(79,179,255,.45);font-size:18px;margin-bottom:2px" }, h("div", { style: "color:#8f919d" }, icon("search", 18, 2.2)), query.el),
    ...results,
  );
  // Header studio: three zones; a Docker shortcut drops into the right one.
  const hIcon = (ic: string) => h("div", { class: "center", style: "width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid var(--line2);flex:none" }, icon(ic, 20, 2.1));
  const zone = (label: string, ...chips: HTMLElement[]) =>
    h(
      "div",
      { class: "col", style: "gap:8px" },
      h("div", { class: "label", style: "font-size:11px;color:#ffd79a;letter-spacing:.18em" }, label),
      h("div", { class: "row", style: "gap:6px;height:56px;padding:0 9px;border-radius:12px;border:1.5px dashed rgba(255,181,71,.4);background:rgba(255,181,71,.04)" }, ...chips),
    );
  const dockerChip = hIcon("brand-docker");
  dockerChip.style.color = "#8fcfff";
  const dockerSlot = h("div", { style: "width:0;height:38px;flex:none;position:relative" }, h("div", { class: "abs", style: "left:0;top:0" }, dockerChip));
  const visHeader = h(
    "div",
    { class: "row", style: "justify-content:space-between;align-items:flex-start" },
    zone("Left", h("div", { class: "row", style: "gap:8px;height:38px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid var(--line2);font-size:15px;font-weight:750" }, icon("layout-dashboard", 17, 2.1), "Homelab")),
    zone("Center", hIcon("layout-grid"), hIcon("search")),
    zone("Right", dockerSlot, hIcon("moon"), hIcon("settings")),
  );
  // Branding: accent and corner style change on a live preview.
  const SW = ["#fa5352", "#7c8cff", "#3ddc97", "#ffb547"];
  const brandBtn = h("div", { class: "center", style: "height:40px;padding:0 22px;font-size:16px;font-weight:800;color:#fff" }, "Sign in");
  const brandName = h("div", { class: "row", style: "gap:10px;font-size:18px;font-weight:800" }, h("div", { style: "width:26px;height:26px;border-radius:8px" }), "Your Homelab");
  const brandPrev = h("div", { class: "col", style: "width:250px;gap:12px;padding:16px 18px;background:#121318;border:1px solid var(--line2)" }, brandName, brandBtn);
  const swatches = SW.map((c) => h("div", { style: `width:34px;height:34px;border-radius:50%;background:${c};border:3px solid transparent;box-sizing:content-box` }));
  const visBrand = h("div", { class: "row", style: "gap:26px" }, brandPrev, h("div", { class: "col", style: "gap:14px" }, h("div", { class: "row", style: "gap:10px" }, ...swatches), h("div", { class: "mono", style: "font-size:14px;color:#8f919d" }, "global.css")));
  // Widgets: the three new ones, ticking.
  const cdEl = h("span", {}, "12d 04h");
  const timerEl = h("span", {}, "05:00");
  const mini = (ic: string, color: string, name: string, value: HTMLElement | string) =>
    h(
      "div",
      { class: "col", style: "flex:1;gap:6px;padding:12px 14px;border-radius:12px;background:#121318;border:1px solid var(--line2)" },
      h("div", { class: "row", style: `gap:7px;font-size:16px;font-weight:750;color:${color};white-space:nowrap` }, icon(ic, 17, 2.2), name),
      h("div", { class: "display", style: "font-size:30px;white-space:nowrap" }, value),
      h("div", { class: "mono", style: "font-size:11px;letter-spacing:.14em;color:#8ff0c4" }, "NEW"),
    );
  const visWidgets = h("div", { class: "row", style: "gap:10px" }, mini("wind", "#8fcfff", "Air Quality", "AQI 32"), mini("hourglass", "#ffd79a", "Countdown", cdEl), mini("stopwatch", "#ffb3ad", "Timer", timerEl));
  const page1 = [
    card("#fa5352", "rocket", "Brand-new onboarding", "A six-stage setup studio.", visOnb),
    card("#7c8cff", "layout-grid", "Board switcher", "A searchable gallery with keyboard navigation.", visSwitch, h("div", { class: "row", style: "gap:6px" }, kbd("Shift"), kbd("C"))),
    card("#4fb3ff", "search", "Command menu", "Finds resources, pages, settings, users, groups and commands.", visCmd, h("div", { class: "row", style: "gap:6px" }, kbd("Ctrl"), kbd("K"))),
    card("#ffb547", "layout-navbar", "Customizable header", "Board links and shortcuts, left, center or right, in any order.", visHeader),
    card("#3ddc97", "palette", "Instance branding", "Name, logo, favicon, colors, corner styles and login page. Global CSS; board CSS can override it.", visBrand),
    card("#ff8f86", "puzzle", "Widgets", "Weather and Clock redesigned. Air Quality, Countdown and Timer are new.", visWidgets),
  ];
  const P1W = 540;
  const P1H = 348;
  page1.forEach((c, i) => {
    c.style.left = `${114 + (i % 3) * (P1W + 36)}px`;
    c.style.top = `${170 + Math.floor(i / 3) * (P1H + 32)}px`;
    c.style.width = `${P1W}px`;
    c.style.height = `${P1H}px`;
  });

  // ---------- Page 2 ----------
  const hostEl = (lg: string, name: string) => h("div", { class: "row", style: "gap:10px;padding:10px 14px;border-radius:12px;background:#121318;border:1px solid var(--line2);font-size:16px;font-weight:700" }, logo(lg, 28), name);
  const creates = ["Apps", "Integrations", "Containers", "Widgets", "Health checks"].map((s) => h("div", { class: "chip", style: "font-size:15px;padding:7px 12px" }, s));
  const visDocker = h(
    "div",
    { class: "col", style: "gap:16px" },
    h(
      "div",
      { class: "row", style: "gap:12px" },
      h("div", { class: "mono", style: "padding:10px 14px;border-radius:10px;background:rgba(79,179,255,.12);border:1px solid rgba(79,179,255,.45);color:#bfe3ff;font-size:17px;font-weight:700" }, "DOCKER_ENDPOINTS"),
      h("div", { style: "color:#8f919d" }, icon("arrow-right", 22, 2.2)),
      hostEl("docker", "Docker"),
      hostEl("docker", "Docker"),
      hostEl("podman", "Podman"),
    ),
    h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, h("div", { class: "mono", style: "font-size:14px;color:#8f919d;margin-right:4px;letter-spacing:.08em" }, "LABELS →"), ...creates),
  );
  const roleChip = (name: string, color: string) => h("div", { class: "chip", style: `font-size:17px;padding:8px 16px;color:${color};border-color:${color}66;background:${color}14` }, name);
  const same = ["API", "Assistant", "MCP"].map((s) => h("div", { class: "chip mono", style: "font-size:16px;padding:7px 14px" }, s));
  const visPerm = h(
    "div",
    { class: "col", style: "gap:16px" },
    h("div", { class: "row", style: "gap:10px" }, roleChip("Viewer", "#8fcfff"), roleChip("Editor", "#ffd79a"), roleChip("Admin", "#ffb3ad"), h("div", { style: "margin-left:auto;display:flex;gap:8px" }, h("div", { class: "chip mono", style: "font-size:15px;padding:7px 12px" }, "LDAP"), h("div", { class: "chip mono", style: "font-size:15px;padding:7px 12px" }, "OIDC"))),
    h("div", { class: "row", style: "gap:10px" }, h("div", { class: "mono", style: "font-size:14px;color:#8f919d;letter-spacing:.08em" }, "SAME RULES →"), ...same),
  );
  const PERF = ["Board startup work runs in parallel", "Heavy screens load when opened", "Identical integration requests share work"];
  const perfBars = [0, 1, 2].map(() => h("div", { style: "height:100%;width:0;border-radius:4px;background:#ffb547" }));
  const visPerf = h(
    "div",
    { class: "row", style: "gap:26px;align-items:flex-start" },
    h("div", { class: "col", style: "gap:12px;flex:1" }, ...PERF.map((p) => h("div", { class: "row", style: "gap:10px;font-size:18px;font-weight:650" }, h("div", { style: "color:#ffb547" }, icon("check", 18, 2.8)), p))),
    h("div", { class: "col", style: "gap:10px;width:170px;padding-top:6px" }, ...perfBars.map((b) => h("div", { style: "height:10px;border-radius:4px;background:rgba(255,255,255,.07)" }, b))),
  );
  const mysql = h("div", { class: "chip mono", style: "font-size:16px;padding:8px 14px;color:#8f919d;text-decoration:line-through" }, "MySQL");
  const visDb = h(
    "div",
    { class: "col", style: "gap:16px" },
    h("div", { class: "row", style: "gap:10px" }, h("div", { class: "chip", style: "font-size:17px;padding:8px 16px;color:#c3caff;border-color:#7c8cff88;background:#7c8cff18" }, "SQLite", h("span", { class: "mono", style: "font-size:12px;letter-spacing:.1em;color:#8f96d8" }, "DEFAULT")), h("div", { class: "chip", style: "font-size:17px;padding:8px 16px;color:#c3caff;border-color:#7c8cff88;background:#7c8cff18" }, "PostgreSQL")),
    h("div", { class: "row", style: "gap:10px" }, mysql, h("div", { style: "color:#8f919d" }, icon("arrow-right", 20, 2.2)), h("div", { class: "mono", style: "font-size:15px;color:#b9bbc6" }, "converter"), h("div", { style: "color:#8f919d" }, icon("arrow-right", 20, 2.2)), h("div", { class: "chip mono", style: "font-size:16px;padding:8px 14px" }, "SQLite")),
  );
  const page2 = [
    card("#4fb3ff", "brand-docker", "Docker and Podman", "Several hosts. Assisted setup and container labels create apps, integrations, Containers, widgets and health checks. Homepage-compatible labels work too.", visDocker),
    card("#fa5352", "shield-lock", "Permissions", "Groups use a Viewer, Editor and Admin matrix. The API, Assistant and MCP follow the same rules.", visPerm),
    card("#ffb547", "bolt", "Performance", "Less waiting, less duplicated work.", visPerf),
    card("#7c8cff", "database", "SQLite and PostgreSQL", "MySQL support is dropped. MySQL users convert to SQLite before upgrading.", visDb),
  ];
  [visDocker, visPerm, visPerf, visDb].forEach((v) => (v.style.zoom = "1.18"));
  const P2W = 834;
  const P2H = 348;
  page2.forEach((c, i) => {
    c.style.left = `${108 + (i % 2) * (P2W + 36)}px`;
    c.style.top = `${170 + Math.floor(i / 2) * (P2H + 32)}px`;
    c.style.width = `${P2W}px`;
    c.style.height = `${P2H}px`;
  });

  fg.append(title, ...page1, ...page2, chapter.el);

  // ---------- Timeline ----------
  const P1 = 0.95;
  const P2 = P1 + 2.9;
  const END = P2 + 2.7;

  const cues: Scene["cues"] = [
    { t: 0.08, kind: "boom", gain: 0.7 },
    { t: P1 - 0.3, kind: "whoosh", gain: 0.6 },
    ...page1.map((_, i) => ({ t: P1 + i * 0.07 + 0.1, kind: "swish" as const, gain: 0.35, pitch: i })),
    ...STAGES.map((_, i) => ({ t: P1 + 0.45 + i * 0.22, kind: "tick" as const, gain: 0.3, pitch: i })),
    { t: P2 - 0.15, kind: "whoosh", gain: 0.7 },
    ...page2.map((_, i) => ({ t: P2 + i * 0.08 + 0.1, kind: "swish" as const, gain: 0.35, pitch: i + 2 })),
    { t: END - 0.3, kind: "whoosh", gain: 0.7 },
  ];

  return {
    name: "rest",
    start: 0,
    end: END,
    fg,
    cues,
    update(t, ctx) {
      ctx.fx.fade = 1 - E.outCubic(seg(t, 0, 0.12));

      // Title
      title.style.display = t < P1 + 0.1 ? "" : "none";
      big.update(t, 0.03, P1 - 0.3, 0.03, "center");
      bigSub.update(t, 0.3, P1 - 0.3, 0.04, 0.45);
      title.style.transform = `scale(${(1 + seg(t, P1 - 0.35, P1 + 0.05) * 0.25).toFixed(3)})`;
      chapter.update(t, P1 - 0.2, END - 0.4);

      // Bento pages
      const enter = (el: HTMLElement, at: number, outAt: number, i: number) => {
        const p = spring(t - at, 2.2, 0.6);
        const pc = clamp(p, 0, 1.15);
        const q = E.inCubic(seg(t, outAt + i * 0.04, outAt + 0.35 + i * 0.04));
        el.style.transform = `perspective(1800px) translateY(${((1 - pc) * 140 - q * 90).toFixed(1)}px) rotateX(${((1 - clamp(p)) * 38).toFixed(2)}deg) scale(${(1 - q * 0.05).toFixed(3)})`;
        el.style.opacity = String((t >= at ? 1 : 0) * (1 - q));
        el.style.display = t > at - 0.05 && t < outAt + 0.5 + i * 0.04 ? "" : "none";
      };
      page1.forEach((c, i) => enter(c, P1 + i * 0.07, P2 - 0.35, i));
      page2.forEach((c, i) => enter(c, P2 + i * 0.08, END - 0.4, i));

      // Page 1 micro-animations
      stageEls.forEach((s, i) => {
        const at = P1 + 0.45 + i * 0.22;
        const d = E.outBack(seg(t, at, at + 0.22), 2);
        s.done.style.transform = `scale(${clamp(d, 0, 1.3).toFixed(3)})`;
        s.done.style.opacity = t >= at ? "1" : "0";
      });
      const focus = Math.min(3, Math.floor(Math.max(0, t - P1 - 0.5) / 0.5));
      thumbs.forEach((th, i) => {
        th.style.borderColor = i === focus && t > P1 + 0.35 ? "#7c8cff" : "transparent";
        th.style.background = i === focus && t > P1 + 0.35 ? "rgba(124,140,255,.12)" : "";
      });
      query.update(t, P1 + 0.4, 10, P2);
      results.forEach((r, i) => {
        const at = P1 + 0.6 + i * 0.08;
        const p = E.outExpo(seg(t, at, at + 0.35));
        tf(r, { y: (1 - p) * 10, o: p });
        const sel = Math.min(2, Math.floor(Math.max(0, t - P1 - 1.1) / 0.5));
        r.style.background = t > P1 + 1.0 && i === sel ? "rgba(79,179,255,.14)" : "";
      });
      {
        // Docker shortcut drops into the Right zone; the others make room.
        const room = E.inOutCubic(seg(t, P1 + 0.7, P1 + 1.0));
        dockerSlot.style.width = `${(room * 38).toFixed(1)}px`;
        dockerSlot.style.marginRight = `${(room * 6 - 6).toFixed(1)}px`;
        const p = E.outBack(seg(t, P1 + 0.8, P1 + 1.2), 1.6);
        tf(dockerChip, { y: lerp(-60, 0, clamp(p, 0, 1.2)), o: t > P1 + 0.8 ? 1 : 0 });
        const glow = t > P1 + 1.2 ? Math.exp(-(t - P1 - 1.2) * 4) : 0;
        dockerChip.style.boxShadow = `0 0 ${(glow * 24).toFixed(0)}px rgba(79,179,255,${(glow * 0.9).toFixed(2)})`;
      }
      const sw = Math.floor(Math.max(0, t - P1 - 0.5) / 0.5) % SW.length;
      const accent = t > P1 + 0.5 ? SW[sw]! : SW[0]!;
      brandBtn.style.background = accent;
      (brandName.firstElementChild as HTMLElement).style.background = accent;
      const rad = lerp(4, 18, (Math.sin((t - P1) * 2.2) + 1) / 2);
      brandPrev.style.borderRadius = `${rad.toFixed(1)}px`;
      brandBtn.style.borderRadius = `${(rad * 0.7).toFixed(1)}px`;
      swatches.forEach((s, i) => (s.style.borderColor = i === sw && t > P1 + 0.5 ? "#fff" : "transparent"));
      {
        const secs = Math.max(0, Math.floor((t - P1 - 0.5) * 2));
        const rem = Math.max(0, 300 - secs);
        timerEl.textContent = `${String(Math.floor(rem / 60)).padStart(2, "0")}:${String(rem % 60).padStart(2, "0")}`;
        cdEl.textContent = "12d 04h";
      }

      // Page 2 micro-animations
      creates.forEach((c, i) => {
        const at = P2 + 0.45 + i * 0.12;
        const p = E.outBack(seg(t, at, at + 0.25), 2);
        tf(c, { s: lerp(0.7, 1, clamp(p, 0, 1.3)), o: clamp(p * 1.5) });
        c.style.borderColor = t > at ? "rgba(79,179,255,.6)" : "";
        c.style.background = t > at ? "rgba(79,179,255,.12)" : "";
      });
      same.forEach((c, i) => {
        const at = P2 + 0.6 + i * 0.14;
        const p = E.outBack(seg(t, at, at + 0.25), 2);
        tf(c, { s: lerp(0.7, 1, clamp(p, 0, 1.3)), o: clamp(p * 1.5) });
      });
      perfBars.forEach((b, i) => {
        const p = E.outCubic(seg(t, P2 + 0.4, P2 + 1.2 + i * 0.2));
        b.style.width = `${(p * 100).toFixed(1)}%`;
      });
      mysql.style.opacity = String(lerp(1, 0.55, seg(t, P2 + 0.6, P2 + 1.0)));
    },
  };
}
