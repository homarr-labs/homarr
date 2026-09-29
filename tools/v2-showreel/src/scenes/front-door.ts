import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, tf, icon, logo } from "../lib/dom";
import { Chapter, CodeType, Headline, svg, bez, type Tok } from "../lib/kit";
import type { Scene } from "../lib/scene";
import { LOGO_D, LOGO_VB } from "./intro";

const services = ["sonarr", "radarr", "seerr", "sabNzbd", "qBittorrent", "bazarr", "beszel", "jellyfin", "prowlarr", "immich", "plex", "proxmox"];
const names: Record<string, string> = {
  sonarr: "Sonarr",
  radarr: "Radarr",
  seerr: "Seerr",
  sabNzbd: "SABnzbd",
  qBittorrent: "qBittorrent",
  bazarr: "Bazarr",
  beszel: "Beszel",
  jellyfin: "Jellyfin",
  prowlarr: "Prowlarr",
  immich: "Immich",
  plex: "Plex",
  proxmox: "Proxmox",
};
const credKinds = ["URL", "API key", "Auth header"];

// Sonarr v3 endpoints. Homarr's Sonarr integration only calls the first four (series, calendar, wanted/missing, queue).
const API: [string, string, boolean][] = [
  ["GET", "/api/v3/series", true],
  ["GET", "/api/v3/calendar", true],
  ["GET", "/api/v3/wanted/missing", true],
  ["GET", "/api/v3/queue", true],
  ["POST", "/api/v3/command", false],
  ["GET", "/api/v3/history", false],
  ["GET", "/api/v3/diskspace", false],
  ["PUT", "/api/v3/episode/monitor", false],
];
const CALL = 4; // the endpoint the request reaches
const methodColor: Record<string, string> = { GET: "#3ddc97", POST: "#fa5352", PUT: "#ffb547" };

const K = (s: string): Tok => [s, "k"];
const S = (s: string): Tok => [s, "s"];
const P = (s: string): Tok => [s];
const reqCode: Tok[][] = [
  [P("{")],
  [P("  "), K('"integrationKind"'), P(": "), S('"sonarr"'), P(",")],
  [P("  "), K('"method"'), P(": "), S('"POST"'), P(",")],
  [P("  "), K('"path"'), P(": "), S('"/api/v3/command"'), P(",")],
  [P("  "), K('"body"'), P(": { "), K('"name"'), P(": "), S('"MissingEpisodeSearch"'), P(" }")],
  [P("}")],
];

function flatLogo(size: number, color = "#fa5352") {
  const s = svg("svg", { viewBox: LOGO_VB, width: size, height: (size * 346.2) / 512 });
  s.append(svg("path", { d: LOGO_D, fill: color }));
  return s;
}

