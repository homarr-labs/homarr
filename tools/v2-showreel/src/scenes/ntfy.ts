import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo, offsetWithin, tf } from "../lib/dom";
import { CodeType, Headline, TypeBlock, countTo, type Tok } from "../lib/kit";
import type { Scene } from "../lib/scene";

// The real run from the blog post: one MCP prompt, seven services wired to ntfy.
const PROMPT = "Install a notification provider and then set it up everywhere it's supported in my installed integrations";
const THOUGHTS = [
  "Their integrations: SABnzbd, qBittorrent, Sonarr, Radarr, Prowlarr, Jellyfin x2, Overseerr, Immich, Umami, Beszel.",
  "Sonarr/Radarr/Prowlarr/Lidarr: have Notifications with ntfy, Telegram, Discord, Gotify, etc.",
];
const ROWS: [string, string, string, string][] = [
  ["sonarr", "Sonarr", "Native ntfy connection for grabs, downloads, upgrades and health", "Test fired ✓"],
  ["radarr", "Radarr", "Native ntfy connection, plus movie added", "Test fired ✓"],
  ["seerr", "Seerr", "Webhook with a JSON payload for readable titles", "Fires on request, approve, available, fail"],
  ["sabNzbd", "SABnzbd", "5.1.3 has no ntfy support, so a completion script on the default category", "Dry run ✓"],
  ["qBittorrent", "qBittorrent", "[AutoRun] completion hook in qBittorrent.conf", "Persisted after restart"],
  ["bazarr", "Bazarr", "ntfy provider enabled for subtitle events", "Restarted ✓"],
  ["beszel", "Beszel", "Webhook with status, CPU, memory and disk alerts on all eight systems", "29 alerts created"],
];
// The service API each change goes through, called via Homarr's integration_request tool.
const CALLS: [string, string, string][] = [
  ["sonarr", "POST", "/api/v3/notification"],
  ["radarr", "POST", "/api/v3/notification"],
  ["seerr", "POST", "/api/v1/settings/notifications/webhook"],
  ["sabNzbd", "GET", "/api?mode=set_config"],
  ["qBittorrent", "POST", "/api/v2/app/setPreferences"],
  ["bazarr", "POST", "/api/system/settings"],
  ["beszel", "POST", "/api/collections/alerts/records"],
];
const OPTIONS: [string, string][] = [
  ["ntfy", "ntfy"],
  ["telegram", "Telegram"],
  ["discord", "Discord"],
  ["gotify", "Gotify"],
];
const K = (s: string): Tok => [s, "k"];
const S = (s: string): Tok => [s, "s"];
const P = (s: string): Tok => [s];
const COMPOSE: Tok[][] = [
  [K("services"), P(":")],
  [P("  "), K("ntfy"), P(":")],
  [P("    "), K("image"), P(": "), S("binwiederhier/ntfy")],
  [P("    "), K("command"), P(": "), S("serve")],
  [P("    "), K("ports"), P(": ["), S('"8090:80"'), P("]")],
  [P("    "), K("restart"), P(": "), S("unless-stopped")],
];

