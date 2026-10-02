import { E, seg, lerp, spring, clamp } from "../lib/anim";
import { h, icon, logo, offsetWithin, tf } from "../lib/dom";
import { Chapter, Headline, TypeBlock, svg } from "../lib/kit";
import { LOGO_D, LOGO_VB } from "./intro";
import type { Scene } from "../lib/scene";

const SUGGESTIONS: [string, string][] = [
  ["heart-rate-monitor", "Check service health"],
  ["compass", "Explore my Homarr"],
  ["movie", "Find media to request"],
  ["palette", "Improve a dashboard"],
  ["puzzle", "Design a widget"],
];
const PREFILL = "Create and install a Custom Widget for ";
const ASK = "my Radarr upcoming movies";

export function assistant(): Scene {
  const bg = h("div", { class: "scene", style: "background:#07070b" });
  const fg = h("div", { class: "scene" });

  // ---------- Board behind the drawer ----------
  const tile = (key: string, name: string) =>
    h(
      "div",
      { class: "card col center", style: "gap:12px;height:150px;border-radius:16px" },
      logo(key, 56),
      h("div", { style: "font-size:17px;font-weight:650;color:#d7d8de" }, name),
    );
  const newWidget = h(
    "div",
    {
      class: "card col",
      style:
        "grid-column:span 2;height:150px;border-radius:16px;padding:18px 20px;gap:10px;border-color:rgba(250,83,82,.6)",
    },
    h("div", { class: "row", style: "gap:10px;font-size:18px;font-weight:750" }, logo("radarr", 26), "Radarr upcoming"),
    ...["Friday · In cinemas", "Next week · Digital release", "In 2 weeks · Physical release"].map((d, i) =>
      h(
        "div",
        { class: "row", style: "gap:10px;font-size:15px;color:#b9bbc6" },
        h("div", {
          style: `width:8px;height:8px;border-radius:50%;background:${["#fa5352", "#ffb547", "#4fb3ff"][i]}`,
        }),
        d,
      ),
    ),
  );
  const board = h(
    "div",
    { class: "abs", style: "left:70px;top:60px;width:1780px;height:960px;transform-origin:50% 50%" },
    h(
      "div",
      {
        class: "row",
        style: "height:70px;padding:0 26px;gap:14px;border-radius:16px;background:#15161b;border:1px solid var(--line)",
      },
      lobster(40),
      h("div", { style: "font-size:24px;font-weight:800" }, "Homelab"),
      h(
        "div",
        { class: "row", style: "margin-left:auto;gap:10px;color:#8f919d" },
        icon("search", 22, 2),
        icon("user-circle", 26, 1.8),
      ),
    ),
    h(
      "div",
      { style: "margin-top:24px;display:grid;grid-template-columns:repeat(8,1fr);gap:18px" },
      tile("jellyfin", "Jellyfin"),
      tile("sonarr", "Sonarr"),
      tile("radarr", "Radarr"),
      tile("immich", "Immich"),
      tile("proxmox", "Proxmox"),
      tile("piHole", "Pi-hole"),
      tile("homeAssistant", "Home Assistant"),
      tile("plex", "Plex"),
      tile("prowlarr", "Prowlarr"),
      tile("qBittorrent", "qBittorrent"),
      newWidget,
      tile("beszel", "Beszel"),
      tile("ntfy", "ntfy"),
      tile("docker", "Docker"),
      tile("seerr", "Seerr"),
    ),
  );
  bg.append(board);
  const toast = h(
    "div",
    { class: "abs row", style: "left:0;right:0;top:0;justify-content:center;pointer-events:none" },
    h(
      "div",
      {
        class: "row",
        style:
          "gap:12px;padding:14px 24px;border-radius:14px;background:#10231b;border:1px solid rgba(61,220,151,.55);font-size:22px;font-weight:750;color:#c9f7e1;box-shadow:0 18px 50px rgba(0,0,0,.5)",
      },
      icon("circle-check", 26, 2.4),
      "Assistant installed “Radarr upcoming” on Homelab",
    ),
  );

  // ---------- Keycaps ----------
  const kShift = h("div", { class: "kbd", style: "font-size:84px;padding:.2em .6em;border-radius:.28em" }, "Shift");
  const kA = h("div", { class: "kbd", style: "font-size:84px;min-width:1.6em;border-radius:.28em" }, "A");
  const keys = h(
    "div",
    { class: "abs row", style: "left:0;right:0;top:360px;justify-content:center;gap:34px" },
    kShift,
    h("div", { style: "font-size:70px;color:#8f919d" }, "+"),
    kA,
  );
  const keyCap = new Headline("Open Assistant from anywhere.", { size: 46, weight: 650, color: "#d7d8de" });
  keyCap.el.style.textAlign = "center";
  const keyCapWrap = h(
    "div",
    { class: "abs", style: "left:0;right:0;top:600px;white-space:nowrap;text-align:center" },
    keyCap.el,
  );

  // ---------- Drawer ----------
  const chipModel = h(
    "div",
    {
      class: "row",
      style:
        "margin-left:auto;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(250,83,82,.12);border:1px solid rgba(250,83,82,.4);font-size:16px;font-weight:700;color:#ffb3ad",
    },
    icon("sparkles", 16, 2.2),
    "Homarr provider",
  );
  const sugg = SUGGESTIONS.map(([ic, label]) =>
    h(
      "div",
      {
        class: "row",
        style:
          "gap:14px;height:58px;padding:0 20px;border-radius:14px;border:1px solid var(--line2);background:rgba(255,255,255,.03);font-size:21px;font-weight:600",
      },
      h("div", { style: "color:#ff8f86" }, icon(ic, 24, 2)),
      label,
    ),
  );
  const empty = h(
    "div",
    { class: "abs col", style: "left:40px;right:40px;top:170px;gap:14px" },
    h("div", { style: "color:var(--coral)" }, icon("sparkles", 44, 1.8)),
    h("div", { class: "display", style: "font-size:40px;font-weight:800" }, "What can I help with?"),
    h(
      "div",
      { style: "font-size:20px;line-height:1.45;color:#a9abb6;margin-bottom:14px" },
      "Ask about your Homarr setup, inspect live instance data, or approve actions when you want me to make a change.",
    ),
    ...sugg,
  );
  const ask = new TypeBlock(ASK, "", "#fff");
  const composerText = h(
    "div",
    { style: "flex:1;font-size:21px;line-height:1.35" },
    h("span", { style: "color:#d7d8de" }, PREFILL),
    ask.el,
  );
  const placeholder = h(
    "div",
    { class: "abs", style: "left:22px;top:30px;font-size:21px;color:#6f717d" },
    "Ask Assistant…",
  );
  const sendBtn = h(
    "div",
    { class: "center", style: "width:48px;height:48px;border-radius:13px;background:#fa5352;color:#fff;flex:none" },
    icon("arrow-up", 26, 2.6),
  );
  const composer = h(
    "div",
    {
      class: "abs row",
      style:
        "left:28px;right:28px;bottom:26px;min-height:92px;padding:14px 16px 14px 22px;gap:14px;border-radius:18px;background:#121318;border:1px solid var(--line2)",
    },
    placeholder,
    composerText,
    sendBtn,
  );
  // Conversation
  const bubble = h(
    "div",
    {
      style:
        "align-self:flex-end;max-width:560px;padding:16px 22px;border-radius:18px 18px 6px 18px;background:#2b1b1e;border:1px solid rgba(250,83,82,.45);font-size:21px;line-height:1.4",
    },
    PREFILL + ASK,
  );
  const step = (text: string, tag: string) => {
    const spin = h("div", { class: "abs", style: "left:0;top:0;color:var(--amber)" }, icon("loader-2", 22, 2.4));
    const ok = h("div", { class: "abs", style: "left:0;top:0;color:var(--mint)" }, icon("circle-check", 22, 2.4));
    const el = h(
      "div",
      { class: "row", style: "gap:14px;font-size:20px;color:#d7d8de" },
      h("div", { style: "position:relative;width:22px;height:22px;flex:none" }, spin, ok),
      text,
      h(
        "span",
        {
          class: "mono",
          style:
            "margin-left:auto;font-size:13px;padding:3px 9px;border-radius:6px;background:rgba(61,220,151,.12);color:var(--mint);letter-spacing:.06em",
        },
        tag,
      ),
    );
    return { el, spin, ok };
  };
  const s1 = step("Reading your Radarr integration", "READ · AUTO");
  const s2 = step("Drafting the Custom Widget", "READ · AUTO");
  const approveBtn = h(
    "div",
    {
      class: "row",
      style:
        "gap:8px;padding:12px 20px;border-radius:11px;background:#fa5352;color:#fff;font-size:18px;font-weight:800",
    },
    icon("player-play", 18, 2.6),
    "Approve and run",
  );
  const denyBtn = h(
    "div",
    {
      style:
        "padding:12px 20px;border-radius:11px;border:1px solid var(--line2);font-size:18px;font-weight:700;color:#d7d8de",
    },
    "Deny",
  );
  const approval = h(
    "div",
    {
      class: "col",
      style:
        "gap:14px;padding:20px 22px;border-radius:16px;background:rgba(255,181,71,.07);border:1px solid rgba(255,181,71,.45)",
    },
    h(
      "div",
      { class: "row label", style: "gap:10px;color:var(--amber);font-size:14px" },
      icon("shield-lock", 18, 2.2),
      "Approval required",
    ),
    h("div", { style: "font-size:23px;font-weight:750" }, "Create and install Custom Widget “Radarr upcoming”"),
    h("div", { class: "row", style: "gap:12px;justify-content:flex-end" }, denyBtn, approveBtn),
  );
  const installed = h(
    "div",
    {
      class: "row",
      style:
        "gap:12px;padding:14px 18px;border-radius:14px;background:rgba(61,220,151,.1);border:1px solid rgba(61,220,151,.45);font-size:20px;font-weight:700;color:#c9f7e1",
    },
    icon("circle-check", 24, 2.4),
    "Installed on Homelab",
  );
  const convo = [bubble, s1.el, s2.el, approval, installed];
  const thread = h("div", { class: "abs col", style: "left:28px;right:28px;top:110px;gap:18px" }, ...convo);
  const drawer = h(
    "div",
    {
      class: "abs card",
      style:
        "left:1130px;top:36px;width:750px;height:1008px;overflow:hidden;border-color:rgba(255,255,255,.12);background:linear-gradient(180deg,#1c1d23,#141519)",
    },
    h(
      "div",
      { class: "row", style: "height:78px;padding:0 26px;gap:12px;border-bottom:1px solid var(--line)" },
      h("div", { style: "color:var(--coral)" }, icon("sparkles", 26, 2)),
      h("div", { style: "font-size:24px;font-weight:800" }, "Assistant"),
      chipModel,
    ),
    empty,
    thread,
    composer,
  );
  const cursor = h(
    "div",
    {
      class: "abs",
      style: "left:0;top:0;width:34px;height:34px;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))",
    },
    icon("filled:pointer", 34, 1),
  );

  const chapter = new Chapter("03", "Assistant");
  const headA = new Headline("Or let Assistant build it for you.", { size: 70, lh: 1.05, accent: ["build"] });
  const subA = new Headline(
    "It works with live Homarr data: boards, apps, integrations, widgets, Docker and supported services.",
    { size: 30, weight: 550, color: "#b9bbc6", lh: 1.3 },
  );
  const headB = new Headline("Reads can run automatically. Changes wait for your approval.", {
    size: 62,
    lh: 1.08,
    accent: ["approval."],
  });
  const subB = new Headline("It also answers questions about your setup.", { size: 34, weight: 600, color: "#b9bbc6" });
  const leftA = h("div", { class: "abs col", style: "left:96px;top:300px;width:940px;gap:26px" }, headA.el, subA.el);
  const leftB = h("div", { class: "abs col", style: "left:96px;top:300px;width:940px;gap:26px" }, headB.el, subB.el);

  // ---------- Providers ----------
  const provHead = new Headline("Free with the Homarr provider. Or bring your own key.", {
    size: 64,
    accent: ["Free", "own", "key."],
  });
  const provHeadWrap = h(
    "div",
    { class: "abs", style: "left:0;right:0;top:150px;text-align:center;white-space:nowrap" },
    provHead.el,
  );
  const bullet = (ic: string, text: string, color: string) =>
    h(
      "div",
      { class: "row", style: "gap:16px;font-size:24px;line-height:1.35;align-items:flex-start;color:#e6e7ec" },
      h("div", { style: `color:${color};margin-top:2px;flex:none` }, icon(ic, 26, 2.2)),
      text,
    );
  const provCard = (accent: string, iconName: string, title: string, badge: string, lines: [string, string][]) =>
    h(
      "div",
      { class: "card col", style: `width:760px;padding:40px 44px;gap:22px;border-color:${accent}66` },
      h(
        "div",
        { class: "row", style: "gap:18px" },
        h(
          "div",
          {
            class: "center",
            style: `width:64px;height:64px;border-radius:18px;background:${accent}22;color:${accent}`,
          },
          icon(iconName, 36, 2),
        ),
        h("div", { style: "font-size:36px;font-weight:850;letter-spacing:-.02em" }, title),
        h(
          "div",
          {
            class: "mono",
            style: `margin-left:auto;padding:6px 14px;border-radius:999px;background:${accent}22;color:${accent};font-size:16px;font-weight:800;letter-spacing:.1em`,
          },
          badge,
        ),
      ),
      ...lines.map(([ic, text]) => bullet(ic, text, accent)),
    );
  const cardFree = provCard("#3ddc97", "gift", "Homarr provider", "FREE", [
    ["check", "Free, and will never offer paid plans"],
    ["check", "Only zero-data-retention (ZDR) providers"],
    ["check", "Daily request allowance, no API key needed"],
  ]);
  const cardByok = provCard("#7c8cff", "key", "Bring your own key", "BYOK", [
    ["check", "Any OpenAI-compatible Chat Completions API"],
    ["check", "Keys are encrypted and never returned to the browser"],
  ]);
  const provRow = h(
    "div",
    { class: "abs row", style: "left:0;right:0;top:330px;justify-content:center;gap:56px;align-items:stretch" },
    cardFree,
    cardByok,
  );

  fg.append(keys, keyCapWrap, toast, drawer, leftA, leftB, chapter.el, provHeadWrap, provRow, cursor);

  // ---------- Timeline ----------
  const K1 = 0.15;
  const K2 = 0.34;
  const DR = 0.95;
  const PICK = DR + 0.85;
  const TYPE = PICK + 0.12;
  const ACPS = 60;
  const SEND = TYPE + ASK.length / ACPS + 0.1;
  const S1 = SEND + 0.15;
  const S2 = S1 + 0.3;
  const APPR = S2 + 0.35;
  const CLICK = APPR + 0.6;
  const INST = CLICK + 0.25;
  const PROV = INST + 1.15;
  const END = PROV + 2.75;

  const cues: Scene["cues"] = [
    { t: K1, kind: "key", gain: 1 },
    { t: K2, kind: "key", gain: 1, pitch: 2 },
    { t: K2 + 0.02, kind: "hit", gain: 0.6 },
    { t: DR - 0.12, kind: "whoosh", gain: 0.8 },
    ...SUGGESTIONS.map((_, i) => ({ t: DR + 0.2 + i * 0.05, kind: "tick" as const, gain: 0.35, pitch: i })),
    { t: PICK, kind: "click", gain: 0.9 },
    { t: TYPE, kind: "type", dur: ASK.length / ACPS, gain: 0.45 },
    { t: SEND, kind: "key", gain: 0.8 },
    { t: S1 + 0.25, kind: "tick", gain: 0.5 },
    { t: S2 + 0.25, kind: "tick", gain: 0.5 },
    { t: APPR, kind: "pop", gain: 0.7 },
    { t: CLICK, kind: "click", gain: 1 },
    { t: INST, kind: "chime", gain: 0.8, pitch: 2 },
    { t: PROV - 0.12, kind: "whoosh", gain: 0.8 },
    { t: PROV + 0.3, kind: "hit", gain: 0.5 },
    { t: PROV + 0.5, kind: "hit", gain: 0.5 },
    { t: END - 0.3, kind: "whoosh", gain: 0.8 },
  ];

  return {
    name: "assistant",
    start: 0,
    end: END,
    bg,
    fg,
    cues,
    update(t, ctx) {
      ctx.fx.fade = 1 - E.outCubic(seg(t, 0, 0.12));

      // Keycaps drop in and press, then give way to the drawer.
      const press = (k: HTMLElement, at: number, i: number) => {
        const pin = spring(t - at + 0.18, 3.4, 0.5);
        const down = t > at && t < at + 0.12;
        const out = E.inCubic(seg(t, DR - 0.25 + i * 0.04, DR + 0.05 + i * 0.04));
        k.style.transform = `translateY(${((down ? 10 : 0) + (1 - clamp(pin, 0, 1.2)) * -80 - out * 60).toFixed(1)}px) scale(${lerp(1, 0.8, out).toFixed(3)})`;
        k.style.opacity = String((t > at - 0.18 ? 1 : 0) * (1 - out));
        k.style.borderBottomWidth = down ? "1px" : "3px";
        const glow = t > at ? Math.exp(-(t - at) * 3) : 0;
        k.style.boxShadow = `0 0 ${(glow * 60).toFixed(0)}px rgba(250,83,82,${(glow * 0.8).toFixed(2)})`;
        k.style.borderColor = glow > 0.05 ? `rgba(250,83,82,${(0.3 + glow * 0.7).toFixed(2)})` : "";
      };
      press(kShift, K1, 0);
      press(kA, K2, 1);
      (keys.children[1] as HTMLElement).style.opacity = String((t > K1 ? 1 : 0) * (1 - seg(t, DR - 0.25, DR)));
      keys.style.display = t < DR + 0.1 ? "" : "none";
      keyCap.update(t, K2 + 0.05, DR - 0.3, 0.025, 0.45);
      keyCapWrap.style.display = t < DR + 0.1 ? "" : "none";

      // Board sits under the drawer; pops to the front when the widget lands.
      const bIn = E.outCubic(seg(t, DR - 0.15, DR + 0.35));
      // Once the widget lands the drawer leaves for good; the board stays in focus until the cut.
      const focusBoard = E.inOutCubic(seg(t, INST + 0.05, INST + 0.35));
      const bOut = E.inOutQuart(seg(t, PROV - 0.3, PROV + 0.05));
      board.style.opacity = String(bIn * lerp(0.32, 1, focusBoard) * (1 - bOut));
      board.style.filter = `blur(${lerp(3.5, 0, focusBoard).toFixed(2)}px)`;
      board.style.transform = `perspective(2000px) rotateY(${lerp(8, 0, focusBoard).toFixed(2)}deg) scale(${(lerp(0.92, 0.98, focusBoard) * (1 - bOut * 0.08)).toFixed(4)})`;
      const nw = t > INST ? spring(t - INST, 2.8, 0.45) : 0;
      newWidget.style.transform = `scale(${clamp(nw, 0, 2).toFixed(3)})`;
      newWidget.style.opacity = t > INST ? "1" : "0";
      const nwGlow = t > INST ? Math.exp(-(t - INST - 0.2) * 1.8) : 0;
      newWidget.style.boxShadow = `0 0 ${(clamp(nwGlow) * 60).toFixed(0)}px rgba(250,83,82,${(clamp(nwGlow) * 0.7).toFixed(2)})`;

      // Drawer
      const dIn = E.outExpo(seg(t, DR - 0.1, DR + 0.4));
      const dOut = E.inOutQuart(seg(t, PROV - 0.35, PROV + 0.05));
      drawer.style.transform = `translateX(${((1 - dIn) * 800 + focusBoard * 820 + dOut * 800).toFixed(1)}px)`;
      const tIn = spring(t - INST - 0.2, 2.8, 0.5);
      const tOut = E.inCubic(seg(t, PROV - 0.45, PROV - 0.2));
      tf(toast, { y: 60 + (1 - clamp(tIn, 0, 1.3)) * -120 - tOut * 120, o: t > INST + 0.2 ? 1 : 0 });
      toast.style.display = t > INST + 0.15 && t < PROV ? "" : "none";
      drawer.style.display = t > DR - 0.15 && t < INST + 0.4 ? "" : "none";
      const eOut = E.inCubic(seg(t, SEND - 0.08, SEND + 0.15));
      empty.style.opacity = String(1 - eOut);
      empty.style.transform = `translateY(${(-eOut * 40).toFixed(1)}px)`;
      sugg.forEach((sg, i) => {
        const at = DR + 0.2 + i * 0.05;
        const si = E.outExpo(seg(t, at, at + 0.3));
        const picked = i === 4 && t >= PICK;
        sg.style.visibility = t >= at ? "visible" : "hidden";
        sg.style.transform = `translateX(${((1 - si) * 60).toFixed(1)}px) scale(${picked && t < PICK + 0.1 ? 0.97 : 1})`;
        sg.style.borderColor = picked ? "#fa5352" : i === 4 && t > PICK - 0.2 ? "rgba(255,255,255,.3)" : "var(--line2)";
        sg.style.background = picked ? "rgba(250,83,82,.14)" : "rgba(255,255,255,.03)";
      });
      // Composer
      placeholder.style.opacity = t < PICK ? "1" : "0";
      composerText.style.opacity = t >= PICK && t < SEND ? "1" : "0";
      ask.update(t, TYPE, ACPS, SEND);
      const sk = t > SEND ? Math.exp(-(t - SEND) * 6) : 0;
      sendBtn.style.transform = `scale(${(t > SEND && t < SEND + 0.1 ? 0.88 : 1 + sk * 0.12).toFixed(3)})`;
      // Conversation: messages snap in with a short rise.
      const revealAt = [SEND + 0.03, S1, S2, APPR, INST];
      convo.forEach((c, i) => {
        const r = E.outExpo(seg(t, revealAt[i]!, revealAt[i]! + 0.3));
        c.style.visibility = t >= revealAt[i]! ? "visible" : "hidden";
        c.style.transform = `translateY(${((1 - r) * 20).toFixed(1)}px)`;
      });
      [s1, s2].forEach((s, i) => {
        const done = t > [S1, S2][i]! + 0.25;
        s.spin.style.opacity = done ? "0" : "1";
        s.spin.style.transform = `rotate(${((t * 720) % 360).toFixed(1)}deg)`;
        s.ok.style.opacity = done ? "1" : "0";
      });
      const ak = t > CLICK ? Math.exp(-(t - CLICK) * 5) : 0;
      approveBtn.style.transform = `scale(${(t > CLICK && t < CLICK + 0.1 ? 0.94 : 1).toFixed(3)})`;
      approveBtn.style.boxShadow = `0 0 ${(ak * 40).toFixed(0)}px rgba(250,83,82,${(ak * 0.9).toFixed(2)})`;
      approval.style.borderColor = t > CLICK ? "rgba(61,220,151,.5)" : "rgba(255,181,71,.45)";

      // Cursor: suggestion pick, then approve.
      const drawerX = 1130 + (1 - dIn) * 800;
      const sgY = 36 + offsetWithin(sugg[4]!, drawer)[1] + 29;
      const [apOx, apOy] = offsetWithin(approveBtn, drawer);
      const apY = 36 + apOy + 30;
      const apX = drawerX + apOx + approveBtn.offsetWidth - 38;
      const c1 = E.inOutCubic(seg(t, DR + 0.35, PICK - 0.04));
      const c2 = E.inOutCubic(seg(t, APPR + 0.1, CLICK - 0.06));
      let cx = lerp(1000, drawerX + 200, c1);
      let cy = lerp(1000, sgY, c1);
      if (t > PICK + 0.15) {
        cx = lerp(drawerX + 200, apX, c2);
        cy = lerp(sgY, apY, c2);
      }
      const clickDown = (t > PICK && t < PICK + 0.1) || (t > CLICK && t < CLICK + 0.1);
      cursor.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${clickDown ? 0.85 : 1})`;
      cursor.style.display = t > DR + 0.35 && t < CLICK + 0.3 ? "" : "none";

      // Left copy
      chapter.update(t, DR + 0.1);
      // Copy blocks leave whole (a quick whip), never word by word over the next block.
      headA.update(t, DR + 0.1, Infinity, 0.04, 0.5);
      subA.update(t, DR + 0.35, Infinity, 0.02, 0.5);
      const wA = E.inCubic(seg(t, SEND - 0.1, SEND + 0.12));
      tf(leftA, { y: -wA * 90, blur: wA * 14, o: t > DR && wA < 1 ? 1 - wA * 0.6 : 0 });
      headB.update(t, SEND + 0.15, Infinity, 0.035, 0.5);
      subB.update(t, S2 + 0.1, Infinity, 0.025, 0.5);
      const wB = E.inCubic(seg(t, INST - 0.05, INST + 0.2));
      tf(leftB, { x: -wB * 300, blur: wB * 16, o: t > SEND && wB < 1 ? 1 - wB * 0.6 : 0 });

      // Providers
      const pOn = t > PROV - 0.2;
      provHeadWrap.style.display = provRow.style.display = pOn ? "" : "none";
      provHead.update(t, PROV, Infinity, 0.035, 0.5);
      [cardFree, cardByok].forEach((c, i) => {
        const ci = spring(t - PROV - 0.05 - i * 0.12, 2.6, 0.55);
        c.style.transform = `perspective(1600px) translateY(${((1 - clamp(ci, 0, 1.2)) * 160).toFixed(1)}px) rotateX(${((1 - clamp(ci, 0, 1)) * 25).toFixed(2)}deg)`;
        c.style.opacity = t > PROV + 0.05 + i * 0.12 ? "1" : "0";
        [...c.children].slice(1).forEach((b, j) => {
          const at = PROV + 0.3 + i * 0.12 + j * 0.08;
          const bi = E.outExpo(seg(t, at, at + 0.35));
          (b as HTMLElement).style.visibility = t >= at ? "visible" : "hidden";
          (b as HTMLElement).style.transform = `translateX(${((1 - bi) * 24).toFixed(1)}px)`;
        });
      });
      ctx.fx.shake = (t > K2 ? Math.exp(-(t - K2) * 8) : 0) * 8;
    },
  };
}

export function lobster(size: number) {
  const s = svg("svg", { viewBox: LOGO_VB, width: size, height: (size * 346.2) / 512 });
  s.append(svg("path", { d: LOGO_D, fill: "#fa5352" }));
  return s as unknown as HTMLElement;
}
