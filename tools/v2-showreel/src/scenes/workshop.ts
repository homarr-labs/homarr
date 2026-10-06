import { E, seg, lerp, clamp, spring, BEAT } from "../lib/anim";
import { h, tf, icon, logo } from "../lib/dom";
import { Chapter, Headline } from "../lib/kit";
import type { Scene } from "../lib/scene";

// Workshop: the catalog opens around the widget published in the previous scene, then a Custom CSS submission gets
// installed and restyles the whole catalog.
type Theme = "base" | "glass";
type Item = {
  title: string;
  by: string;
  hue: number;
  kind: "queue" | "poke" | "rows" | "bars" | "css";
  uses?: string[];
  votes: number;
  fresh?: boolean;
};
const ITEMS: Item[] = [
  { title: "Sonarr queue", by: "you", hue: 212, kind: "queue", uses: ["sonarr"], votes: 0, fresh: true },
  { title: "Pokédex", by: "ajnart", hue: 350, kind: "poke", votes: 412 },
  { title: "Pi-hole stats", by: "community", hue: 0, kind: "bars", uses: ["piHole"], votes: 188 },
  { title: "Jellyfin sessions", by: "community", hue: 280, kind: "rows", uses: ["jellyfin"], votes: 256 },
  { title: "Proxmox nodes", by: "community", hue: 28, kind: "bars", uses: ["proxmox"], votes: 143 },
  { title: "Midnight Glass", by: "community", hue: 258, kind: "css", votes: 331 },
  { title: "Immich memories", by: "community", hue: 45, kind: "rows", uses: ["immich"], votes: 97 },
  { title: "Nord", by: "community", hue: 205, kind: "css", votes: 274 },
  { title: "Frigate events", by: "community", hue: 190, kind: "bars", uses: ["frigate"], votes: 165 },
  { title: "Home Assistant scenes", by: "community", hue: 195, kind: "rows", uses: ["homeAssistant"], votes: 210 },
  { title: "Plex now playing", by: "community", hue: 38, kind: "rows", uses: ["plex"], votes: 127 },
  { title: "Release calendar", by: "community", hue: 150, kind: "bars", uses: ["sonarr", "radarr"], votes: 301 },
];
const CSS_ITEM = 5;
const W = 290;
const H = 244;
const GAP = 18;
const PAD = 22;
const HEAD = 86;
const PANEL = { x: 890, y: 100, w: 3 * W + 2 * GAP + 2 * PAD, h: 880 };
const QUEUE = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

function thumb(item: Item, g: boolean) {
  const el = h("div", {
    class: "abs",
    style: `left:10px;top:10px;width:${W - 20}px;height:112px;border-radius:${g ? 18 : 10}px;overflow:hidden;background:linear-gradient(150deg,hsl(${item.hue} 55% 22%),hsl(${item.hue + 30} 50% 10%))`,
  });
  if (item.kind === "queue")
    QUEUE.forEach((c, i) =>
      el.append(
        h("div", {
          class: "abs",
          style: `left:16px;top:${12 + i * 24}px;width:14px;height:18px;border-radius:3px;background:${c}`,
        }),
        h("div", {
          class: "abs",
          style: `left:42px;top:${19 + i * 24}px;width:200px;height:5px;border-radius:3px;background:rgba(255,255,255,.12)`,
        }),
        h("div", {
          class: "abs",
          style: `left:42px;top:${19 + i * 24}px;width:${[172, 122, 74, 28][i]}px;height:5px;border-radius:3px;background:#fa5352`,
        }),
      ),
    );
  else if (item.kind === "poke")
    el.append(
      h("div", {
        class: "abs",
        style:
          "left:93px;top:14px;width:84px;height:84px;border-radius:50%;background:linear-gradient(180deg,#fa5352 0 46%,#222 46% 54%,#eee 54%);box-shadow:0 0 0 5px #222 inset",
      }),
      h("div", {
        class: "abs",
        style: "left:124px;top:45px;width:22px;height:22px;border-radius:50%;background:#eee;border:5px solid #222",
      }),
    );
  else if (item.kind === "css") {
    const nord = item.title === "Nord";
    el.append(
      h(
        "div",
        {
          class: "abs mono",
          style: `left:14px;top:14px;font-size:13px;line-height:22px;color:hsl(${item.hue} 90% 80%)`,
        },
        ".mantine-Card-root {",
      ),
      h(
        "div",
        { class: "abs mono", style: "left:30px;top:36px;font-size:13px;line-height:22px;color:#fff;opacity:.75" },
        nord ? "background: #3b4252;" : "border-radius: 26px;",
      ),
      h(
        "div",
        { class: "abs mono", style: "left:30px;top:58px;font-size:13px;line-height:22px;color:#fff;opacity:.75" },
        nord ? "color: #eceff4;" : "backdrop-filter: blur(16px);",
      ),
      h(
        "div",
        {
          class: "abs mono",
          style: `left:14px;top:80px;font-size:13px;line-height:22px;color:hsl(${item.hue} 90% 80%)`,
        },
        "}",
      ),
    );
  } else if (item.kind === "bars")
    for (let b = 0; b < 9; b++)
      el.append(
        h("div", {
          class: "abs",
          style: `left:${18 + b * 27}px;bottom:14px;width:17px;height:${22 + ((b * 37 + item.hue) % 64)}px;border-radius:${g ? 6 : 3}px;background:${b % 3 ? "rgba(255,255,255,.22)" : g ? "#b9a8ff" : "#fa5352"}`,
        }),
      );
  else
    for (let r = 0; r < 3; r++)
      el.append(
        h("div", {
          class: "abs",
          style: `left:16px;top:${16 + r * 30}px;width:22px;height:22px;border-radius:${g ? 8 : 6}px;background:rgba(255,255,255,.2)`,
        }),
        h("div", {
          class: "abs",
          style: `left:48px;top:${22 + r * 30}px;width:${160 - r * 34}px;height:9px;border-radius:5px;background:hsla(${item.hue} 80% 75% / .45)`,
        }),
      );
  return el;
}

