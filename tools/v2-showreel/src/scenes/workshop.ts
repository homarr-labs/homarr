import { E, seg, lerp, env, spring, clamp } from "../lib/anim";
import { h, tf, icon, logo } from "../lib/dom";
import { Chapter, Headline } from "../lib/kit";
import type { Scene } from "../lib/scene";

const catalog: { title: string; by: string; css?: boolean; hue: number }[] = [
  { title: "Pokédex", by: "ajnart", hue: 350 },
  { title: "Recommended TV Shows", by: "ajnart", hue: 210 },
  { title: "Categorized App List", by: "Clarkar00", hue: 150 },
  { title: "Midnight Glass", by: "community", css: true, hue: 260 },
  { title: "Pi-hole stats", by: "community", hue: 0 },
  { title: "Proxmox nodes", by: "community", hue: 28 },
  { title: "Frigate events", by: "community", hue: 190 },
  { title: "Nord", by: "community", css: true, hue: 205 },
  { title: "Jellyfin sessions", by: "community", hue: 280 },
  { title: "Speedtest history", by: "community", hue: 120 },
  { title: "Immich memories", by: "community", hue: 45 },
  { title: "Rounded Soft", by: "community", css: true, hue: 330 },
  { title: "qBittorrent speed", by: "community", hue: 100 },
  { title: "Home Assistant scenes", by: "community", hue: 195 },
  { title: "Uptime overview", by: "community", hue: 160 },
  { title: "Paper", by: "community", css: true, hue: 40 },
  { title: "Plex now playing", by: "community", hue: 38 },
  { title: "Calendar agenda", by: "community", hue: 230 },
  { title: "Gatus status", by: "community", hue: 140 },
  { title: "Terminal Green", by: "community", css: true, hue: 130 },
];

function thumb(hue: number, css = false, big = false) {
  const H = big ? 190 : 120;
  const el = h("div", {
    style: `height:${H}px;border-radius:12px;position:relative;overflow:hidden;background:linear-gradient(150deg,hsl(${hue} 55% 22%),hsl(${hue + 30} 50% 10%))`,
  });
  if (css) {
    el.append(
      h("div", { class: "abs mono", style: `left:16px;top:14px;font-size:${big ? 17 : 12}px;line-height:1.5;color:hsl(${hue} 90% 80%)` }, ".mantine-Card-root {"),
      h("div", { class: "abs mono", style: `left:30px;top:${big ? 42 : 32}px;font-size:${big ? 17 : 12}px;color:#fff;opacity:.75` }, "border-radius: 24px;"),
      h("div", { class: "abs mono", style: `left:16px;top:${big ? 70 : 50}px;font-size:${big ? 17 : 12}px;color:hsl(${hue} 90% 80%)` }, "}"),
    );
  } else {
    for (let i = 0; i < 3; i++)
      el.append(
        h("div", {
          class: "abs",
          style: `left:14px;right:${40 + i * 24}px;top:${16 + i * (big ? 50 : 32)}px;height:${big ? 34 : 20}px;border-radius:6px;background:hsla(${hue} 80% 70% / ${0.35 - i * 0.08})`,
        }),
      );
  }
  return el;
}

