import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo, offsetWithin, tf } from "../lib/dom";
import { Chapter, Headline } from "../lib/kit";
import { lobster } from "./assistant";
import type { Scene } from "../lib/scene";

type Rect = [number, number, number, number];
type Key = [number, number, number];

// Board window on the right; the grid starts below its header.
const FX = 820;
const FY = 170;
const FW = 1000;
const FH = 688;
const GX = FX + 40;
const GY = FY + 110;
const cell = (c: number, r: number, w = 1, hh = 1, fy = FY, fx = FX): Rect => [fx + 40 + c * 156, fy + 110 + r * 136, w * 156 - 16, hh * 136 - 16];
// Phone frame for the Mobile layout.
const PHONE: Rect = [1110, 150, 420, 800];
const mcell = (c: number, r: number, w = 1, hh = 1): Rect => [PHONE[0] + 20 + c * 198, PHONE[1] + 96 + r * 96, w * 198 - 16, hh * 96 - 12];

const place = (el: HTMLElement, [x, y, w, hh]: Rect) => {
  el.style.left = `${x.toFixed(1)}px`;
  el.style.top = `${y.toFixed(1)}px`;
  el.style.width = `${w.toFixed(1)}px`;
  el.style.height = `${hh.toFixed(1)}px`;
};
const lerpR = (a: Rect, b: Rect, p: number): Rect => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p), lerp(a[3], b[3], p)];

/** Piecewise eased path through [t, x, y] keys. */
function path(t: number, keys: Key[]): [number, number] {
  const first = keys[0]!;
  if (t <= first[0]) return [first[1], first[2]];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1] = keys[i]!;
    const [t0, x0, y0] = keys[i - 1]!;
    if (t <= t1) {
      const p = E.inOutCubic(seg(t, t0, t1));
      return [lerp(x0, x1, p), lerp(y0, y1, p)];
    }
  }
  const last = keys[keys.length - 1]!;
  return [last[1], last[2]];
}

const app = (key: string, name: string) =>
  h(
    "div",
    { class: "abs card col center", style: "gap:8px;border-radius:16px;overflow:hidden" },
    logo(key, 44),
    h("div", { style: "font-size:15px;font-weight:650;color:#d7d8de;white-space:nowrap" }, name),
  );
const widgetHead = (ic: HTMLElement, name: string, extra = "") =>
  h("div", { class: "row", style: "gap:10px;font-size:17px;font-weight:750;white-space:nowrap" }, ic, name, extra ? h("div", { style: "margin-left:auto;font-size:14px;color:#8f919d;font-weight:600" }, extra) : "");
const bar = (p: number, color: string) =>
  h("div", { style: "height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;flex:none" }, h("div", { style: `height:100%;width:${p}%;background:${color};border-radius:4px` }));
const downloadsW = () =>
  h("div", { class: "abs card col", style: "padding:16px 18px;gap:12px;border-radius:16px;overflow:hidden" }, widgetHead(logo("qBittorrent", 24), "Downloads", "2 active"), bar(64, "#4fb3ff"), bar(31, "#3ddc97"));
const weatherW = () =>
  h(
    "div",
    { class: "abs card col", style: "padding:18px 20px;gap:6px;border-radius:16px;overflow:hidden" },
    widgetHead(h("div", { style: "color:#ffb547" }, icon("sun", 22, 2.2)), "Weather"),
    h("div", { class: "display", style: "font-size:68px;margin-top:6px" }, "21°"),
    h("div", { style: "font-size:16px;color:#a9abb6" }, "Clear sky"),
  );
const calendarW = () =>
  h(
    "div",
    { class: "abs card col", style: "padding:18px 20px;gap:14px;border-radius:16px;overflow:hidden" },
    widgetHead(h("div", { style: "color:#7c8cff" }, icon("calendar", 22, 2.2)), "Calendar"),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:9px" },
      ...Array.from({ length: 21 }, (_, i) =>
        h("div", { style: `height:22px;border-radius:6px;background:${[3, 9, 16].includes(i) ? "#fa5352" : i === 12 ? "#7c8cff" : "rgba(255,255,255,.06)"}` }),
      ),
    ),
  );
const clockW = () =>
  h(
    "div",
    { class: "abs card col", style: "padding:14px 20px;gap:2px;border-radius:16px;overflow:hidden;justify-content:center" },
    h("div", { class: "label", style: "font-size:13px;color:#8f919d" }, "Clock"),
    h("div", { class: "display", style: "font-size:56px" }, "21:04"),
  );