/** A Workshop catalog card; `g` renders it with the Midnight Glass Custom CSS. */
function card(item: Item, g: boolean) {
  const vote = h("span", { class: "tnum" }, String(item.votes));
  const comments = h("span", { class: "tnum" }, "0");
  const btn = h(
    "div",
    {
      class: "abs center",
      style: `right:12px;bottom:12px;width:104px;height:36px;border-radius:${g ? 18 : 9}px;background:${g ? "#8b7bff" : "#fa5352"};font-size:15px;font-weight:750;overflow:hidden`,
    },
    "Install",
  );
  const installed = h(
    "div",
    { class: "abs row center", style: "inset:0;gap:5px;background:#2f9e6b;opacity:0" },
    icon("check", 16, 3),
    "Installed",
  );
  btn.append(installed);
  const badge =
    item.kind === "css"
      ? h(
          "span",
          {
            class: "mono",
            style: `padding:5px 10px;border-radius:${g ? 12 : 6}px;background:${g ? "rgba(185,168,255,.2)" : "rgba(124,140,255,.2)"};color:#c3caff;font-size:12px;font-weight:700;letter-spacing:.08em`,
          },
          "CUSTOM CSS",
        )
      : h(
          "span",
          { class: "row", style: "gap:6px" },
          item.uses
            ? h(
                "span",
                { style: `font-size:13px;font-weight:600;margin-right:2px;color:${g ? "#a99fd6" : "var(--muted)"}` },
                "Works with",
              )
            : null,
          ...(item.uses ?? []).map((u) =>
            h(
              "span",
              {
                class: "center",
                style: `width:30px;height:30px;border-radius:${g ? 11 : 7}px;background:${g ? "rgba(255,255,255,.12)" : "#2a2b31"}`,
              },
              logo(u, 20),
            ),
          ),
          item.uses
            ? null
            : h("span", { class: "mono", style: "font-size:12px;color:var(--muted);letter-spacing:.1em" }, "API"),
        );
  const el = h(
    "div",
    {
      class: "abs",
      style: `width:${W}px;height:${H}px;border-radius:${g ? 26 : 14}px;overflow:hidden;${
        g
          ? "background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 20px 40px rgba(10,6,40,.45)"
          : "background:#1d1e23;border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 36px rgba(0,0,0,.4)"
      }`,
    },
    thumb(item, g),
    h(
      "div",
      {
        class: "abs",
        style: `left:16px;top:134px;width:170px;font-size:18px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${g ? "color:#f1edff" : ""}`,
      },
      item.title,
    ),
    h(
      "div",
      { class: "abs", style: `left:16px;top:160px;font-size:14px;color:${g ? "#a99fd6" : "var(--muted)"}` },
      `by ${item.by}`,
    ),
    h(
      "div",
      { class: "abs row", style: `right:14px;top:137px;gap:10px;font-size:14px;color:${g ? "#d9d2ff" : "#cfcfd6"}` },
      h("span", { class: "row", style: "gap:4px" }, icon("arrow-big-up", 16, 2), vote),
      h("span", { class: "row", style: "gap:4px" }, icon("message-circle", 15, 2), comments),
    ),
    h("div", { class: "abs row", style: "left:16px;bottom:15px" }, badge),
    btn,
  );
  if (item.fresh) {
    el.style.border = `2px solid ${g ? "rgba(185,168,255,.8)" : "rgba(250,83,82,.8)"}`;
    el.append(
      h(
        "div",
        {
          class: "abs mono",
          style: `left:12px;top:12px;padding:4px 9px;border-radius:${g ? 10 : 6}px;background:${g ? "#8b7bff" : "#fa5352"};font-size:12px;font-weight:800;letter-spacing:.1em`,
        },
        "NEW",
      ),
    );
  }
  return { el, vote, comments, btn, installed };
}