function wsCard(item: (typeof catalog)[number]) {
  return h(
    "div",
    { class: "card", style: "width:300px;height:236px;padding:10px;border-radius:16px" },
    thumb(item.hue, item.css),
    h("div", { style: "font-size:17px;font-weight:700;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }, item.title),
    h(
      "div",
      { class: "row", style: "font-size:13px;color:var(--muted);margin-top:6px;gap:8px" },
      item.by,
      item.css ? h("span", { class: "mono", style: "padding:1px 7px;border-radius:5px;background:rgba(124,140,255,.2);color:#c3caff;font-size:11px" }, "CSS") : null,
      h("span", { class: "row", style: "margin-left:auto;gap:4px" }, icon("arrow-big-up", 14, 2), String(20 + ((item.hue * 7) % 180))),
    ),
  );
}

/** Miniature board used for the Custom CSS restyle. */
function miniBoard(theme: "base" | "glass") {
  const g = theme === "glass";
  const tile = (w: number, hgt: number, content: HTMLElement | string, accent = false) =>
    h(
      "div",
      {
        style: `width:${w}px;height:${hgt}px;border-radius:${g ? 26 : 10}px;padding:16px;${
          g
            ? "background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)"
            : "background:#292a2e;border:1px solid rgba(255,255,255,.07)"
        };${accent ? (g ? "color:#b9a8ff" : "color:#fa5352") : ""}`,
      },
      content,
    );
  const big = (txt: string, sub: string) =>
    h("div", { class: "col" }, h("div", { style: "font-size:40px;font-weight:800;letter-spacing:-.03em" }, txt), h("div", { style: "font-size:15px;opacity:.6" }, sub));
  // One row that fits the tile's 328px content box.
  const apps = h(
    "div",
    { class: "row", style: "gap:10px;height:100%" },
    ...["sonarr", "radarr", "jellyfin", "piHole", "immich"].map((n) =>
      h("div", { class: "center", style: `width:56px;height:56px;flex:none;border-radius:${g ? 18 : 10}px;background:${g ? "rgba(255,255,255,.1)" : "#1f2024"}` }, logo(n, 32)),
    ),
  );
  const bars = h(
    "div",
    { class: "row", style: "gap:8px;align-items:flex-end;height:100%" },
    ...[40, 64, 30, 80, 55, 92, 70].map((v) =>
      h("div", { style: `flex:1;height:${v}%;border-radius:${g ? 8 : 3}px;background:${g ? "linear-gradient(180deg,#b9a8ff,#6d5dfc)" : "#fa5352"}` }),
    ),
  );
  return h(
    "div",
    {
      class: "abs",
      style: `inset:0;border-radius:${g ? 30 : 16}px;overflow:hidden;padding:22px;${
        g ? "background:radial-gradient(120% 90% at 20% 0%,#3b2a7a,#12102a 60%,#0a0a18)" : "background:#11172f"
      }`,
    },
    h(
      "div",
      { class: "row", style: `height:44px;margin-bottom:18px;gap:12px;font-weight:700;font-size:18px;${g ? "color:#e6e0ff" : ""}` },
      h("div", { style: `width:28px;height:28px;border-radius:${g ? 10 : 6}px;background:${g ? "#8b7bff" : "#fa5352"}` }),
      "Homelab",
      h("div", {
        style: `margin-left:auto;width:260px;height:36px;border-radius:${g ? 18 : 8}px;background:${g ? "rgba(255,255,255,.1)" : "#1f2024"}`,
      }),
    ),
    h(
      "div",
      { class: "row", style: "gap:16px;align-items:stretch" },
      h("div", { class: "col", style: "gap:16px" }, tile(250, 130, big("21:47", "Paris · Saturday"), true), tile(250, 130, big("24.9°", "Mainly clear"))),
      h("div", { class: "col", style: "gap:16px" }, tile(360, 130, apps), tile(360, 130, bars)),
    ),
  );
}

export function workshop(): Scene {
  const bg = h("div", { class: "scene" });
  const fg = h("div", { class: "scene" });

  // Catalog plane in perspective.
  const grid = h("div", { class: "abs", style: "left:0;top:0;display:grid;grid-template-columns:repeat(5,300px);gap:26px" }, ...catalog.map(wsCard));
  const plane = h("div", { class: "abs", style: "left:560px;top:-160px;transform-origin:50% 50%" }, grid);
  const planeWrap = h("div", { class: "abs", style: "inset:0;perspective:1800px" }, plane);
  const shade = h("div", {
    class: "abs",
    style: "inset:0;background:linear-gradient(90deg,#07070b 22%,rgba(7,7,11,.8) 42%,rgba(7,7,11,.2) 70%,rgba(7,7,11,.5))",
  });
  bg.append(planeWrap, shade);

  const chapter = new Chapter("02", "Workshop");
  const head = new Headline("Publish and install Custom Widgets.", { size: 92, accent: ["install"] });
  const headWrap = h("div", { class: "abs", style: "left:92px;top:150px;width:900px" }, head.el);

  const verbs = ["Publish", "Install", "Update", "Vote", "Comment", "Report"];
  const verbEls = verbs.map((v) => h("div", { class: "display", style: "font-size:64px;font-weight:800;transform-origin:0 50%" }, v));
  const verbCol = h("div", { class: "abs col", style: "left:96px;top:420px;gap:6px" }, ...verbEls);

  // Focus card: the Sonarr queue widget arriving from the previous scene.
  const votes = h("span", { class: "mono" }, "41");
  const upBtn = h("div", { class: "row", style: "gap:6px;padding:8px 12px;border-radius:10px;border:1px solid var(--line2)" }, icon("arrow-big-up", 20, 2), votes);
  const comBtn = h("div", { class: "row", style: "gap:6px;padding:8px 12px;border-radius:10px;border:1px solid var(--line2)" }, icon("message-circle", 20, 2), h("span", { class: "mono" }, "7"));
  const flagBtn = h("div", { class: "row", style: "gap:6px;padding:8px 12px;border-radius:10px;border:1px solid var(--line2)" }, icon("flag", 20, 2));
  const instLabel = h("span", {}, "Install");
  const instFill = h("div", { class: "abs", style: "left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.25)" });
  const instBtn = h(
    "div",
    {
      class: "row",
      style:
        "position:relative;overflow:hidden;margin-left:auto;gap:8px;padding:10px 20px;border-radius:10px;background:#fa5352;color:#fff;font-weight:800;font-size:18px",
    },
    instFill,
    icon("download", 20, 2.4),
    instLabel,
  );
  const version = h("span", { class: "mono", style: "padding:3px 10px;border-radius:6px;background:rgba(255,255,255,.08);font-size:15px" }, "v1.0");
  const published = h(
    "div",
    { class: "abs row mono", style: "right:18px;top:18px;gap:6px;padding:6px 12px;border-radius:8px;background:rgba(61,220,151,.18);color:var(--mint);font-size:14px;font-weight:700" },
    icon("check", 16, 2.6),
    "PUBLISHED",
  );
  const bubble = h(
    "div",
    {
      class: "abs",
      style:
        "right:-40px;top:250px;padding:16px 20px;border-radius:16px 16px 16px 4px;background:#2a2b33;border:1px solid var(--line2);font-size:19px;width:330px;box-shadow:0 20px 50px rgba(0,0,0,.5)",
    },
    h("div", { class: "mono", style: "font-size:13px;color:var(--muted);margin-bottom:6px" }, "comment"),
    "Works with my Sonarr v4 setup",
  );
  const reportTip = h(
    "div",
    {
      class: "abs row",
      style:
        "left:-24px;bottom:-66px;gap:10px;padding:12px 18px;border-radius:12px;background:#2a2b33;border:1px solid rgba(250,83,82,.5);font-size:18px;color:#ffb3ad;white-space:nowrap",
    },
    icon("flag", 20, 2),
    "Report sent to moderators",
  );
  const focusThumb = thumb(350, false, true);
  focusThumb.append(h("div", { class: "abs", style: "right:18px;bottom:16px" }, logo("sonarr", 64)));
  const focus = h(
    "div",
    { class: "abs card", style: "left:1060px;top:230px;width:600px;padding:18px;border-radius:22px;border-color:rgba(250,83,82,.45)" },
    focusThumb,
    h("div", { class: "row", style: "margin-top:16px;gap:12px" }, h("div", { style: "font-size:30px;font-weight:800;letter-spacing:-.02em" }, "Sonarr queue"), version),
    h("div", { style: "font-size:17px;color:var(--muted);margin-top:6px" }, "Queue with progress and a search action · by you"),
    h("div", { class: "row", style: "margin-top:20px;gap:10px;font-size:17px;color:#d7d8de" }, upBtn, comBtn, flagBtn, instBtn),
    published,
    bubble,
    reportTip,
  );

  // Custom CSS restyle
  const head2 = new Headline("Not only widgets: Custom CSS too.", { size: 92, accent: ["Custom", "CSS"] });
  const head2Wrap = h("div", { class: "abs", style: "left:92px;top:150px;width:900px" }, head2.el);
  const boardA = miniBoard("base");
  const boardB = miniBoard("glass");
  const boardFrame = h("div", { class: "abs", style: "left:1000px;top:290px;width:720px;height:420px;border-radius:30px" }, boardA, boardB);
  const cssCard = h(
    "div",
    { class: "abs card", style: "left:96px;top:470px;width:560px;padding:24px 28px;border-color:rgba(124,140,255,.4)" },
    h(
      "div",
      { class: "row", style: "gap:12px;font-size:24px;font-weight:800" },
      "Midnight Glass",
      h("span", { class: "mono", style: "padding:2px 9px;border-radius:6px;background:rgba(124,140,255,.2);color:#c3caff;font-size:13px" }, "CSS"),
    ),
    h(
      "div",
      { class: "mono", style: "margin-top:16px;font-size:18px;line-height:1.6;color:#c9d1d9" },
      h("div", {}, h("span", { class: "tok-p" }, ".mantine-Card-root"), " {"),
      h("div", {}, "  ", h("span", { class: "tok-k" }, "border-radius"), ": ", h("span", { class: "tok-n" }, "26px"), ";"),
      h("div", {}, "  ", h("span", { class: "tok-k" }, "backdrop-filter"), ": ", h("span", { class: "tok-s" }, "blur(16px)"), ";"),
      h("div", {}, "}"),
    ),
  );
  const cssInstall = h(
    "div",
    { class: "abs row", style: "left:96px;top:760px;gap:10px;padding:14px 24px;border-radius:12px;background:#7c8cff;color:#fff;font-weight:800;font-size:20px" },
    icon("download", 22, 2.4),
    "Apply",
  );
  const cursor = h("div", { class: "abs", style: "left:0;top:0;width:34px;height:34px;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))" }, icon("filled:pointer", 34, 1));

  const stamp = h(
    "div",
    {
      class: "abs display center",
      style:
        "left:170px;top:560px;width:430px;height:130px;border:6px solid #fa5352;border-radius:14px;color:#fa5352;font-size:64px;font-weight:900;letter-spacing:.04em",
    },
    "MODERATED",
  );
  const stampSub = h(
    "div",
    { class: "abs", style: "left:130px;top:730px;width:520px;text-align:center;font-size:24px;color:#d7d8de;line-height:1.4" },
    "Test it, add a useful screenshot and explain its setup.",
  );

  // Collapse into the door slit.
  const slit = h("div", { class: "abs", style: "left:958px;top:0;bottom:0;width:4px;background:#ffb0a8;box-shadow:0 0 30px 8px rgba(250,83,82,.9)" });

  const all = h("div", { class: "abs", style: "inset:0;transform-origin:50% 50%" });
  all.append(chapter.el, headWrap, verbCol, focus, head2Wrap, boardFrame, cssCard, cssInstall, stamp, stampSub, cursor);
  fg.append(all, slit);

  const V0 = 0.75;
  const VS = 0.36;
  const vt = (i: number) => V0 + i * VS;
  const CSS = 3.05;
  const APPLY = 4.2;
  const STAMP = 5.25;
  const OUT = 6.45;

  return {
    name: "workshop",
    start: 0,
    end: OUT + 0.45,
    bg,
    fg,
    cues: [
      { t: 0.1, kind: "hit", gain: 0.7 },
      ...verbs.map((_, i) => ({ t: vt(i), kind: "tick" as const, gain: 0.7, pitch: i })),
      { t: vt(1) + 0.12, kind: "click", gain: 0.7 },
      { t: vt(3) + 0.06, kind: "pop", gain: 0.6 },
      { t: vt(4) + 0.06, kind: "pop", gain: 0.6 },
      { t: CSS - 0.1, kind: "whoosh", gain: 0.7 },
      { t: APPLY, kind: "click", gain: 0.8 },
      { t: APPLY + 0.05, kind: "whoosh", gain: 0.6 },
      { t: STAMP, kind: "stamp", gain: 1 },
      { t: OUT - 0.1, kind: "riser", dur: 0.5, gain: 0.6 },
      { t: OUT, kind: "reverse", gain: 0.6 },
    ],
    update(t, ctx) {
      // Catalog plane drifts; dims behind the CSS beat and returns for the stamp.
      const pIn = E.outExpo(seg(t, 0, 0.8));
      plane.style.transform = `translate3d(0,${(-t * 30).toFixed(1)}px,0) rotateX(42deg) rotateZ(-16deg) rotateY(-8deg) scale(${lerp(1.3, 1, pIn).toFixed(3)})`;
      const dim = seg(t, CSS - 0.3, CSS + 0.3) * (1 - seg(t, STAMP - 0.3, STAMP));
      plane.style.opacity = String(pIn * lerp(0.9, 0.3, dim) * (1 - seg(t, OUT - 0.3, OUT)));
      plane.style.filter = `blur(${lerp(0, 3, seg(t, 0.6, 1.4)).toFixed(2)}px)`;

      chapter.update(t, 0.15, OUT - 0.3);
      head.update(t, 0.2, CSS - 0.3, 0.04, 0.6);
      verbEls.forEach((v, i) => {
        const a = E.outExpo(seg(t, 0.4 + i * 0.04, 0.9 + i * 0.04));
        const active = t >= vt(i) && t < (i === verbs.length - 1 ? CSS - 0.3 : vt(i + 1));
        const k = t >= vt(i) ? Math.exp(-(t - vt(i)) * 6) : 0;
        const out = t > CSS - 0.3 + i * 0.02;
        v.style.opacity = out ? "0" : String(a * (active ? 1 : t > vt(i) ? 0.45 : 0.22));
        v.style.color = active ? "#fa5352" : "#fff";
        v.style.transform = `translateX(${((1 - a) * -40 + (active ? 16 : 0)).toFixed(1)}px) scale(${(1 + k * 0.06).toFixed(3)})`;
      });

      // Focus card arrives from above (continuation of the publish fly-out).
      const fIn = E.outExpo(seg(t, 0, 0.6));
      const fOut = E.inOutQuart(seg(t, CSS - 0.4, CSS + 0.1));
      focus.style.transform = `perspective(1600px) translate(${(fOut * 900).toFixed(1)}px,${((1 - fIn) * -700).toFixed(1)}px) rotateX(${((1 - fIn) * -30).toFixed(2)}deg) rotateY(${(-6 + Math.sin(t * 0.8) * 2).toFixed(2)}deg)`;
      focus.style.opacity = String(Math.min(1, fIn * 1.5) * (1 - fOut));
      focus.style.display = t < CSS + 0.15 ? "" : "none";
      const pb = spring(t - vt(0), 3, 0.45);
      published.style.transform = `scale(${clamp(pb, 0, 2).toFixed(3)})`;
      published.style.opacity = t >= vt(0) ? "1" : "0";
      // Install: fill then installed state.
      const ip = seg(t, vt(1) + 0.08, vt(1) + 0.3);
      instFill.style.width = `${(ip * 100).toFixed(1)}%`;
      instLabel.textContent = ip >= 1 ? "Installed" : "Install";
      instBtn.style.background = ip >= 1 ? "#2f9e6e" : "#fa5352";
      // Update: version bump.
      version.textContent = t > vt(2) + 0.08 ? "v1.1" : "v1.0";
      const vk = t > vt(2) + 0.08 ? Math.exp(-(t - vt(2) - 0.08) * 6) : 0;
      version.style.background = `rgba(250,83,82,${(0.08 + vk * 0.6).toFixed(2)})`;
      version.style.transform = `scale(${(1 + vk * 0.3).toFixed(3)})`;
      // Vote
      votes.textContent = t > vt(3) + 0.06 ? "42" : "41";
      const uk = t > vt(3) + 0.06 ? Math.exp(-(t - vt(3) - 0.06) * 6) : 0;
      upBtn.style.color = t > vt(3) + 0.06 ? "#fa5352" : "";
      upBtn.style.borderColor = t > vt(3) + 0.06 ? "rgba(250,83,82,.6)" : "";
      upBtn.style.transform = `translateY(${(-uk * 8).toFixed(1)}px) scale(${(1 + uk * 0.15).toFixed(3)})`;
      // Comment
      const cb = spring(t - vt(4) - 0.06, 3.2, 0.5);
      bubble.style.transform = `scale(${clamp(cb, 0, 2).toFixed(3)})`;
      bubble.style.transformOrigin = "0 100%";
      bubble.style.opacity = t > vt(4) + 0.06 ? "1" : "0";
      // Report
      const rb = E.outExpo(seg(t, vt(5) + 0.06, vt(5) + 0.35));
      reportTip.style.opacity = t > vt(5) + 0.06 ? "1" : "0";
      reportTip.style.transform = `translateY(${((1 - rb) * 16).toFixed(1)}px)`;
      flagBtn.style.color = t > vt(5) + 0.06 ? "#fa5352" : "";

      // CSS section
      head2.update(t, CSS, STAMP - 0.3, 0.04, 0.55);
      const bIn = E.outExpo(seg(t, CSS + 0.05, CSS + 0.6));
      const bOut = E.inOutQuart(seg(t, STAMP - 0.35, STAMP + 0.05));
      boardFrame.style.transform = `perspective(1800px) translate(${((1 - bIn) * 500 + bOut * 800).toFixed(1)}px,0) rotateY(${((1 - bIn) * -25 - 10 + Math.sin(t) * 2).toFixed(2)}deg) rotateX(4deg)`;
      boardFrame.style.opacity = String(Math.min(1, bIn * 2) * (1 - bOut));
      boardFrame.style.display = t > CSS && t < STAMP + 0.1 ? "" : "none";
      const wipe = E.inOutQuart(seg(t, APPLY + 0.05, APPLY + 0.6));
      const wx = lerp(-40, 140, wipe);
      boardB.style.clipPath = `polygon(0 0, ${wx}% 0, ${wx - 30}% 100%, 0 100%)`;
      const ci = E.outExpo(seg(t, CSS + 0.15, CSS + 0.6));
      const co = t > STAMP - 0.3;
      cssCard.style.transform = `translateY(${((1 - ci) * 40).toFixed(1)}px)`;
      cssCard.style.opacity = co || t < CSS + 0.15 ? "0" : "1";
      const bi = spring(t - CSS - 0.4, 3.2, 0.5);
      const press = t > APPLY ? 1 - Math.sin(clamp((t - APPLY) / 0.2) * Math.PI) * 0.1 : 1;
      cssInstall.style.transform = `scale(${(clamp(bi, 0, 2) * press).toFixed(3)})`;
      cssInstall.style.opacity = co || t < CSS + 0.4 ? "0" : "1";
      cssInstall.style.background = t > APPLY + 0.1 ? "#2f9e6e" : "#7c8cff";
      (cssInstall.lastChild as Text).textContent = t > APPLY + 0.1 ? "Applied" : "Apply";
      // Cursor path to the apply button
      const cp = E.inOutCubic(seg(t, CSS + 0.45, APPLY - 0.05));
      const cx = lerp(700, 190, cp);
      const cy = lerp(980, 790, cp);
      cursor.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${t > APPLY && t < APPLY + 0.2 ? 0.85 : 1})`;
      cursor.style.opacity = String(seg(t, CSS + 0.4, CSS + 0.55) * (1 - seg(t, APPLY + 0.3, APPLY + 0.5)));

      // Moderated stamp
      const st = seg(t, STAMP, STAMP + 0.14);
      stamp.style.display = t >= STAMP ? "" : "none";
      stamp.style.transform = `rotate(-8deg) scale(${lerp(2.4, 1, E.inCubic(st)).toFixed(3)})`;
      stamp.style.opacity = String(Math.min(1, st * 3));
      const ss = E.outExpo(seg(t, STAMP + 0.25, STAMP + 0.7));
      stampSub.style.opacity = t > STAMP + 0.25 ? "1" : "0";
      stampSub.style.transform = `translateY(${((1 - ss) * 14).toFixed(1)}px)`;
      const hit = t >= STAMP + 0.14 ? Math.exp(-(t - STAMP - 0.14) * 7) : 0;
      ctx.fx.shake = hit * 14 + Math.exp(-t * 7) * 8;
      ctx.fx.zoom = 1 + hit * 0.015;

      // Collapse to the slit
      const c = E.inExpo(seg(t, OUT, OUT + 0.4));
      all.style.transform = `scaleX(${(1 - c * 0.995).toFixed(4)})`;
      all.style.filter = c > 0.01 ? `brightness(${(1 + c * 3).toFixed(2)})` : "";
      bg.style.opacity = String(1 - c);
      slit.style.opacity = String(seg(t, OUT + 0.25, OUT + 0.4));
    },
  };
}
