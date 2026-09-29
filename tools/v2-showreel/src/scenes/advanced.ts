import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo } from "../lib/dom";
import { Headline } from "../lib/kit";
import { lobster } from "./assistant";
import type { Scene } from "../lib/scene";

// Hover Downloads, hold Shift for half a second, the advanced view opens.
type Row = [string, number, string, string, string, string, string];
const ROWS: Row[] = [
  ["Tears of Steel", 22, "8.8 GiB", "26.7 MiB/s", "0 B/s", "4 minutes", "DOWNLOADING"],
  ["Sintel", 3, "17.0 GiB", "1.1 MiB/s", "48.8 KiB/s", "4 hours", "LEECHING"],
  ["ubuntu-26.04-desktop-amd64.iso", 61, "5.9 GiB", "48.2 MiB/s", "1.3 MiB/s", "a minute", "DOWNLOADING"],
  ["Big Buck Bunny", 100, "1.7 GiB", "0 B/s", "2.1 MiB/s", "an hour", "COMPLETED"],
  ["Agent 327", 45, "3.1 GiB", "39.5 MiB/s", "0 B/s", "a few seconds", "DOWNLOADING"],
  ["Cosmos Laundromat", 0, "6.8 GiB", "0 B/s", "0 B/s", "∞", "PAUSED"],
  ["Spring", 100, "2.3 GiB", "0 B/s", "5.5 MiB/s", "an hour", "SEEDING"],
];
const STATE_COLOR: Record<string, string> = {
  DOWNLOADING: "#4fb3ff",
  LEECHING: "#ffb547",
  COMPLETED: "#3ddc97",
  SEEDING: "#3ddc97",
  PAUSED: "#8f919d",
};
const COLS = "370px 240px 110px 140px 130px 140px 1fr";

const FRAME = { x: 96, y: 300, w: 1728, h: 690 };
const cellX = (c: number) => FRAME.x + 40 + c * 166;
const cellY = (r: number) => FRAME.y + 110 + r * 156;
const WID = { x: cellX(4), y: cellY(0), w: 4 * 166 - 16, h: 140 };
const PANEL = { x: 300, y: 276, w: 1320, h: 720 };