function panel(theme: Theme) {
  const g = theme === "glass";
  const cards = ITEMS.map((it, i) => {
    const c = card(it, g);
    c.el.style.left = `${PAD + (i % 3) * (W + GAP)}px`;
    c.el.style.top = `${Math.floor(i / 3) * (H + GAP)}px`;
    return c;
  });
  const grid = h("div", { class: "abs", style: "left:0;top:0;right:0" }, ...cards.map((c) => c.el));
  const tab = (label: string, on: boolean) =>
    h(
      "div",
      {
        style: `padding:8px 16px;border-radius:${g ? 16 : 8}px;font-size:16px;font-weight:650;${
          on
            ? g
              ? "background:rgba(185,168,255,.22);color:#e6e0ff"
              : "background:rgba(250,83,82,.16);color:#ff8f86"
            : `color:${g ? "#a99fd6" : "var(--muted)"}`
        }`,
      },
      label,
    );
  const el = h(
    "div",
    {
      class: "abs",
      style: `left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;border-radius:${g ? 34 : 20}px;overflow:hidden;${
        g
          ? "background:radial-gradient(120% 90% at 20% 0%,#3b2a7a,#12102a 60%,#0a0a18);border:1px solid rgba(255,255,255,.2)"
          : "background:#141418;border:1px solid rgba(255,255,255,.08)"
      };box-shadow:0 50px 100px -20px rgba(0,0,0,.7)`,
    },
    h(
      "div",
      {
        class: "abs row",
        style: `left:${PAD}px;right:${PAD}px;top:18px;height:48px;gap:12px;font-weight:800;font-size:22px;${g ? "color:#e6e0ff" : ""}`,
      },
      h(
        "div",
        {
          class: "center",
          style: `width:34px;height:34px;border-radius:${g ? 12 : 8}px;background:${g ? "#8b7bff" : "#fa5352"}`,
        },
        icon("building-store", 20, 2.2),
      ),
      "Workshop",
      h(
        "div",
        { class: "row", style: "gap:4px;margin-left:18px" },
        tab("Widgets", true),
        tab("Custom CSS", false),
        tab("Installed", false),
      ),
      h(
        "div",
        {
          class: "row",
          style: `margin-left:auto;gap:8px;width:190px;height:38px;padding:0 12px;border-radius:${g ? 19 : 9}px;background:${g ? "rgba(255,255,255,.1)" : "#1f2025"};font-size:15px;font-weight:500;color:${g ? "#a99fd6" : "var(--muted)"}`,
        },
        icon("search", 17, 2),
        "Search",
      ),
    ),
    h("div", { class: "abs", style: `left:0;right:0;top:${HEAD}px;bottom:0;overflow:hidden` }, grid),
  );
  return { el, grid, cards };
}

/** Screen rect of the published widget's catalog slot (inside the panel's 1px border). */
export const SLOT = { x: PANEL.x + 1 + PAD, y: PANEL.y + 1 + HEAD, w: W, h: H };
export const WORKSHOP_BG =
  "radial-gradient(ellipse 55% 50% at 14% 12%,rgba(250,82,82,.16),rgba(250,82,82,0) 62%),#0b0b0f";

/**
 * The published widget as a Workshop card, for Custom Widgets to morph into. It ends the scene alone in its slot and
 * shadowless, matching the first Workshop frame, where the catalog is still clipped to that card.
 */
export function publishedCard() {
  const c = card(ITEMS[0]!, false);
  c.el.style.left = `${SLOT.x}px`;
  c.el.style.top = `${SLOT.y}px`;
  c.el.style.boxShadow = "none";
  c.el.style.transformOrigin = "0 0";
  return c.el;
}