export function ntfy(): Scene {
  const bg = h("div", {
    class: "scene",
    style: "background:radial-gradient(90% 70% at 30% 40%,#141a33 0%,#0a0b12 60%,#07070b 100%)",
  });
  const grid = h("div", {
    class: "abs",
    style:
      "inset:-200px;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:80px 80px;-webkit-mask-image:radial-gradient(60% 60% at 50% 50%,#000,transparent);mask-image:radial-gradient(60% 60% at 50% 50%,#000,transparent)",
  });
  bg.append(grid);
  const fg = h("div", { class: "scene" });

  // ---------- Title ----------
  const title = new Headline("Integration requests in action.", { size: 112, accent: ["action."] });
  const titleWrap = h("div", { class: "abs", style: "left:0;top:0;white-space:nowrap;transform-origin:0 0" }, title.el);
  const kicker = h(
    "div",
    { class: "abs row", style: "left:96px;top:152px;gap:12px;font-size:26px;color:#b9bbc6;white-space:nowrap" },
    h("div", { style: "color:var(--coral)" }, icon("plug-connected", 26, 2)),
    "A local model, talking to Homarr's MCP server:",
  );

  // ---------- Chat ----------
  const CHAT_W = 820;
  const CHAT_TOP = 216;
  const CHAT_H = 810;
  const BODY_TOP = 70;
  const VIEW_H = CHAT_H - BODY_TOP - 128;
  const thread = h("div", { class: "col", style: "gap:18px" });
  const chatBody = h("div", { class: "abs", style: `left:28px;right:28px;top:${BODY_TOP}px;height:${VIEW_H}px;overflow:hidden` }, thread);
  const chat = h(
    "div",
    { class: "abs card", style: `left:0;top:${CHAT_TOP}px;width:${CHAT_W}px;height:${CHAT_H}px;overflow:hidden` },
    h(
      "div",
      { class: "row", style: "height:54px;padding:0 22px;gap:9px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.02)" },
      ...["#ff5f57", "#febc2e", "#28c840"].map((c) => h("div", { style: `width:12px;height:12px;border-radius:50%;background:${c}` })),
      h("div", { style: "margin-left:16px;font-size:18px;font-weight:700" }, "Agent"),
      h(
        "div",
        { class: "row mono", style: "margin-left:auto;gap:9px;font-size:14px;color:#a9abb6" },
        h("div", { style: "width:9px;height:9px;border-radius:50%;background:var(--mint);box-shadow:0 0 10px var(--mint)" }),
        "homarr · MCP connected",
      ),
    ),
    chatBody,
  );
  const prompt = new TypeBlock(PROMPT, "", "#fff");
  const sendBtn = h("div", { class: "center", style: "width:48px;height:48px;border-radius:13px;background:#fa5352;color:#fff;flex:none" }, icon("arrow-up", 26, 2.6));
  const composer = h(
    "div",
    { class: "abs row", style: "left:28px;right:28px;bottom:20px;min-height:92px;padding:12px 14px 12px 22px;gap:16px;border-radius:16px;background:#121318;border:1px solid var(--line2);font-size:21px;line-height:1.35" },
    h("div", { style: "flex:1" }, prompt.el),
    sendBtn,
  );
  chat.append(composer);
  const bubble = (text: string) =>
    h(
      "div",
      { style: "align-self:flex-end;max-width:640px;padding:16px 22px;border-radius:18px 18px 6px 18px;background:#2b1b1e;border:1px solid rgba(250,83,82,.45);font-size:22px;line-height:1.4;font-weight:560" },
      text,
    );
  const userMsg = bubble(PROMPT);
  const shimmer = h("span", { style: "background:linear-gradient(90deg,#8f919d 0%,#fff 50%,#8f919d 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent" }, "Thinking");
  const thoughtTypes = THOUGHTS.map((tx) => new TypeBlock(tx, "", "#8f919d"));
  const thinking = h(
    "div",
    { class: "col", style: "gap:8px" },
    h("div", { class: "row", style: "gap:10px;font-size:19px;font-weight:700;color:#a9abb6" }, icon("sparkles", 20, 2), shimmer),
    h(
      "div",
      { class: "col", style: "gap:6px;padding-left:16px;border-left:2px solid rgba(255,255,255,.12);font-size:18px;line-height:1.4;color:#9a9ca8;font-style:italic" },
      ...thoughtTypes.map((tt) => h("div", {}, tt.el)),
    ),
  );
  const opts = OPTIONS.map(([key, name], i) =>
    h(
      "div",
      { class: "row", style: "gap:12px;height:56px;padding:0 16px;border-radius:13px;border:1.5px solid var(--line2);font-size:22px;font-weight:700" },
      logo(key, 30),
      name,
      i === 0 ? h("span", { style: "margin-left:auto;font-size:14px;padding:3px 9px;border-radius:999px;background:rgba(61,220,151,.15);color:var(--mint);font-weight:700" }, "Recommended") : "",
    ),
  );
  const optNtfy = opts[0]!;
  const optOther = h(
    "div",
    { class: "row", style: "grid-column:span 2;gap:12px;height:48px;padding:0 16px;border-radius:13px;border:1px dashed var(--line2);font-size:19px;color:#8f919d" },
    icon("pencil", 20, 2),
    "Type your own answer",
  );
  const question = h(
    "div",
    { class: "col", style: "gap:10px;padding:18px 20px;border-radius:16px;background:rgba(124,140,255,.07);border:1px solid rgba(124,140,255,.35)" },
    h("div", { class: "label", style: "color:#aab4ff;font-size:13px" }, "Question"),
    h("div", { style: "font-size:24px;font-weight:750;margin-bottom:4px" }, "Which notification provider should I install and wire up?"),
    h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px" }, ...opts, optOther),
  );
  const compose = new CodeType(COMPOSE);
  compose.el.style.cssText = "font-size:17px;line-height:25px;color:#c9d1d9";
  const reply = h(
    "div",
    { class: "col", style: "gap:10px" },
    h("div", { style: "font-size:21px;line-height:1.4;color:#e6e7ec" }, "Add ntfy to your compose file and start it. Tell me when it's up."),
    h(
      "div",
      { style: "padding:12px 16px;border-radius:12px;background:#0d0e12;border:1px solid var(--line2)" },
      h("div", { class: "row mono", style: "gap:8px;font-size:13px;color:var(--muted);margin-bottom:6px;letter-spacing:.08em" }, icon("brand-docker", 16, 2), "COMPOSE.YAML"),
      compose.el,
    ),
  );
  const userUp = bubble("It's up.");
  const callEls = CALLS.map(([key, m, path]) => {
    const spin = h("div", { class: "abs", style: "left:0;top:0;color:var(--amber)" }, icon("loader-2", 18, 2.4));
    const ok = h("div", { class: "abs", style: "left:0;top:0;color:var(--mint)" }, icon("circle-check", 18, 2.4));
    const el = h(
      "div",
      { class: "row mono", style: "gap:10px;height:30px;font-size:16px;white-space:nowrap" },
      h("div", { style: "position:relative;width:18px;height:18px;flex:none" }, spin, ok),
      logo(key, 20),
      h("span", { style: "color:#a9abb6;width:104px" }, key.toLowerCase()),
      h("span", { style: `font-weight:800;color:${m === "GET" ? "#3ddc97" : "#fa5352"};width:44px` }, m),
      h("span", { style: "color:#e6e7ec" }, path),
    );
    return { el, spin, ok };
  });
  const wiring = h(
    "div",
    { class: "col", style: "align-self:stretch;gap:4px;padding:12px 16px;border-radius:12px;background:#15161b;border:1px solid var(--line2)" },
    h("div", { class: "row mono", style: "gap:10px;font-size:16px;margin-bottom:4px" }, h("span", { style: "color:#a9abb6" }, "execute"), h("span", { style: "font-weight:700" }, "homarr.integration_request"), h("span", { style: "margin-left:auto;color:var(--muted)" }, `×${CALLS.length}`)),
    ...callEls.map((c) => c.el),
  );
  const items = [userMsg, thinking, question, reply, userUp, wiring];
  thread.append(...items);
  const cursor = h("div", { class: "abs", style: "left:0;top:0;width:34px;height:34px;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))" }, icon("filled:pointer", 34, 1));

  // ---------- Report table (right of the chat once wiring starts) ----------
  const TX = 980;
  const TW = 844;
  const TY = 268;
  const RH = 86;
  const tableHead = new Headline("Then it set everything up itself:", { size: 44, weight: 750 });
  const tableHeadWrap = h("div", { class: "abs", style: `left:${TX}px;top:${TY - 76}px;white-space:nowrap` }, tableHead.el);
  const alerts = h("span", {}, "0");
  const rows = ROWS.map(([key, name, how, ver], i) => {
    const verEl = h(
      "div",
      { class: "row", style: "justify-self:end;gap:6px;padding:5px 11px;border-radius:9px;background:rgba(61,220,151,.12);border:1px solid rgba(61,220,151,.4);color:#b8f5d8;font-size:15px;font-weight:700;line-height:1.3;max-width:210px;text-align:right" },
      key === "beszel" ? h("span", {}, alerts, " alerts created") : ver,
    );
    const el = h(
      "div",
      { class: "abs", style: `left:${TX}px;top:${TY + i * (RH + 6)}px;width:${TW}px;height:${RH}px;display:grid;grid-template-columns:190px 1fr 220px;align-items:center;padding:0 18px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid var(--line)` },
      h("div", { class: "row", style: "gap:12px;font-size:21px;font-weight:800" }, logo(key, 36), name),
      h("div", { style: "font-size:17px;line-height:1.3;color:#d7d8de;padding-right:16px" }, how),
      verEl,
    );
    return { el, verEl };
  });
  const table = h("div", { class: "abs", style: "inset:0" }, tableHeadWrap, ...rows.map((r) => r.el));

  // ---------- Phone ----------
  const notif = (key: string, name: string) =>
    h(
      "div",
      { class: "row", style: "gap:14px;padding:16px;border-radius:22px;background:rgba(40,42,52,.92);border:1px solid rgba(255,255,255,.08);align-items:flex-start" },
      h("div", { class: "center", style: "width:44px;height:44px;border-radius:12px;background:#1d2d35;flex:none" }, logo("ntfy", 30)),
      h(
        "div",
        { class: "col", style: "gap:3px;flex:1" },
        h("div", { class: "row", style: "font-size:15px;color:#a9abb6;gap:6px" }, "ntfy", h("span", { style: "margin-left:auto" }, "now")),
        h("div", { class: "row", style: "gap:8px;font-size:19px;font-weight:750" }, logo(key, 20), name),
        h("div", { style: "font-size:17px;color:#d7d8de" }, "Test notification"),
      ),
    );
  const n1 = notif("sonarr", "Sonarr");
  const n2 = notif("radarr", "Radarr");
  const phone = h(
    "div",
    { class: "abs", style: "left:1250px;top:140px;width:400px;height:820px;border-radius:64px;background:#0d0e13;border:10px solid #2a2b33;box-shadow:0 60px 120px rgba(0,0,0,.7),0 0 0 2px #3a3b44;overflow:hidden" },
    h("div", { class: "abs", style: "inset:0;background:radial-gradient(120% 70% at 30% 0%,#3a1c2a,#10121c 60%)" }),
    h("div", { class: "abs", style: "left:50%;top:18px;width:120px;height:34px;margin-left:-60px;border-radius:20px;background:#000" }),
    h("div", { class: "abs display", style: "left:0;right:0;top:110px;text-align:center;font-size:96px;font-weight:300;letter-spacing:-.03em;color:#f1eef4" }, "21:04"),
    h("div", { class: "abs col", style: "left:18px;right:18px;top:300px;gap:12px" }, n1, n2),
  );
  const buzzLines = [0, 1].map(() =>
    h("div", { class: "abs", style: "width:40px;height:220px;border-left:4px solid rgba(250,83,82,.7);border-radius:50%" }),
  );
  const phoneWrap = h("div", { class: "abs", style: "inset:0" }, phone, ...buzzLines);
  const cap1 = new Headline("Two test notifications later, the phone buzzed.", { size: 50, weight: 700, lh: 1.15 });
  const cap1Wrap = h("div", { class: "abs", style: "left:120px;top:250px;width:980px" }, cap1.el);
  const zero = h("div", { class: "abs display", style: "left:112px;top:410px;font-size:260px;font-weight:850;letter-spacing:-.05em;color:var(--mint);line-height:1" }, "$0");
  const cost = h(
    "div",
    { class: "abs col", style: "left:124px;top:700px;gap:16px" },
    h("div", { style: "font-size:40px;font-weight:700" }, "Qwen3.8-27B ran locally through MLX."),
    h("div", { style: "font-size:28px;color:#8f919d" }, "The only side effect was warm feet."),
  );
  const costA = cost.children[0] as HTMLElement;
  const costB = cost.children[1] as HTMLElement;

  fg.append(titleWrap, kicker, table, chat, cursor, cap1Wrap, zero, cost, phoneWrap);

  // ---------- Timeline (scene-local) ----------
  const P0 = 1.3;
  const PCPS = 115;
  const SEND = P0 + PROMPT.length / PCPS + 0.1;
  const TH0 = SEND + 0.15;
  const TCPS = 260;
  const thStarts: number[] = [];
  let acc = TH0 + 0.15;
  for (const tt of thoughtTypes) {
    thStarts.push(acc);
    acc = tt.end(acc, TCPS) + 0.1;
  }
  const Q = acc + 0.05;
  const CLICK = Q + 0.85;
  const REPLY = CLICK + 0.25;
  const CODE0 = REPLY + 0.15;
  const CODE1 = CODE0 + 0.55;
  const UP = CODE1 + 0.35;
  const WIRE = UP + 0.35;
  const reveal = [SEND, TH0, Q, REPLY, UP, WIRE];
  const RS = 0.27;
  const callT = (i: number) => WIRE + 0.3 + i * RS;
  const LAST = callT(CALLS.length - 1);
  const PH = LAST + 1.15;
  const OUT = PH + 2.9;
  const END = OUT + 0.45;

  let scrollTargets: number[] | null = null;
  let titleW: number | undefined;

  const cues: Scene["cues"] = [
    { t: 0, kind: "whoosh", gain: 0.8 },
    { t: 0.22, kind: "hit", gain: 0.6 },
    { t: 0.85, kind: "swish", gain: 0.5 },
    { t: P0, kind: "type", dur: PROMPT.length / PCPS, gain: 0.45 },
    { t: SEND, kind: "key", gain: 0.9 },
    { t: SEND + 0.06, kind: "swish", gain: 0.4 },
    { t: Q, kind: "pop", gain: 0.7 },
    { t: CLICK, kind: "click", gain: 1 },
    { t: CODE0, kind: "type", dur: CODE1 - CODE0, gain: 0.35 },
    { t: UP, kind: "key", gain: 0.7 },
    { t: WIRE - 0.2, kind: "whoosh", gain: 0.6 },
    ...CALLS.flatMap((_, i) => [
      { t: callT(i), kind: "zap" as const, dur: 0.12, gain: 0.3, pitch: i },
      { t: callT(i) + 0.2, kind: "tick" as const, gain: 0.6, pitch: i },
    ]),
    { t: LAST + 0.3, kind: "chime", gain: 0.6, pitch: 3 },
    { t: PH, kind: "whoosh", gain: 0.6 },
    { t: PH + 0.5, kind: "buzz", dur: 0.4, gain: 0.9 },
    { t: PH + 0.9, kind: "buzz", dur: 0.4, gain: 0.9 },
    { t: PH + 1.3, kind: "hit", gain: 0.8 },
    { t: OUT, kind: "whoosh", gain: 0.9 },
  ];

  return {
    name: "ntfy",
    start: 0,
    end: END,
    bg,
    fg,
    cues,
    update(t, ctx) {
      tf(grid, { y: (t * 12) % 80, o: 0.9 });

      // Title: whips in from the right (continuing the previous exit), then docks top-left.
      const whipIn = E.outExpo(seg(t, 0, 0.5));
      const dockP = E.inOutQuart(seg(t, 0.8, 1.25));
      titleW ??= titleWrap.offsetWidth;
      const x0 = (1920 - titleW) / 2 + (1 - whipIn) * 900;
      titleWrap.style.transform = `translate(${lerp(x0, 96, dockP).toFixed(1)}px,${lerp(460, 66, dockP).toFixed(1)}px) scale(${lerp(1, 0.52, dockP).toFixed(4)})`;
      titleWrap.style.filter = whipIn < 0.98 ? `blur(${((1 - whipIn) * 24).toFixed(1)}px)` : "";
      title.update(t, 0.03, OUT - 0.1, 0.04, 0.5);
      const kIn = E.outExpo(seg(t, 1.05, 1.5));
      const kOut = t > PH - 0.1;
      kicker.style.clipPath = `inset(-10px ${((1 - kIn) * 100).toFixed(1)}% -10px 0)`;
      kicker.style.display = kOut ? "none" : "";

      // Chat: slides up from below the frame, centred; moves left when the wiring table arrives.
      const cIn = E.outExpo(seg(t, 0.9, 1.4));
      const toLeft = E.inOutQuart(seg(t, WIRE - 0.35, WIRE + 0.2));
      const cOut = E.inOutQuart(seg(t, PH - 0.3, PH + 0.3));
      const chatOn = t < PH + 0.3;
      chat.style.display = chatOn ? "" : "none";
      const chatX = lerp((1920 - CHAT_W) / 2, 96, toLeft);
      chat.style.transform = `translate(${(chatX - cOut * 1000).toFixed(1)}px,${((1 - cIn) * 900).toFixed(1)}px)`;
      chat.style.filter = cOut > 0.02 ? `blur(${(cOut * 10).toFixed(1)}px)` : "";

      if (chatOn) {
        prompt.update(t, P0, PCPS, SEND);
        // Sending clears the composer; the message lands in the thread.
        (prompt.el.parentElement as HTMLElement).style.visibility = t < SEND ? "visible" : "hidden";
        const sk = t > SEND ? Math.exp(-(t - SEND) * 6) : 0;
        sendBtn.style.transform = `scale(${(t > SEND && t < SEND + 0.1 ? 0.88 : 1 + sk * 0.12).toFixed(3)})`;
        sendBtn.style.boxShadow = `0 0 ${(sk * 40).toFixed(0)}px rgba(250,83,82,${(sk * 0.8).toFixed(2)})`;
        thoughtTypes.forEach((tt, i) => tt.update(t, thStarts[i]!, TCPS, i === thoughtTypes.length - 1 ? Q : thStarts[i + 1]! - 0.05));
        shimmer.style.backgroundPosition = `${(200 - ((t * 120) % 200)).toFixed(1)}% 0`;
        // Messages pop into the thread (no fade): a quick rise from just below.
        items.forEach((it, i) => {
          const on = t >= reveal[i]!;
          const r = E.outExpo(seg(t, reveal[i]!, reveal[i]! + 0.3));
          it.style.visibility = on ? "visible" : "hidden";
          it.style.transform = `translateY(${((1 - r) * 18).toFixed(1)}px)`;
        });
        compose.set(Math.floor(compose.total * seg(t, CODE0, CODE1)), t < UP);
        // Scroll so the newest message is always in view.
        if (!scrollTargets) {
          scrollTargets = items.map((it) => Math.max(0, offsetWithin(it, chatBody)[1] + it.offsetHeight - VIEW_H + 6));
        }
        let sy = 0;
        scrollTargets.forEach((target, i) => {
          const prev = i ? scrollTargets![i - 1]! : 0;
          sy += (target - prev) * E.inOutCubic(seg(t, reveal[i]! - 0.08, reveal[i]! + 0.3));
        });
        thread.style.transform = `translateY(${(-sy).toFixed(1)}px)`;
        // Question → click ntfy
        const picked = t >= CLICK;
        const pk = picked ? Math.exp(-(t - CLICK) * 5) : 0;
        const hover = seg(t, CLICK - 0.25, CLICK - 0.12);
        optNtfy.style.borderColor = picked ? "#fa5352" : hover > 0 ? "rgba(255,255,255,.35)" : "var(--line2)";
        optNtfy.style.background = picked ? `rgba(250,83,82,${(0.14 + pk * 0.3).toFixed(3)})` : `rgba(255,255,255,${(hover * 0.05).toFixed(3)})`;
        optNtfy.style.transform = `scale(${(t > CLICK && t < CLICK + 0.12 ? 0.97 : 1).toFixed(3)})`;
        opts.slice(1).forEach((o) => (o.style.opacity = picked ? "0.45" : "1"));
        optOther.style.opacity = picked ? "0.45" : "1";
        // Cursor glides in from the lower right to the ntfy option.
        const cp = E.inOutCubic(seg(t, Q + 0.2, CLICK - 0.04));
        const [optX, optY] = offsetWithin(optNtfy, chatBody);
        const ox = chatX + 28 + optX + 120;
        const oy = CHAT_TOP + BODY_TOP + optY - scrollTargets[2]! + 30;
        cursor.style.display = t > Q + 0.15 && t < CLICK + 0.45 ? "" : "none";
        cursor.style.transform = `translate(${lerp(1400, ox, cp).toFixed(1)}px,${lerp(1060, oy, cp).toFixed(1)}px) scale(${t > CLICK && t < CLICK + 0.12 ? 0.85 : 1})`;
        // integration_request calls tick off one by one.
        callEls.forEach((c, i) => {
          const done = t >= callT(i) + 0.2;
          const going = t >= callT(i);
          c.el.style.opacity = going ? "1" : "0.28";
          c.spin.style.display = going && !done ? "" : "none";
          c.spin.style.transform = `rotate(${((t * 720) % 360).toFixed(1)}deg)`;
          c.ok.style.display = done ? "" : "none";
          c.ok.style.transform = `scale(${done ? clamp(spring(t - callT(i) - 0.2, 4, 0.4), 0, 2).toFixed(3) : 0})`;
        });
      } else cursor.style.display = "none";

      // Table: each row slides out from behind the chat as its call lands.
      const tOn = t > WIRE - 0.2 && t < OUT + 0.5;
      table.style.display = tOn ? "" : "none";
      const recede = E.inOutCubic(seg(t, PH - 0.1, PH + 0.5));
      const tOut = E.inCubic(seg(t, OUT, OUT + 0.45));
      table.style.transform = `translateX(${(-recede * 880).toFixed(1)}px) scale(${lerp(1, 0.9, recede).toFixed(3)})`;
      table.style.opacity = String(lerp(1, 0.16, recede) * (1 - tOut));
      table.style.filter = recede > 0.02 ? `blur(${(recede * 6).toFixed(1)}px)` : "";
      tableHead.update(t, WIRE - 0.05, Infinity, 0.035, 0.45);
      rows.forEach((r, i) => {
        const r0 = callT(i);
        const ri = E.outExpo(seg(t, r0, r0 + 0.35));
        const hit = t > r0 + 0.2 ? Math.exp(-(t - r0 - 0.2) * 4) : 0;
        tf(r.el, { x: (1 - ri) * -120, o: t >= r0 ? 1 : 0 });
        r.el.style.clipPath = `inset(-4px -4px -4px ${((1 - ri) * 60).toFixed(1)}%)`;
        r.el.style.borderColor = hit > 0.05 ? `rgba(61,220,151,${(hit * 0.8).toFixed(2)})` : "rgba(61,220,151,.2)";
        r.el.style.background = `rgba(61,220,151,${(hit * 0.12).toFixed(3)})`;
        const vi = spring(t - r0 - 0.2, 3.4, 0.45);
        r.verEl.style.transform = `scale(${(0.6 + 0.4 * clamp(vi, 0, 2)).toFixed(3)})`;
        r.verEl.style.visibility = t >= r0 + 0.2 ? "visible" : "hidden";
      });
      countTo(alerts, t, callT(6) + 0.2, callT(6) + 0.8, 29);

      // Phone + cost
      const phOn = t > PH - 0.2;
      phoneWrap.style.display = cap1Wrap.style.display = zero.style.display = cost.style.display = phOn ? "" : "none";
      const phIn = E.outExpo(seg(t, PH, PH + 0.6));
      const buzz = (b: number) => (t > b && t < b + 0.4 ? Math.sin((t - b) * 90) * (1 - (t - b) / 0.4) : 0);
      const bz = buzz(PH + 0.5) + buzz(PH + 0.9);
      const pOut = E.inCubic(seg(t, OUT, OUT + 0.45));
      phone.style.transform = `translate(${(bz * 6).toFixed(1)}px,${((1 - phIn) * 900 + pOut * -80).toFixed(1)}px) rotate(${(lerp(-8, 4, phIn) + bz * 1.2).toFixed(2)}deg) scale(${lerp(1, 1.4, pOut).toFixed(3)})`;
      phone.style.opacity = String(1 - pOut);
      [n1, n2].forEach((n, i) => {
        const nt = PH + 0.5 + i * 0.4;
        const ni = spring(t - nt, 2.6, 0.5);
        n.style.transform = `translateY(${((1 - clamp(ni, 0, 1.2)) * -40).toFixed(1)}px) scale(${lerp(0.9, 1, clamp(ni, 0, 1)).toFixed(3)})`;
        n.style.visibility = t >= nt ? "visible" : "hidden";
      });
      buzzLines.forEach((b, i) => {
        const k = Math.max(t > PH + 0.5 ? Math.exp(-(t - PH - 0.5) * 5) : 0, t > PH + 0.9 ? Math.exp(-(t - PH - 0.9) * 5) : 0);
        const x = i === 0 ? 1212 : 1660;
        b.style.transform = `translate(${x}px,440px) scaleX(${i === 0 ? -1 : 1}) scale(${(1 + (1 - k) * 0.3).toFixed(3)})`;
        b.style.opacity = String(k);
      });
      cap1.update(t, PH + 0.15, OUT - 0.15, 0.03, 0.5);
      const ZT = PH + 1.3;
      const z = spring(t - ZT, 2.4, 0.4);
      zero.style.transform = `scale(${clamp(z, 0, 2).toFixed(3)})`;
      zero.style.transformOrigin = "0 80%";
      zero.style.opacity = String((t >= ZT ? 1 : 0) * (1 - pOut));
      zero.style.textShadow = `0 0 ${(40 + (t > ZT ? Math.exp(-(t - ZT) * 3) : 0) * 80).toFixed(0)}px rgba(61,220,151,.45)`;
      const c1 = E.outExpo(seg(t, ZT + 0.2, ZT + 0.6));
      const c2 = E.outExpo(seg(t, ZT + 0.5, ZT + 0.9));
      costA.style.clipPath = `inset(-10px ${((1 - c1) * 100).toFixed(1)}% -10px 0)`;
      costB.style.clipPath = `inset(-10px ${((1 - c2) * 100).toFixed(1)}% -10px 0)`;
      cost.style.opacity = String(1 - pOut);

      const hitZ = t > ZT ? Math.exp(-(t - ZT) * 6) : 0;
      ctx.fx.shake = hitZ * 10 + Math.abs(bz) * 3 + (1 - whipIn) * 10;
      ctx.fx.ca = (1 - whipIn) * 8 + pOut * 6;
      ctx.fx.fade = E.inCubic(seg(t, OUT + 0.15, END));
    },
  };
}