export function frontDoor(): Scene {
  const bg = h("div", { class: "scene" });
  const fg = h("div", { class: "scene" });

  // ---------- Door: the sentence is split by a real door that swings open ----------
  const DX = 960;
  const DY = 430;
  const DW = 300;
  const DH = 500;
  const rays = h("div", {
    class: "abs",
    style: `left:${DX}px;top:${DY}px;width:3000px;height:3000px;margin:-1500px;background:repeating-conic-gradient(from 0deg,rgba(255,140,125,.16) 0deg 2deg,transparent 2deg 8deg);-webkit-mask-image:radial-gradient(closest-side,#000,transparent 70%);mask-image:radial-gradient(closest-side,#000,transparent 70%)`,
  });
  const spill = h("div", {
    class: "abs",
    style: `left:0;right:0;top:${DY + DH / 2}px;height:${1080 - DY - DH / 2}px;background:linear-gradient(180deg,rgba(255,200,190,.55),rgba(250,83,82,.12) 70%,transparent);clip-path:polygon(${DX - DW / 2}px 0,${DX + DW / 2}px 0,1560px 100%,360px 100%)`,
  });
  const doorLight = h("div", {
    class: "abs",
    style: `left:${DX - DW / 2}px;top:${DY - DH / 2}px;width:${DW}px;height:${DH}px;border-radius:8px;background:radial-gradient(90% 70% at 50% 60%,#fff,#ffd3cc 35%,#fa5352 90%)`,
  });
  const panel = h(
    "div",
    {
      class: "abs",
      style: `left:${DX - DW / 2}px;top:${DY - DH / 2}px;width:${DW}px;height:${DH}px;border-radius:8px;transform-origin:0 50%;background:linear-gradient(90deg,#1b1b22,#121217);border:1.5px solid rgba(255,176,168,.35);box-shadow:inset 0 0 0 14px rgba(255,255,255,.02)`,
    },
    h("div", { class: "abs", style: "left:26px;right:26px;top:30px;height:190px;border-radius:6px;border:1.5px solid rgba(255,255,255,.08)" }),
    h("div", { class: "abs", style: "left:26px;right:26px;bottom:30px;height:210px;border-radius:6px;border:1.5px solid rgba(255,255,255,.08)" }),
    h("div", { class: "abs", style: "right:24px;top:246px;width:16px;height:16px;border-radius:50%;background:#ffb0a8;box-shadow:0 0 12px rgba(250,83,82,.8)" }),
  );
  const frame = h("div", {
    class: "abs",
    style: `left:${DX - DW / 2 - 10}px;top:${DY - DH / 2 - 10}px;width:${DW + 20}px;height:${DH + 10}px;border:4px solid #ffb0a8;border-bottom:none;border-radius:12px 12px 0 0;box-shadow:0 0 30px rgba(250,83,82,.7),inset 0 0 20px rgba(250,83,82,.5)`,
  });
  const sill = h("div", { class: "abs", style: `left:260px;right:260px;top:${DY + DH / 2}px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,176,168,.8),transparent)` });
  const persp = h("div", { class: "abs", style: `inset:0;perspective:1400px;perspective-origin:${DX}px ${DY}px` }, panel);
  const headL = new Headline("The front door", { size: 104, accent: ["front", "door"] });
  const headR = new Headline("to your homelab.", { size: 104 });
  const headLWrap = h("div", { class: "abs", style: `right:${1920 - (DX - DW / 2 - 50)}px;top:${DY - 64}px;white-space:nowrap;text-align:right` }, headL.el);
  const headRWrap = h("div", { class: "abs", style: `left:${DX + DW / 2 + 50}px;top:${DY - 64}px;white-space:nowrap` }, headR.el);
  const doorScene = h("div", { class: "abs", style: `inset:0;transform-origin:${DX}px ${DY}px` }, rays, spill, sill, doorLight, persp, frame, headLWrap, headRWrap);

  const chapter = new Chapter("04", "Integration requests");

  // ---------- Hub ----------
  const cx = 960;
  const cy = 500;
  const hub = h("div", {
    class: "abs center",
    style: `left:${cx - 110}px;top:${cy - 110}px;width:220px;height:220px;border-radius:44px;background:radial-gradient(circle at 50% 30%,#2a1c1f,#141217);border:2px solid rgba(250,83,82,.6);box-shadow:0 0 80px rgba(250,83,82,.35)`,
  });
  const hubLock = h(
    "div",
    { class: "abs row mono", style: `left:${cx - 90}px;top:${cy + 130}px;width:180px;justify-content:center;gap:8px;font-size:15px;font-weight:700;color:var(--mint);letter-spacing:.14em` },
    icon("lock", 18, 2.4),
    "ENCRYPTED",
  );
  const lines = svg("svg", { width: 1920, height: 1080 });
  lines.setAttribute("style", "position:absolute;left:0;top:0;overflow:visible");
  const RX = 640;
  const RY = 330;
  const arc: number[] = [0];
  for (let k = 1; k <= 720; k++) {
    const a0 = ((k - 1) / 720) * Math.PI * 2;
    const a1 = (k / 720) * Math.PI * 2;
    arc.push(arc[k - 1]! + Math.hypot(RX * (Math.cos(a1) - Math.cos(a0)), RY * (Math.sin(a1) - Math.sin(a0))));
  }
  const angleAt = (frac: number) => {
    const target = frac * arc[720]!;
    const k = arc.findIndex((v) => v >= target);
    return (Math.max(0, k) / 720) * Math.PI * 2;
  };
  const nodes = services.map((s, i) => {
    const a = angleAt(i / services.length + 0.02) - Math.PI / 2;
    const x = cx + Math.cos(a) * RX;
    const y = cy + Math.sin(a) * RY;
    const path = svg("path", {
      d: `M${cx} ${cy} Q ${(cx + x) / 2 + Math.sin(a) * 60} ${(cy + y) / 2 - Math.cos(a) * 60} ${x} ${y}`,
      pathLength: 1,
      fill: "none",
      stroke: "rgba(250,83,82,.45)",
      "stroke-width": 2,
    });
    lines.append(path);
    const el = h(
      "div",
      { class: "abs col center", style: `left:${x - 70}px;top:${y - 58}px;width:140px;gap:10px` },
      h("div", { class: "card center", style: "width:92px;height:92px;border-radius:22px" }, logo(s, 56)),
      h("div", { style: "font-size:18px;font-weight:700;white-space:nowrap" }, names[s]!),
    );
    const cred = h(
      "div",
      { class: "abs row mono", style: "left:0;top:0;gap:6px;padding:6px 10px;border-radius:8px;background:#2a1a1c;border:1px solid rgba(250,83,82,.6);color:#ffb3ad;font-size:13px;font-weight:700;white-space:nowrap" },
      icon(i % 3 === 0 ? "world" : "key", 15, 2.2),
      credKinds[i % 3]!,
    );
    return { el, path, x, y, a, cred, ctrl: [(cx + x) / 2 + Math.sin(a) * 60, (cy + y) / 2 - Math.cos(a) * 60] };
  });
  const hubCaption = new Headline("Homarr already has your services' URLs, API keys and auth headers.", {
    size: 44,
    weight: 700,
    lh: 1.15,
  });
  hubCaption.el.style.letterSpacing = "-0.02em";
  const hubCapWrap = h("div", { class: "abs", style: "left:260px;right:260px;top:888px;text-align:center" }, hubCaption.el);
  const hubGroup = h("div", { class: "abs", style: "inset:0;transform-origin:960px 500px" }, lines, ...nodes.map((n) => n.el), hub, hubLock, ...nodes.map((n) => n.cred));

  // ---------- Explanation: an endpoint Homarr has no code for ----------
  const headA = new Headline("Homarr only has code for a few Sonarr endpoints.", { size: 60, accent: ["few"] });
  const headAWrap = h("div", { class: "abs", style: "left:96px;top:140px;white-space:nowrap" }, headA.el);
  const headB = new Headline("One new endpoint reaches the rest.", { size: 60, accent: ["rest."] });
  const headBWrap = h("div", { class: "abs", style: "left:96px;top:140px;white-space:nowrap" }, headB.el);

  const apiRows = API.map(([m, path, built]) => {
    const tagCode = h("div", { class: "row mono", style: "gap:6px;font-size:14px;font-weight:700;letter-spacing:.06em;padding:5px 10px;border-radius:7px;background:rgba(250,83,82,.14);color:#ffb3ad" }, icon("code", 15, 2.4), "HOMARR CODE");
    const tagNone = h("div", { class: "mono", style: "font-size:14px;letter-spacing:.06em;padding:5px 10px;border-radius:7px;border:1px dashed rgba(255,255,255,.2);color:#8f919d" }, "NO HOMARR CODE");
    const tagDone = h("div", { class: "row mono", style: "white-space:nowrap;gap:6px;font-size:14px;font-weight:700;letter-spacing:.06em;padding:5px 10px;border-radius:7px;background:#1f7a55;color:#fff" }, icon("check", 15, 3), "CALLED THROUGH HOMARR");
    const tags = h("div", { class: "row", style: "margin-left:auto;position:relative" }, built ? tagCode : tagNone, built ? "" : tagDone);
    tagDone.style.position = "absolute";
    tagDone.style.right = "0";
    const el = h(
      "div",
      { class: "row", style: "gap:16px;height:58px;padding:0 18px;border-top:1px solid var(--line);border-radius:10px" },
      h("div", { class: "mono", style: `width:62px;font-size:16px;font-weight:800;color:${methodColor[m]}` }, m),
      h("div", { class: "mono", style: "font-size:21px;color:#e4e5ea" }, path),
      tags,
    );
    return { el, tagNone, tagDone, built };
  });
  const apiCard = h(
    "div",
    { class: "abs card col", style: "left:96px;top:250px;width:790px;padding:14px 12px 10px" },
    h("div", { class: "row", style: "gap:14px;height:62px;padding:0 18px;font-size:26px;font-weight:800" }, logo("sonarr", 38), "Sonarr API", h("div", { class: "mono", style: "margin-left:auto;font-size:15px;color:var(--muted);font-weight:500" }, "v3")),
    ...apiRows.map((r) => r.el),
  );

  const reqCodeT = new CodeType(reqCode);
  reqCodeT.el.style.cssText = "font-size:21px;line-height:33px;font-family:'JetBrains Mono';color:#c9d1d9";
  const reqStatus = h("div", { class: "row mono", style: "margin-left:auto;gap:8px;padding:5px 12px;border-radius:8px;background:#1f7a55;color:#fff;font-size:16px;font-weight:800" }, "201", h("span", { style: "font-weight:500" }, "Created"));
  const reqCard = h(
    "div",
    { class: "abs card", style: "left:960px;top:250px;width:864px;padding:18px 26px 22px;border-color:rgba(250,83,82,.45)" },
    h(
      "div",
      { class: "row", style: "gap:14px;height:46px;margin-bottom:10px" },
      h("div", { class: "mono", style: "padding:4px 12px;border-radius:8px;background:#fa5352;color:#fff;font-size:18px;font-weight:800" }, "POST"),
      h("div", { class: "mono", style: "font-size:24px;font-weight:700" }, "/api/integrations/request"),
      reqStatus,
    ),
    reqCodeT.el,
  );
  const FLOW_Y = 705;
  const homarrNode = h(
    "div",
    { class: "abs card row", style: `left:960px;top:${FLOW_Y - 68}px;width:470px;height:136px;padding:0 24px;gap:18px` },
    flatLogo(70),
    h("div", { class: "col", style: "gap:6px" }, h("div", { style: "font-size:28px;font-weight:850" }, "Homarr"), h("div", { style: "font-size:18px;color:#b9bbc6;line-height:1.3" }, "Adds the saved URL and API key.", h("br"), "Never returns them.")),
  );
  const sonarrNode = h(
    "div",
    { class: "abs card row", style: `left:1570px;top:${FLOW_Y - 68}px;width:254px;height:136px;padding:0 24px;gap:16px` },
    logo("sonarr", 64),
    h("div", { style: "font-size:28px;font-weight:850" }, "Sonarr"),
  );
  const flowWire = h("div", { class: "abs", style: `left:1430px;width:140px;top:${FLOW_Y - 1}px;height:3px;background:rgba(250,83,82,.55);transform-origin:0 50%` });
  const packet = h(
    "div",
    { class: "abs row mono", style: "left:0;top:0;gap:10px;padding:9px 14px;border-radius:11px;background:#fa5352;color:#fff;font-weight:700;font-size:17px;white-space:nowrap;box-shadow:0 0 30px rgba(250,83,82,.6)" },
    "POST /api/v3/command",
  );
  // Second leg: the same call, now carrying Homarr's stored key, crosses the wire to Sonarr.
  const pkt2 = h(
    "div",
    { class: "abs row", style: "left:0;top:0;gap:8px;padding:10px 12px;border-radius:999px;background:#fa5352;color:#fff;box-shadow:0 0 30px rgba(250,83,82,.8)" },
    icon("send", 26, 2.4),
    h("span", { class: "center", style: "width:36px;height:36px;border-radius:50%;background:#1f7a55" }, icon("key", 22, 2.6)),
  );
  const resp = h(
    "div",
    { class: "abs row mono", style: "left:0;top:0;gap:10px;padding:9px 14px;border-radius:11px;background:#15261f;border:1.5px solid var(--mint);color:#d8ffe9;font-size:17px;font-weight:700;white-space:nowrap;box-shadow:0 0 30px rgba(61,220,151,.35)" },
    h("span", { style: "color:var(--mint)" }, "201"),
    "Created",
  );
  const statement = new Headline("If the service's API has the endpoint, Homarr can call it.", { size: 52, weight: 800 });
  const stWrap = h("div", { class: "abs", style: "left:96px;top:836px;white-space:nowrap" }, statement.el);
  const lane = (tag: string, text: string) =>
    h("div", { class: "row", style: "gap:12px;padding:9px 16px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--line2)" }, h("div", { class: "mono", style: "font-size:14px;letter-spacing:.16em;color:var(--muted)" }, tag), h("div", { class: "mono", style: "font-size:20px;font-weight:600" }, text));
  const lanes = [lane("REST", "POST /api/integrations/request"), lane("tRPC", "integration.request"), lane("MCP", "integration_request")];
  const laneRow = h("div", { class: "abs row", style: "left:96px;top:936px;gap:14px" }, ...lanes);
  const expl = h("div", { class: "abs", style: "inset:0" }, apiCard, flowWire, reqCard, homarrNode, sonarrNode, packet, pkt2, resp, stWrap, laneRow, headAWrap, headBWrap);

  bg.append(doorScene, hubGroup);
  fg.append(chapter.el, hubCapWrap, expl);

  // Scene-local timeline
  const SWING = 0.3;
  const PUSH = 1.45;
  const HUB = 1.95;
  const KEYS = HUB + 0.55;
  const EXPL = 4.15;
  const ROW = EXPL + 1.05; // command row is singled out
  const REQ = EXPL + 1.4;
  const TYPE0 = REQ + 0.2;
  const TYPE1 = TYPE0 + 0.8;
  const PK0 = TYPE1 + 0.15; // packet drops into Homarr
  const PK1 = PK0 + 0.3;
  const PK2 = PK1 + 0.25; // key attached, leaves for Sonarr
  const PK3 = PK2 + 0.32;
  const R1 = PK3 + 0.45; // response back at the request card
  const STATE = R1 + 0.25;
  const END = STATE + 2.2;

  const cues: Scene["cues"] = [
    { t: 0.05, kind: "whoosh", gain: 0.6 },
    { t: SWING, kind: "boom", gain: 0.9 },
    { t: SWING + 0.2, kind: "swish", gain: 0.5 },
    { t: PUSH - 0.35, kind: "riser", dur: 0.5, gain: 0.6 },
    { t: PUSH + 0.3, kind: "whoosh", gain: 0.9 },
    ...nodes.map((_, i) => ({ t: HUB + 0.05 + i * 0.03, kind: "tick" as const, gain: 0.3, pitch: i % 5 })),
    ...nodes.map((_, i) => ({ t: KEYS + 0.45 + i * 0.04, kind: "zap" as const, dur: 0.06, gain: 0.22 })),
    { t: KEYS + 0.9, kind: "hit", gain: 0.6 },
    { t: EXPL - 0.1, kind: "whoosh", gain: 0.7 },
    ...API.map((_, i) => ({ t: EXPL + 0.2 + i * 0.04, kind: "tick" as const, gain: 0.25, pitch: i % 6 })),
    { t: ROW, kind: "pop", gain: 0.5 },
    { t: REQ, kind: "swish", gain: 0.5 },
    { t: TYPE0, kind: "type", dur: TYPE1 - TYPE0, gain: 0.45 },
    { t: PK0, kind: "swish", gain: 0.4 },
    { t: PK1 + 0.05, kind: "click", gain: 0.8 },
    { t: PK3, kind: "hit", gain: 0.55 },
    { t: R1, kind: "chime", gain: 0.6, pitch: 3 },
    { t: STATE, kind: "hit", gain: 0.7 },
    { t: END - 0.3, kind: "whoosh", gain: 0.9 },
  ];

  return {
    name: "front-door",
    start: 0,
    end: END,
    bg,
    fg,
    cues,
    update(t, ctx) {
      // Door: frame is there from the first frame; the panel swings in; the words slide out from behind the jambs.
      const swing = E.outBack(seg(t, SWING, SWING + 0.7), 1.1);
      const open = clamp(swing, 0, 1.05);
      panel.style.transform = `rotateY(${(-open * 108).toFixed(2)}deg)`;
      panel.style.filter = `brightness(${lerp(1, 0.55, clamp(open)).toFixed(3)})`;
      const glow = clamp(open);
      tf(doorLight, { o: 0.25 + glow * 0.75 });
      tf(spill, { o: glow * 0.9 });
      tf(rays, { r: t * 8, s: 0.5 + glow * 0.7, o: glow * 0.9 });
      const wIn = E.outExpo(seg(t, SWING + 0.12, SWING + 0.75));
      tf(headLWrap, { x: (1 - wIn) * 260, o: wIn > 0.01 ? 1 : 0 });
      tf(headRWrap, { x: -(1 - wIn) * 260, o: wIn > 0.01 ? 1 : 0 });
      headLWrap.style.clipPath = `inset(-40px 0 -40px ${((1 - wIn) * 100).toFixed(1)}%)`;
      headRWrap.style.clipPath = `inset(-40px ${((1 - wIn) * 100).toFixed(1)}% -40px 0)`;
      headL.update(t, SWING + 0.1, Infinity, 0.03, 0.5);
      headR.update(t, SWING + 0.14, Infinity, 0.03, 0.5);
      // Push through the doorway into the homelab.
      const push = E.inExpo(seg(t, PUSH, HUB + 0.1));
      doorScene.style.transform = `scale(${(1 + push * 11).toFixed(3)})`;
      doorScene.style.opacity = String(1 - seg(t, HUB - 0.05, HUB + 0.15));
      doorScene.style.display = t < HUB + 0.2 ? "" : "none";
      const hitO = t > SWING ? Math.exp(-(t - SWING) * 6) : 0;
      ctx.fx.shake = hitO * 14;
      ctx.fx.flash = Math.max(hitO * 0.25, Math.sin(seg(t, HUB - 0.15, HUB + 0.25) * Math.PI) * 0.75);
      ctx.fx.flashColor = "#ffd9d3";
      ctx.fx.fade = 1 - seg(t, 0, 0.12);
      chapter.update(t, HUB + 0.1, END - 0.4);

      // Hub
      const hubOn = t > HUB - 0.1 && t < EXPL + 0.4;
      hubGroup.style.display = hubOn ? "" : "none";
      hubCapWrap.style.display = hubOn ? "" : "none";
      const hIn = E.outBack(seg(t, HUB - 0.05, HUB + 0.4), 1.4);
      const hOut = E.inExpo(seg(t, EXPL - 0.35, EXPL + 0.2));
      hubGroup.style.transform = `scale(${(lerp(1.25, 1, E.outExpo(seg(t, HUB - 0.1, HUB + 0.6))) * (1 + hOut * 2.2)).toFixed(3)})`;
      hubGroup.style.opacity = String(1 - hOut);
      tf(hub, { s: hIn });
      const L = ctx.logo;
      if (hubOn) {
        L.visible = hOut < 0.95;
        L.scale = 0.2 * hIn * (1 + hOut * 2.2);
        L.y = ((540 - cy) / 168) * (1 + hOut * 2.2);
        L.ry = Math.sin(t * 1.6) * 0.5;
        L.rx = -0.1;
        L.antenna = t * 3;
        L.clawL = 0.3 + 0.3 * Math.sin(t * 5);
        L.clawR = 0.3 + 0.3 * Math.sin(t * 5 + 1);
        ctx.fx.glBlur = hOut * 10;
      }
      const LOCK = KEYS + 0.9;
      const lockIn = spring(t - LOCK, 3, 0.45);
      hubLock.style.transform = `scale(${clamp(lockIn, 0, 2).toFixed(3)})`;
      hubLock.style.opacity = t > LOCK ? "1" : "0";
      const hk = t > LOCK ? Math.exp(-(t - LOCK) * 4) : 0;
      hub.style.boxShadow = `0 0 ${(80 + hk * 80).toFixed(0)}px rgba(${hk > 0.05 ? "61,220,151" : "250,83,82"},${(0.35 + hk * 0.4).toFixed(2)})`;
      nodes.forEach((n, i) => {
        const n0 = HUB + 0.05 + i * 0.03;
        const ni = E.outBack(seg(t, n0, n0 + 0.35), 1.6);
        const drift = Math.sin(t * 0.8 + i) * 6;
        tf(n.el, { s: ni, o: t > n0 ? 1 : 0, y: drift });
        const lp = E.outCubic(seg(t, n0, n0 + 0.4));
        n.path.style.strokeDasharray = `${lp} 1`;
        // Credential travels from service to hub.
        const k0 = KEYS + i * 0.04;
        const kp = E.inOutCubic(seg(t, k0, k0 + 0.45));
        const [px, py] = bez([n.x, n.y + drift], n.ctrl, n.ctrl, [cx, cy], kp);
        n.cred.style.transform = `translate(${(px - 50).toFixed(1)}px,${(py - 16).toFixed(1)}px) scale(${lerp(1, 0.5, kp).toFixed(3)})`;
        n.cred.style.opacity = String((t > k0 - 0.15 ? 1 : 0) * (1 - seg(t, k0 + 0.38, k0 + 0.45)));
        n.path.setAttribute("stroke", t > k0 + 0.45 ? "rgba(61,220,151,.55)" : "rgba(250,83,82,.45)");
      });
      hubCaption.update(t, HUB + 0.25, EXPL - 0.4, 0.018, 0.55);

      // Explanation
      const eOn = t > EXPL - 0.1;
      expl.style.display = eOn ? "" : "none";
      if (!eOn) return;
      const whip = E.inExpo(seg(t, END - 0.3, END));
      expl.style.transform = `translateX(${(-whip * 1400).toFixed(1)}px)`;
      expl.style.filter = whip > 0.02 ? `blur(${(whip * 30).toFixed(1)}px)` : "";
      headA.update(t, EXPL, REQ - 0.1, 0.035, 0.55);
      headB.update(t, REQ + 0.2, Infinity, 0.035, 0.55);
      const aIn = E.outExpo(seg(t, EXPL, EXPL + 0.5));
      tf(apiCard, { x: (1 - aIn) * -80, o: t > EXPL ? 1 : 0 });
      apiRows.forEach((r, i) => {
        const at = EXPL + 0.2 + i * 0.04;
        const ri = E.outExpo(seg(t, at, at + 0.35));
        tf(r.el, { x: (1 - ri) * 40, o: t > at ? 1 : 0 });
        const done = !r.built && i === CALL && t > R1;
        const k = done ? Math.exp(-(t - R1) * 4) : 0;
        r.tagDone.style.display = done ? "" : "none";
        r.tagDone.style.transform = `scale(${done ? clamp(spring(t - R1, 3.2, 0.45), 0, 1.5).toFixed(3) : 0})`;
        r.tagNone.style.visibility = done ? "hidden" : "visible";
        const focus = i === CALL && t > ROW;
        r.el.style.background = done ? `rgba(61,220,151,${(0.1 + k * 0.2).toFixed(3)})` : focus ? "rgba(250,83,82,.12)" : "";
        r.el.style.boxShadow = focus ? `inset 0 0 0 1.5px ${done ? "rgba(61,220,151,.6)" : "rgba(250,83,82,.6)"}` : "";
        // Other unsupported rows recede once the call is singled out.
        r.el.style.opacity = t > ROW && i !== CALL && !r.built ? String(lerp(1, 0.55, seg(t, ROW, ROW + 0.3))) : r.el.style.opacity;
      });

      const rIn = E.outExpo(seg(t, REQ, REQ + 0.45));
      tf(reqCard, { y: (1 - rIn) * 60, o: t > REQ ? 1 : 0 });
      reqCodeT.set(Math.floor(reqCodeT.total * seg(t, TYPE0, TYPE1)), t < PK0);
      const rs = spring(t - R1, 3.2, 0.45);
      reqStatus.style.transform = `scale(${clamp(rs, 0, 1.5).toFixed(3)})`;
      reqStatus.style.opacity = t > R1 ? "1" : "0";
      const fIn = E.outExpo(seg(t, REQ + 0.2, REQ + 0.6));
      tf(homarrNode, { y: (1 - fIn) * 40, o: t > REQ + 0.2 ? 1 : 0 });
      tf(sonarrNode, { x: (1 - fIn) * 80, o: t > REQ + 0.25 ? 1 : 0 });
      tf(flowWire, { sx: E.outExpo(seg(t, PK2 - 0.1, PK2 + 0.2)) });
      // Homarr lights up when it adds the key; Sonarr when the call lands.
      const hkk = t > PK1 ? Math.exp(-(t - PK1) * 5) : 0;
      homarrNode.style.boxShadow = `0 0 ${(hkk * 60).toFixed(0)}px rgba(61,220,151,${(hkk * 0.7).toFixed(2)})`;
      homarrNode.style.borderColor = t > PK1 ? "rgba(61,220,151,.5)" : "";
      const sk = t > PK3 ? Math.exp(-(t - PK3) * 5) : 0;
      sonarrNode.style.boxShadow = `0 0 ${(sk * 60).toFixed(0)}px rgba(250,83,82,${(sk * 0.8).toFixed(2)})`;

      // Packet: request card → into Homarr's logo; a smaller key-carrying packet then crosses the wire to Sonarr.
      const LOGO_X = 960 + 24 + 35;
      const p1 = E.inOutCubic(seg(t, PK0, PK1));
      packet.style.transform = `translate(${lerp(1190, LOGO_X, p1).toFixed(1)}px,${lerp(560, FLOW_Y, p1).toFixed(1)}px) translate(-50%,-50%) scale(${lerp(1, 0.5, seg(p1, 0.75, 1)).toFixed(3)})`;
      packet.style.visibility = t > PK0 && t < PK1 ? "visible" : "hidden";
      const p2 = E.inOutCubic(seg(t, PK2, PK3));
      pkt2.style.transform = `translate(${lerp(1440, 1600, p2).toFixed(1)}px,${FLOW_Y}px) translate(-50%,-50%) scale(${(t < PK2 + 0.08 ? lerp(0.4, 1, seg(t, PK2, PK2 + 0.08)) : 1).toFixed(3)})`;
      pkt2.style.visibility = t > PK2 && t < PK3 ? "visible" : "hidden";
      // Response: Sonarr → up into the request card.
      const rp = E.outCubic(seg(t, PK3 + 0.05, R1));
      const rx = lerp(1690, 1730, rp);
      const ry = lerp(FLOW_Y, 296, rp);
      resp.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) translate(-50%,-50%) scale(${lerp(1, 0.6, seg(rp, 0.8, 1)).toFixed(3)})`;
      resp.style.opacity = t > PK3 + 0.05 && t < R1 ? "1" : "0";

      // Plain statement + where to call it from.
      statement.update(t, STATE, Infinity, 0.03, 0.55);
      lanes.forEach((l, i) => {
        const at = STATE + 0.35 + i * 0.07;
        const li = E.outBack(seg(t, at, at + 0.3), 1.8);
        l.style.transform = `scale(${clamp(lerp(0.7, 1, li), 0, 1.2).toFixed(3)})`;
        l.style.opacity = t > at ? "1" : "0";
      });
      const hs = t > STATE ? Math.exp(-(t - STATE) * 6) : 0;
      ctx.fx.shake = Math.max(ctx.fx.shake, hs * 6);
      ctx.fx.ca = hs * 3 + whip * 6;
    },
  };
}