export function board(): Scene {
  const fg = h("div", { class: "scene" });

  // ---------- Window ----------
  const editChip = h("div", { class: "chip", style: "font-size:16px;padding:7px 14px;gap:8px;color:#ffd79a;border-color:rgba(255,181,71,.5);background:rgba(255,181,71,.1)" }, icon("pencil", 16, 2.2), "Editing");
  const status = h("div", { class: "chip mono", style: "font-size:15px;padding:7px 14px;gap:8px;min-width:190px;justify-content:center" }, "");
  const headRight = h("div", { class: "row", style: "margin-left:auto;gap:10px" }, editChip, status);
  const frame = h(
    "div",
    { class: "abs", style: "border-radius:22px;background:#0f1014;border:1px solid rgba(255,255,255,.1);box-shadow:0 50px 120px -30px rgba(0,0,0,.8);overflow:hidden" },
    h(
      "div",
      { class: "row", style: "margin:22px 26px 0;height:64px;padding:0 18px;gap:12px;border-radius:14px;background:#17181d;border:1px solid var(--line)" },
      lobster(34),
      h("div", { style: "font-size:21px;font-weight:800" }, "Homelab"),
      headRight,
    ),
  );
  const gridDots = h("div", { class: "abs", style: "inset:0" });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const d = h("div", { class: "abs", style: "border:1.5px dashed rgba(255,255,255,.07);border-radius:14px" });
      place(d, cell(c, r));
      gridDots.append(d);
    }

  // ---------- A: drag and drop ----------
  const aItems: [HTMLElement, Rect][] = [
    [app("jellyfin", "Jellyfin"), cell(0, 0)],
    [app("sonarr", "Sonarr"), cell(1, 0)],
    [app("radarr", "Radarr"), cell(2, 0)],
    [app("immich", "Immich"), cell(3, 0)],
    [weatherW(), cell(4, 0, 2, 2)],
    [calendarW(), cell(2, 1, 2, 2)],
    [app("piHole", "Pi-hole"), cell(0, 2)],
    [app("proxmox", "Proxmox"), cell(1, 2)],
    [app("plex", "Plex"), cell(0, 3)],
  ];
  const occupied = new Set<string>();
  for (const [, [x, y, w, hh]] of aItems)
    for (let c = Math.round((x - GX) / 156); c < Math.round((x - GX + w + 16) / 156); c++)
      for (let r = Math.round((y - GY) / 136); r < Math.round((y - GY + hh + 16) / 136); r++) occupied.add(`${c},${r}`);
  const calendarEl = aItems[5]![0];
  const dl = downloadsW();
  const O = cell(0, 1, 2, 1);
  const preview = h("div", { class: "abs", style: "border-radius:16px;border:2.5px dashed;transition:none" });
  const handles = [0, 1, 2].flatMap((i) => [0, 1, 2].filter((j) => i !== 1 || j !== 1).map((j) => ({ i, j, el: h("div", { class: "abs", style: "width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;border:3px solid #fa5352" }) })));
  const aLayer = h("div", { class: "abs", style: "inset:0" }, ...aItems.map(([el]) => el), preview, dl, ...handles.map((x) => x.el));
  aItems.forEach(([el, r]) => place(el, r));

  // ---------- B: Containers ----------
  const bTop = [
    app("sonarr", "Sonarr"),
    app("radarr", "Radarr"),
    app("qBittorrent", "qBittorrent"),
    app("prowlarr", "Prowlarr"),
    app("piHole", "Pi-hole"),
    app("proxmox", "Proxmox"),
  ];
  bTop.forEach((el, i) => place(el, cell(i, 0)));
  const selRings = bTop.slice(0, 2).map((el) => {
    const ring = h("div", { class: "abs", style: "inset:-5px;border-radius:20px;border:3px solid #fa5352;pointer-events:none" }, h("div", { class: "abs center", style: "right:-10px;top:-10px;width:26px;height:26px;border-radius:50%;background:#fa5352;color:#fff" }, icon("check", 16, 3)));
    el.style.overflow = "visible";
    el.append(ring);
    return ring;
  });
  const CONT = cell(0, 1, 4, 3);
  const chevron = h("div", { style: "color:#d7d8de" }, icon("chevron-down", 26, 2.4));
  const inner = (key: string, name: string, c: number) => {
    const el = app(key, name);
    el.style.width = "128px";
    el.style.height = "104px";
    el.style.left = `${16 + c * 144}px`;
    el.style.top = "60px";
    return el;
  };
  const inSon = inner("sonarr", "Sonarr", 2);
  const inRad = inner("radarr", "Radarr", 3);
  const music = h(
    "div",
    { class: "abs col", style: "left:16px;top:180px;width:272px;height:196px;border-radius:14px;border:1.5px solid rgba(124,140,255,.45);background:rgba(124,140,255,.06);padding:10px 12px;gap:10px" },
    h("div", { class: "row", style: "gap:8px;font-size:15px;font-weight:750;color:#c3caff" }, icon("grip-vertical", 16, 2), "Music", h("div", { class: "mono", style: "margin-left:auto;font-size:11px;letter-spacing:.1em;color:#8f96d8" }, "CONTAINER")),
    h(
      "div",
      { class: "row", style: "gap:12px;flex:1" },
      ...[
        ["navidrome", "Navidrome"],
        ["lidarr", "Lidarr"],
      ].map(([k, n]) => h("div", { class: "card col center", style: "flex:1;height:100%;gap:6px;border-radius:12px" }, logo(k!, 36), h("div", { style: "font-size:13px;font-weight:650;color:#d7d8de" }, n!))),
    ),
  );
  const contBody = h("div", { class: "abs", style: "inset:0" }, inner("jellyfin", "Jellyfin", 0), inner("plex", "Plex", 1), inSon, inRad, music);
  const container = h(
    "div",
    { class: "abs", style: "border-radius:18px;border:1.5px solid rgba(250,83,82,.5);background:linear-gradient(180deg,rgba(250,83,82,.07),rgba(250,83,82,.02));overflow:hidden" },
    h(
      "div",
      { class: "row", style: "height:52px;padding:0 16px;gap:10px;border-bottom:1px solid rgba(250,83,82,.2)" },
      h("div", { style: "color:#8f919d" }, icon("grip-vertical", 20, 2)),
      h("div", { style: "font-size:19px;font-weight:800" }, "Media"),
      h("div", { class: "mono", style: "font-size:12px;letter-spacing:.12em;color:#ff8f86;padding:3px 8px;border-radius:6px;background:rgba(250,83,82,.12)" }, "CONTAINER"),
      h("div", { style: "margin-left:auto" }, chevron),
    ),
    contBody,
  );
  const bRight = [weatherW(), clockW()];
  place(bRight[0]!, cell(4, 1, 2, 2));
  place(bRight[1]!, cell(4, 3, 2, 1));
  const flyers = [app("sonarr", "Sonarr"), app("radarr", "Radarr")];
  const moveBtn = h("div", { class: "row", style: "gap:8px;padding:10px 16px;border-radius:11px;background:#fa5352;color:#fff;font-size:17px;font-weight:800" }, icon("arrow-move-right", 18, 2.4), "Move to", icon("chevron-down", 16, 2.6));
  const selCount = h("span", {}, "1");
  const toolbar = h(
    "div",
    { class: "abs row", style: "left:1100px;top:92px;height:64px;padding:0 10px 0 22px;gap:18px;border-radius:16px;background:#1d1e24;border:1px solid var(--line2);box-shadow:0 20px 50px rgba(0,0,0,.5);font-size:18px;font-weight:700" },
    h("div", { style: "color:#ff8f86" }, icon("square-check", 22, 2.2)),
    h("span", {}, selCount, " selected"),
    moveBtn,
  );
  const optMedia = h("div", { class: "row", style: "gap:12px;height:50px;padding:0 16px;border-radius:10px;font-size:18px;font-weight:700" }, h("div", { style: "color:#ff8f86" }, icon("box", 20, 2.2)), "Media");
  const optMusic = h("div", { class: "row", style: "gap:12px;height:50px;padding:0 16px;border-radius:10px;font-size:18px;font-weight:700;color:#b9bbc6" }, h("div", { style: "color:#8f96d8" }, icon("box", 20, 2.2)), "Media / Music");
  const menu = h(
    "div",
    { class: "abs col", style: "left:1250px;top:166px;width:280px;padding:8px;gap:2px;border-radius:14px;background:#1d1e24;border:1px solid var(--line2);box-shadow:0 30px 60px rgba(0,0,0,.6);transform-origin:50% 0" },
    h("div", { class: "label", style: "font-size:12px;color:#8f919d;padding:8px 16px 6px;letter-spacing:.16em" }, "Move to"),
    optMedia,
    optMusic,
  );
  const ctrlKbd = h("div", { class: "abs row", style: "left:0;top:0;gap:6px;z-index:30" }, h("div", { class: "kbd", style: "font-size:17px" }, "Ctrl"), h("div", { style: "font-size:15px;color:#8f919d" }, "/"), h("div", { class: "kbd", style: "font-size:17px" }, "⌘"));
  const bLayer = h("div", { class: "abs", style: "inset:0" }, ...bTop, container, ...bRight, ...flyers);
  place(container, CONT);

  // ---------- C: layouts and sidebar ----------
  type Lay = [number, number, number?, number?];
  const cDefs: [HTMLElement, Lay, Lay, Lay][] = [
    [weatherW(), [0, 0, 2, 2], [0, 0, 2, 2], [0, 0, 2, 2]],
    [app("jellyfin", "Jellyfin"), [2, 0], [0, 2], [2, 0]],
    [app("sonarr", "Sonarr"), [3, 0], [1, 2], [3, 0]],
    [app("radarr", "Radarr"), [4, 0], [0, 3], [4, 0]],
    [app("immich", "Immich"), [5, 0], [1, 3], [2, 1]],
    [app("piHole", "Pi-hole"), [2, 1], [0, 4], [3, 1]],
    [app("proxmox", "Proxmox"), [3, 1], [1, 4], [4, 1]],
    [downloadsW(), [4, 1, 2, 1], [0, 5, 2, 1], [0, 2, 3, 1]],
    [app("plex", "Plex"), [0, 2], [0, 6], [3, 2]],
    [app("homeAssistant", "Home Assistant"), [1, 2], [1, 6], [4, 2]],
  ];
  const extras = (
    [
      ["bazarr", "Bazarr"],
      ["prowlarr", "Prowlarr"],
      ["qBittorrent", "qBittorrent"],
      ["beszel", "Beszel"],
      ["ntfy", "ntfy"],
      ["seerr", "Seerr"],
      ["docker", "Docker"],
      ["lidarr", "Lidarr"],
      ["navidrome", "Navidrome"],
      ["mealie", "Mealie"],
      ["paperless-ngx", "Paperless-ngx"],
      ["homebox", "Homebox"],
      ["karakeep", "Karakeep"],
      ["frigate", "Frigate"],
      ["gatus", "Gatus"],
    ] as const
  ).map(([k, n], i) => ({ el: app(k, n), c: i % 5, r: 3 + Math.floor(i / 5) }));
  const cLayer = h("div", { class: "abs", style: "inset:0" }, ...cDefs.map(([el]) => el), ...extras.map((x) => x.el));
  const segs = ["Base", "Mobile", "+ Breakpoint"].map((s, i) =>
    h("div", { class: "center", style: `width:170px;height:48px;font-size:18px;font-weight:700;position:relative;z-index:1;color:${i === 2 ? "#8f919d" : "#e6e7ec"}` }, i === 0 ? icon("device-desktop", 20, 2) : i === 1 ? icon("device-mobile", 20, 2) : "", h("span", { style: "margin-left:8px" }, s)),
  );
  const segPill = h("div", { class: "abs", style: "left:6px;top:6px;width:170px;height:48px;border-radius:12px;background:#fa5352" });
  const segCtl = h("div", { class: "abs row", style: "left:1060px;top:84px;padding:6px;border-radius:16px;background:#17181d;border:1px solid var(--line2)" }, segPill, ...segs);
  const resetBtn = h("div", { class: "abs row", style: "left:1170px;top:520px;width:300px;height:64px;justify-content:center;gap:10px;border-radius:14px;border:2px solid #fa5352;background:rgba(250,83,82,.12);font-size:21px;font-weight:800;color:#ffd2ce" }, icon("restore", 22, 2.4), "Reset from Base");
  const sidebar = h(
    "div",
    { class: "abs col", style: "left:1640px;top:266px;width:160px;height:568px;padding:16px 14px;gap:14px;border-radius:16px;background:#17181d;border:1px solid rgba(124,140,255,.4)" },
    h("div", { class: "row label", style: "gap:8px;font-size:12px;color:#aab3ff;letter-spacing:.14em" }, icon("pin", 14, 2.4), "Sidebar"),
    ...(
      [
        ["jellyfin", "Jellyfin"],
        ["seerr", "Seerr"],
        ["sonarr", "Sonarr"],
        ["radarr", "Radarr"],
        ["qBittorrent", "qBittorrent"],
        ["immich", "Immich"],
      ] as const
    ).map(([k, n]) => h("div", { class: "row", style: "gap:10px;height:58px;padding:0 10px;border-radius:12px;background:rgba(255,255,255,.04);font-size:15px;font-weight:650" }, logo(k, 30), n)),
  );
  const scrollThumb = h("div", { class: "abs", style: "left:1626px;width:5px;height:160px;border-radius:3px;background:rgba(255,255,255,.3)" });

  // ---------- Copy ----------
  const chapter = new Chapter("05", "Board editing, rebuilt");
  const copy = (top = 250) => h("div", { class: "abs col", style: `left:96px;top:${top}px;width:650px;gap:24px` });
  const headA = new Headline("Drag and drop, rebuilt.", { size: 80, lh: 1.02 });
  const subA = new Headline("Rebuilt on dnd-kit. Moves and eight-direction resizes are transactional.", { size: 28, weight: 550, color: "#b9bbc6", lh: 1.3 });
  const checks = (
    [
      ["eye", "Previews the result"],
      ["alert-triangle", "Checks collisions"],
      ["arrow-back-up", "Bad moves roll back"],
      ["device-floppy", "Only saves a valid layout"],
    ] as const
  ).map(([ic, text]) => {
    const dot = h("div", { class: "center", style: "width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.05);color:#8f919d;flex:none" }, icon(ic, 22, 2.2));
    const el = h("div", { class: "row", style: "gap:16px;font-size:25px;font-weight:650" }, dot, text);
    return { el, dot };
  });
  const colA = copy();
  colA.append(headA.el, subA.el, h("div", { class: "col", style: "gap:14px;margin-top:14px" }, ...checks.map((c) => c.el)));
  const headB = new Headline("Containers replace Groups and sections.", { size: 70, lh: 1.04, accent: ["containers"] });
  const subB = new Headline("They hold apps, widgets and other Containers.", { size: 28, weight: 550, color: "#b9bbc6", lh: 1.3 });
  const tipRow = (lead: HTMLElement, text: string) => h("div", { class: "row", style: "gap:16px;font-size:24px;font-weight:600;line-height:1.35;align-items:flex-start;color:#e6e7ec" }, lead, h("div", {}, text));
  const tipB1 = tipRow(h("div", { class: "row", style: "gap:6px;flex:none" }, h("div", { class: "kbd", style: "font-size:17px" }, "Ctrl"), h("div", { class: "kbd", style: "font-size:17px" }, "⌘")), "+ click to select several items, then Move to.");
  const tipB2 = tipRow(h("div", { class: "center", style: "width:40px;height:40px;border-radius:12px;background:rgba(250,83,82,.14);color:#ff8f86;flex:none" }, icon("chevron-down", 22, 2.4)), "Move a Container with its contents, or collapse it when you need the space.");
  const colB = copy();
  colB.append(headB.el, subB.el, h("div", { class: "col", style: "gap:22px;margin-top:18px" }, tipB1, tipB2));
  const headC = new Headline("One board, several layouts.", { size: 76, lh: 1.04 });
  const subC = new Headline("Base and Mobile layouts, plus optional breakpoints.", { size: 28, weight: 550, color: "#b9bbc6", lh: 1.3 });
  const tipC = tipRow(h("div", { class: "center", style: "width:40px;height:40px;border-radius:12px;background:rgba(250,83,82,.14);color:#ff8f86;flex:none" }, icon("restore", 22, 2.4)), "Reset from Base creates a Mobile starting point without duplicating the board.");
  const colC = copy();
  colC.append(headC.el, subC.el, h("div", { style: "margin-top:18px" }, tipC));
  const headD = new Headline("Fixed sidebars.", { size: 84, lh: 1.02 });
  const subD = new Headline("Keep app shortcuts or widgets in a sidebar while the main board scrolls.", { size: 28, weight: 550, color: "#b9bbc6", lh: 1.3 });
  const colD = copy(300);
  colD.append(headD.el, subD.el);

  const cursor = h("div", { class: "abs", style: "left:0;top:0;width:34px;height:34px;z-index:30;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))" }, icon("filled:pointer", 34, 1));
  const moreBelow = h("div", { class: "abs", style: `left:${FX}px;top:${FY + FH - 90}px;width:${FW - 190}px;height:88px;border-radius:0 0 0 22px;background:linear-gradient(180deg,rgba(15,16,20,0),#0f1014 85%);pointer-events:none` });

  fg.append(frame, gridDots, aLayer, bLayer, cLayer, moreBelow, sidebar, scrollThumb, segCtl, resetBtn, toolbar, menu, colA, colB, colC, colD, chapter.el, ctrlKbd, cursor);

  // ---------- Timeline ----------
  const G1 = 1.1;
  const D1 = 2.3;
  const G2 = 3.0;
  const D2 = 3.9;
  const R0 = 4.5;
  const R1 = 5.1;
  const B = 6.0;
  const C = B + 6.0;
  const MOB = C + 1.4;
  const RST = C + 2.6;
  // The fixed-sidebar beat was cut for pace; SB sits past the end so its copy leaves with the scene.
  const END = C + 4.4;
  const SB = END + 0.1;

  const grab: [number, number] = [O[0] + 88, O[1] + 60];
  const P2: Rect = cell(4, 2, 2, 1);
  const hdl: [number, number] = [P2[0] + P2[2] / 2, P2[1] + P2[3]];
  const keysA: Key[] = [
    [0.6, 1150, 1000],
    [1.05, ...grab],
    [1.2, ...grab],
    [1.9, 1270, 488],
    [D1, 1270, 492],
    [2.75, ...grab],
    [G2, ...grab],
    [3.75, P2[0] + 96, P2[1] + 70],
    [D2 + 0.05, P2[0] + 96, P2[1] + 70],
    [4.4, ...hdl],
    [R0, ...hdl],
    [R1, hdl[0], hdl[1] + 136],
    [5.7, 1700, 960],
  ];
  const ctr = (r: Rect): [number, number] => [r[0] + r[2] / 2, r[1] + r[3] / 2 + 10];
  const chevXY: [number, number] = [CONT[0] + CONT[2] - 34, CONT[1] + 26];
  const keysC: Key[] = [
    [C + 0.6, 1500, 960],
    [MOB - 0.1, 1060 + 6 + 170 + 110, 108],
    [MOB + 0.1, 1060 + 6 + 170 + 110, 108],
    [RST - 0.2, 1370, 552],
    [RST + 0.1, 1370, 552],
    [C + 3.4, 1650, 1000],
  ];

  const cues: Scene["cues"] = [
    { t: 0.05, kind: "whoosh", gain: 0.7 },
    { t: G1, kind: "click", gain: 0.8 },
    { t: D1, kind: "reverse", gain: 0.5 },
    { t: D1 + 0.05, kind: "swish", gain: 0.6, pitch: -2 },
    { t: G2, kind: "click", gain: 0.8 },
    { t: D2, kind: "stamp", gain: 0.7 },
    { t: D2 + 0.05, kind: "chime", gain: 0.5 },
    { t: R0, kind: "click", gain: 0.6 },
    { t: R1, kind: "pop", gain: 0.7 },
    { t: B - 0.15, kind: "whoosh", gain: 0.7 },
    { t: B + 1.2, kind: "click", gain: 0.7 },
    { t: B + 1.65, kind: "click", gain: 0.7 },
    { t: B + 2.25, kind: "click", gain: 0.7 },
    { t: B + 2.7, kind: "click", gain: 0.8 },
    { t: B + 2.8, kind: "swish", gain: 0.6 },
    { t: B + 3.3, kind: "pop", gain: 0.6 },
    { t: B + 4.0, kind: "click", gain: 0.7 },
    { t: B + 4.05, kind: "swish", gain: 0.5, pitch: -3 },
    { t: B + 4.9, kind: "click", gain: 0.7 },
    { t: B + 4.95, kind: "swish", gain: 0.5, pitch: 2 },
    { t: C - 0.15, kind: "whoosh", gain: 0.7 },
    { t: MOB, kind: "click", gain: 0.8 },
    { t: MOB + 0.15, kind: "whoosh", gain: 0.6 },
    { t: RST, kind: "click", gain: 0.8 },
    ...cDefs.map((_, i) => ({ t: RST + 0.1 + i * 0.06 + 0.6, kind: "tick" as const, gain: 0.35, pitch: i })),
    { t: END - 0.35, kind: "whoosh", gain: 0.8 },
  ];

  return {
    name: "board",
    start: 0,
    end: END,
    // Authored at a relaxed pace; played back faster.
    warp: [[0, END, 1.6]],
    fg,
    cues,
    update(t, ctx) {

      // Window rect: A/B board → shorter Base board → phone → board with sidebar.
      const toBase = E.inOutQuart(seg(t, C - 0.3, C + 0.3));
      const toPhone = E.inOutQuart(seg(t, MOB + 0.15, MOB + 0.8));
      const toSb = E.inOutQuart(seg(t, SB, SB + 0.8));
      const baseFrame: Rect = [FX, FY, FW, lerp(FH, 560, toBase)];
      let fr = lerpR(baseFrame, PHONE, toPhone);
      fr = lerpR(fr, [FX, FY, FW, FH], toSb);
      const phoneAmt = toPhone * (1 - toSb);
      place(frame, fr);
      frame.style.borderRadius = `${lerp(22, 46, phoneAmt).toFixed(1)}px`;
      frame.style.borderWidth = `${lerp(1, 7, phoneAmt).toFixed(1)}px`;
      frame.style.borderColor = phoneAmt > 0.02 ? "#2a2b33" : "rgba(255,255,255,.1)";
      const fIn = E.outExpo(seg(t, -0.4, 0.3)); // already up as the push lands
      const out = E.inCubic(seg(t, END - 0.4, END));
      frame.style.opacity = String(fIn * (1 - out));
      frame.style.transform = `translateY(${((1 - fIn) * 60).toFixed(1)}px) scale(${(1 - out * 0.06).toFixed(3)})`;
      headRight.style.opacity = String(1 - seg(t, C - 0.3, C));

      const aOn = t < B + 0.2;
      const bOn = t > B - 0.3 && t < C + 0.2;
      const cOn = t > C - 0.3;
      aLayer.style.display = aOn ? "" : "none";
      bLayer.style.display = bOn ? "" : "none";
      cLayer.style.display = cOn ? "" : "none";
      gridDots.style.opacity = String(0.9 * fIn * (1 - seg(t, C - 0.3, C)));
      gridDots.style.display = t < C ? "" : "none";

      // ----- A -----
      const aExit = (i: number) => E.inCubic(seg(t, B - 0.3 + i * 0.02, B + 0.05 + i * 0.02));
      aItems.forEach(([el], i) => {
        const pi = E.outBack(seg(t, -0.35 + i * 0.03, 0.1 + i * 0.03), 1.4);
        const q = aExit(i);
        tf(el, { s: lerp(0.8, 1, pi) * (1 - q * 0.2), o: clamp(pi * 1.5) * (1 - q) });
      });
      const [cxA, cyA] = path(t, keysA);
      const [lx, ly] = path(t - 0.04, keysA);
      const [px0] = path(t - 0.09, keysA);
      let dr: Rect = O;
      let dragging = false;
      if (t >= G1 && t < D1) dragging = true;
      if (t >= G2 && t < D2) dragging = true;
      if (dragging) dr = [lx - 88, ly - 60, O[2], O[3]];
      else if (t >= D1 && t < G2) {
        const [dx, dy] = path(D1 - 0.04, keysA);
        const sp = spring(t - D1, 2.2, 0.55);
        dr = [lerp(dx - 88, O[0], sp), lerp(dy - 60, O[1], sp), O[2], O[3]];
      } else if (t >= D2) {
        const [dx, dy] = path(D2 - 0.04, keysA);
        const sp = spring(t - D2, 2.6, 0.5);
        const hh = t < R0 ? P2[3] : lerp(P2[3], P2[3] + 136, t < R1 ? clamp((path(t, keysA)[1] - hdl[1]) / 136) : spring(t - R1, 3, 0.55) * (1 - clamp((path(R1, keysA)[1] - hdl[1]) / 136)) + clamp((path(R1, keysA)[1] - hdl[1]) / 136));
        dr = [lerp(dx - 88, P2[0], sp), lerp(dy - 60, P2[1], sp), P2[2], hh];
      }
      place(dl, dr);
      const lift = dragging ? 1 : 0;
      const tilt = dragging ? clamp((cxA - px0) * 0.12, -5, 5) : 0;
      const dIn = E.outBack(seg(t, 0.3, 0.75), 1.4);
      dl.style.transform = `rotate(${tilt.toFixed(2)}deg) scale(${((lift ? 1.05 : 1) * lerp(0.8, 1, dIn) * (1 - aExit(9) * 0.2)).toFixed(3)})`;
      dl.style.opacity = String(clamp(dIn * 1.5) * (1 - aExit(9)));
      dl.style.boxShadow = lift ? "0 40px 70px rgba(0,0,0,.7), 0 0 0 2px #fa5352" : "";
      dl.style.zIndex = "5";
      // Snapped preview + collision check against occupied cells.
      let collide = false;
      let pv: Rect | null = null;
      if (dragging) {
        const c = clamp(Math.round((dr[0] - GX) / 156), 0, 4);
        const r = clamp(Math.round((dr[1] - GY) / 136), 0, 3);
        pv = cell(c, r, 2, 1);
        collide = occupied.has(`${c},${r}`) || occupied.has(`${c + 1},${r}`);
      } else if (t >= R0 && t < R1 + 0.1) {
        const grow = (path(t, keysA)[1] - hdl[1]) / 136 > 0.5 ? 2 : 1;
        pv = cell(4, 2, 2, grow);
      }
      preview.style.display = pv ? "" : "none";
      if (pv) place(preview, pv);
      preview.style.borderColor = collide ? "#fa5352" : "#3ddc97";
      preview.style.background = collide ? "rgba(250,83,82,.14)" : "rgba(61,220,151,.1)";
      calendarEl.style.boxShadow = collide ? "0 0 0 2px #fa5352, 0 0 40px rgba(250,83,82,.45)" : "";
      calendarEl.style.transform = collide ? `translateX(${(Math.sin(t * 70) * 3).toFixed(1)}px)` : calendarEl.style.transform;
      const hOn = E.outBack(seg(t, D2 + 0.25, D2 + 0.5), 2) * (1 - seg(t, R1 + 0.35, R1 + 0.55));
      handles.forEach(({ i, j, el }) => {
        el.style.left = `${(dr[0] + (dr[2] * i) / 2).toFixed(1)}px`;
        el.style.top = `${(dr[1] + (dr[3] * j) / 2).toFixed(1)}px`;
        el.style.transform = `scale(${hOn.toFixed(3)})`;
        el.style.display = hOn > 0.01 ? "" : "none";
      });
      // Header status
      const st: [string, string, string] =
        t < G1 ? ["Ready", "#8f919d", "rgba(255,255,255,.04)"]
        : dragging && collide ? ["Collision", "#ff8f86", "rgba(250,83,82,.14)"]
        : dragging ? ["Valid layout", "#8ff0c4", "rgba(61,220,151,.12)"]
        : t < G2 ? ["Rolled back", "#ff8f86", "rgba(250,83,82,.1)"]
        : t >= R0 && t < R1 ? ["Resizing", "#8ff0c4", "rgba(61,220,151,.12)"]
        : ["Saved", "#8ff0c4", "rgba(61,220,151,.12)"];
      if (status.textContent !== st[0]) status.textContent = st[0];
      status.style.color = st[1];
      status.style.background = st[2];
      status.style.borderColor = st[1] + "66";
      const change = [G1 + 0.15, 1.6, D1, G2 + 0.1, D2, R0, R1].reduce((m, x) => (t >= x ? Math.max(m, x) : m), -9);
      status.style.transform = `scale(${(1 + Math.exp(-(t - change) * 9) * 0.12).toFixed(3)})`;

      // ----- B -----
      const bIn = (i: number) => E.outBack(seg(t, B + 0.05 + i * 0.03, B + 0.5 + i * 0.03), 1.4);
      const bExit = (i: number) => E.inCubic(seg(t, C - 0.3 + i * 0.02, C + 0.05 + i * 0.02));
      const land = [B + 3.3, B + 3.38];
      bTop.forEach((el, i) => {
        const p = bIn(i);
        const gone = i < 2 && t >= B + 2.8;
        tf(el, { s: lerp(0.8, 1, p) * (1 - bExit(i) * 0.2), o: gone ? 0 : clamp(p * 1.5) * (1 - bExit(i)) });
      });
      selRings.forEach((ring, i) => {
        const at = [B + 1.2, B + 1.65][i]!;
        const r = E.outBack(seg(t, at, at + 0.25), 2);
        ring.style.opacity = String(clamp(r));
        ring.style.transform = `scale(${lerp(1.15, 1, clamp(r)).toFixed(3)})`;
      });
      {
        const p = bIn(6);
        const collapse = E.inOutQuart(seg(t, B + 4.0, B + 4.45)) * (1 - E.inOutQuart(seg(t, B + 4.9, B + 5.35)));
        place(container, [CONT[0], CONT[1], CONT[2], lerp(CONT[3], 54, collapse)]);
        tf(container, { s: lerp(0.9, 1, p) * (1 - bExit(6) * 0.2), o: clamp(p * 1.5) * (1 - bExit(6)) });
        chevron.style.transform = `rotate(${(-90 * collapse).toFixed(1)}deg)`;
        contBody.style.opacity = String(1 - collapse);
        container.style.boxShadow = collapse > 0.01 && collapse < 0.99 ? "0 0 40px rgba(250,83,82,.3)" : "";
      }
      [inSon, inRad].forEach((el, i) => {
        el.style.opacity = t >= land[i]! ? "1" : "0";
        const pop = t >= land[i]! ? Math.exp(-(t - land[i]!) * 8) : 0;
        el.style.transform = `scale(${(1 + pop * 0.08).toFixed(3)})`;
        el.style.boxShadow = pop > 0.02 ? `0 0 ${(pop * 40).toFixed(0)}px rgba(250,83,82,${(pop * 0.8).toFixed(2)})` : "";
      });
      flyers.forEach((el, i) => {
        const from = cell(i, 0);
        const to: Rect = [CONT[0] + 16 + (i + 2) * 144, CONT[1] + 60, 128, 104];
        const f = E.inOutCubic(seg(t, B + 2.8 + i * 0.08, land[i]!));
        const r = lerpR(from, to, f);
        r[1] -= Math.sin(f * Math.PI) * 90;
        place(el, r);
        el.style.display = t >= B + 2.8 && t < land[i]! ? "" : "none";
        el.style.transform = `rotate(${(Math.sin(f * Math.PI) * (i ? 6 : -6)).toFixed(1)}deg)`;
        el.style.boxShadow = "0 30px 60px rgba(0,0,0,.6), 0 0 0 3px #fa5352";
        el.style.zIndex = "6";
      });
      bRight.forEach((el, i) => {
        const p = bIn(7 + i);
        tf(el, { s: lerp(0.8, 1, p) * (1 - bExit(7 + i) * 0.2), o: clamp(p * 1.5) * (1 - bExit(7 + i)) });
      });
      selCount.textContent = t >= B + 1.65 ? "2" : "1";
      const tbIn = E.outBack(seg(t, B + 1.25, B + 1.55), 1.6) * (1 - E.inCubic(seg(t, B + 2.8, B + 3.05)));
      tf(toolbar, { y: (1 - tbIn) * -30, o: clamp(tbIn * 1.4) });
      toolbar.style.display = t > B + 1.2 && t < B + 3.1 ? "" : "none";
      const mbPress = t > B + 2.25 && t < B + 2.37;
      moveBtn.style.transform = `scale(${mbPress ? 0.94 : 1})`;
      const mIn = E.outBack(seg(t, B + 2.3, B + 2.5), 1.5) * (1 - E.inCubic(seg(t, B + 2.78, B + 2.92)));
      tf(menu, { sy: lerp(0.7, 1, clamp(mIn)), o: clamp(mIn * 1.5) });
      menu.style.display = t > B + 2.28 && t < B + 2.95 ? "" : "none";
      optMedia.style.background = t > B + 2.5 ? "rgba(250,83,82,.16)" : "";
      optMusic.style.background = "";

      // ----- C -----
      const flyP = (i: number) => E.inOutCubic(seg(t, RST + 0.1 + i * 0.06, RST + 0.8 + i * 0.06));
      const sbP = (i: number) => E.inOutQuart(seg(t, SB + i * 0.025, SB + 0.8 + i * 0.025));
      const scroll = E.inOutSine(seg(t, C + 6.6, C + 8.4)) * 300;
      cDefs.forEach(([el, bl, ml, sl], i) => {
        const baseR = cell(bl[0], bl[1], bl[2] ?? 1, bl[3] ?? 1, FY);
        const mobR = mcell(ml[0], ml[1], ml[2] ?? 1, ml[3] ?? 1);
        const sbR = cell(sl[0], sl[1], sl[2] ?? 1, sl[3] ?? 1);
        sbR[1] -= scroll;
        let r: Rect = baseR;
        let o = 1;
        const pin = E.outBack(seg(t, C + 0.05 + i * 0.03, C + 0.5 + i * 0.03), 1.4);
        let s = lerp(0.8, 1, pin);
        o = clamp(pin * 1.5) * (1 - E.inCubic(seg(t, MOB + 0.05, MOB + 0.3)));
        if (t >= RST) {
          const f = flyP(i);
          r = lerpR(baseR, mobR, f);
          r[1] -= Math.sin(f * Math.PI) * 60;
          o = clamp(seg(t, RST + 0.1 + i * 0.06, RST + 0.25 + i * 0.06));
          s = 1;
          if (t >= SB) r = lerpR(mobR, sbR, sbP(i));
        }
        place(el, r);
        tf(el, { s, o: o * (1 - out) });
      });
      extras.forEach(({ el, c, r }, j) => {
        const rr = cell(c, r);
        rr[1] -= scroll;
        place(el, rr);
        tf(el, { o: seg(t, SB + 0.7 + j * 0.02, SB + 1.0 + j * 0.02) * (1 - out) });
      });
      const flying = t > RST + 0.05 && t < RST + 1.5;
      cLayer.style.clipPath = flying ? "" : `inset(${(fr[1] + 96).toFixed(1)}px ${(1920 - fr[0] - fr[2]).toFixed(1)}px ${(1080 - fr[1] - fr[3] + 8).toFixed(1)}px ${fr[0].toFixed(1)}px round 0 0 20px 20px)`;
      const sIn = E.outExpo(seg(t, SB + 0.6, SB + 1.1));
      tf(sidebar, { x: (1 - sIn) * 200, o: sIn * (1 - out) });
      sidebar.style.clipPath = `inset(0 0 0 0 round 16px)`;
      sidebar.style.display = t > SB + 0.5 ? "" : "none";
      moreBelow.style.opacity = String(seg(t, SB + 0.7, SB + 1.1) * (1 - out));
      moreBelow.style.display = t > SB + 0.6 ? "" : "none";
      scrollThumb.style.top = `${(FY + 110 + (scroll / 300) * 360).toFixed(1)}px`;
      scrollThumb.style.opacity = String(seg(t, C + 6.4, C + 6.6) * (1 - seg(t, C + 8.6, C + 8.9)) * (1 - out));
      const segIn = E.outBack(seg(t, C + 0.7, C + 1.0), 1.5) * (1 - E.inCubic(seg(t, SB - 0.3, SB)));
      tf(segCtl, { y: (1 - segIn) * -30, o: clamp(segIn * 1.4) });
      segCtl.style.display = t > C + 0.6 && t < SB ? "" : "none";
      segPill.style.transform = `translateX(${(E.outBack(seg(t, MOB, MOB + 0.3), 1.3) * 170).toFixed(1)}px)`;
      const rIn = E.outBack(seg(t, MOB + 0.75, MOB + 1.0), 1.8) * (1 - E.inCubic(seg(t, RST + 0.05, RST + 0.2)));
      const rPress = t > RST && t < RST + 0.12;
      tf(resetBtn, { s: clamp(rIn, 0, 2) * (rPress ? 0.94 : 1), o: clamp(rIn * 1.5) });
      resetBtn.style.display = t > MOB + 0.7 && t < RST + 0.25 ? "" : "none";

      // ----- Cursor -----
      let cur: [number, number] | null = null;
      let press = false;
      if (t > 0.55 && t < 5.75) {
        cur = [cxA, cyA];
        press = dragging || (t >= R0 && t < R1);
      } else if (t > B + 0.55 && t < B + 5.6) {
        const son = ctr(cell(0, 0));
        const rad = ctr(cell(1, 0));
        const [mbx, mby] = offsetWithin(moveBtn, fg);
        const mb: [number, number] = [mbx + 60, mby + 26];
        const [omx, omy] = offsetWithin(optMedia, fg);
        const om: [number, number] = [omx + 90, omy + 28];
        cur = path(t, [
          [B + 0.6, 1500, 980],
          [B + 1.1, ...son],
          [B + 1.25, ...son],
          [B + 1.58, ...rad],
          [B + 1.8, ...rad],
          [B + 2.2, ...mb],
          [B + 2.35, ...mb],
          [B + 2.65, ...om],
          [B + 2.8, ...om],
          [B + 3.85, ...chevXY],
          [B + 4.9, ...chevXY],
          [B + 5.55, 1650, 1000],
        ]);
        press = [B + 1.2, B + 1.65, B + 2.25, B + 2.7, B + 4.0, B + 4.9].some((x) => t >= x && t < x + 0.12);
      } else if (t > C + 0.55 && t < C + 3.45) {
        cur = path(t, keysC);
        press = [MOB, RST].some((x) => t >= x && t < x + 0.12);
      }
      cursor.style.display = cur ? "" : "none";
      if (cur) {
        cursor.style.transform = `translate(${cur[0].toFixed(1)}px,${cur[1].toFixed(1)}px) scale(${press ? 0.85 : 1})`;
        const edge = Math.min(seg(t, 0.55, 0.75), 1 - seg(t, 5.5, 5.75), 1) ;
        cursor.style.opacity = String(t < B ? edge : 1);
      }
      const kOn = E.outBack(seg(t, B + 0.9, B + 1.1), 1.6) * (1 - seg(t, B + 1.85, B + 2.0));
      ctrlKbd.style.display = kOn > 0.01 && cur ? "" : "none";
      if (cur) tf(ctrlKbd, { x: cur[0] + 34, y: cur[1] + 30, s: clamp(kOn, 0, 1.5), o: clamp(kOn * 1.5) });

      // ----- Copy -----
      chapter.update(t, -0.15, C - 0.4);
      colA.style.display = t < B + 0.3 ? "" : "none";
      headA.update(t, -0.1, B - 0.45, 0.06);
      subA.update(t, 0.3, B - 0.4, 0.02);
      checks.forEach((c, i) => {
        const at = [G1 + 0.15, 1.6, D1 + 0.05, D2][i]!;
        const inn = E.outExpo(seg(t, 0.8 + i * 0.08, 1.2 + i * 0.08));
        const lit = t >= at ? 1 : 0;
        const q = E.inCubic(seg(t, B - 0.4 + i * 0.03, B - 0.1 + i * 0.03));
        tf(c.el, { x: (1 - inn) * -30, o: inn * lerp(0.38, 1, lit) * (1 - q) });
        const color = i === 1 || i === 2 ? "#fa5352" : "#3ddc97";
        c.dot.style.background = lit ? color + "26" : "rgba(255,255,255,.05)";
        c.dot.style.color = lit ? color : "#8f919d";
        const pop = t >= at ? Math.exp(-(t - at) * 7) : 0;
        c.dot.style.transform = `scale(${(1 + pop * 0.3).toFixed(3)})`;
      });
      colB.style.display = t > B - 0.1 && t < C + 0.3 ? "" : "none";
      headB.update(t, B + 0.1, C - 0.45, 0.05);
      subB.update(t, B + 0.4, C - 0.4, 0.02);
      [tipB1, tipB2].forEach((el, i) => {
        const at = [B + 0.95, B + 3.9][i]!;
        const p = E.outExpo(seg(t, at, at + 0.5));
        tf(el, { x: (1 - p) * -30, o: p * (1 - E.inCubic(seg(t, C - 0.4, C - 0.1))) });
      });
      colC.style.display = t > C - 0.1 && t < SB + 0.3 ? "" : "none";
      headC.update(t, C + 0.1, SB - 0.45, 0.05);
      subC.update(t, C + 0.4, SB - 0.4, 0.02);
      {
        const p = E.outExpo(seg(t, RST + 1.0, RST + 1.5));
        tf(tipC, { x: (1 - p) * -30, o: p * (1 - E.inCubic(seg(t, SB - 0.4, SB - 0.1))) });
      }
      colD.style.display = t > SB - 0.1 ? "" : "none";
      headD.update(t, SB + 0.15, END - 0.45, 0.06);
      subD.update(t, SB + 0.45, END - 0.4, 0.02);

      ctx.fx.shake = (t > D1 ? Math.exp(-(t - D1) * 10) : 0) * 5;
      ctx.fx.zoom = 1 + (t > D2 ? Math.exp(-(t - D2) * 7) : 0) * 0.012;
    },
  };
}