export function advanced(): Scene {
  const fg = h("div", { class: "scene" });

  const head = new Headline("Advanced views.", { size: 84, accent: ["advanced"] });
  const headWrap = h("div", { class: "abs", style: "left:96px;top:84px;white-space:nowrap" }, head.el);
  const sub = new Headline("Supported widgets: hover and hold Shift for half a second.", {
    size: 32,
    weight: 600,
    color: "#b9bbc6",
  });
  const subWrap = h("div", { class: "abs", style: "left:96px;top:196px;white-space:nowrap" }, sub.el);

  // ---------- Board ----------
  const tile = (key: string, name: string, c: number, r: number) =>
    h(
      "div",
      {
        class: "abs card col center",
        style: `left:${cellX(c)}px;top:${cellY(r)}px;width:150px;height:140px;gap:8px;border-radius:16px`,
      },
      logo(key, 46),
      h("div", { style: "font-size:15px;font-weight:650;color:#d7d8de;white-space:nowrap" }, name),
    );
  const bar = (p: number, color: string) =>
    h(
      "div",
      { style: "height:9px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden" },
      h("div", { style: `height:100%;width:${p}%;background:${color};border-radius:5px` }),
    );
  const widget = h(
    "div",
    {
      class: "abs card col",
      style: `left:${WID.x}px;top:${WID.y}px;width:${WID.w}px;height:${WID.h}px;padding:18px 22px;gap:14px;border-radius:16px`,
    },
    h(
      "div",
      { class: "row", style: "gap:10px;font-size:19px;font-weight:750" },
      logo("qBittorrent", 26),
      "Downloads",
      h("div", { style: "margin-left:auto;font-size:15px;color:#8f919d;font-weight:600" }, "3 active"),
    ),
    bar(22, "#4fb3ff"),
    bar(61, "#3ddc97"),
  );
  const weather = h(
    "div",
    {
      class: "abs card col",
      style: `left:${cellX(8)}px;top:${cellY(0)}px;width:316px;height:296px;padding:20px 22px;gap:6px;border-radius:16px`,
    },
    h(
      "div",
      { class: "row", style: "gap:10px;font-size:17px;font-weight:750;color:#ffb547" },
      icon("sun", 22, 2.2),
      h("span", { style: "color:#fff" }, "Weather"),
    ),
    h("div", { class: "display", style: "font-size:84px;margin-top:10px" }, "21°"),
    h("div", { style: "font-size:17px;color:#a9abb6" }, "Clear sky"),
  );
  const calendar = h(
    "div",
    {
      class: "abs card col",
      style: `left:${cellX(4)}px;top:${cellY(1)}px;width:${WID.w}px;height:140px;padding:18px 22px;gap:12px;border-radius:16px`,
    },
    h(
      "div",
      { class: "row", style: "gap:10px;font-size:17px;font-weight:750" },
      h("div", { style: "color:#7c8cff" }, icon("calendar", 22, 2.2)),
      "Calendar",
    ),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(14,1fr);gap:8px" },
      ...Array.from({ length: 28 }, (_, i) =>
        h("div", {
          style: `height:20px;border-radius:5px;background:${[3, 9, 16, 22].includes(i) ? "#fa5352" : i === 12 ? "#7c8cff" : "rgba(255,255,255,.06)"}`,
        }),
      ),
    ),
  );
  const APPS: [string, string][] = [
    ["jellyfin", "Jellyfin"],
    ["sonarr", "Sonarr"],
    ["radarr", "Radarr"],
    ["immich", "Immich"],
    ["plex", "Plex"],
    ["prowlarr", "Prowlarr"],
    ["piHole", "Pi-hole"],
    ["proxmox", "Proxmox"],
    ["homeAssistant", "Home Assistant"],
    ["seerr", "Seerr"],
    ["bazarr", "Bazarr"],
    ["beszel", "Beszel"],
    ["ntfy", "ntfy"],
    ["navidrome", "Navidrome"],
    ["lidarr", "Lidarr"],
    ["uptimeKuma", "Uptime Kuma"],
    ["nextcloud", "Nextcloud"],
    ["traefik", "Traefik"],
  ];
  const cell = (i: number): [number, number] => (i < 12 ? [i % 4, Math.floor(i / 4)] : [i - 8, 2]);
  const tiles = APPS.map(([k, n], i) => tile(k, n, ...cell(i)));
  const frame = h(
    "div",
    {
      class: "abs",
      style: `left:${FRAME.x}px;top:${FRAME.y}px;width:${FRAME.w}px;height:${FRAME.h}px;border-radius:22px;background:#0f1014;border:1px solid rgba(255,255,255,.1);overflow:hidden`,
    },
    h(
      "div",
      {
        class: "row",
        style:
          "margin:22px 26px 0;height:64px;padding:0 18px;gap:12px;border-radius:14px;background:#17181d;border:1px solid var(--line)",
      },
      lobster(34),
      h("div", { style: "font-size:21px;font-weight:800" }, "Homelab"),
    ),
  );
  const boardEl = h(
    "div",
    { class: "abs", style: "inset:0;transform-origin:960px 640px" },
    frame,
    ...tiles,
    widget,
    weather,
    calendar,
  );

  // ---------- Hover + Shift hold ----------
  const cursor = h(
    "div",
    {
      class: "abs",
      style: "left:0;top:0;width:34px;height:34px;z-index:30;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))",
    },
    icon("filled:pointer", 34, 1),
  );
  const ring = h("div", { class: "abs", style: "inset:-8px;border-radius:50%" });
  const key = h("div", { class: "kbd", style: "font-size:24px;padding:.25em .6em;border-radius:.3em" }, "Shift");
  const holdTime = h("span", {}, "0.0s");
  const keyWrap = h(
    "div",
    { class: "abs row", style: "left:0;top:0;gap:14px;z-index:31" },
    h(
      "div",
      { style: "position:relative;width:44px;height:44px" },
      ring,
      h("div", { class: "abs", style: "inset:6px;border-radius:50%;background:#15161b" }),
    ),
    key,
    h("div", { class: "mono", style: "font-size:18px;color:#b9bbc6;min-width:52px" }, holdTime),
  );
  const outline = h("div", {
    class: "abs",
    style: `left:${WID.x - 6}px;top:${WID.y - 6}px;width:${WID.w + 12}px;height:${WID.h + 12}px;border-radius:20px;border:3px solid #fa5352`,
  });

  // ---------- Advanced panel ----------
  const badge = (color: string, n: string) =>
    h(
      "div",
      {
        class: "row mono",
        style: `gap:6px;padding:4px 10px;border-radius:999px;background:${color}1f;color:${color};font-size:15px;font-weight:800`,
      },
      h("div", { style: `width:8px;height:8px;border-radius:50%;background:${color}` }),
      n,
    );
  const totalPct = h("div", { class: "display", style: "font-size:52px;width:110px" }, "25%");
  const totalBar = h("div", {
    style: "height:100%;width:25%;border-radius:5px;background:linear-gradient(90deg,#4fb3ff,#3ddc97)",
  });
  const summary = h(
    "div",
    { class: "row", style: "gap:26px;height:86px;padding:0 6px;border-bottom:1px solid var(--line)" },
    totalPct,
    h(
      "div",
      { class: "col", style: "gap:8px;width:260px" },
      h("div", { style: "height:10px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden" }, totalBar),
      h("div", { class: "mono", style: "font-size:15px;color:#b9bbc6" }, "11.5 GiB / 45.6 GiB"),
    ),
    h(
      "div",
      { class: "row mono", style: "gap:8px;font-size:20px;font-weight:700;color:#4fb3ff" },
      icon("arrow-down", 20, 2.6),
      "115.5 MiB/s",
    ),
    h(
      "div",
      { class: "row mono", style: "gap:8px;font-size:20px;font-weight:700;color:#3ddc97" },
      icon("arrow-up", 20, 2.6),
      "8.9 MiB/s",
    ),
    h(
      "div",
      { class: "row", style: "gap:8px" },
      badge("#4fb3ff", "3"),
      badge("#ffb547", "1"),
      badge("#3ddc97", "2"),
      badge("#8f919d", "1"),
    ),
    h(
      "div",
      { class: "row", style: "margin-left:auto;gap:10px;font-size:17px;font-weight:700;color:#d7d8de" },
      logo("qBittorrent", 26),
      "1 client",
    ),
  );
  const headerRow = h(
    "div",
    {
      class: "label",
      style: `display:grid;grid-template-columns:${COLS};align-items:center;height:44px;padding:0 14px;font-size:13px;color:#8f919d;letter-spacing:.14em`,
    },
    ...["Name", "Progress", "Size", "Down", "Up", "ETA", "State"].map((c) => h("div", {}, c)),
  );
  const fills: { el: HTMLElement; pct: HTMLElement; p: number }[] = [];
  const rowEls = ROWS.map(([name, p, size, down, up, eta, state]) => {
    const fill = h("div", { style: `height:100%;width:${p}%;border-radius:4px;background:${STATE_COLOR[state]}` });
    const pct = h("span", {}, `${p}%`);
    fills.push({ el: fill, pct, p });
    return h(
      "div",
      {
        style: `display:grid;grid-template-columns:${COLS};align-items:center;height:60px;padding:0 14px;border-top:1px solid var(--line);font-size:18px`,
      },
      h(
        "div",
        { class: "row", style: "gap:10px;font-weight:650;white-space:nowrap;overflow:hidden" },
        h("div", { style: "color:#ffd23f;flex:none" }, icon("filled:bolt", 18, 1)),
        name,
      ),
      h(
        "div",
        { class: "row", style: "gap:12px;padding-right:24px" },
        h(
          "div",
          { style: "flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden" },
          fill,
        ),
        h("div", { class: "mono", style: "width:44px;font-size:15px;color:#b9bbc6;text-align:right" }, pct),
      ),
      h("div", { class: "mono", style: "font-size:16px;color:#d7d8de" }, size),
      h("div", { class: "mono", style: `font-size:16px;color:${down === "0 B/s" ? "#6f717d" : "#4fb3ff"}` }, down),
      h("div", { class: "mono", style: `font-size:16px;color:${up === "0 B/s" ? "#6f717d" : "#3ddc97"}` }, up),
      h("div", { style: "font-size:16px;color:#b9bbc6;white-space:nowrap" }, eta),
      h(
        "div",
        { class: "mono", style: `font-size:13px;font-weight:800;letter-spacing:.06em;color:${STATE_COLOR[state]}` },
        state,
      ),
    );
  });
  const controls = h(
    "div",
    { class: "row", style: "height:52px;padding:0 10px;border-top:1px solid var(--line);color:#a9abb6;gap:18px" },
    icon("filter", 22, 2),
    icon("bolt", 22, 2),
    h(
      "div",
      { class: "row", style: "margin-left:auto;gap:18px" },
      icon("player-play", 22, 2),
      icon("player-pause", 22, 2),
    ),
  );
  const panelBody = h(
    "div",
    { class: "col", style: "height:100%" },
    summary,
    headerRow,
    ...rowEls,
    h("div", { style: "flex:1" }),
    controls,
  );
  const panel = h(
    "div",
    {
      class: "abs card",
      style: `left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;padding:18px 26px 8px;border-radius:22px;transform-origin:0 0;background:#16171c;border-color:rgba(255,255,255,.14);box-shadow:0 60px 140px rgba(0,0,0,.75)`,
    },
    panelBody,
  );

  fg.append(boardEl, outline, panel, headWrap, subWrap, cursor, keyWrap);

  // ---------- Timeline ----------
  const HOVER = 0.5;
  const HOLD = 0.62;
  const HOLD_S = 0.5; // Shift is held for half a second in Homarr; the scene plays at its authored speed
  const OPEN = HOLD + HOLD_S;
  const END = OPEN + 2.75;
  const wc: [number, number] = [WID.x + WID.w * 0.62, WID.y + WID.h * 0.55];

  const cues: Scene["cues"] = [
    { t: 0.02, kind: "whoosh", gain: 0.6 },
    { t: HOLD, kind: "key", gain: 1 },
    { t: HOLD + 0.05, kind: "riser", dur: HOLD_S - 0.05, gain: 0.45 },
    { t: OPEN, kind: "hit", gain: 0.8 },
    { t: OPEN + 0.02, kind: "swish", gain: 0.6 },
    ...ROWS.map((_, i) => ({ t: OPEN + 0.2 + i * 0.04, kind: "tick" as const, gain: 0.22, pitch: i })),
    { t: END - 0.25, kind: "whoosh", gain: 0.7 },
  ];

  return {
    name: "advanced",
    start: 0,
    end: END,
    fg,
    cues,
    update(t, ctx) {
      head.update(t, 0.02, Infinity, 0.05, 0.5);
      sub.update(t, 0.2, Infinity, 0.02, 0.5);

      const open = E.outExpo(seg(t, OPEN, OPEN + 0.4));
      const bIn = E.outExpo(seg(t, 0, 0.5));
      boardEl.style.transform = `translateY(${((1 - bIn) * 60).toFixed(1)}px) scale(${lerp(1, 0.94, open).toFixed(4)})`;
      boardEl.style.filter =
        open > 0.01 ? `brightness(${lerp(1, 0.45, open).toFixed(3)}) blur(${(open * 3).toFixed(2)}px)` : "";

      // Cursor glides onto Downloads and stays while Shift is held.
      const cp = E.inOutCubic(seg(t, 0.1, HOVER));
      const cx = lerp(1560, wc[0], cp);
      const cy = lerp(1010, wc[1], cp);
      cursor.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`;
      cursor.style.display = t > 0.08 && t < OPEN + 0.08 ? "" : "none";
      const hover = t > HOVER - 0.05;
      widget.style.borderColor = hover ? "rgba(255,255,255,.3)" : "";
      const hold = seg(t, HOLD, OPEN);
      ring.style.background = `conic-gradient(#fa5352 ${(hold * 360).toFixed(1)}deg, rgba(255,255,255,.12) 0)`;
      holdTime.textContent = `${(hold * HOLD_S).toFixed(1)}s`;
      const kIn = spring(t - HOLD + 0.08, 3.2, 0.5);
      keyWrap.style.transform = `translate(${(cx + 40).toFixed(1)}px,${(cy + 34).toFixed(1)}px) scale(${clamp(kIn, 0, 1.3).toFixed(3)})`;
      keyWrap.style.display = t > HOLD - 0.08 && t < OPEN + 0.12 ? "" : "none";
      key.style.borderBottomWidth = t > HOLD ? "1px" : "3px";
      key.style.transform = `translateY(${t > HOLD ? 3 : 0}px)`;
      key.style.borderColor = t > HOLD ? "rgba(250,83,82,.8)" : "";
      // The outline closes around the widget as the hold completes.
      outline.style.display = t > HOLD && t < OPEN + 0.1 ? "" : "none";
      outline.style.clipPath = `inset(0 ${((1 - hold) * 100).toFixed(1)}% 0 0 round 20px)`;
      const pulse = t > OPEN ? Math.exp(-(t - OPEN) * 8) : 0;
      widget.style.boxShadow = `0 0 ${(hold * 30 + pulse * 60).toFixed(0)}px rgba(250,83,82,${(hold * 0.35 + pulse * 0.5).toFixed(2)})`;

      // Panel grows out of the widget.
      panel.style.display = t >= OPEN ? "" : "none";
      const sx = lerp(WID.w / PANEL.w, 1, open);
      const sy = lerp(WID.h / PANEL.h, 1, open);
      const px = lerp(WID.x - PANEL.x, 0, open);
      const py = lerp(WID.y - PANEL.y, 0, open);
      panel.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      panelBody.style.visibility = open > 0.55 ? "visible" : "hidden";
      rowEls.forEach((r, i) => {
        const at = OPEN + 0.18 + i * 0.04;
        const p = E.outExpo(seg(t, at, at + 0.3));
        r.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(1)}% 0 0)`;
      });
      // Live data keeps moving.
      fills.forEach((f, i) => {
        if (f.p <= 0 || f.p >= 100) return;
        const v = Math.min(99, f.p + Math.max(0, t - OPEN) * [4, 0.3, 6, 0, 9][i]!);
        f.el.style.width = `${v.toFixed(1)}%`;
        f.pct.textContent = `${Math.floor(v)}%`;
      });
      const tp = 25 + Math.max(0, t - OPEN) * 1.6;
      totalBar.style.width = `${tp.toFixed(1)}%`;
      totalPct.textContent = `${Math.floor(tp)}%`;
      ctx.fx.shake = pulse * 6;
    },
  };
}