export function workshop(): Scene {
  const bg = h("div", { class: "scene", style: `background:${WORKSHOP_BG}` });
  // The Custom CSS restyle spills past the catalog into the background.
  const bgGlass = h("div", {
    class: "abs",
    style:
      "inset:0;background:radial-gradient(ellipse 70% 60% at 70% 20%,rgba(139,123,255,.3),rgba(139,123,255,0) 70%),#0d0b1c",
  });
  bg.append(bgGlass);
  const fg = h("div", { class: "scene" });

  const A = panel("base");
  const B = panel("glass");
  const both = [A, B];
  const cursor = h(
    "div",
    {
      class: "abs",
      style: "left:0;top:0;width:40px;height:40px;color:#fff;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))",
    },
    icon("filled:pointer", 40, 1),
  );

  const chapter = new Chapter("02", "Workshop");
  const h1 = new Headline("Share it in the", { size: 96, weight: 830 });
  const h2 = new Headline("Workshop.", { size: 96, weight: 830, color: "var(--coral)" });
  const head = h(
    "div",
    { class: "abs col", style: "left:100px;top:150px;line-height:1.08;white-space:nowrap" },
    h1.el,
    h2.el,
  );
  const desc = new Headline("Publish and install community submissions.", { size: 30, weight: 500, color: "#b5b5bf" });
  const descWrap = h("div", { class: "abs", style: "left:104px;top:392px;white-space:nowrap" }, desc.el);
  const chips = (
    [
      ["puzzle", "Custom Widgets"],
      ["palette", "Custom CSS"],
      ["refresh", "Updates"],
      ["arrow-big-up", "Votes"],
      ["message-circle", "Comments"],
    ] as const
  ).map(([ic, label]) =>
    h(
      "div",
      {
        class: "chip",
        style: "font-size:19px;padding:9px 17px;color:#dcdce2;border-color:rgba(255,255,255,.2);gap:9px",
      },
      h("span", { style: "color:#ff8787;display:inline-flex" }, icon(ic, 20, 2)),
      label,
    ),
  );
  const chipBox = h(
    "div",
    { class: "abs row", style: "left:104px;top:458px;width:700px;flex-wrap:wrap;gap:12px" },
    ...chips,
  );
  const usesLabel = h(
    "div",
    {
      class: "abs row",
      style:
        "left:104px;top:600px;width:700px;gap:14px;align-items:flex-start;font-size:26px;line-height:1.35;font-weight:600;color:#dcdce2",
    },
    h("span", { style: "color:#ff8787;display:inline-flex;margin-top:3px" }, icon("plug-connected", 28, 2)),
    h("span", {}, "Custom widgets can leverage your integrations, so you don't have to retype your credentials."),
  );
  const privacy = h(
    "div",
    {
      class: "abs row",
      style: "left:104px;top:740px;gap:12px;font-size:22px;font-weight:550;color:#9a9ca8;white-space:nowrap",
    },
    h("span", { style: "color:var(--mint);display:inline-flex" }, icon("lock", 22, 2)),
    "Deployment URLs and credentials stay on your Homarr instance.",
  );
  const applied = h(
    "div",
    {
      class: "abs row",
      style:
        "left:104px;top:824px;gap:12px;padding:12px 20px;border-radius:16px;background:rgba(139,123,255,.16);border:1px solid rgba(185,168,255,.4);font-size:21px;font-weight:650;color:#e6e0ff;white-space:nowrap",
    },
    icon("palette", 22, 2),
    "Custom CSS installed: Midnight Glass",
  );
  fg.append(A.el, B.el, cursor, chapter.el, head, descWrap, chipBox, usesLabel, privacy, applied);

  const LAND = 0.05;
  const CLICK = 7 * BEAT;
  const WIPE = CLICK + 0.12;
  const END = WIPE + 1.5;
  // Screen position of the Midnight Glass install button.
  const bx = PANEL.x + PAD + (CSS_ITEM % 3) * (W + GAP) + W - 12 - 52;
  const by = PANEL.y + HEAD + Math.floor(CSS_ITEM / 3) * (H + GAP) + H - 12 - 18;
  // Diagonal wipe edge in screen px: x at a given y.
  const edge = (wx: number, y: number) => wx - 0.55 * y;

  return {
    name: "workshop",
    start: 0,
    end: END,
    bg,
    fg,
    cues: [
      { t: LAND, kind: "hit", gain: 0.55 },
      { t: 0.25, kind: "swish", gain: 0.5 },
      ...ITEMS.slice(1).map((_, i) => ({ t: 0.3 + i * 0.05, kind: "tick" as const, gain: 0.25, pitch: i % 6 })),
      { t: 1.9, kind: "swish", gain: 0.35 },
      { t: CLICK, kind: "click", gain: 0.8 },
      { t: WIPE, kind: "swish", gain: 0.7 },
      { t: WIPE + 0.5, kind: "pop", gain: 0.6 },
    ],
    update(t) {
      // Left column
      chapter.update(t, 0.05, END + 1); // a finite exit keeps it hidden on the first frame, as Custom Widgets left it
      h1.update(t, 0.1, Infinity, 0.05, 0.55);
      h2.update(t, 0.25, Infinity, 0.05, 0.55);
      desc.update(t, 0.55, Infinity, 0.015, 0.5);
      chips.forEach((c, i) => {
        const a = 1.2 + i * 0.09;
        tf(c, { s: clamp(spring(t - a, 2.6, 0.5), 0, 1.3), o: seg(t, a, a + 0.08) });
      });
      const ul = E.outExpo(seg(t, 1.9, 2.4));
      tf(usesLabel, { y: (1 - ul) * 16, o: ul });
      const pv = E.outQuart(seg(t, 2.8, 3.4));
      tf(privacy, { o: pv });
      privacy.style.clipPath = `inset(0 ${((1 - pv) * 100).toFixed(1)}% 0 0)`;
      const ap = E.outBack(seg(t, WIPE + 0.45, WIPE + 0.85));
      tf(applied, { y: (1 - ap) * 20, s: lerp(0.9, 1, ap), o: seg(t, WIPE + 0.45, WIPE + 0.55) });

      // Catalog: grows out of the published card (the first frame is just that card, as Custom Widgets left it), then
      // the other cards pop in.
      const open = E.outQuart(seg(t, 0.05, 0.75));
      const inset = [
        SLOT.y - PANEL.y,
        PANEL.x + PANEL.w - SLOT.x - W,
        PANEL.y + PANEL.h - SLOT.y - H,
        SLOT.x - PANEL.x,
      ];
      const press = 1 - 0.1 * Math.sin(seg(t, CLICK - 0.06, CLICK + 0.1) * Math.PI);
      const votes = String(Math.round(24 * E.outCubic(seg(t, LAND + 0.3, CLICK))));
      const comments = String(Math.round(5 * E.outCubic(seg(t, LAND + 0.8, CLICK))));
      for (const P of both) {
        if (P === A)
          // 1px outside the card so its own anti-aliased edge isn't clipped a second time.
          P.el.style.clipPath =
            open < 1
              ? `inset(${inset.map((v) => `${((v - 1) * (1 - open)).toFixed(2)}px`).join(" ")} round ${lerp(15, 20, open).toFixed(2)}px)`
              : "";
        P.cards.forEach((c, i) => {
          if (i > 0) {
            const a = 0.3 + i * 0.05;
            tf(c.el, { s: lerp(0.85, 1, E.outBack(seg(t, a, a + 0.4))), o: seg(t, a, a + 0.12) });
          }
        });
        P.cards[0]!.vote.textContent = votes;
        P.cards[0]!.comments.textContent = comments;
        const cc = P.cards[CSS_ITEM]!;
        cc.installed.style.opacity = t >= CLICK + 0.04 ? "1" : "0";
        cc.btn.style.transform = `scale(${press.toFixed(3)})`;
      }
      // The glass copy of the catalog and background, revealed by a diagonal wipe after the install.
      const wx = lerp(-200, 2700, E.inOutQuart(seg(t, WIPE, WIPE + 0.62)));
      const pl = (y: number) => (edge(wx, y) - PANEL.x).toFixed(1);
      B.el.style.clipPath = `polygon(0 0,${pl(PANEL.y)}px 0,${pl(PANEL.y + PANEL.h)}px 100%,0 100%)`;
      B.el.style.display = t > WIPE ? "" : "none";
      bgGlass.style.clipPath = `polygon(0 0,${edge(wx, 0).toFixed(1)}px 0,${edge(wx, 1080).toFixed(1)}px 100%,0 100%)`;
      bgGlass.style.display = t > WIPE ? "" : "none";

      // The cursor installs Midnight Glass.
      const cp = E.inOutCubic(seg(t, CLICK - 0.8, CLICK - 0.04));
      const cx = lerp(bx - 380, bx, cp);
      const cy = lerp(by + 260, by, cp);
      cursor.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${press.toFixed(3)})`;
      cursor.style.opacity = String(seg(t, CLICK - 0.9, CLICK - 0.75) * (1 - seg(t, CLICK + 0.5, CLICK + 0.65)));
    },
  };
}
