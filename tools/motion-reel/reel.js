"use strict";
(() => {
  // ───────────────────────────── constants ─────────────────────────────
  const W = 1920,
    H = 1080,
    BEAT = 60 / 128,
    BAR = BEAT * 4,
    E8 = BEAT / 2;
  const RED = "#fa5252",
    RED_L = "#ff8787",
    INK = "#0b0b0f",
    PAPER = "#f2f2f4",
    DIM = "#8d8d97";
  const IMP = BEAT * 2; // first impact (logo fill)
  const stage = document.getElementById("stage");
  const A = window.ASSETS;
  const INT = {};
  A.integrations.forEach((o) => (INT[o.kind] = o));
  const ICON = (k) => (k === "homarr" ? "assets/logo.svg" : "assets/" + INT[k].file);

  // ───────────────────────────── math ─────────────────────────────
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    lin: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) =>
      x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x) => {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
    },
    outBack2: (x) => {
      const c = 2.6;
      return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
    },
    inBack: (x) => {
      const c = 1.9;
      return (c + 1) * x ** 3 - c * x * x;
    },
  };
  const spring = (x, z = 7, f = 2) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-z * x) * Math.cos(f * 2 * Math.PI * x));
  const tw = (t, a, b, v0, v1, e = E.outCubic) => lerp(v0, v1, e(seg(t, a, b)));
  const pulse = (t, t0, k) => (t < t0 ? 0 : Math.exp(-k * (t - t0)));
  function rng(s) {
    return () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x, sd = 0) => {
    const i = Math.floor(x),
      f = x - i,
      u = f * f * (3 - 2 * f);
    return lerp(hash(i + sd * 57.3), hash(i + 1 + sd * 57.3), u) * 2 - 1;
  };

  // ───────────────────────────── dom helpers ─────────────────────────────
  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || stage).appendChild(e);
    return e;
  }
  const div = (cls, parent, html) => el("div", cls, parent, html);
  const css = (e, o) => (Object.assign(e.style, o), e);
  function box(e, x, y, w, h) {
    const s = e.style;
    s.left = x + "px";
    s.top = y + "px";
    if (w != null) s.width = w + "px";
    if (h != null) s.height = h + "px";
    return e;
  }
  function frag(parent, html) {
    const t = document.createElement("div");
    t.innerHTML = html.trim();
    const e = t.firstElementChild;
    parent.appendChild(e);
    return e;
  }
  const q = (e, s) => e.querySelector(s);
  const qk = (e, k) => e.querySelector(`[data-k="${k}"]`);
  const tab = (n, size, color = "currentColor", sw = 2) =>
    A.tabler[n]
      .replace('width="24"', `width="${size}"`)
      .replace('height="24"', `height="${size}"`)
      .replace('stroke="currentColor"', `stroke="${color}"`)
      .replace('stroke-width="2"', `stroke-width="${sw}"`);
  const iconImg = (k, size, extra = "") =>
    `<img src="${ICON(k)}" style="width:${size}px;height:${size}px;object-fit:contain;${extra}">`;
  const show = (e, on) => {
    const v = on ? "" : "none";
    if (e.style.display !== v) e.style.display = v;
  };
  const LOGO_W = 483.71,
    LOGO_H = 327.04;
  const logoSVG = (w, fill = RED) =>
    `<svg viewBox="0 0 ${LOGO_W} ${LOGO_H}" width="${w}" height="${(w * LOGO_H) / LOGO_W}" style="display:block;overflow:visible">${A.logoPaths.map((d) => `<path d="${d}" fill="${fill}"/>`).join("")}</svg>`;

  // single masked line that rises into view
  function riseLine(parent, text, o) {
    const wrap = div("abs mask", parent);
    css(wrap, {
      left: o.x + "px",
      top: o.y + "px",
      width: (o.w || W) + "px",
      textAlign: o.align || "left",
      fontSize: o.size + "px",
      fontWeight: o.weight || 800,
      letterSpacing: o.ls || "-0.035em",
      lineHeight: o.lh || 1.14,
      color: o.color || "#fff",
      paddingBottom: "0.04em",
    });
    if (o.font) wrap.style.fontFamily = o.font;
    const inner = div("", wrap);
    inner.textContent = text;
    return {
      wrap,
      inner,
      set(p, extra = "") {
        inner.style.transform = `translateY(${(1 - p) * 118}%) ${extra}`;
      },
    };
  }
  // centered row of individually masked letters
  function letters(parent, text, o) {
    const wrap = div("abs", parent);
    css(wrap, {
      left: "0px",
      top: o.y + "px",
      width: W + "px",
      display: "flex",
      justifyContent: "center",
      fontSize: o.size + "px",
      fontWeight: o.weight || 800,
      lineHeight: 1.12,
      color: o.color || "#fff",
      letterSpacing: o.ls || "0",
    });
    const spans = [...text].map((ch) => {
      const m = div("mask", wrap);
      css(m, { display: "inline-block", paddingBottom: "0.04em" });
      const s = div("", m);
      s.textContent = ch;
      css(s, { display: "inline-block" });
      return { m, s };
    });
    return { wrap, spans };
  }
  // centered sentence of masked words
  function words(parent, text, o) {
    const wrap = div("abs", parent);
    css(wrap, {
      left: "0px",
      top: o.y + "px",
      width: W + "px",
      textAlign: "center",
      fontSize: o.size + "px",
      fontWeight: o.weight || 600,
      letterSpacing: o.ls || "-0.01em",
      color: o.color || "#fff",
      lineHeight: 1.2,
    });
    const ws = text.split(" ").map((w) => {
      const m = el("span", "mask", wrap);
      css(m, { display: "inline-block", margin: "0 .13em", verticalAlign: "top", paddingBottom: ".08em" });
      const s = el("span", "", m);
      s.textContent = w;
      css(s, { display: "inline-block" });
      return s;
    });
    return { wrap, ws };
  }
  function chartPath(w, h, n, t, seed, amp = 0.3, base = 0.5, speed = 2) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i * 0.22 + t * speed;
      const v = base + amp * (0.62 * noise(u, seed) + 0.38 * noise(u * 2.7, seed + 5));
      pts.push([(i / n) * w, h - clamp(v, 0.04, 0.96) * h]);
    }
    const line = "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
    return { line, area: line + `L${w},${h}L0,${h}Z` };
  }
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  // ════════════════════════════ SCENE 1 — IGNITION (0 → 1.875) ════════════════════════════
  const S1 = (() => {
    const root = div("scene", stage);
    css(root, { background: "#060607" });
    const glow = div("full", root);
    css(glow, {
      background: "radial-gradient(ellipse 50% 42% at 50% 45%, rgba(250,82,82,.34), rgba(250,82,82,0) 72%)",
    });
    const cam = div("full", root);
    const LW = 560,
      LH = (LW * LOGO_H) / LOGO_W,
      SC = LW / LOGO_W;
    const logo = div("abs", cam);
    box(logo, 960 - LW / 2, 540 - LH / 2, LW, LH);
    const P = A.logoPaths;
    logo.innerHTML = `<svg viewBox="0 0 ${LOGO_W} ${LOGO_H}" width="${LW}" height="${LH}" style="display:block;overflow:visible">
      <g class="f">${P.map((d) => `<path d="${d}" fill="${RED}" style="transform-box:fill-box;transform-origin:50% 50%"/>`).join("")}</g>
      <g class="w">${P.map((d) => `<path d="${d}" fill="#fff"/>`).join("")}</g>
      <g class="s" fill="none" stroke="#ffb3b3" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${P.map((d) => `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`).join("")}</g></svg>`;
    const fillG = q(logo, ".f"),
      fills = [...fillG.children],
      white = q(logo, ".w"),
      strokeG = q(logo, ".s"),
      strokes = [...strokeG.children];
    const line = div("abs", root);
    css(line, {
      top: "538px",
      height: "4px",
      borderRadius: "2px",
      background: "linear-gradient(90deg,rgba(255,135,135,0),#ff8787 18%,#fff 50%,#ff8787 82%,rgba(255,135,135,0))",
      boxShadow: "0 0 16px 3px rgba(250,82,82,.95),0 0 80px 16px rgba(250,82,82,.45)",
    });
    const flare = div("abs", root);
    box(flare, 0, 380, W, 320);
    css(flare, {
      background: "radial-gradient(ellipse 50% 20% at 50% 50%, rgba(255,130,130,.75), rgba(255,80,80,0) 70%)",
      mixBlendMode: "screen",
    });
    const rings = [0, 1, 2].map((i) =>
      css(div("abs", root), {
        borderRadius: "50%",
        boxSizing: "border-box",
        border: `${[5, 2, 1.5][i]}px solid ${["#ff8787", "#ffffff", "#fa5252"][i]}`,
      }),
    );
    const flash = div("full", root);
    css(flash, {
      background: "radial-gradient(circle at 50% 50%, #fff 0%, rgba(255,170,170,.7) 35%, rgba(250,82,82,0) 75%)",
      mixBlendMode: "screen",
    });
    const wm = letters(cam, "HOMARR", { y: 616, size: 132, weight: 820 });
    const sub = div("abs mono", cam);
    box(sub, 0, 792, W);
    css(sub, { textAlign: "center", fontSize: "22px", color: RED_L, fontWeight: 500, whiteSpace: "nowrap" });
    sub.textContent = "THE DASHBOARD FOR YOUR SERVER";
    const LIFT = -135;
    const EYE = { x: 960 - LW / 2 + 214.56 * SC, y: 540 - LH / 2 + LIFT + 187.39 * SC };
    const ZS = 1.52,
      ZE = BAR;
    strokes[3].style.display = strokes[4].style.display = "none";
    const draw = [
      [2, 0.18, 0.8],
      [5, 0.26, 0.86],
      [6, 0.26, 0.86],
      [0, 0.34, 0.92],
      [1, 0.34, 0.92],
      [3, 9, 9],
      [4, 9, 9],
    ];
    return {
      t0: 0,
      t1: BAR,
      root,
      update(t) {
        const lw = W * E.outExpo(seg(t, 0, 0.5));
        css(line, {
          left: 960 - lw / 2 + "px",
          width: lw + "px",
          opacity: 1 - seg(t, 0.3, 0.62),
          transform: `scaleY(${1 - 0.7 * seg(t, 0.28, 0.6)})`,
        });
        flare.style.opacity = clamp(seg(t, 0, 0.16) * (1 - seg(t, 0.35, 0.8)) + 1.3 * pulse(t, IMP, 5));
        glow.style.opacity = clamp(0.35 * seg(t, 0.1, 0.8) + (t > IMP ? 0.45 + 0.6 * pulse(t, IMP, 4) : 0));
        draw.forEach(([i, a, b]) => strokes[i].setAttribute("stroke-dashoffset", 1 - E.inOutCubic(seg(t, a, b))));
        strokeG.style.opacity = 1 - seg(t, IMP, IMP + 0.3);
        fillG.style.opacity = t >= IMP ? 1 : 0;
        white.style.opacity = t >= IMP ? Math.exp(-10 * (t - IMP)) : 0;
        [3, 4].forEach((i, k) => {
          fills[i].style.transform = `scale(${spring(seg(t, IMP + k * 0.05, IMP + k * 0.05 + 0.6))})`;
        });
        const dt = t - IMP;
        const punch = dt > 0 ? 0.075 * Math.exp(-8 * dt) * Math.cos(15 * dt) : 0;
        const ly = tw(t, 1.0, 1.48, 0, LIFT, E.outExpo);
        logo.style.transform = `translateY(${ly}px) scale(${tw(t, 0, IMP, 0.88, 1) + punch})`;
        const zp = seg(t, ZS, ZE);
        logo.style.filter =
          zp > 0
            ? "none"
            : t < IMP
              ? "drop-shadow(0 0 10px rgba(250,82,82,.9))"
              : `drop-shadow(0 0 ${lerp(44, 16, seg(t, IMP, IMP + 0.5))}px rgba(250,82,82,${lerp(0.95, 0.45, seg(t, IMP, IMP + 0.5))}))`;
        rings.forEach((r, i) => {
          const a = IMP + i * 0.05,
            p = seg(t, a, a + 0.85 + i * 0.15),
            d = lerp(90, 2300 + i * 350, E.outExpo(p));
          css(r, {
            left: 960 - d / 2 + "px",
            top: 540 - d / 2 + "px",
            width: d + "px",
            height: d + "px",
            opacity: t < a ? 0 : (1 - E.outQuad(p)) * [1, 0.85, 0.6][i],
          });
        });
        flash.style.opacity = t < IMP ? 0 : 0.9 * Math.exp(-9 * dt);
        wm.spans.forEach(({ m, s }, i) => {
          const a = 1.0 + i * 0.045,
            p = E.outExpo(seg(t, a, a + 0.55));
          s.style.transform = `translateY(${(1 - p) * 112}%)`;
          m.style.margin = `0 ${lerp(40, 7, E.outExpo(seg(t, 1.0, 1.75)))}px`;
        });
        const fadeZ = 1 - seg(t, ZS, ZS + 0.12);
        wm.wrap.style.opacity = fadeZ;
        sub.style.opacity = seg(t, 1.22, 1.42) * fadeZ;
        sub.style.letterSpacing = lerp(0.95, 0.5, E.outExpo(seg(t, 1.18, 1.75))) + "em";
        const sh = t > IMP ? 18 * Math.exp(-7 * dt) : 0;
        const zs = Math.exp(Math.log(150) * E.inCubic(zp)),
          zc = E.inOutCubic(zp);
        cam.style.transformOrigin = `${EYE.x}px ${EYE.y}px`;
        cam.style.transform = `translate(${(960 - EYE.x) * zc + noise(t * 32, 1) * sh}px, ${(540 - EYE.y) * zc + noise(t * 32, 2) * sh}px) scale(${zs})`;
        root.style.background = zp > 0.985 ? RED : "#060607";
      },
    };
  })();

  // ════════════════════════════ SCENE 2 — SERVICES STROBE (1.875 → 3.75) ════════════════════════════
  const S2 = (() => {
    const T0 = BAR;
    const root = div("scene", stage);
    const svc = [
      ["sonarr", "SERIES"],
      ["radarr", "MOVIES"],
      ["plex", "MEDIA SERVER"],
      ["jellyfin", "STREAMING"],
      ["piHole", "DNS & AD-BLOCKING"],
      ["homeAssistant", "SMART HOME"],
      ["proxmox", "VIRTUALIZATION"],
      ["qBittorrent", "DOWNLOADS"],
    ];
    const cards = [];
    const mk = (bg, fg) => {
      const c = div("scene", root);
      c.style.background = bg;
      const o = { c, fg };
      cards.push(o);
      return o;
    };
    const big = (parent, text, o) => {
      const e = div("abs nowrap", parent);
      css(e, {
        fontSize: o.size + "px",
        fontWeight: 900,
        letterSpacing: o.ls || "-0.045em",
        lineHeight: 1,
        color: o.color || "#fff",
      });
      e.textContent = text;
      return box(e, o.x, o.y);
    };
    const tileBox = (parent, x, y, s, bg, k, is, extra = {}) => {
      const e = div("abs center", parent);
      box(e, x, y, s, s);
      css(e, { background: bg, borderRadius: s * 0.26 + "px", ...extra });
      e.innerHTML = iconImg(k, is);
      return e;
    };
    {
      // 1 Sonarr
      const o = mk(RED, "#fff");
      const tile = tileBox(o.c, 180, 390, 300, "#fff", "sonarr", 200, { boxShadow: "0 40px 80px rgba(110,0,0,.35)" });
      const tx = big(o.c, "Sonarr", { size: 290, x: 560, y: 540 - 145 });
      o.u = (lt) => {
        const p = seg(lt, 0, 0.2),
          e = E.outExpo(p);
        tile.style.transform = `scale(${lerp(0.4, 1, E.outBack2(p))}) rotate(${(1 - e) * -25}deg)`;
        tx.style.transform = `translateX(${(1 - e) * 260 - lt * 90}px) skewX(${(1 - e) * -18}deg)`;
      };
    }
    {
      // 2 Radarr
      const o = mk(INK, "#fff");
      const tx = div("full center nowrap", o.c);
      css(tx, {
        fontSize: "370px",
        fontWeight: 900,
        color: "transparent",
        WebkitTextStroke: "3px " + RED,
        lineHeight: 1,
      });
      tx.textContent = "RADARR";
      const ic = div("full center", o.c);
      ic.innerHTML = iconImg("radarr", 300, "filter:drop-shadow(0 20px 70px rgba(250,82,82,.6))");
      o.u = (lt) => {
        const e = E.outExpo(seg(lt, 0, 0.22));
        tx.style.transform = `scale(${lerp(1.55, 1, e) - lt * 0.18})`;
        tx.style.letterSpacing = lerp(0.14, -0.035, e) + "em";
        ic.style.transform = `scale(${spring(seg(lt, 0, 0.5))}) rotate(${(1 - e) * -40}deg)`;
      };
    }
    {
      // 3 Plex
      const o = mk(PAPER, INK);
      const tx = div("full center nowrap", o.c);
      css(tx, { fontSize: "520px", fontWeight: 900, letterSpacing: "-0.06em", color: INK, lineHeight: 1 });
      tx.textContent = "Plex";
      const tile = tileBox(o.c, 250, 130, 260, INK, "plex", 170, { boxShadow: "0 30px 60px rgba(0,0,0,.25)" });
      o.u = (lt) => {
        const e = E.outExpo(seg(lt, 0, 0.2));
        tx.style.transform = `translate(90px, ${(1 - e) * 320 + 30}px) rotate(-6deg) scale(${1 + lt * 0.14})`;
        tile.style.transform = `scale(${spring(seg(lt, 0.02, 0.5))}) rotate(${8 + (1 - e) * 30}deg)`;
      };
    }
    {
      // 4 Jellyfin
      const o = mk("#12070b", "#fff");
      const rows = [];
      for (let k = -2; k <= 2; k++) {
        const r = div("abs nowrap", o.c);
        css(r, {
          top: 540 - 105 + k * 205 + "px",
          fontSize: "210px",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        });
        if (k === 0) {
          r.innerHTML = `<span style="display:inline-flex;align-items:center;gap:44px">${iconImg("jellyfin", 190)}Jellyfin</span>`;
          css(r, { color: "#fff", left: "380px" });
        } else {
          r.textContent = "JELLYFIN JELLYFIN JELLYFIN";
          css(r, { color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,.2)", left: "-500px" });
        }
        rows.push([r, k]);
      }
      o.u = (lt) => {
        const e = E.outExpo(seg(lt, 0, 0.22));
        rows.forEach(([r, k]) => {
          const dir = Math.abs(k) % 2 === 0 ? 1 : -1;
          r.style.transform =
            k === 0
              ? `translateX(${(1 - e) * -320 + lt * 120}px)`
              : `translateX(${dir * (lt * 900 + (1 - e) * 420)}px)`;
        });
      };
    }
    {
      // 5 Pi-hole
      const o = mk(RED, INK);
      const tx = big(o.c, "Pi-hole", { size: 262, x: 130, y: 540 - 131, color: INK });
      const disc = div("abs center", o.c);
      box(disc, 1270, 310, 460, 460);
      css(disc, { background: "#fff", borderRadius: "50%", boxShadow: "0 40px 90px rgba(110,0,0,.35)" });
      disc.innerHTML = iconImg("piHole", 290);
      o.u = (lt) => {
        const e = E.outExpo(seg(lt, 0, 0.2));
        tx.style.transform = `translate(${-lt * 70}px, ${(1 - e) * -240}px)`;
        disc.style.transform = `scale(${lerp(0.3, 1, spring(seg(lt, 0, 0.45)))}) rotate(${(1 - E.outExpo(seg(lt, 0, 0.3))) * 140}deg)`;
      };
    }
    {
      // 6 Home Assistant
      const o = mk(INK, "#fff");
      const l1 = big(o.c, "Home", { size: 226, x: 130, y: 300 });
      const l2 = big(o.c, "Assistant", { size: 226, x: 130, y: 530, color: RED });
      const disc = div("abs center", o.c);
      box(disc, 1340, 320, 440, 440);
      css(disc, {
        background: "#18181d",
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.08)",
        boxSizing: "border-box",
      });
      disc.innerHTML = iconImg("homeAssistant", 290);
      o.u = (lt) => {
        l1.style.transform = `translateX(${(1 - E.outExpo(seg(lt, 0, 0.2))) * -520}px)`;
        l2.style.transform = `translateX(${(1 - E.outExpo(seg(lt, 0.03, 0.23))) * 620}px)`;
        disc.style.clipPath = `circle(${E.outExpo(seg(lt, 0, 0.24)) * 72}% at 50% 50%)`;
        disc.style.transform = `scale(${1.18 - lt * 0.6})`;
      };
    }
    {
      // 7 Proxmox
      const o = mk(PAPER, INK);
      const half = (clip) => {
        const e = div("full center nowrap", o.c);
        css(e, {
          fontSize: "350px",
          fontWeight: 900,
          letterSpacing: "-0.05em",
          color: INK,
          lineHeight: 1,
          clipPath: clip,
        });
        e.textContent = "Proxmox";
        return e;
      };
      const top = half("inset(0 0 50% 0)"),
        bot = half("inset(50% 0 0 0)");
      const tile = tileBox(o.c, 860, 96, 200, INK, "proxmox", 130);
      o.u = (lt) => {
        const e = E.outExpo(seg(lt, 0, 0.22));
        top.style.transform = `translate(${(1 - e) * -760}px, 80px)`;
        bot.style.transform = `translate(${(1 - e) * 760}px, 80px)`;
        tile.style.transform = `translateY(${(1 - e) * -280}px) scale(${lerp(0.7, 1, e)})`;
      };
    }
    {
      // 8 qBittorrent
      const o = mk(INK, "#fff");
      const layers = ["#ff3b3b", "#27e0ff", "#ffffff"].map((col, i) => {
        const e = div("full center nowrap", o.c);
        css(e, {
          fontSize: "232px",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: col,
          lineHeight: 1,
          paddingLeft: "330px",
          boxSizing: "border-box",
          mixBlendMode: i < 2 ? "screen" : "normal",
        });
        e.textContent = "qBittorrent";
        return e;
      });
      const tile = tileBox(o.c, 130, 400, 280, "#1a1a20", "qBittorrent", 190, {
        border: "2px solid rgba(255,255,255,.1)",
        boxSizing: "border-box",
      });
      o.u = (lt) => {
        const p = seg(lt, 0, 0.25);
        const g = (1 - E.outCubic(p)) * 42 + (Math.floor(lt * 60) % 3 === 0 ? 7 : 0);
        layers[0].style.transform = `translate(${-g}px, ${g * 0.25}px)`;
        layers[1].style.transform = `translate(${g}px, ${-g * 0.25}px)`;
        layers[2].style.transform = `scale(${lerp(1.08, 1, E.outExpo(p))})`;
        tile.style.transform = `scale(${spring(seg(lt, 0, 0.45))})`;
      };
    }
    const cap = words(root, "Your server runs a lot of apps.", { y: 930, size: 42, weight: 650 });
    const cat = div("abs chip", root);
    css(cat, { left: "96px", top: "108px", fontSize: "20px", padding: "8px 18px" });
    return {
      t0: T0,
      t1: 2 * BAR,
      root,
      update(t) {
        const i = clamp(Math.floor((t - T0) / E8), 0, 7),
          lt = t - T0 - i * E8;
        cards.forEach((c, k) => show(c.c, k === i));
        cards[i].u(lt);
        const fg = cards[i].fg;
        cap.wrap.style.color = fg;
        cat.style.color = fg;
        cap.ws.forEach(
          (s, k) =>
            (s.style.transform = `translateY(${(1 - E.outExpo(seg(t, T0 + 0.04 + k * 0.04, T0 + 0.5 + k * 0.04))) * 115}%)`),
        );
        cat.textContent = svc[i][1];
        const cp = E.outExpo(seg(lt, 0, 0.14));
        cat.style.transform = `translateY(${(1 - cp) * -18}px)`;
        cat.style.opacity = cp;
      },
    };
  })();

  // ════════════════════════════ SCENE 3+4 — ONE PLACE → BOARD (3.75 → 7.5) ════════════════════════════
  const S34 = (() => {
    const T0 = 2 * BAR,
      T1 = 4 * BAR;
    const root = div("scene", stage);
    css(root, { background: "radial-gradient(ellipse 70% 60% at 50% 45%, #17171d 0%, #0b0b0f 70%)" });
    const dots = div("full", root);
    css(dots, {
      backgroundImage: "radial-gradient(rgba(255,255,255,.08) 1.2px, transparent 1.4px)",
      backgroundSize: "36px 36px",
    });
    const persp = div("full", root);
    css(persp, { perspective: "2300px", perspectiveOrigin: "50% 45%" });
    const BX = 160,
      BY = 96,
      BW = 1600,
      BH = 888,
      HDR = 72,
      PAD = 24,
      GAP = 16,
      CW = 180,
      RH = 180;
    const cell = (c, r, w = 1, h = 1) => ({
      x: PAD + c * (CW + GAP),
      y: HDR + PAD + r * (RH + GAP),
      w: w * CW + (w - 1) * GAP,
      h: h * RH + (h - 1) * GAP,
    });
    const cam = div("abs", persp);
    box(cam, BX, BY, BW, BH);
    css(cam, { transformOrigin: "50% 50%" });
    const frame = div("abs", cam);
    box(frame, 0, 0, BW, BH);
    css(frame, {
      background: "linear-gradient(180deg,#131317,#0f0f12)",
      border: "1px solid rgba(255,255,255,.09)",
      borderRadius: "24px",
      boxShadow: "0 90px 160px rgba(0,0,0,.7)",
      boxSizing: "border-box",
    });
    const header = frag(
      cam,
      `<div class="abs" style="left:0;top:0;width:${BW}px;height:${HDR}px;border-bottom:1px solid rgba(255,255,255,.07);box-sizing:border-box">
      <div class="abs" style="left:26px;top:19px">${logoSVG(50)}</div>
      <div class="abs" style="left:90px;top:20px;font-size:26px;font-weight:750;letter-spacing:-.02em">Homarr</div>
      <div class="abs" style="left:560px;top:15px;width:480px;height:42px;border-radius:10px;background:#1b1b20;border:1px solid rgba(255,255,255,.08);box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:0 14px;color:#7c7c86;font-size:17px">${tab("search", 19, "#7c7c86")}<span style="flex:1">Search</span><span class="mono" style="font-size:13px;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:2px 7px">Ctrl K</span></div>
      <div class="abs" style="left:${BW - 176}px;top:23px;display:flex;gap:20px;color:#a0a0aa">${tab("bell", 26)}${tab("settings", 26)}</div>
      <div class="abs center" style="left:${BW - 66}px;top:16px;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#ff8787,#c92a2a);font-weight:700;font-size:17px">A</div></div>`,
    );

    // ── widgets
    const Wd = {};
    const widget = (name, g, inner) => {
      const e = frag(
        cam,
        `<div class="wcard" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px">${inner}</div>`,
      );
      Wd[name] = { e, g };
      return e;
    };
    widget(
      "clock",
      cell(0, 0, 2, 1),
      `<div class="abs tnum" style="left:22px;top:30px;font-size:84px;font-weight:720;letter-spacing:-.045em;line-height:1">14:32</div>
      <div class="abs" style="left:24px;top:126px;font-size:19px;color:${DIM};font-weight:500">Saturday, September 26</div>`,
    );
    widget(
      "weather",
      cell(2, 0, 2, 1),
      `<div class="abs" style="left:22px;top:30px;font-size:84px;font-weight:720;letter-spacing:-.045em;line-height:1">21°</div>
      <div class="abs" style="left:24px;top:126px;font-size:19px;color:${DIM};font-weight:500">Paris · Sunny</div>
      <div class="abs" data-k="sun" style="left:228px;top:32px;width:116px;height:116px">${tab("sun", 116, "#fcc419", 1.5)}</div>`,
    );
    const sysE = widget(
      "system",
      cell(4, 0, 4, 2),
      `<div class="wtitle">${iconImg("proxmox", 22)} pve-01 <span style="color:#6f6f79;font-weight:500">· Proxmox</span></div>
      <div class="abs" style="left:20px;top:56px;right:20px;display:flex;flex-wrap:wrap;gap:6px 40px">
        ${[
          ["CPU", "23%", "cpu"],
          ["RAM", "12.4 GB", ""],
          ["NET", "84 MB/s", "net"],
        ]
          .map(
            ([l, v, k]) =>
              `<div><div class="mono" style="font-size:13px;letter-spacing:.18em;color:${DIM}">${l}</div><div class="tnum" data-k="${k}" style="font-size:36px;font-weight:720;letter-spacing:-.02em">${v}</div></div>`,
          )
          .join("")}
      </div>
      <svg class="abs" style="left:0;top:auto;bottom:0" width="100%" height="190" viewBox="0 0 1000 190" preserveAspectRatio="none">
        <defs><linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fa5252" stop-opacity=".5"/><stop offset="1" stop-color="#fa5252" stop-opacity="0"/></linearGradient></defs>
        <path data-k="area" fill="url(#cg1)"/><path data-k="line" fill="none" stroke="#ff6b6b" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>
      <div class="abs" data-k="handle" style="right:8px;bottom:8px;left:auto;top:auto;width:22px;height:22px;border-right:4px solid ${RED};border-bottom:4px solid ${RED};border-radius:0 0 8px 0;box-sizing:border-box"></div>`,
    );
    const dlE = widget(
      "downloads",
      cell(0, 3, 4, 1),
      `<div class="wtitle">${iconImg("qBittorrent", 22)} Downloads <span class="mono tnum" data-k="spd" style="color:${RED_L};font-size:15px;margin-left:8px">↓ 84.2 MB/s</span></div>
      ${[
        ["ubuntu-24.04.3-desktop-amd64.iso", 0],
        ["debian-13.1.0-amd64-DVD-1.iso", 1],
      ]
        .map(
          ([n, i]) => `
        <div class="abs mono" style="left:20px;top:${60 + i * 56}px;font-size:15px;color:#d5d5dc">${n}</div>
        <div class="abs mono tnum" data-k="p${i}" style="right:20px;left:auto;top:${60 + i * 56}px;font-size:15px;color:${DIM}">0%</div>
        <div class="bar" style="left:20px;right:20px;top:${86 + i * 56}px"><i data-k="b${i}"></i></div>`,
        )
        .join("")}`,
    );
    const calDays = (() => {
      let h = ["M", "T", "W", "T", "F", "S", "S"]
        .map(
          (d, i) =>
            `<div class="abs mono" style="left:${20 + i * 48.6}px;top:58px;width:48px;text-align:center;font-size:13px;color:#6f6f79">${d}</div>`,
        )
        .join("");
      const dotsOn = { 3: "#4dabf7", 8: RED, 12: "#63e6be", 17: RED, 22: "#4dabf7", 26: "#fff", 29: "#63e6be" };
      for (let d = 1; d <= 30; d++) {
        const idx = d; // Sept 1 2026 is a Tuesday → column 1
        const col = idx % 7,
          row = Math.floor(idx / 7);
        const today = d === 26;
        h += `<div class="abs center tnum" style="left:${20 + col * 48.6 + 5}px;top:${86 + row * 52}px;width:38px;height:38px;border-radius:50%;font-size:16px;font-weight:${today ? 750 : 500};${today ? `background:${RED};color:#fff;` : "color:#cfcfd6;"}">${d}</div>`;
        if (dotsOn[d] && !today)
          h += `<div class="abs" style="left:${20 + col * 48.6 + 21}px;top:${86 + row * 52 + 36}px;width:6px;height:6px;border-radius:50%;background:${dotsOn[d]}"></div>`;
      }
      return h;
    })();
    widget(
      "calendar",
      cell(4, 2, 2, 2),
      `<div class="wtitle">${tab("calendar", 20, "#cfcfd6")} September 2026</div>${calDays}`,
    );
    const dnsBars = Array.from(
      { length: 12 },
      (_, i) =>
        `<div class="abs" data-k="db${i}" style="left:${208 + i * 13.5}px;top:auto;bottom:24px;width:9px;border-radius:3px;background:${i % 3 === 1 ? RED : "#3a3a43"}"></div>`,
    ).join("");
    widget(
      "dns",
      cell(6, 2, 2, 1),
      `<div class="wtitle">${iconImg("piHole", 22)} Pi-hole</div>
      <div class="abs tnum" data-k="blk" style="left:18px;top:52px;font-size:58px;font-weight:780;letter-spacing:-.04em;color:#ff6b6b">27.4%</div>
      <div class="abs" style="left:20px;top:124px;font-size:16px;color:${DIM}">blocked today</div>${dnsBars}`,
    );
    widget(
      "media",
      cell(6, 3, 2, 1),
      `<div class="wtitle">${iconImg("jellyfin", 22)} Jellyfin</div>
      <div class="abs" style="left:18px;top:48px;font-size:44px;font-weight:780">3</div><div class="abs" style="left:50px;top:66px;font-size:16px;color:${DIM}">active streams</div>
      ${["alex", "sam", "kim"].map((n, i) => `<div class="abs mono" style="left:20px;top:${108 + i * 22}px;font-size:13px;color:#b5b5bd">${n}</div><div class="bar" style="left:70px;right:20px;top:${113 + i * 22}px;height:6px"><i data-k="m${i}" style="width:${[34, 71, 18][i]}%"></i></div>`).join("")}`,
    );
    const spE = widget(
      "speed",
      cell(6, 0, 2, 2),
      `<div class="wtitle">${iconImg("speedtestTracker", 22)} Speedtest</div>
      <svg class="abs" style="left:38px;top:62px" width="300" height="200" viewBox="0 0 300 200">
        <path d="M 30 170 A 120 120 0 1 1 270 170" fill="none" stroke="#2a2a31" stroke-width="18" stroke-linecap="round" pathLength="1"/>
        <path data-k="arc" d="M 30 170 A 120 120 0 1 1 270 170" fill="none" stroke="${RED}" stroke-width="18" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>
      <div class="abs tnum" data-k="mbps" style="left:0;top:150px;width:376px;text-align:center;font-size:64px;font-weight:780;letter-spacing:-.04em">0</div>
      <div class="abs" style="left:0;top:224px;width:376px;text-align:center;font-size:17px;color:${DIM}">Mbps download</div>
      <div class="abs mono" style="left:0;top:300px;width:376px;text-align:center;font-size:15px;color:#b5b5bd">↑ 118 Mbps · 8 ms</div>`,
    );
    const toast = frag(
      cam,
      `<div class="abs" style="left:${BW - 300}px;top:${BH - 76}px;width:270px;height:50px;border-radius:12px;background:#1f2a22;border:1px solid rgba(105,219,124,.35);display:flex;align-items:center;gap:12px;padding:0 16px;box-sizing:border-box;font-size:18px;font-weight:600;color:#b2f2bb">${tab("check", 22, "#69db7c", 2.5)} Board saved</div>`,
    );
    const placeholder = div("abs", cam);
    box(placeholder, cell(6, 2).x, cell(6, 2).y, cell(6, 2, 2, 1).w, 180);
    css(placeholder, {
      border: "2px dashed rgba(250,82,82,.75)",
      background: "rgba(250,82,82,.08)",
      borderRadius: "16px",
      boxSizing: "border-box",
    });

    // ── the 87 integration tiles (8 of them become the board's app tiles)
    const R = rng(42);
    const featured = ["sonarr", "radarr", "jellyfin", "plex", "piHole", "homeAssistant", "proxmox", "qBittorrent"];
    const order = A.integrations.map((o) => o.kind);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const TS = 68,
      TP = 86,
      COLS = 15;
    const gx0 = 324 - BX,
      gy0 = 396 - BY;
    const tiles = order.map((k, i) => {
      const row = Math.floor(i / COLS),
        col = i % COLS,
        inRow = row < 5 ? COLS : order.length - 5 * COLS;
      const e = frag(
        cam,
        `<div class="abs" style="width:${TS}px;height:${TS}px;border-radius:16px;background:linear-gradient(180deg,#1f1f25,#18181c);border:1px solid rgba(255,255,255,.09);box-sizing:border-box;box-shadow:0 10px 26px rgba(0,0,0,.35)">
        <img class="abs" src="${ICON(k)}" style="object-fit:contain">
        <div class="abs nm" style="left:0;width:100%;text-align:center;font-size:19px;font-weight:650;opacity:0">${INT[k].name}</div>
        <div class="abs dt" style="width:10px;height:10px;border-radius:50%;background:#40c057;box-shadow:0 0 0 4px rgba(64,192,87,.18);opacity:0"></div></div>`,
      );
      const a = R() * Math.PI * 2,
        d = 380 + R() * 640;
      return {
        k,
        e,
        img: q(e, "img"),
        nm: q(e, ".nm"),
        dt: q(e, ".dt"),
        f: featured.indexOf(k),
        gx: gx0 + col * TP + ((COLS - inRow) * TP) / 2,
        gy: gy0 + row * TP,
        bx: 800 + Math.cos(a) * d * 1.45 - TS / 2,
        by: 444 + Math.sin(a) * d * 0.95 - TS / 2,
        rot: (R() - 0.5) * 620,
        ex: R(),
        st: 0,
      };
    });
    const gcx = gx0 + (COLS * TP) / 2,
      gcy = gy0 + (6 * TP) / 2;
    tiles.forEach((o) => (o.st = (Math.hypot(o.gx - gcx, o.gy - gcy) / 700) * 0.24));

    // cursor + click ripple
    const ripple = div("abs", cam);
    css(ripple, { borderRadius: "50%", border: "3px solid rgba(255,255,255,.9)", boxSizing: "border-box" });
    const cursor = frag(
      cam,
      `<div class="abs" style="width:44px;height:44px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))"><svg width="44" height="44" viewBox="0 0 32 32"><path d="M6 3 L6 26 L11.5 20.8 L15.4 29.2 L19.2 27.5 L15.4 19.3 L23 19.3 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`,
    );

    // headline + side list
    const h1 = riseLine(root, "All your services.", { x: 0, y: 136, w: W, align: "center", size: 96, weight: 820 });
    const h2 = riseLine(root, "One dashboard.", {
      x: 0,
      y: 248,
      w: W,
      align: "center",
      size: 96,
      weight: 820,
      color: RED,
    });
    const listT = [5.625, 6.094, 6.563, 7.031];
    const list = ["Drag.", "Drop.", "Resize.", "No YAML."].map((w, i) =>
      riseLine(root, w, { x: 104, y: 250 + i * 122, w: 760, size: 112, weight: 830 }),
    );
    const listSub = riseLine(root, "Everything is configured in the UI.", {
      x: 110,
      y: 758,
      w: 760,
      size: 30,
      weight: 500,
      ls: "-0.01em",
      color: "#a5a5b0",
    });

    const cur = (t, sysW) => {
      if (t < 5.64) {
        const p = E.outCubic(seg(t, 5.38, 5.64));
        return [lerp(1320, 606, p), lerp(780, 190, p)];
      }
      if (t < 6.12) {
        const p = E.inOutCubic(seg(t, 5.7, 6.06));
        return [lerp(416, 1200, p) + 190, lerp(96, 488, p) - Math.sin(Math.PI * p) * 70 + 94];
      }
      if (t < 6.5) {
        const p = E.inOutCubic(seg(t, 6.12, 6.48));
        return [lerp(1390, 1566, p), lerp(582, 462, p)];
      }
      if (t < 6.97) return [808 + sysW - 10, 462];
      const p = E.inOutCubic(seg(t, 6.99, 7.42));
      return [lerp(808 + 376 - 10, 1010, p), lerp(462, 800, p)];
    };
    const sysWAt = (t) => lerp(768, 376, E.inOutCubic(seg(t, 6.563, 6.95)));
    const clicks = [5.64, 6.094, 6.5, 6.95];
    const wOrder = ["clock", "weather", "system", "calendar", "dns", "downloads", "media"];

    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        // headline
        const hOut = E.inCubic(seg(t, 4.84, 5.06));
        h1.set(E.outExpo(seg(t, 4.06, 4.6)));
        h2.set(E.outExpo(seg(t, 4.22, 4.76)));
        [h1, h2].forEach((h) =>
          css(h.wrap, { opacity: 1 - hOut, transform: `translateY(${-hOut * 50}px)`, filter: `blur(${hOut * 10}px)` }),
        );
        // tiles
        const pa = E.outExpo(seg(t, T0, T0 + 0.45));
        for (const o of tiles) {
          const b0 = T0 + 0.3 + o.st,
            pb = seg(t, b0, b0 + 0.55),
            eb = E.outBack(pb),
            ec = E.outCubic(pb);
          const cx = 800 - TS / 2,
            cy = 444 - TS / 2;
          let x = lerp(lerp(cx, o.bx, pa), o.gx, eb),
            y = lerp(lerp(cy, o.by, pa), o.gy, eb);
          const rot = o.rot * pa * (1 - ec);
          let sc = lerp(lerp(0.15, 1.25, pa), 1, ec),
            op = 1,
            w = TS,
            h = TS,
            isz = 42,
            iy = (TS - 42) / 2,
            nameO = 0;
          if (o.f >= 0) {
            const a = 4.84 + o.f * 0.028,
              m = E.inOutCubic(seg(t, a, a + 0.55)),
              g = cell(o.f % 4, 1 + (o.f >> 2));
            x = lerp(x, g.x, m);
            y = lerp(y, g.y, m);
            w = lerp(TS, g.w, m);
            h = lerp(TS, g.h, m);
            isz = lerp(42, 86, m);
            iy = lerp((TS - 42) / 2, 30, m);
            nameO = seg(m, 0.55, 1);
          } else {
            const a = 4.78 + o.ex * 0.22,
              e = seg(t, a, a + 0.3);
            if (e >= 1) {
              show(o.e, false);
              continue;
            }
            sc *= Math.max(0, 1 - E.inBack(e));
            op = 1 - e * e;
          }
          show(o.e, true);
          const s = o.e.style;
          s.left = x + "px";
          s.top = y + "px";
          s.width = w + "px";
          s.height = h + "px";
          s.opacity = op;
          s.transform = `rotate(${rot}deg) scale(${sc})`;
          const is = o.img.style;
          is.width = is.height = isz + "px";
          is.left = (w - isz) / 2 + "px";
          is.top = iy + "px";
          o.nm.style.opacity = nameO;
          o.nm.style.top = h - 52 + "px";
          o.dt.style.opacity = nameO;
          o.dt.style.left = w - 24 + "px";
          o.dt.style.top = "14px";
        }
        // board chrome + widgets
        const fr = seg(t, 4.86, 5.2);
        frame.style.opacity = fr;
        frame.style.transform = `scale(${lerp(0.95, 1, E.outExpo(fr))})`;
        const hp = E.outExpo(seg(t, 4.98, 5.45));
        header.style.opacity = hp;
        header.style.transform = `translateY(${(1 - hp) * -30}px)`;
        const base = {};
        wOrder.forEach((n, k) => {
          const a = 5.0 + k * 0.045;
          base[n] = lerp(0.78, 1, spring(seg(t, a, a + 0.6)));
          Wd[n].e.style.opacity = seg(t, a, a + 0.12);
        });
        // widget live content
        q(Wd.weather.e, '[data-k="sun"]').style.transform = `rotate(${t * 40}deg)`;
        const sysW = sysWAt(t);
        sysE.style.width = sysW + "px";
        const cp = chartPath(1000, 190, 44, t, 3, 0.3, 0.5, 2.2);
        qk(sysE, "line").setAttribute("d", cp.line);
        qk(sysE, "area").setAttribute("d", cp.area);
        qk(sysE, "cpu").textContent = Math.round(23 + 9 * noise(t * 3, 2)) + "%";
        qk(sysE, "net").textContent = Math.round(84 + 20 * noise(t * 2.5, 4)) + " MB/s";
        qk(sysE, "handle").style.opacity = seg(t, 6.15, 6.3) * (1 - seg(t, 7.0, 7.2));
        [0.42, 0.13].forEach((p0, i) => {
          const p = lerp(p0, p0 + 0.35, seg(t, 4.9, T1));
          qk(dlE, "b" + i).style.width = p * 100 + "%";
          qk(dlE, "p" + i).textContent = Math.round(p * 100) + "%";
        });
        qk(dlE, "spd").textContent = "↓ " + (84.2 + 6 * noise(t * 3, 9)).toFixed(1) + " MB/s";
        for (let i = 0; i < 12; i++)
          qk(Wd.dns.e, "db" + i).style.height = 14 + 36 * (0.5 + 0.5 * noise(i * 0.7 + t * 1.5, 6)) + "px";
        // drag & drop: weather ⇄ dns
        const dragP = E.inOutCubic(seg(t, 5.7, 6.06));
        const up = E.outBack(seg(t, 5.64, 5.76)),
          down = spring(seg(t, 6.094, 6.5)),
          L = clamp(up - down);
        const wx = lerp(416, 1200, dragP),
          wy = lerp(96, 488, dragP) - Math.sin(Math.PI * dragP) * 70;
        css(Wd.weather.e, {
          left: wx + "px",
          top: wy + "px",
          zIndex: 5,
          transform: `scale(${base.weather * (1 + 0.05 * (up - down))}) rotate(${2.5 * (up - down)}deg)`,
          boxShadow: `0 ${lerp(12, 56, L)}px ${lerp(32, 100, L)}px rgba(0,0,0,${lerp(0.35, 0.65, L)})`,
          borderColor: `rgba(250,82,82,${0.075 + 0.6 * L})`,
        });
        const dp = E.outBack(seg(t, 5.86, 6.2));
        css(Wd.dns.e, {
          left: lerp(1200, 416, dp) + "px",
          top: lerp(488, 96, dp) + "px",
          transform: `scale(${base.dns})`,
        });
        placeholder.style.opacity = seg(t, 5.76, 5.86) * (1 - seg(t, 6.08, 6.2));
        ["clock", "system", "calendar", "downloads", "media"].forEach(
          (n) => (Wd[n].e.style.transform = `scale(${base[n]})`),
        );
        // speedtest pops into the freed space
        const sp = seg(t, 7.031, 7.62);
        spE.style.opacity = seg(t, 7.031, 7.09);
        spE.style.transform = `scale(${lerp(0.55, 1, spring(sp))})`;
        const mb = 942 * E.outCubic(seg(t, 7.08, 7.46));
        qk(spE, "mbps").textContent = Math.round(mb);
        qk(spE, "arc").setAttribute("stroke-dashoffset", 1 - (mb / 1000) * 0.94);
        const tp = E.outExpo(seg(t, 7.12, 7.4));
        toast.style.opacity = tp;
        toast.style.transform = `translateY(${(1 - tp) * 30}px)`;
        // cursor
        const [cx, cy] = cur(t, sysW);
        cursor.style.opacity = seg(t, 5.38, 5.48);
        cursor.style.transform = `translate(${cx - 8}px, ${cy - 4}px) scale(${1 - 0.15 * (seg(t, 5.62, 5.66) - seg(t, 5.7, 5.76))})`;
        let rp = -1,
          rc = null;
        for (const c of clicks)
          if (t >= c && t < c + 0.42) {
            rp = seg(t, c, c + 0.42);
            rc = cur(c, sysWAt(c));
          }
        if (rp >= 0) {
          const d = lerp(12, 110, E.outCubic(rp));
          css(ripple, {
            display: "",
            left: rc[0] - d / 2 + "px",
            top: rc[1] - d / 2 + "px",
            width: d + "px",
            height: d + "px",
            opacity: 1 - rp,
          });
        } else ripple.style.display = "none";
        // 3D camera
        const p = E.inOutCubic(seg(t, 5.1, 5.9)),
          dr = seg(t, 5.9, T1);
        const push = E.inExpo(seg(t, 7.26, T1));
        cam.style.transform = `translate3d(${270 * p - 160 * push}px, ${34 * p}px, ${900 * push}px) rotateX(${12 * p - 4 * dr}deg) rotateY(${-24 * p + 6 * dr}deg) rotateZ(${2.2 * p}deg) scale(${lerp(1, 0.715, p) + 0.025 * dr})`;
        persp.style.filter = push > 0.01 ? `blur(${push * 14}px)` : "none";
        // side list
        const lOut = seg(t, 7.3, 7.46);
        list.forEach((Lr, i) => {
          Lr.set(E.outExpo(seg(t, listT[i] - 0.03, listT[i] + 0.45)));
          Lr.inner.style.color = i === 3 ? RED : t >= listT[i + 1] ? "#45454e" : "#fff";
          Lr.wrap.style.opacity = 1 - lOut;
        });
        listSub.set(E.outExpo(seg(t, 7.1, 7.5)));
        listSub.wrap.style.opacity = 1 - lOut;
      },
    };
  })();

  // ════════════════════════════ SCENE 5 — LIVE DATA (7.5 → 9.375) ════════════════════════════
  const S5 = (() => {
    const T0 = 4 * BAR,
      T1 = 5 * BAR;
    const root = div("scene", stage);
    css(root, { background: "#0b0b0f" });
    const grp = div("full", root);
    const CW5 = 852,
      CH5 = 428,
      CHW = 496,
      CHH = 296;
    const pos = [
      [96, 100],
      [972, 100],
      [96, 552],
      [972, 552],
    ];
    const mkc = (i, inner) =>
      frag(
        grp,
        `<div class="wcard" style="left:${pos[i][0]}px;top:${pos[i][1]}px;width:${CW5}px;height:${CH5}px;border-radius:26px">${inner}</div>`,
      );
    const hdr = (k, title, right = "") =>
      `<div class="abs" style="left:36px;top:30px;display:flex;align-items:center;gap:16px;font-size:34px;font-weight:720;letter-spacing:-.02em">${iconImg(k, 46)}${title}</div>${right}`;
    const dl = [
      ["ubuntu-24.04.3-desktop-amd64.iso", "5.9 GB", 0.38, 0.81],
      ["debian-13.1.0-amd64-DVD-1.iso", "3.8 GB", 0.12, 0.57],
      ["archlinux-2026.09.01-x86_64.iso", "1.4 GB", 0.86, 1],
      ["fedora-43-workstation-live.iso", "2.3 GB", 0.02, 0.34],
    ];
    const cA = mkc(
      0,
      hdr(
        "qBittorrent",
        "Downloads",
        `<div class="abs mono tnum" data-k="spd" style="left:auto;right:36px;top:40px;font-size:28px;color:${RED_L};font-weight:600">↓ 84.2 MB/s</div>`,
      ) +
        dl
          .map(
            (
              d,
              i,
            ) => `<div class="abs mono" style="left:36px;top:${108 + i * 74}px;font-size:22px;color:#e4e4ea">${d[0]}</div>
        <div class="abs mono tnum" data-k="pct${i}" style="left:auto;right:36px;top:${108 + i * 74}px;font-size:22px;color:${DIM}">${d[1]}</div>
        <div class="bar" style="left:36px;right:36px;top:${142 + i * 74}px;height:14px;border-radius:7px"><i data-k="bar${i}" style="border-radius:7px"></i></div>`,
          )
          .join(""),
    );
    const cB = mkc(
      1,
      hdr(
        "proxmox",
        "pve-01",
        `<div class="abs chip" style="left:auto;right:36px;top:36px;font-size:16px;padding:6px 14px;color:${DIM};border-width:1.5px">PROXMOX VE</div>`,
      ) +
        `
      <div class="abs mono" style="left:36px;top:104px;font-size:18px;letter-spacing:.2em;color:${DIM}">CPU</div>
      <div class="abs tnum" data-k="cpu" style="left:30px;top:128px;font-size:118px;font-weight:790;letter-spacing:-.055em;line-height:1">23%</div>
      <div class="abs mono" style="left:36px;top:264px;font-size:18px;letter-spacing:.2em;color:${DIM}">MEMORY</div>
      <div class="abs tnum" style="left:36px;top:290px;font-size:32px;font-weight:700">12.4 <span style="color:#6f6f79">/ 32 GB</span></div>
      <div class="bar" style="left:36px;top:342px;width:250px;height:12px"><i data-k="ram"></i></div>
      <div class="abs mono" style="left:36px;top:372px;font-size:18px;color:#6f6f79;letter-spacing:.08em">UPTIME 41d 07h</div>
      <svg class="abs" style="left:320px;top:100px" width="${CHW}" height="${CHH}" viewBox="0 0 ${CHW} ${CHH}">
        <defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fa5252" stop-opacity=".55"/><stop offset="1" stop-color="#fa5252" stop-opacity="0"/></linearGradient>
        <clipPath id="cclip"><rect data-k="clip" x="0" y="0" width="0" height="${CHH}"/></clipPath></defs>
        ${[0, 1, 2, 3].map((i) => `<line x1="0" x2="${CHW}" y1="${i * 98 + 0.5}" y2="${i * 98 + 0.5}" stroke="rgba(255,255,255,.06)"/>`).join("")}
        <g clip-path="url(#cclip)"><path data-k="area" fill="url(#cg2)"/><path data-k="line" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linejoin="round"/>
        <circle data-k="dot" r="8" fill="#fff" stroke="${RED}" stroke-width="4"/></g></svg>`,
    );
    const cC = mkc(
      2,
      hdr(
        "piHole",
        "Pi-hole",
        `<div class="abs" style="left:auto;right:36px;top:38px;display:flex;align-items:center;gap:10px;font-size:21px;color:#8ce99a;font-weight:600"><span style="width:12px;height:12px;border-radius:50%;background:#40c057;box-shadow:0 0 14px #40c057"></span>Blocking on</div>`,
      ) +
        `
      <div class="abs tnum" data-k="blk" style="left:30px;top:100px;font-size:124px;font-weight:810;letter-spacing:-.055em;line-height:1;color:#ff6b6b">27.4%</div>
      <div class="abs" style="left:36px;top:228px;font-size:24px;color:${DIM}">of queries blocked today</div>
      <div class="abs mono tnum" data-k="q" style="left:auto;right:36px;top:112px;font-size:44px;font-weight:700;text-align:right">184,302</div>
      <div class="abs mono" style="left:auto;right:36px;top:166px;font-size:18px;color:${DIM};letter-spacing:.18em">QUERIES</div>
      ${Array.from({ length: 24 }, (_, i) => `<div class="abs" data-k="bb${i}" style="left:${36 + i * 32.5}px;top:auto;bottom:32px;width:24px;border-radius:5px;background:#34343c;overflow:hidden"><div class="abs" data-k="br${i}" style="left:0;top:auto;bottom:0;width:100%;background:linear-gradient(180deg,#ff8787,#e03131)"></div></div>`).join("")}`,
    );
    const streams = [
      ["Big Buck Bunny", "alex", "Direct Play", 0.34, ["#f59f00", "#e8590c"]],
      ["Sintel", "sam", "Transcode · 1080p", 0.71, ["#4dabf7", "#5f3dc4"]],
      ["Tears of Steel", "kim", "Direct Play", 0.18, ["#63e6be", "#0b7285"]],
    ];
    const cD = mkc(
      3,
      hdr(
        "jellyfin",
        "Jellyfin",
        `<div class="abs chip" style="left:auto;right:36px;top:36px;font-size:16px;padding:6px 14px;color:${RED_L};border-width:1.5px">3 STREAMS</div>`,
      ) +
        streams
          .map(
            (
              s,
              i,
            ) => `<div class="abs center" style="left:36px;top:${104 + i * 104}px;width:64px;height:88px;border-radius:10px;background:linear-gradient(160deg,${s[4][0]},${s[4][1]});font-size:30px;font-weight:800;color:rgba(255,255,255,.9)">${s[0][0]}</div>
        <div class="abs" style="left:124px;top:${106 + i * 104}px;font-size:27px;font-weight:720;letter-spacing:-.01em">${s[0]}</div>
        <div class="abs" style="left:124px;top:${142 + i * 104}px;font-size:19px;color:${DIM}">${s[1]} · ${s[2]}</div>
        <div class="bar" style="left:124px;right:36px;top:${176 + i * 104}px;height:8px"><i data-k="s${i}"></i></div>`,
          )
          .join(""),
    );
    const cards = [cA, cB, cC, cD];
    const enter = [
      "inset(0 100% 0 0 round 26px)",
      "inset(0 0 100% 0 round 26px)",
      "inset(100% 0 0 0 round 26px)",
      "inset(0 0 0 100% round 26px)",
    ];
    const off = [
      [-60, 0],
      [0, -60],
      [0, 60],
      [60, 0],
    ];
    const hl1 = riseLine(root, "Live data.", { x: 0, y: 330, w: W, align: "center", size: 150, weight: 830 });
    const hl2 = riseLine(root, "Real controls.", {
      x: 0,
      y: 500,
      w: W,
      align: "center",
      size: 150,
      weight: 830,
      color: RED,
    });
    const hsub = riseLine(root, "FROM THE APPS YOU ALREADY RUN", {
      x: 0,
      y: 700,
      w: W,
      align: "center",
      size: 26,
      weight: 500,
      ls: ".4em",
      color: "#c9c9d1",
      font: "JB",
    });
    const barH = Array.from(
      { length: 24 },
      (_, i) => 30 + 80 * (0.5 + 0.5 * Math.sin(i * 0.55 + 1.3)) * (0.7 + 0.3 * hash(i)),
    );
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        cards.forEach((c, i) => {
          const a = T0 + i * 0.117,
            p = E.outExpo(seg(t, a, a + 0.5));
          const from = enter[i].match(/[\d.]+%?/g);
          c.style.clipPath = p >= 1 ? "none" : enter[i].replace(/100%/, (1 - p) * 100 + "%");
          c.style.transform = `translate(${off[i][0] * (1 - p)}px, ${off[i][1] * (1 - p)}px)`;
          c.style.opacity = t < a ? 0 : 1;
          void from;
        });
        // A downloads
        dl.forEach((d, i) => {
          const p = lerp(d[2], d[3], E.outCubic(seg(t, T0 + 0.1, T1)));
          const b = qk(cA, "bar" + i);
          b.style.width = p * 100 + "%";
          b.style.background = `repeating-linear-gradient(-45deg, rgba(255,255,255,.16) 0 10px, rgba(255,255,255,0) 10px 20px), linear-gradient(90deg,#e03131,#ff8787)`;
          b.style.backgroundPosition = `${t * 90}px 0, 0 0`;
          qk(cA, "pct" + i).textContent = (p >= 1 ? "Seeding · " : Math.round(p * 100) + "% · ") + d[1];
        });
        qk(cA, "spd").textContent = "↓ " + (84.2 + 9 * noise(t * 3, 9)).toFixed(1) + " MB/s";
        // B system
        const cp = chartPath(CHW, CHH, 36, t, 7, 0.34, 0.52, 2.4);
        qk(cB, "line").setAttribute("d", cp.line);
        qk(cB, "area").setAttribute("d", cp.area);
        qk(cB, "clip").setAttribute("width", CHW * E.outCubic(seg(t, T0 + 0.2, T0 + 0.8)));
        const lastY = +cp.line.split("L").pop().split(",")[1];
        const dot = qk(cB, "dot");
        dot.setAttribute("cx", CHW * E.outCubic(seg(t, T0 + 0.2, T0 + 0.8)));
        dot.setAttribute("cy", seg(t, T0 + 0.2, T0 + 0.8) >= 1 ? lastY : CHH / 2);
        qk(cB, "cpu").textContent = Math.round(24 + 11 * noise(t * 2.2, 2)) + "%";
        qk(cB, "ram").style.width = 39 * E.outCubic(seg(t, T0 + 0.25, T0 + 0.8)) + "%";
        // C dns
        const qv = lerp(183200, 184302, E.outCubic(seg(t, T0 + 0.25, T1)));
        qk(cC, "q").textContent = fmt(qv);
        qk(cC, "blk").textContent = (27.4 * E.outExpo(seg(t, T0 + 0.25, T0 + 1.0))).toFixed(1) + "%";
        for (let i = 0; i < 24; i++) {
          const a = T0 + 0.3 + i * 0.018,
            p = spring(seg(t, a, a + 0.55));
          qk(cC, "bb" + i).style.height = barH[i] * p + "px";
          qk(cC, "br" + i).style.height = 22 + 30 * hash(i + 3) + "%";
        }
        // D streams
        streams.forEach(
          (s, i) =>
            (qk(cD, "s" + i).style.width =
              (s[3] + (t - T0) * 0.02) * 100 * E.outCubic(seg(t, T0 + 0.4 + i * 0.05, T0 + 0.9 + i * 0.05)) + "%"),
        );
        // rack focus → headline
        const f = E.outCubic(seg(t, 8.36, 8.62));
        grp.style.filter = f > 0.001 ? `blur(${f * 18}px) brightness(${lerp(1, 0.38, f)})` : "none";
        grp.style.transform = `scale(${lerp(1.04, 1, E.outCubic(seg(t, T0, T1)))})`;
        hl1.set(E.outExpo(seg(t, 8.42, 8.95)));
        hl2.set(E.outExpo(seg(t, 8.62, 9.15)));
        hsub.set(E.outExpo(seg(t, 8.8, 9.3)));
        const ex = E.inCubic(seg(t, 9.26, T1));
        root.style.transform = `scale(${1 + ex * 0.12})`;
        root.style.opacity = 1 - ex * 0.6;
      },
    };
  })();

  // ════════════════════════════ SCENE 6 — 87 INTEGRATIONS RING (9.375 → 11.25) ════════════════════════════
  const S6 = (() => {
    const T0 = 5 * BAR;
    const root = div("scene", stage);
    css(root, { background: "radial-gradient(ellipse 60% 55% at 50% 50%, #1c0d11 0%, #0b0b0f 70%)" });
    const kinds = ["homarr", ...A.integrations.map((o) => o.kind)];
    const N = kinds.length / 2;
    const items = kinds.map((k, i) => {
      const e = frag(
        root,
        `<div class="abs center" style="width:132px;height:132px;border-radius:32px;background:linear-gradient(180deg,#202027,#16161a);border:1.5px solid rgba(255,255,255,.1);box-sizing:border-box;box-shadow:0 18px 40px rgba(0,0,0,.45)">${k === "homarr" ? logoSVG(96) : iconImg(k, 84)}</div>`,
      );
      return { e, row: i % 2, idx: Math.floor(i / 2) };
    });
    const shade = div("abs", root);
    box(shade, 960 - 700, 540 - 330, 1400, 660);
    css(shade, {
      background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(11,11,15,.97) 30%, rgba(11,11,15,0) 70%)",
      zIndex: 500,
    });
    const cnt = div("abs", root);
    css(cnt, {
      left: "0px",
      top: 468 - 140 + "px",
      width: W + "px",
      height: "280px",
      display: "flex",
      justifyContent: "center",
      zIndex: 600,
      fontSize: "320px",
      fontWeight: 900,
      letterSpacing: "-0.06em",
      lineHeight: "280px",
    });
    const cols = [0, 1].map(() => {
      const m = div("mask", cnt);
      css(m, { height: "280px", display: "inline-block" });
      const s = div("", m);
      s.innerHTML = [..."01234567890"].map((d) => `<div class="tnum" style="height:280px">${d}</div>`).join("");
      return s;
    });
    const lab = riseLine(root, "integrations", {
      x: 0,
      y: 628,
      w: W,
      align: "center",
      size: 76,
      weight: 750,
      ls: "-0.03em",
    });
    lab.wrap.style.zIndex = 600;
    const tick = div("abs mono", root);
    box(tick, 0, 742, W);
    css(tick, {
      textAlign: "center",
      fontSize: "24px",
      letterSpacing: ".32em",
      color: RED_L,
      zIndex: 600,
      fontWeight: 600,
      whiteSpace: "nowrap",
    });
    const names = A.integrations.map((o) => o.name.toUpperCase());
    return {
      t0: T0,
      t1: 11.45,
      root,
      update(t) {
        const zoom = lerp(2.6, 1, E.outExpo(seg(t, T0, T0 + 0.75)));
        const spin = 2.3 * E.outExpo(seg(t, T0, T0 + 1.2)) + 0.4 * (t - T0) + 4.5 * E.inExpo(seg(t, 10.9, 11.4));
        const Rr = 1150,
          Pd = 1500;
        for (const it of items) {
          const dir = it.row ? -1 : 1;
          const th = (it.idx / N) * Math.PI * 2 + (it.row ? Math.PI / N : 0) + dir * spin;
          const x = Rr * Math.sin(th),
            z = Rr * Math.cos(th) - Rr,
            sc = Pd / (Pd - z);
          const d = (1 - Math.cos(th)) / 2;
          const yy = (it.row ? 318 : -318) * sc;
          const s = sc * zoom;
          const X = 960 + x * sc * zoom,
            Y = 540 + yy * zoom;
          const st = it.e.style;
          st.transform = `translate(${X - 66}px, ${Y - 66}px) scale(${s})`;
          st.zIndex = Math.round((1 - d) * 1000);
          st.opacity = lerp(1, 0.2, d);
          st.filter = d > 0.25 ? `blur(${(d - 0.25) * 6}px)` : "none";
        }
        const v = 87 * E.outQuint(seg(t, T0 + 0.06, T0 + 0.95));
        const ones = v % 10,
          carry = ones > 9 ? ones - 9 : 0;
        cols[0].style.transform = `translateY(${-(Math.floor(v / 10) + carry) * 280}px)`;
        cols[1].style.transform = `translateY(${-ones * 280}px)`;
        const ci = E.outExpo(seg(t, T0, T0 + 0.5));
        cnt.style.transform = `scale(${lerp(1.5, 1, ci)})`;
        cnt.style.opacity = ci;
        lab.set(E.outExpo(seg(t, T0 + 0.2, T0 + 0.7)));
        const done = t > T0 + 1.0;
        tick.textContent = done ? "CONNECT THE SERVICES YOU RUN" : names[Math.min(86, Math.floor(v))];
        tick.style.opacity = done ? seg(t, T0 + 1.0, T0 + 1.12) : seg(t, T0 + 0.1, T0 + 0.25);
        tick.style.letterSpacing = done ? lerp(0.6, 0.32, E.outExpo(seg(t, T0 + 1.0, T0 + 1.45))) + "em" : ".32em";
      },
    };
  })();

  // ════════════════════════════ SCENE 7 — FEATURE BENTO (11.25 → 13.125) ════════════════════════════
  const S7 = (() => {
    const T1 = 7 * BAR;
    const root = div("scene", stage);
    css(root, { background: "#0b0b0f" });
    const dots = div("full", root);
    css(dots, {
      backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1.2px, transparent 1.4px)",
      backgroundSize: "36px 36px",
    });
    const T = {};
    const mk = (name, x, y, w, h, inner) => {
      const e = frag(
        root,
        `<div class="tile" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inner}</div>`,
      );
      T[name] = { e, x, y, w, h };
      return e;
    };
    // auth
    const people = [
      ["Admins", "Manage everything", "#ff8787", true],
      ["Family", "View & use boards", "#74c0fc", true],
      ["Guests", "Read-only", "#b197fc", false],
    ];
    const auth = mk(
      "auth",
      80,
      80,
      680,
      560,
      `
      <div class="abs center" style="left:48px;top:44px;width:136px;height:136px;border-radius:50%;background:radial-gradient(circle at 50% 35%, rgba(250,82,82,.38), rgba(250,82,82,.08));border:2px solid rgba(250,82,82,.55)">
        <svg width="78" height="78" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/>
          <path data-k="shackle" d="M8 11v-4a4 4 0 1 1 8 0v4"/></svg></div>
      <div class="abs" style="left:48px;top:204px;font-size:54px;font-weight:820;letter-spacing:-.035em">Sign in your way</div>
      <div class="abs" style="left:48px;top:282px;display:flex;gap:12px">${["OIDC", "LDAP", "Credentials"].map((c, i) => `<span class="chip" data-k="c${i}" style="font-size:19px;padding:8px 18px;letter-spacing:.1em;color:${i < 2 ? RED_L : "#cfcfd6"}">${c}</span>`).join("")}</div>
      ${people
        .map(
          (p, i) => `<div class="abs" data-k="r${i}" style="left:48px;top:${366 + i * 60}px;width:584px;height:52px">
        <div class="abs center" style="left:0;top:4px;width:44px;height:44px;border-radius:50%;background:${p[2]}22;color:${p[2]};font-weight:750;font-size:19px">${p[0][0]}</div>
        <div class="abs" style="left:60px;top:2px;font-size:22px;font-weight:680">${p[0]}</div>
        <div class="abs" style="left:60px;top:29px;font-size:16px;color:${DIM}">${p[1]}</div>
        <div class="abs" data-k="sw${i}" style="left:528px;top:12px;width:56px;height:30px;border-radius:15px;background:#2c2c33"><div class="abs" data-k="kn${i}" style="left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff"></div></div></div>`,
        )
        .join("")}`,
    );
    // languages
    const langs = A.welcome.slice();
    const lang = mk(
      "lang",
      784,
      80,
      1056,
      268,
      `
      <div class="abs tnum" style="left:40px;top:30px;font-size:156px;font-weight:860;letter-spacing:-.065em;line-height:1;color:${RED}">26</div>
      <div class="abs" style="left:46px;top:190px;font-size:31px;font-weight:650;color:#cfcfd6">languages</div>
      <div class="abs" style="left:320px;top:40px;width:1px;height:188px;background:rgba(255,255,255,.09)"></div>
      <div class="abs mono" data-k="code" style="left:372px;top:58px;font-size:20px;letter-spacing:.24em;color:${DIM}">EN</div>
      <div class="abs mask" style="left:368px;top:96px;width:650px;height:104px"><div data-k="reel" class="abs" style="left:0;top:0;width:650px">
        ${langs.map((l) => `<div style="height:104px;line-height:104px;font-size:62px;font-weight:760;letter-spacing:-.025em;white-space:nowrap;transform-origin:0 50%"><span>${l.text}</span></div>`).join("")}</div></div>
      <div class="abs" style="left:320px;top:0;width:736px;height:268px;background:linear-gradient(180deg,#19191e 0%,rgba(25,25,30,0) 28%,rgba(20,20,24,0) 72%,#141418 100%);pointer-events:none"></div>`,
    );
    // icons
    const R = rng(5);
    const pool = A.integrations.map((o) => o.kind);
    let mos = "";
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 14; c++)
        mos += `<div class="abs center" style="left:${c * 74}px;top:${r * 74}px;width:60px;height:60px;border-radius:15px;background:#1d1d23;border:1px solid rgba(255,255,255,.07)">${iconImg(pool[Math.floor(R() * pool.length)], 38)}</div>`;
    const icons = mk(
      "icons",
      784,
      372,
      516,
      268,
      `<div class="abs" data-k="mos" style="left:-160px;top:-200px;width:1036px;height:666px">${mos}</div>
      <div class="abs" style="left:0;top:0;width:516px;height:268px;background:linear-gradient(0deg,#131317 22%,rgba(19,19,23,.2) 70%,rgba(19,19,23,.0))"></div>
      <div class="abs" style="left:32px;top:186px;font-size:40px;font-weight:820;letter-spacing:-.03em">Thousands of icons</div>`,
    );
    // search
    const res = [
      ["jellyfin", "Jellyfin", "Open app"],
      ["jellyseerr", "Jellyseerr", "Request media"],
    ];
    const search = mk(
      "search",
      1324,
      372,
      516,
      268,
      `
      <div class="abs" style="left:32px;top:24px;font-size:30px;font-weight:820;letter-spacing:-.025em">Search everything</div>
      <div class="abs" style="left:32px;top:74px;width:452px;height:56px;border-radius:12px;background:#0e0e11;border:1.5px solid rgba(250,82,82,.6);box-shadow:0 0 0 4px rgba(250,82,82,.12);display:flex;align-items:center;gap:12px;padding:0 16px;box-sizing:border-box;font-size:23px">
        ${tab("search", 22, DIM)}<span data-k="q" style="white-space:pre"></span><span data-k="car" style="width:2px;height:26px;background:${RED_L};margin-left:-10px"></span><span style="flex:1"></span>
        <span class="mono" style="font-size:14px;color:${DIM};border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:3px 8px">Ctrl K</span></div>
      ${res
        .map(
          (
            r,
            i,
          ) => `<div class="abs" data-k="res${i}" style="left:32px;top:${142 + i * 56}px;width:452px;height:50px;border-radius:10px;${i === 0 ? "background:rgba(250,82,82,.13);" : ""}display:flex;align-items:center;gap:14px;padding:0 14px;box-sizing:border-box">
        ${iconImg(r[0], 30)}<span style="font-size:21px;font-weight:680;flex:1">${r[1]}</span><span class="mono" style="font-size:14px;color:${DIM}">${r[2]}</span></div>`,
        )
        .join("")}`,
    );
    // install
    const CMD = "docker pull ghcr.io/homarr-labs/homarr:latest";
    const inst = mk(
      "install",
      80,
      664,
      1760,
      336,
      `
      <div class="abs" style="left:48px;top:40px;display:flex;align-items:center;gap:20px">${tab("brand-docker", 66, "#339af0", 1.6)}<div style="font-size:54px;font-weight:820;letter-spacing:-.035em">Self-hosted. Open source.</div></div>
      <div class="abs mono" style="left:48px;top:148px;width:1040px;height:140px;border-radius:16px;background:#08080a;border:1px solid rgba(255,255,255,.08);box-sizing:border-box;padding:22px 28px;font-size:26px;line-height:46px">
        <div style="white-space:pre"><span style="color:${RED_L}">$</span> <span data-k="cmd"></span><span data-k="cur" style="display:inline-block;width:14px;height:28px;background:${RED_L};vertical-align:-5px;margin-left:3px"></span></div>
        <div data-k="ok" style="color:#69db7c;display:flex;align-items:center;gap:10px">${tab("check", 26, "#69db7c", 2.6)}Pull complete</div></div>
      <div class="abs" style="left:1170px;top:128px;font-size:68px;font-weight:830;letter-spacing:-.04em;line-height:1.06">Your server.<br><span style="color:${RED}">Your data.</span></div>`,
    );
    const entries = [
      ["auth", 11.2],
      ["lang", 11.32],
      ["icons", 11.6],
      ["search", 11.72],
      ["install", 12.0],
    ];
    let fitted = false;
    const fit = () => {
      [...qk(lang, "reel").children].forEach((row) => {
        const w = row.firstElementChild.getBoundingClientRect().width;
        row.style.transform = `scale(${Math.min(1, 640 / w)})`;
      });
      fitted = true;
    };
    return {
      t0: 10.95,
      t1: T1,
      root,
      fit,
      update(t) {
        if (!fitted) fit();
        entries.forEach(([n, a], k) => {
          const o = T[n],
            p = E.outExpo(seg(t, a, a + 0.6));
          const c = E.inBack(seg(t, 12.9 + k * 0.022, 13.1 + k * 0.022));
          const dx = (960 - (o.x + o.w / 2)) * c,
            dy = (540 - (o.y + o.h / 2)) * c;
          o.e.style.opacity = seg(t, a, a + 0.1) * (1 - seg(t, 13.02 + k * 0.022, 13.1 + k * 0.022));
          o.e.style.transform = `perspective(1600px) translate(${dx}px, ${dy + (1 - p) * 80}px) rotateX(${(1 - p) * -32}deg) scale(${lerp(0.88, 1, p) * (1 - 0.9 * clamp(c))})`;
        });
        // auth: unlock + chips + switches
        qk(auth, "shackle").style.transform = `translateY(${-2.2 * E.outBack(seg(t, 11.62, 11.85))}px)`;
        [0, 1, 2].forEach((i) => {
          const c = qk(auth, "c" + i),
            p = spring(seg(t, 11.4 + i * 0.07, 11.9 + i * 0.07));
          c.style.transform = `scale(${p})`;
          c.style.display = "inline-block";
          const r = qk(auth, "r" + i),
            rp = E.outExpo(seg(t, 11.5 + i * 0.07, 11.95 + i * 0.07));
          r.style.opacity = rp;
          r.style.transform = `translateX(${(1 - rp) * 40}px)`;
          const on = people[i][3] ? E.outBack(seg(t, 11.85 + i * 0.12, 12.05 + i * 0.12)) : 0;
          qk(auth, "kn" + i).style.transform = `translateX(${on * 26}px)`;
          qk(auth, "sw" + i).style.background = on > 0.5 ? RED : "#2c2c33";
        });
        // languages slot reel
        const rp = (langs.length - 1) * E.outCubic(seg(t, 11.38, 12.75));
        qk(lang, "reel").style.transform = `translateY(${-rp * 104}px)`;
        qk(lang, "reel").style.filter =
          `blur(${Math.min(6, Math.abs(((langs.length - 1) * 3 * (1 - seg(t, 11.38, 12.75)) ** 2) / 1.37) * 0.9)}px)`;
        qk(lang, "code").textContent = langs[Math.round(rp)].code.toUpperCase();
        // icons mosaic drift
        qk(icons, "mos").style.transform = `rotate(-14deg) translate(${-(t - 11.2) * 70}px, ${-(t - 11.2) * 40}px)`;
        // search typing
        const qtxt = "jelly",
          n = Math.floor(clamp((t - 11.86) / 0.07, 0, qtxt.length));
        qk(search, "q").textContent = qtxt.slice(0, n);
        qk(search, "car").style.opacity = Math.floor(t * 4) % 2 === 0 || n < qtxt.length ? 1 : 0;
        [0, 1].forEach((i) => {
          const p = E.outExpo(seg(t, 12.0 + i * 0.06, 12.35 + i * 0.06));
          const r = qk(search, "res" + i);
          r.style.opacity = p;
          r.style.transform = `translateY(${(1 - p) * 16}px)`;
        });
        // install typing
        const cn = Math.floor(clamp((t - 12.12) / 0.0105, 0, CMD.length));
        qk(inst, "cmd").textContent = CMD.slice(0, cn);
        qk(inst, "cur").style.opacity = cn < CMD.length || Math.floor(t * 4) % 2 === 0 ? 1 : 0;
        const ok = E.outExpo(seg(t, 12.66, 12.9));
        qk(inst, "ok").style.opacity = ok;
        qk(inst, "ok").style.transform = `translateY(${(1 - ok) * 12}px)`;
      },
    };
  })();

  // ════════════════════════════ 3D — three.js rigs from origin/feat/3d-logo-lab ════════════════════════════
  const R3 = (() => {
    const H3 = window.Homarr3D,
      THREE = H3.THREE;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    css(canvas, { position: "absolute", left: "0px", top: "0px", width: W + "px", height: H + "px" });
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new H3.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.4;
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 100);
    const cfg = { ...H3.initialConfig };
    const key = new THREE.DirectionalLight(0xffe4df, 5.2);
    key.position.set(-4, 6, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
    const fill = new THREE.DirectionalLight(0x8aa5ff, 1.8);
    fill.position.set(6, 1, 5);
    const rim = new THREE.DirectionalLight(0xff5c66, 6.5);
    rim.position.set(2, 5, -6);
    scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0x191a20, 0.55));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.38 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.4;
    floor.receiveShadow = true;
    scene.add(floor);
    const lob = H3.extrudeSvg(A.lobsterSvg, cfg);
    const lobRoot = new THREE.Group();
    lobRoot.add(lob.model);
    scene.add(lobRoot);
    const wm = H3.buildWordmarkRig(A.wordmarkSvg, cfg);
    const wmRoot = new THREE.Group();
    wmRoot.add(wm.model);
    scene.add(wmRoot);
    const motion = { ...H3.defaultWordmarkMotion };
    // Same claw / antenna maths as the lab's animate loop, driven by reel time instead of a clock.
    function poseLobster(t, clacks) {
      let clack = 0;
      for (const c of clacks) {
        const age = t - c;
        if (age >= 0 && age < 0.6) clack = Math.max(clack, Math.sin((age / 0.6) * Math.PI) ** 2);
      }
      for (const ch of lob.rig.claws) {
        const cycle = (1 - Math.cos(t * cfg.clawSpeed * cfg.clawFrequency * 2.2 + (ch.side === 1 ? 0.55 : 0))) / 2;
        const closure = Math.min(1, Math.pow(cycle, 1.8) * 0.6 + clack) * cfg.clawStrength * 1.25;
        ch.middle.rotation.z = -ch.side * closure * 2.1;
        ch.tip.rotation.z = -ch.side * closure;
      }
      for (const ch of lob.rig.antennae) {
        const s = cfg.antennaStrength * 1.4,
          ph = t * cfg.antennaSpeed * 3.4 + (ch.side === 1 ? 0.55 : 0);
        ch.middle.rotation.z = Math.sin(ph) * s * 0.7;
        ch.tip.rotation.z = Math.sin(ph - 0.85) * s * 1.25;
        ch.middle.rotation.x = Math.sin(ph * 0.72) * s * 0.2;
        ch.tip.rotation.x = Math.sin(ph * 0.72 - 0.65) * s * 0.45;
      }
    }
    return {
      canvas,
      attach(parent) {
        if (canvas.parentNode !== parent) parent.appendChild(canvas);
      },
      lobster(t, o) {
        lobRoot.visible = true;
        wmRoot.visible = false;
        floor.visible = true;
        camera.position.set(0, 0.25, 12);
        camera.rotation.set(0, 0, 0);
        lobRoot.position.set(o.x || 0, (o.y || 0) + Math.sin(t * cfg.idleSpeed * 2) * cfg.idleStrength, 0);
        lobRoot.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
        lobRoot.scale.setScalar(Math.max(1e-3, o.s ?? 1));
        poseLobster(t, o.clacks || []);
        renderer.render(scene, camera);
      },
      wordmark(t, o) {
        lobRoot.visible = false;
        wmRoot.visible = true;
        floor.visible = false;
        camera.position.set(0, 0.25, 14);
        camera.rotation.set(0, 0, 0);
        H3.animateWordmarkRig(wm, t, 1 / 60, motion, null);
        wmRoot.position.set(o.x || 0, o.y || 0, 0);
        wmRoot.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
        wmRoot.scale.setScalar(Math.max(1e-3, o.s ?? 1));
        renderer.render(scene, camera);
      },
      warm() {
        this.lobster(0, {});
        this.wordmark(0, {});
      },
    };
  })();

  // ── shared v2 helpers
  const fits = [];
  const v2bg = (root) => {
    css(root, {
      background: "radial-gradient(ellipse 55% 50% at 14% 12%, rgba(250,82,82,.16), rgba(250,82,82,0) 62%), #0b0b0f",
    });
    const d = div("full", root);
    css(d, {
      backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1.2px, transparent 1.4px)",
      backgroundSize: "36px 36px",
    });
    const wm = div("abs nowrap", root);
    css(wm, {
      left: "1180px",
      top: "560px",
      fontSize: "640px",
      fontWeight: 900,
      letterSpacing: "-0.08em",
      lineHeight: 1,
      color: "transparent",
      WebkitTextStroke: "2px rgba(250,82,82,.07)",
    });
    wm.textContent = "v2";
    return wm;
  };
  function tag(parent, x, y, kind, label) {
    return frag(
      parent,
      `<div class="abs" style="left:${x}px;top:${y}px;display:flex;align-items:center;gap:14px;white-space:nowrap">
      <span class="mono" style="font-size:16px;font-weight:700;letter-spacing:.14em;padding:5px 12px;border-radius:7px;${kind === "NEW" ? `background:${RED};color:#fff` : `background:rgba(250,82,82,.14);color:${RED_L};border:1.5px solid rgba(250,82,82,.55)`}">${kind}</span>
      <span class="mono" style="font-size:18px;letter-spacing:.3em;color:#cfcfd6;font-weight:600">${label}</span></div>`,
    );
  }
  const enterX = (e, t, a, d = 40) => {
    const p = E.outExpo(seg(t, a, a + 0.45));
    e.style.opacity = seg(t, a, a + 0.12);
    e.style.transform = `translateX(${(1 - p) * -d}px)`;
    return p;
  };
  const enterY = (e, t, a, d = 40) => {
    const p = E.outExpo(seg(t, a, a + 0.5));
    e.style.opacity = seg(t, a, a + 0.12);
    e.style.transform = `translateY(${(1 - p) * d}px)`;
    return p;
  };
  const pop = (e, t, a, from = 0.6) => {
    const p = spring(seg(t, a, a + 0.55));
    e.style.opacity = seg(t, a, a + 0.08);
    e.style.transform = `scale(${lerp(from, 1, p)})`;
    return p;
  };
  const cursorSVG = `<svg width="40" height="40" viewBox="0 0 32 32"><path d="M6 3 L6 26 L11.5 20.8 L15.4 29.2 L19.2 27.5 L15.4 19.3 L23 19.3 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const mkCursor = (parent) => {
    const c = frag(
      parent,
      `<div class="abs" style="width:40px;height:40px;z-index:40;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))">${cursorSVG}</div>`,
    );
    const r = div("abs", parent);
    css(r, { borderRadius: "50%", border: "3px solid rgba(255,255,255,.9)", boxSizing: "border-box", zIndex: 39 });
    return {
      set(t, x, y, o, clicks = []) {
        c.style.opacity = o;
        c.style.transform = `translate(${x - 7}px, ${y - 3}px)`;
        let rp = -1,
          rc = null;
        for (const [ct, cx, cy] of clicks)
          if (t >= ct && t < ct + 0.4) {
            rp = seg(t, ct, ct + 0.4);
            rc = [cx, cy];
          }
        if (rp >= 0) {
          const d = lerp(12, 100, E.outCubic(rp));
          css(r, {
            display: "",
            left: rc[0] - d / 2 + "px",
            top: rc[1] - d / 2 + "px",
            width: d + "px",
            height: d + "px",
            opacity: 1 - rp,
          });
        } else r.style.display = "none";
      },
    };
  };
  // tiny JSX highlighter for the code shot
  function jsxHL(line) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const C = { t: "#ff8787", a: "#74c0fc", s: "#8ce99a", x: "#fcc419", p: "#6f6f7c", txt: "#e9e9ee" };
    let out = "",
      i = 0,
      inTag = false;
    const span = (k, s) => (out += `<span style="color:${C[k]}">${esc(s)}</span>`);
    const readExpr = () => {
      let d = 0,
        j = i;
      do {
        if (line[j] === "{") d++;
        else if (line[j] === "}") d--;
        j++;
      } while (d > 0 && j < line.length);
      const s = line.slice(i, j);
      i = j;
      return s;
    };
    while (i < line.length) {
      const ch = line[i];
      if (!inTag && ch === "<") {
        const m = line.slice(i).match(/^<\/?[A-Za-z]*/)[0];
        span("p", m.replace(/[A-Za-z]/g, ""));
        span("t", m.replace(/[</]/g, ""));
        i += m.length;
        inTag = true;
        continue;
      }
      if (inTag) {
        if (line.startsWith("/>", i)) {
          span("p", "/>");
          i += 2;
          inTag = false;
          continue;
        }
        if (ch === ">") {
          span("p", ">");
          i++;
          inTag = false;
          continue;
        }
        if (ch === '"') {
          const j = line.indexOf('"', i + 1) + 1;
          span("s", line.slice(i, j));
          i = j;
          continue;
        }
        if (ch === "{") {
          span("x", readExpr());
          continue;
        }
        const m = line.slice(i).match(/^[A-Za-z]+(?==)/);
        if (m) {
          span("a", m[0]);
          span("p", "=");
          i += m[0].length + 1;
          continue;
        }
        span("txt", ch);
        i++;
        continue;
      }
      if (ch === "{") {
        span("x", readExpr());
        continue;
      }
      const m = line.slice(i).match(/^[^<{]+/)[0];
      span(m.trim() && !/^[()=>\s]+$/.test(m) ? "txt" : "p", m);
      i += m.length;
    }
    return out;
  }

  // ════════════════════════════ SCENE 8 — NOW IN v2 (13.125 → 15) ════════════════════════════
  const S8 = (() => {
    const T0 = 7 * BAR,
      T1 = 8 * BAR,
      SLAM = T0 + 2 * BEAT;
    const root = div("scene", stage);
    css(root, { background: "#070708" });
    const glow = div("full", root);
    css(glow, {
      background: "radial-gradient(ellipse 48% 46% at 50% 52%, rgba(250,82,82,.42), rgba(250,82,82,0) 70%)",
    });
    const rays = div("abs", root);
    box(rays, 960 - 1500, 540 - 1500, 3000, 3000);
    css(rays, {
      background:
        "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,130,130,.08) 0deg 3deg, rgba(255,130,130,0) 3deg 12deg)",
      WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,.4) 18%, transparent 42%)",
    });
    const layer3d = div("full", root);
    const txt = div("full", root);
    const now = div("abs mono", txt);
    box(now, 1004, 318);
    css(now, { fontSize: "28px", color: RED_L, fontWeight: 600, whiteSpace: "nowrap" });
    now.textContent = "NOW IN";
    const hm = riseLine(txt, "Homarr", { x: 996, y: 350, w: 860, size: 172, weight: 830, ls: "-0.045em" });
    const v2 = div("abs", txt);
    box(v2, 986, 470);
    css(v2, {
      fontSize: "440px",
      fontWeight: 900,
      letterSpacing: "-0.07em",
      lineHeight: 1,
      color: RED,
      whiteSpace: "nowrap",
      transformOrigin: "25% 65%",
      textShadow: "0 30px 80px rgba(250,82,82,.35)",
    });
    v2.textContent = "v2";
    const sub = div("abs mono", txt);
    box(sub, 1004, 912);
    css(sub, { fontSize: "22px", letterSpacing: ".3em", color: "#cfcfd6", whiteSpace: "nowrap" });
    sub.textContent = "2.0 · THE ULTIMATE HOMARR UPDATE";
    const flash = div("full", root);
    css(flash, {
      background: "radial-gradient(circle at 50% 50%, #fff 0%, rgba(255,170,170,.7) 30%, rgba(250,82,82,0) 70%)",
      mixBlendMode: "screen",
    });
    return {
      t0: T0,
      t1: T1 + 0.2,
      root,
      update(t) {
        const dt = t - T0;
        R3.attach(layer3d);
        const turn = -Math.PI * 4 * (1 - E.outExpo(seg(t, T0, T0 + 1.05)));
        const slide = E.inOutCubic(seg(t, 13.78, 14.22));
        const s = lerp(0.05, 1, spring(seg(t, T0, T0 + 0.8), 6, 2)) * lerp(1, 0.84, slide);
        R3.lobster(t, {
          x: lerp(0, -3.3, slide),
          y: 0.15,
          ry: turn + 0.42 * slide + 0.12 * Math.sin(dt * 1.6) * seg(t, T0 + 1, T1),
          rx: -0.06,
          s,
          clacks: [T0 + 0.55, SLAM, SLAM + 0.5],
        });
        glow.style.opacity = clamp(0.7 + 0.6 * pulse(t, T0, 4) + 0.5 * pulse(t, SLAM, 5));
        rays.style.transform = `rotate(${dt * 10}deg) scale(${lerp(0.6, 1, E.outExpo(seg(t, T0, T0 + 1)))})`;
        rays.style.opacity = E.outCubic(seg(t, T0, T0 + 0.5));
        const np = E.outExpo(seg(t, 13.88, 14.35));
        now.style.opacity = np;
        now.style.letterSpacing = lerp(1.3, 0.5, np) + "em";
        hm.set(E.outExpo(seg(t, 13.92, 14.42)));
        const vp = seg(t, SLAM, SLAM + 0.38);
        v2.style.opacity = t < SLAM ? 0 : 1;
        v2.style.transform = `scale(${lerp(2.8, 1, E.outExpo(vp))}) rotate(${(1 - E.outExpo(vp)) * -8}deg)`;
        v2.style.filter = vp < 1 ? `blur(${(1 - E.outExpo(vp)) * 18}px)` : "none";
        const sp = E.outExpo(seg(t, SLAM + 0.22, SLAM + 0.65));
        sub.style.opacity = sp;
        sub.style.transform = `translateY(${(1 - sp) * 14}px)`;
        flash.style.opacity = 0.9 * pulse(t, T0, 9) + 0.45 * pulse(t, SLAM, 16);
        const sh = t > SLAM ? 16 * Math.exp(-9 * (t - SLAM)) : 0;
        txt.style.transform = `translate(${noise(t * 35, 3) * sh}px, ${noise(t * 35, 4) * sh}px)`;
      },
    };
  })();

  // ════════════════════════════ SCENE 9 — CUSTOM WIDGETS v2 (15 → 16.875) ════════════════════════════
  const S9 = (() => {
    const T0 = 8 * BAR,
      T1 = 9 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "REWORK", "CUSTOM WIDGETS v2");
    const h1 = riseLine(root, "Build almost", { x: 104, y: 164, w: 880, size: 104, weight: 830 });
    const h2 = riseLine(root, "any widget.", { x: 104, y: 282, w: 880, size: 104, weight: 830, color: RED });
    const CODE = [
      '<Stack gap="xs">',
      '  <Group justify="space-between">',
      "    <Title order={4}>Sonarr queue</Title>",
      '    <RefreshButton requestId="queue" />',
      "  </Group>",
      "  {(data.queue?.records ?? []).map((r) => (",
      '    <Group key={r.id} justify="space-between">',
      '      <Text size="sm">{r.title}</Text>',
      "      <Badge>{r.status}</Badge>",
      "    </Group>",
      "  ))}",
      "  <Progress value={data.queue?.progress ?? 0} />",
      "</Stack>",
    ];
    const edP = div("full", root);
    css(edP, { perspective: "1800px" });
    const ed = frag(
      edP,
      `<div class="abs" style="left:110px;top:436px;width:830px;height:530px;border-radius:22px;background:#0d0d11;border:1px solid rgba(255,255,255,.09);box-shadow:0 40px 90px rgba(0,0,0,.55);overflow:hidden;transform-origin:0 50%">
      <div class="abs" style="left:0;top:0;width:830px;height:50px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:9px;padding:0 20px;box-sizing:border-box">
        <i style="width:12px;height:12px;border-radius:50%;background:#ff6b6b"></i><i style="width:12px;height:12px;border-radius:50%;background:#fcc419"></i><i style="width:12px;height:12px;border-radius:50%;background:#51cf66"></i>
        <span class="mono" style="margin-left:18px;font-size:16px;color:#a5a5b0">template.jsx</span>
        <span class="mono" data-k="ok" style="margin-left:auto;font-size:15px;color:#69db7c">● valid</span></div>
      ${CODE.map((l, i) => `<div class="abs mono" style="left:0;top:${64 + i * 34}px;width:830px;height:34px;font-size:19px;line-height:34px;white-space:pre"><span style="display:inline-block;width:52px;text-align:right;color:#4a4a55;margin-right:22px">${i + 1}</span><span data-k="l${i}" style="display:inline-block">${jsxHL(l)}</span></div>`).join("")}
      <div class="abs" data-k="car" style="width:10px;height:22px;background:${RED_L}"></div></div>`,
    );
    const lineEls = CODE.map((_, i) => qk(ed, "l" + i));
    const caret = qk(ed, "car");
    let lw = CODE.map(() => 400);
    fits.push(() => {
      root.style.display = "";
      lw = lineEls.map((e) => e.getBoundingClientRect().width);
      root.style.display = "none";
    });
    const LT = (i) => T0 + 0.1 + i * 0.086; // line i typing start
    const rows = [
      ["Sintel · S01E04", "Downloading", "#4dabf7"],
      ["Spring · S01E02", "Queued", "#868e96"],
      ["Cosmos Laundromat · S01E01", "Importing", "#51cf66"],
      ["Tears of Steel · S01E05", "Downloading", "#4dabf7"],
    ];
    const pvP = div("full", root);
    css(pvP, { perspective: "1800px" });
    const pv = frag(
      pvP,
      `<div class="abs" style="left:1000px;top:150px;width:816px;height:816px;border-radius:26px;background:linear-gradient(180deg,#141418,#0f0f12);border:1px solid rgba(255,255,255,.08);overflow:hidden;transform-origin:100% 50%;box-shadow:0 40px 90px rgba(0,0,0,.5)">
      <div class="abs mono" style="left:30px;top:26px;font-size:16px;letter-spacing:.22em;color:${DIM}">WORKBENCH · PREVIEW</div>
      <div class="abs mono" style="left:auto;right:30px;top:26px;font-size:15px;color:#69db7c">● live</div>
      <div class="wcard" data-k="w" style="left:84px;top:118px;width:648px;height:540px;border-radius:22px">
        <div class="abs" data-k="title" style="left:30px;top:28px;display:flex;align-items:center;gap:14px;font-size:32px;font-weight:760;letter-spacing:-.02em">${iconImg("sonarr", 38)}Sonarr queue</div>
        <div class="abs center" data-k="ref" style="left:auto;right:28px;top:26px;width:46px;height:46px;border-radius:12px;background:#25252c">${tab("refresh", 22, "#cfcfd6")}</div>
        ${rows
          .map(
            (
              r,
              i,
            ) => `<div class="abs" data-k="r${i}" style="left:30px;top:${112 + i * 84}px;width:588px;height:68px;border-radius:14px;background:#1f1f25;display:flex;align-items:center;padding:0 20px;box-sizing:border-box;gap:14px">
          <span style="font-size:22px;font-weight:620;flex:1;white-space:nowrap">${r[0]}</span>
          <span class="mono" style="font-size:15px;font-weight:700;letter-spacing:.06em;padding:6px 12px;border-radius:8px;background:${r[2]}26;color:${r[2]}">${r[1].toUpperCase()}</span></div>`,
          )
          .join("")}
        <div class="abs" data-k="pg" style="left:30px;top:458px;width:588px">
          <div class="mono" style="display:flex;justify-content:space-between;font-size:16px;color:${DIM};margin-bottom:10px"><span>QUEUE</span><span data-k="pct">0%</span></div>
          <div class="bar" style="position:relative;height:12px;border-radius:6px"><i data-k="pb" style="border-radius:6px"></i></div></div></div>
      <div class="abs mono" style="left:0;top:716px;width:816px;text-align:center;font-size:17px;letter-spacing:.3em;color:#a5a5b0">JSX · API REQUESTS · ACTIONS · SETTINGS</div></div>`,
    );
    const beam = Array.from({ length: 6 }, () =>
      css(div("abs", root), {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: RED_L,
        boxShadow: `0 0 14px ${RED}`,
      }),
    );
    return {
      t0: T0 - 0.2,
      t1: T1,
      root,
      update(t) {
        const tp = enterX(tg, t, T0 + 0.02);
        void tp;
        h1.set(E.outExpo(seg(t, T0 + 0.04, T0 + 0.55)));
        h2.set(E.outExpo(seg(t, T0 + 0.14, T0 + 0.65)));
        const ep = E.outExpo(seg(t, T0 - 0.05, T0 + 0.6));
        ed.style.transform = `rotateY(${lerp(28, 7, ep)}deg) translateY(${(1 - ep) * 120}px)`;
        ed.style.opacity = seg(t, T0 - 0.05, T0 + 0.1);
        const pp = E.outExpo(seg(t, T0 + 0.05, T0 + 0.7));
        pv.style.transform = `rotateY(${lerp(-30, -7, pp)}deg) translateX(${(1 - pp) * 160}px)`;
        pv.style.opacity = seg(t, T0 + 0.05, T0 + 0.2);
        let ci = -1;
        CODE.forEach((_, i) => {
          const p = seg(t, LT(i), LT(i) + 0.08);
          lineEls[i].style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
          if (t >= LT(i)) ci = i;
        });
        if (ci >= 0) {
          const p = seg(t, LT(ci), LT(ci) + 0.08);
          css(caret, {
            left: 74 + lw[ci] * p + 4 + "px",
            top: 64 + ci * 34 + 6 + "px",
            opacity: t > LT(CODE.length - 1) + 0.12 && Math.floor(t * 5) % 2 ? 0 : 1,
          });
        } else caret.style.opacity = 0;
        // preview assembles as the code lands
        pop(qk(pv, "title"), t, LT(2) + 0.06, 0.8);
        pop(qk(pv, "ref"), t, LT(3) + 0.06, 0.4);
        rows.forEach((_, i) => {
          const e = qk(pv, "r" + i);
          const p = E.outExpo(seg(t, LT(8) + 0.05 + i * 0.07, LT(8) + 0.5 + i * 0.07));
          e.style.opacity = seg(t, LT(8) + 0.05 + i * 0.07, LT(8) + 0.12 + i * 0.07);
          e.style.transform = `translateX(${(1 - p) * 60}px)`;
        });
        enterY(qk(pv, "pg"), t, LT(11) + 0.05, 20);
        const q = 0.64 * E.outCubic(seg(t, LT(11) + 0.1, T1));
        qk(pv, "pb").style.width = q * 100 + "%";
        qk(pv, "pct").textContent = Math.round(q * 100) + "%";
        // data beam from editor to preview
        beam.forEach((b, i) => {
          const u = ((t - T0) * 1.4 + i / beam.length) % 1;
          const on = seg(t, T0 + 0.35, T0 + 0.5) * (1 - seg(t, T1 - 0.3, T1 - 0.15));
          const x = lerp(940, 1080, u),
            y = lerp(700, 560, u) - Math.sin(u * Math.PI) * 60;
          css(b, { left: x + "px", top: y + "px", opacity: on * Math.sin(u * Math.PI) });
        });
      },
    };
  })();

  // ════════════════════════════ SCENE 10 — WORKSHOP (16.875 → 18.75) ════════════════════════════
  const S10 = (() => {
    const T0 = 9 * BAR,
      T1 = 10 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const defs = [
      ["Pokédex", "ajnart", "poke", 412],
      ["Recommended TV Shows", "mika", "list", 188],
      ["Categorized App List", "noah", "grid", 256],
      ["Glass theme", "sven", "css", 331],
      ["Release calendar", "ana", "bars", 97],
      ["Speedtest history", "lea", "line", 143],
      ["Uptime overview", "kai", "ring", 210],
      ["Nord theme", "ines", "css2", 274],
      ["Now playing", "tom", "list2", 165],
      ["Disk health", "eli", "bars2", 88],
      ["GitHub releases", "ruben", "list", 127],
      ["Service map", "ada", "grid2", 301],
    ];
    const ic = [
      "sonarr",
      "radarr",
      "jellyfin",
      "plex",
      "piHole",
      "homeAssistant",
      "proxmox",
      "immich",
      "paperlessNgx",
      "uptimeKuma",
      "traefik",
      "nextcloud",
    ];
    const thumb = (k, i) => {
      const g = [
        "linear-gradient(135deg,#3b1d24,#1c1216)",
        "linear-gradient(135deg,#1b2440,#141726)",
        "linear-gradient(135deg,#17322a,#121a17)",
        "linear-gradient(135deg,#2e2140,#17131f)",
      ][i % 4];
      let inner = "";
      if (k.startsWith("list"))
        inner = [0, 1, 2]
          .map(
            (r) =>
              `<div class="abs" style="left:22px;top:${22 + r * 32}px;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.18)"></div><div class="abs" style="left:56px;top:${28 + r * 32}px;width:${150 - r * 30}px;height:10px;border-radius:5px;background:rgba(255,255,255,.22)"></div>`,
          )
          .join("");
      else if (k.startsWith("bars"))
        inner = Array.from(
          { length: 9 },
          (_, b) =>
            `<div class="abs" style="left:${24 + b * 31}px;bottom:18px;top:auto;width:20px;height:${24 + ((b * 37) % 70)}px;border-radius:4px;background:${b % 3 ? "rgba(255,255,255,.25)" : RED}"></div>`,
        ).join("");
      else if (k === "ring")
        inner = `<svg class="abs" style="left:115px;top:14px" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/><circle cx="50" cy="50" r="38" fill="none" stroke="#51cf66" stroke-width="12" stroke-dasharray="200 239" transform="rotate(-90 50 50)" stroke-linecap="round"/></svg>`;
      else if (k === "line")
        inner = `<svg class="abs" style="left:0;top:20px" width="330" height="100" viewBox="0 0 330 100"><path d="M0 80 L40 60 L80 70 L120 30 L160 45 L200 20 L240 40 L280 15 L330 30" fill="none" stroke="${RED_L}" stroke-width="4"/></svg>`;
      else if (k.startsWith("css"))
        inner =
          ["#fa5252", "#fcc419", "#51cf66", "#4dabf7", "#b197fc"]
            .map(
              (c, j) =>
                `<div class="abs" style="left:${26 + j * 46}px;top:40px;width:38px;height:38px;border-radius:50%;background:${k === "css2" ? ["#88c0d0", "#81a1c1", "#5e81ac", "#a3be8c", "#ebcb8b"][j] : c};opacity:.9"></div>`,
            )
            .join("") +
          `<div class="abs mono" style="left:auto;right:18px;top:14px;font-size:14px;color:rgba(255,255,255,.6)">CSS</div>`;
      else if (k === "poke")
        inner = `<div class="abs" style="left:125px;top:18px;width:84px;height:84px;border-radius:50%;background:linear-gradient(180deg,${RED} 0 46%,#222 46% 54%,#eee 54%);box-shadow:0 0 0 5px #222 inset"></div><div class="abs" style="left:156px;top:49px;width:22px;height:22px;border-radius:50%;background:#eee;border:5px solid #222;box-sizing:border-box"></div>`;
      else
        inner = [0, 1, 2, 3, 4, 5]
          .map(
            (j) =>
              `<div class="abs center" style="left:${24 + (j % 3) * 98}px;top:${14 + Math.floor(j / 3) * 52}px;width:44px;height:44px;border-radius:11px;background:rgba(255,255,255,.1)">${iconImg(ic[(i + j) % ic.length], 28)}</div>`,
          )
          .join("");
      return `<div class="abs" style="left:0;top:0;width:330px;height:124px;background:${g}">${inner}</div>`;
    };
    const wallP = div("full", root);
    css(wallP, { perspective: "1900px", perspectiveOrigin: "75% 45%" });
    const wall = div("abs", wallP);
    box(wall, 900, 0, 1070, 2000);
    css(wall, { transformOrigin: "50% 30%" });
    const cards = [];
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c,
          d = defs[i % defs.length];
        const e = frag(
          wall,
          `<div class="abs" style="left:${c * 356}px;top:${r * 276}px;width:330px;height:250px;border-radius:20px;background:#17171c;border:1px solid rgba(255,255,255,.09);overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.4)">
        ${thumb(d[2], i)}
        <div class="abs nowrap" style="left:18px;top:138px;font-size:21px;font-weight:720">${d[0]}</div>
        <div class="abs" style="left:18px;top:168px;font-size:15px;color:${DIM}">by ${d[1]}</div>
        <div class="abs" style="left:18px;top:208px;display:flex;align-items:center;gap:7px;font-size:17px;color:#cfcfd6">${tab("thumb-up", 18, "#cfcfd6")}<span data-k="v" class="tnum">${d[3]}</span></div>
        <div class="abs center" data-k="btn" style="left:auto;right:16px;top:198px;width:112px;height:38px;border-radius:10px;background:${RED};font-size:16px;font-weight:700;gap:6px">Install</div></div>`,
        );
        cards.push({ e, r, c, votes: d[3] });
      }
    const focus = cards[7];
    const fade = div("full", root);
    css(fade, {
      background: "linear-gradient(90deg,#0b0b0f 0%,#0b0b0f 40%,rgba(11,11,15,.6) 52%,rgba(11,11,15,0) 64%)",
    });
    const fadeV = div("full", root);
    css(fadeV, {
      background: "linear-gradient(180deg,#0b0b0f 0%,rgba(11,11,15,0) 16%,rgba(11,11,15,0) 84%,#0b0b0f 100%)",
    });
    const tg = tag(root, 110, 116, "NEW", "COMMUNITY WORKSHOP");
    const h1 = riseLine(root, "Share it in the", { x: 104, y: 164, w: 900, size: 104, weight: 830 });
    const h2 = riseLine(root, "Workshop.", { x: 104, y: 282, w: 900, size: 104, weight: 830, color: RED });
    const s1 = riseLine(root, "Publish, install and vote on", {
      x: 110,
      y: 430,
      w: 800,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const s2 = riseLine(root, "widgets and Custom CSS.", {
      x: 110,
      y: 476,
      w: 800,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const chips = frag(
      root,
      `<div class="abs" style="left:110px;top:566px;display:flex;gap:12px">${[
        ["puzzle", "Widgets"],
        ["palette", "Custom CSS"],
        ["shield-check", "Moderated"],
      ]
        .map(
          ([i, l]) =>
            `<span class="chip" style="font-size:18px;padding:9px 18px;letter-spacing:.08em;color:#cfcfd6;border-color:rgba(255,255,255,.2);display:inline-flex;align-items:center;gap:9px">${tab(i, 20, RED_L)}${l}</span>`,
        )
        .join("")}</div>`,
    );
    const cur = mkCursor(wall);
    const CLICK = T0 + 1.02;
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        enterX(tg, t, T0 + 0.05);
        h1.set(E.outExpo(seg(t, T0 + 0.08, T0 + 0.6)));
        h2.set(E.outExpo(seg(t, T0 + 0.18, T0 + 0.7)));
        s1.set(E.outExpo(seg(t, T0 + 0.3, T0 + 0.8)));
        s2.set(E.outExpo(seg(t, T0 + 0.36, T0 + 0.86)));
        enterY(chips, t, T0 + 0.45, 20);
        const scroll = -(t - T0) * 150 - 180;
        const ent = E.outExpo(seg(t, T0, T0 + 0.8));
        wall.style.transform = `rotateX(${lerp(40, 20, ent)}deg) rotateY(-24deg) rotateZ(6deg) translateY(${scroll + (1 - ent) * 500}px)`;
        cards.forEach((o) => {
          const a = T0 + 0.02 + (o.r * 3 + o.c) * 0.025,
            p = E.outBack(seg(t, a, a + 0.45));
          if (o !== focus) {
            o.e.style.opacity = seg(t, a, a + 0.1);
            o.e.style.transform = `translateZ(${(1 - p) * -300}px)`;
          }
        });
        // hero card: lift, click Install, vote
        const lift = E.outBack(seg(t, T0 + 0.62, T0 + 0.95)) * (1 - E.inOutCubic(seg(t, T1 - 0.35, T1 - 0.1)) * 0.4);
        const fa = T0 + 0.02 + 7 * 0.025;
        focus.e.style.opacity = seg(t, fa, fa + 0.1);
        focus.e.style.transform = `translateZ(${lift * 90 + (1 - E.outBack(seg(t, fa, fa + 0.45))) * -300}px) scale(${1 + lift * 0.06})`;
        focus.e.style.borderColor = `rgba(250,82,82,${0.09 + lift * 0.7})`;
        focus.e.style.boxShadow = `0 ${20 + lift * 30}px ${40 + lift * 50}px rgba(0,0,0,.5), 0 0 ${lift * 40}px rgba(250,82,82,${lift * 0.35})`;
        const btn = qk(focus.e, "btn"),
          done = t >= CLICK + 0.05;
        btn.style.background = done ? "#2b8a3e" : RED;
        btn.innerHTML = done ? `${tab("check", 18, "#fff", 3)}Installed` : "Install";
        btn.style.transform = `scale(${1 - 0.1 * (seg(t, CLICK - 0.03, CLICK) - seg(t, CLICK + 0.02, CLICK + 0.12))})`;
        qk(focus.e, "v").textContent = focus.votes + (t >= CLICK + 0.25 ? 1 : 0);
        const bx = (7 % 3) * 356 + 330 - 16 - 56,
          by = Math.floor(7 / 3) * 276 + 217;
        const cp = E.inOutCubic(seg(t, T0 + 0.6, CLICK - 0.02));
        cur.set(
          t,
          lerp(bx + 260, bx, cp),
          lerp(by + 240, by, cp),
          seg(t, T0 + 0.55, T0 + 0.65) * (1 - seg(t, T1 - 0.2, T1 - 0.1)),
          [[CLICK, bx, by]],
        );
      },
    };
  })();

  // ════════════════════════════ SCENE 11 — ASSISTANT (18.75 → 20.625) ════════════════════════════
  const S11 = (() => {
    const T0 = 10 * BAR,
      T1 = 11 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "NEW", "HOMARR ASSISTANT");
    const h1 = riseLine(root, "Just ask", { x: 104, y: 164, w: 880, size: 104, weight: 830 });
    const h2 = riseLine(root, "Assistant.", { x: 104, y: 282, w: 880, size: 104, weight: 830, color: RED });
    const s1 = riseLine(root, "It reads live Homarr data, makes", {
      x: 110,
      y: 430,
      w: 820,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const s2 = riseLine(root, "approved changes, builds widgets.", {
      x: 110,
      y: 476,
      w: 820,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const feats = [
      ["sparkles", "Free Homarr provider"],
      ["lock", "Zero data retention"],
      ["plug", "MCP at /api/mcp"],
    ].map(([i, l], k) =>
      frag(
        root,
        `<div class="abs mono" style="left:110px;top:${580 + k * 58}px;display:flex;align-items:center;gap:14px;font-size:22px;color:#e4e4ea;white-space:nowrap"><span class="center" style="display:flex;width:40px;height:40px;border-radius:11px;background:rgba(250,82,82,.14)">${tab(i, 22, RED_L)}</span>${l}</div>`,
      ),
    );
    const PROMPT = "Make a widget for my Sonarr queue";
    const chat = frag(
      root,
      `<div class="abs" style="left:990px;top:110px;width:830px;height:860px;border-radius:26px;background:linear-gradient(180deg,#141418,#101013);border:1px solid rgba(255,255,255,.09);overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55)">
      <div class="abs" style="left:0;top:0;width:830px;height:72px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:14px;padding:0 26px;box-sizing:border-box">
        <span class="center" style="display:flex;width:40px;height:40px;border-radius:12px;background:${RED}">${tab("sparkles", 22, "#fff")}</span>
        <span style="font-size:24px;font-weight:740">Assistant</span><span class="mono" style="font-size:14px;color:${DIM};letter-spacing:.12em;margin-left:4px">HOMARR PROVIDER</span>
        <span class="mono" style="margin-left:auto;font-size:15px;color:${DIM};border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:4px 9px">Shift A</span></div>
      <div class="abs" data-k="u" style="left:auto;right:28px;top:104px;max-width:600px;padding:16px 22px;border-radius:18px 18px 4px 18px;background:rgba(250,82,82,.16);border:1px solid rgba(250,82,82,.38);font-size:23px;white-space:nowrap"><span data-k="ut"></span><span data-k="uc" style="display:inline-block;width:2px;height:24px;background:${RED_L};vertical-align:-4px;margin-left:2px"></span></div>
      ${[
        ["integration_all", "found Sonarr"],
        ["customWidget_previewCreate", "preview ready"],
        ["customWidget_createFromPreview", "saved"],
      ]
        .map(
          (x, i) => `
        <div class="abs mono" data-k="tool${i}" style="left:28px;top:${[198, 250, 514][i]}px;display:flex;align-items:center;gap:12px;font-size:18px;padding:9px 14px;border-radius:11px;background:#1c1c22;border:1px solid rgba(255,255,255,.07);white-space:nowrap">
          <span data-k="ti${i}" class="center" style="display:flex;width:22px;height:22px"></span><span style="color:#e4e4ea">${x[0]}</span><span style="color:${DIM}">· ${x[1]}</span></div>`,
        )
        .join("")}
      <div class="abs" data-k="ap" style="left:28px;top:318px;width:774px;height:170px;border-radius:18px;background:#1a1a20;border:1px solid rgba(250,82,82,.35);box-sizing:border-box;padding:22px 24px">
        <div style="font-size:24px;font-weight:700">Create widget “Sonarr queue”?</div>
        <div style="font-size:18px;color:${DIM};margin-top:6px">Changes need your approval.</div>
        <div class="abs center" data-k="deny" style="left:auto;right:180px;top:auto;bottom:22px;width:120px;height:46px;border-radius:12px;background:#2a2a31;font-size:18px;font-weight:650;color:#cfcfd6">Deny</div>
        <div class="abs center" data-k="ok" style="left:auto;right:24px;top:auto;bottom:22px;width:140px;height:46px;border-radius:12px;background:${RED};font-size:18px;font-weight:700;gap:8px">Approve</div></div>
      <div class="abs" data-k="reply" style="left:28px;top:582px;width:774px;font-size:23px;line-height:1.4;color:#e9e9ee">Done. <b>Sonarr queue</b> is ready to add to any board.</div>
      <div class="abs" data-k="mini" style="left:28px;top:648px;width:430px;height:120px;border-radius:16px;background:#1d1d23;border:1px solid rgba(255,255,255,.08);overflow:hidden">
        <div class="abs" style="left:18px;top:16px;display:flex;align-items:center;gap:10px;font-size:19px;font-weight:720">${iconImg("sonarr", 24)}Sonarr queue</div>
        ${[0, 1].map((i) => `<div class="abs" style="left:18px;top:${54 + i * 30}px;width:${[260, 200][i]}px;height:20px;border-radius:6px;background:#2a2a31"></div><div class="abs" style="left:auto;right:18px;top:${54 + i * 30}px;width:90px;height:20px;border-radius:6px;background:${["#4dabf733", "#51cf6633"][i]}"></div>`).join("")}</div>
      <div class="abs" style="left:28px;top:auto;bottom:24px;width:774px;height:58px;border-radius:14px;background:#0c0c0f;border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;padding:0 18px;box-sizing:border-box;font-size:19px;color:#6f6f7c">Ask Assistant…<span class="center" style="display:flex;margin-left:auto;width:38px;height:38px;border-radius:10px;background:#2a2a31">${tab("arrow-up", 20, "#cfcfd6")}</span></div></div>`,
    );
    const cur = mkCursor(chat);
    const CLICK = T0 + 1.0;
    const tools = [
      [T0 + 0.5, T0 + 0.64],
      [T0 + 0.62, T0 + 0.76],
      [CLICK + 0.1, CLICK + 0.22],
    ];
    const spin = tab("loader-2", 20, RED_L),
      check = tab("circle-check", 20, "#69db7c");
    return {
      t0: T0,
      t1: T1 + 0.32,
      root,
      update(t) {
        enterX(tg, t, T0 + 0.02);
        h1.set(E.outExpo(seg(t, T0 + 0.05, T0 + 0.55)));
        h2.set(E.outExpo(seg(t, T0 + 0.15, T0 + 0.65)));
        s1.set(E.outExpo(seg(t, T0 + 0.28, T0 + 0.78)));
        s2.set(E.outExpo(seg(t, T0 + 0.34, T0 + 0.84)));
        feats.forEach((f, k) => enterX(f, t, T0 + 0.45 + k * 0.07));
        const cp = E.outExpo(seg(t, T0, T0 + 0.6));
        chat.style.opacity = seg(t, T0, T0 + 0.1);
        chat.style.transform = `translateX(${(1 - cp) * 140}px)`;
        const n = Math.floor(clamp((t - T0 - 0.08) / 0.0125, 0, PROMPT.length));
        qk(chat, "ut").textContent = PROMPT.slice(0, n);
        qk(chat, "uc").style.opacity = n < PROMPT.length ? 1 : 0;
        qk(chat, "u").style.opacity = t > T0 + 0.06 ? 1 : 0;
        tools.forEach(([a, b], i) => {
          const e = qk(chat, "tool" + i);
          enterY(e, t, a, 16);
          const ic = qk(chat, "ti" + i),
            want = t >= b ? "ok" : "spin";
          if (ic.dataset.s !== want) {
            ic.innerHTML = want === "ok" ? check : spin;
            ic.dataset.s = want;
          }
          ic.style.transform =
            t < b ? `rotate(${t * 720}deg)` : `scale(${lerp(1.5, 1, E.outBack(seg(t, b, b + 0.2)))})`;
        });
        const ap = qk(chat, "ap");
        pop(ap, t, T0 + 0.74, 0.85);
        const ok = qk(chat, "ok"),
          approved = t >= CLICK + 0.04;
        ok.innerHTML = approved ? `${tab("check", 20, "#fff", 3)}Approved` : "Approve";
        ok.style.background = approved ? "#2b8a3e" : RED;
        ok.style.transform = `scale(${1 - 0.1 * (seg(t, CLICK - 0.03, CLICK) - seg(t, CLICK + 0.02, CLICK + 0.12))})`;
        ap.style.borderColor = approved ? "rgba(105,219,124,.45)" : "rgba(250,82,82,.35)";
        enterY(qk(chat, "reply"), t, CLICK + 0.25, 16);
        pop(qk(chat, "mini"), t, CLICK + 0.33, 0.7);
        const okx = 28 + 774 - 24 - 70,
          oky = 318 + 170 - 22 - 23;
        const mp = E.inOutCubic(seg(t, T0 + 0.78, CLICK - 0.02));
        cur.set(
          t,
          lerp(okx + 180, okx, mp),
          lerp(oky + 260, oky, mp),
          seg(t, T0 + 0.76, T0 + 0.85) * (1 - seg(t, CLICK + 0.4, CLICK + 0.5)),
          [[CLICK, okx, oky]],
        );
      },
    };
  })();

  // ════════════════════════════ SCENE FD-A — THE FRONT DOOR: one new endpoint, as a diagram (2 bars) ════════════════════════════
  const SFA = (() => {
    const T0 = 11 * BAR,
      T1 = 13 * BAR;
    const O = (x) => T0 + x;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "NEW", "INTEGRATION REQUESTS");
    const h1 = riseLine(root, "The front door", { x: 104, y: 164, w: 900, size: 98, weight: 830 });
    const h2 = riseLine(root, "to your homelab.", { x: 104, y: 276, w: 900, size: 98, weight: 830, color: RED });
    const epLab = frag(
      root,
      `<div class="abs mono" style="left:1012px;top:128px;font-size:17px;letter-spacing:.3em;color:${RED_L};white-space:nowrap">ONE NEW API ENDPOINT</div>`,
    );
    const ep = frag(
      root,
      `<div class="abs mono" style="left:1010px;top:164px;display:flex;align-items:center;gap:16px;font-size:32px;white-space:nowrap;padding:14px 24px 14px 16px;border-radius:16px;background:#15151a;border:1.5px solid rgba(250,82,82,.5);box-shadow:0 0 0 7px rgba(250,82,82,.06);transform-origin:0 50%">
      <span style="color:#fff;font-weight:800;padding:4px 11px;border-radius:9px;background:${RED};font-size:21px;letter-spacing:.06em">POST</span><span style="color:#fff">/api/integrations/request</span></div>`,
    );
    const d1 = riseLine(root, "Call any path of any connected service.", {
      x: 1012,
      y: 266,
      w: 840,
      size: 30,
      weight: 560,
      ls: "-0.01em",
      color: "#e4e4ea",
    });
    const d2 = riseLine(root, "Your secrets never leave Homarr.", {
      x: 1012,
      y: 308,
      w: 840,
      size: 30,
      weight: 560,
      ls: "-0.01em",
      color: "#e4e4ea",
    });
    const d3 = frag(
      root,
      `<div class="abs mono" style="left:1013px;top:368px;font-size:15px;letter-spacing:.12em;color:${DIM};white-space:nowrap">REST · tRPC integration.request · MCP integration_request</div>`,
    );

    // ── diagram: callers → Homarr (auth, access, vault) → service, and back
    const LANE = 712;
    const bez = (p0, p1, p2, p3, n = 36) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const s = i / n,
          m = 1 - s;
        return [0, 1].map((k) => m * m * m * p0[k] + 3 * m * m * s * p1[k] + 3 * m * s * s * p2[k] + s * s * s * p3[k]);
      });
    const route = (...parts) => {
      const pts = parts.flat(),
        acc = [0];
      for (let i = 1; i < pts.length; i++)
        acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = acc[acc.length - 1];
      return {
        pts,
        len,
        at(p) {
          const d = clamp(p) * len;
          let i = 1;
          while (i < acc.length - 1 && acc[i] < d) i++;
          const f = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
          return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
        },
        d: "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L"),
      };
    };
    const RW = route(bez([420, 610], [560, 610], [580, LANE], [720, LANE]), [[960, LANE]]);
    const RA = route(bez([420, 790], [560, 790], [580, LANE], [720, LANE]), [[960, LANE]]);
    const RS = route([
      [960, LANE],
      [1480, LANE],
    ]);
    const RBW = route([[1480, LANE]], RW.pts.slice().reverse());
    const RBA = route([[1480, LANE]], RA.pts.slice().reverse());
    // first route position where the packet's centre passes x (packets leave and enter ports edge-first)
    const pAtX = (r, x, dir) => {
      for (let i = 0; i <= 600; i++) {
        const p = i / 600;
        if (dir * (r.at(p)[0] - x) >= 0) return p;
      }
      return 1;
    };
    const dg = div("full", root);
    const card = (x, y, w, h, extra = "") =>
      `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:20px;background:linear-gradient(180deg,#17171c,#121216);border:1.5px solid rgba(255,255,255,.1);box-sizing:border-box;box-shadow:0 24px 60px rgba(0,0,0,.45);${extra}`;
    const lbl = (x, y, s) =>
      frag(
        dg,
        `<div class="abs mono" style="left:${x}px;top:${y}px;font-size:14px;letter-spacing:.26em;color:${DIM};white-space:nowrap">${s}</div>`,
      );
    const lCall = lbl(112, 504, "WHO CALLS IT");
    const lSvc = lbl(1482, 554, "YOUR SERVICE");
    const caller = (y, icon, title, sub, res) =>
      frag(
        dg,
        `<div class="abs" style="${card(110, y, 310, 140)}">
      <span class="abs center" style="left:18px;top:18px;display:flex;width:46px;height:46px;border-radius:13px;background:rgba(250,82,82,.14)">${tab(icon, 26, RED_L)}</span>
      <div class="abs" style="left:78px;top:16px;font-size:25px;font-weight:760;white-space:nowrap">${title}</div>
      <div class="abs" style="left:78px;top:50px;font-size:17px;color:${DIM};white-space:nowrap">${sub}</div>
      <div class="abs" data-k="res" style="left:18px;top:92px;width:274px;height:32px;border-radius:9px;background:rgba(64,192,87,.12);display:flex;align-items:center;gap:9px;padding:0 10px;box-sizing:border-box;font-size:16px;color:#b2f2bb;white-space:nowrap">${res}</div></div>`,
      );
    const cW = caller(
      540,
      "components",
      "Custom Widget",
      "No credentials to re-enter",
      `${iconImg("sonarr", 20)}<b style="font-weight:700">Sonarr queue</b><span style="color:#8ce99a">· 12 items</span>`,
    );
    const cA = caller(
      720,
      "robot",
      "Your agent",
      "Acts on your behalf · MCP",
      `${tab("circle-check", 19, "#69db7c")}Episode search started`,
    );
    const checks = [
      ["user-shield", "Authenticates your API key"],
      ["shield-check", "Checks full integration access"],
      ["route", "Keeps the path on Sonarr’s URL"],
    ];
    const gate = frag(
      dg,
      `<div class="abs" style="${card(720, 470, 480, 410, "border-color:rgba(250,82,82,.55);box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 60px rgba(250,82,82,.12)")}">
      <div class="abs" style="left:0;top:0;width:480px;height:58px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:12px;padding:0 20px;box-sizing:border-box">
        ${logoSVG(34)}<span style="font-size:23px;font-weight:780">Homarr</span><span class="mono" style="margin-left:auto;font-size:13px;color:${DIM};letter-spacing:.04em">/api/integrations/request</span></div>
      ${checks
        .map(
          (
            [ic, l],
            i,
          ) => `<div class="abs" data-k="ck${i}" style="left:18px;top:${70 + i * 50}px;width:444px;height:40px;display:flex;align-items:center;gap:13px;font-size:19px;color:#e4e4ea;white-space:nowrap">
        <span class="center" style="display:flex;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.06)">${tab(ic, 20, "#cfcfd6")}</span>${l}
        <span data-k="cs${i}" class="center" style="display:flex;margin-left:auto;width:24px;height:24px"></span></div>`,
        )
        .join("")}
      <div class="abs" data-k="vault" style="left:18px;top:282px;width:444px;height:110px;border-radius:14px;background:#0e0e11;border:1.5px dashed rgba(250,82,82,.35);box-sizing:border-box">
        <div class="abs mono" style="left:16px;top:12px;display:flex;align-items:center;gap:8px;font-size:13px;letter-spacing:.2em;color:${DIM};white-space:nowrap">${tab("lock", 15, DIM, 2.2)}SAVED SECRETS · ENCRYPTED</div>
        <div class="abs" style="left:14px;top:46px;width:414px;height:46px;border-radius:11px;background:#18181d;display:flex;align-items:center;gap:10px;padding:0 10px;box-sizing:border-box;white-space:nowrap">
          <span data-k="vk" class="center" style="display:flex;width:30px;height:30px;border-radius:8px;background:rgba(250,82,82,.2)">${tab("key", 17, RED_L, 2.2)}</span>
          <span style="font-size:18px;font-weight:650">Sonarr API key</span><span class="mono" style="font-size:15px;color:#5c5c66">••••</span>
          <span data-k="nr" class="mono" style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:.1em;padding:5px 9px;border-radius:7px;background:rgba(250,82,82,.14);color:${RED_L}">${tab("eye-off", 14, RED_L, 2.4)}NEVER RETURNED</span></div></div></div>`,
    );
    const svc = frag(
      dg,
      `<div class="abs" style="${card(1480, 590, 330, 246)}">
      <div class="abs" style="left:20px;top:18px;display:flex;align-items:center;gap:14px;white-space:nowrap">${iconImg("sonarr", 52)}
        <span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:28px;font-weight:780">Sonarr</span><span class="mono" style="font-size:14px;color:${DIM};letter-spacing:.06em">sonarr:8989 · LAN</span></span></div>
      <div class="abs mono" style="left:22px;top:96px;font-size:12px;letter-spacing:.22em;color:#6f6f7c">REQUEST LOG</div>
      ${["GET /api/v3/queue", "POST /api/v3/command"]
        .map(
          (
            p,
            i,
          ) => `<div class="abs mono" data-k="lg${i}" style="left:18px;top:${122 + i * 54}px;width:294px;height:44px;border-radius:10px;background:#1c1c22;display:flex;align-items:center;padding:0 10px 0 12px;box-sizing:border-box;font-size:15px;color:#e4e4ea;white-space:nowrap">${p}
        <span data-k="st${i}" style="margin-left:auto;font-size:13px;font-weight:700;padding:4px 9px;border-radius:7px;background:rgba(64,192,87,.16);color:#8ce99a">${["200", "201"][i]}</span></div>`,
        )
        .join("")}</div>`,
    );
    const NS = "http://www.w3.org/2000/svg";
    const svg = frag(dg, `<svg class="abs" width="${W}" height="${H}" style="overflow:visible;z-index:4"></svg>`);
    const path = (d, st) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke-linecap", "round");
      Object.entries(st).forEach(([k, v]) => p.setAttribute(k, v));
      svg.appendChild(p);
      return p;
    };
    const base = [RW, RA, RS].map((r) => ({
      r,
      e: path(r.d, { stroke: "rgba(255,255,255,.2)", "stroke-width": 3, "stroke-dasharray": "2 9" }),
    }));
    const trail = (r, col) => ({
      r,
      g: path(r.d, { stroke: col, "stroke-width": 12, "stroke-opacity": 0.22 }),
      e: path(r.d, { stroke: col, "stroke-width": 3.5 }),
    });
    const TR = {
      w: trail(RW, "#ff6b6b"),
      a: trail(RA, "#ff6b6b"),
      s: trail(RS, "#ff6b6b"),
      bw: trail(RBW, "#69db7c"),
      ba: trail(RBA, "#69db7c"),
    };
    const ports = [
      [720, LANE],
      [1200, LANE],
      [1480, LANE],
      [420, 610],
      [420, 790],
    ].map(([x, y]) =>
      frag(
        dg,
        `<div class="abs" style="left:${x - 7}px;top:${y - 7}px;width:14px;height:14px;border-radius:50%;background:#0b0b0f;border:3px solid ${RED_L};box-sizing:border-box;z-index:5"></div>`,
      ),
    );
    const PW = 296;
    const pk = frag(
      dg,
      `<div class="abs mono" style="width:${PW}px;height:46px;z-index:7;display:flex;align-items:center;gap:10px;padding:0 7px;border-radius:13px;background:#1f1f26;border:1.5px solid rgba(250,82,82,.75);box-sizing:border-box;box-shadow:0 12px 30px rgba(0,0,0,.6),0 0 26px rgba(250,82,82,.3);font-size:15px;white-space:nowrap">
      <span data-k="au" class="center" style="display:flex;width:30px;height:30px;border-radius:8px"></span>
      <span data-k="p" style="flex:1;text-align:center;color:#fff"></span>
      <span data-k="sl" class="center" style="display:flex;width:30px;height:30px;border-radius:8px;box-sizing:border-box"></span></div>`,
    );
    const RPW = 168;
    const rp = frag(
      dg,
      `<div class="abs mono" style="width:${RPW}px;height:46px;z-index:7;display:flex;align-items:center;gap:10px;padding:0 14px 0 8px;border-radius:13px;background:#1b221d;border:1.5px solid rgba(105,219,124,.7);box-sizing:border-box;box-shadow:0 12px 30px rgba(0,0,0,.6),0 0 26px rgba(105,219,124,.25);font-size:15px;color:#d3f9d8;white-space:nowrap">
      <span class="center" style="display:flex;width:30px;height:30px;border-radius:8px;background:rgba(105,219,124,.18)">${tab("braces", 17, "#8ce99a", 2.2)}</span><span data-k="t"></span></div>`,
    );
    const tok = frag(
      dg,
      `<div class="abs center" style="width:30px;height:30px;border-radius:8px;background:${RED};z-index:8;display:flex;box-shadow:0 0 22px rgba(250,82,82,.8)">${tab("key", 17, "#fff", 2.4)}</div>`,
    );
    const STEPS = [
      "Request + your API key",
      "Homarr authenticates you",
      "Adds the saved secret",
      "Calls your service",
      "Response comes back",
    ];
    const stepper = frag(
      root,
      `<div class="abs" style="left:110px;top:926px;width:1700px;height:40px">
      ${STEPS.map(
        (
          s,
          i,
        ) => `<div class="abs" data-k="s${i}" style="left:${i * 344}px;top:0;display:flex;align-items:center;gap:12px;white-space:nowrap">
        <span data-k="n${i}" class="center mono" style="display:flex;width:34px;height:34px;border-radius:50%;box-sizing:border-box;font-size:16px;font-weight:700">${i + 1}</span>
        <span data-k="l${i}" style="font-size:20px;font-weight:600">${s}</span></div>`,
      ).join("")}</div>`,
    );
    const icKey = tab("key", 17, "#fff", 2.2),
      icOk = tab("check", 18, "#fff", 3),
      icLock = tab("key", 17, "#fff", 2.4);
    const spin = tab("loader-2", 20, RED_L),
      check = tab("circle-check", 22, "#69db7c");
    // two round trips: the widget reads its queue, then the agent starts a search
    const FL = [
      {
        R: RW,
        RB: RBW,
        tr: "w",
        trb: "bw",
        c: cW,
        path: "GET /api/v3/queue",
        res: "200 · JSON",
        appear: 0.95,
        go: [1.0, 1.35],
        auth: 1.42,
        tok: [1.6, 1.8],
        go2: [1.84, 2.12],
        hit: 2.12,
        back: [2.22, 2.64],
        end: 2.7,
      },
      {
        R: RA,
        RB: RBA,
        tr: "a",
        trb: "ba",
        c: cA,
        path: "POST /api/v3/command",
        res: "201 · JSON",
        appear: 2.72,
        go: [2.74, 2.96],
        auth: 2.97,
        tok: [2.97, 3.09],
        go2: [3.1, 3.26],
        hit: 3.26,
        back: [3.3, 3.52],
        end: 9,
      },
    ];
    const stepAt = [0.95, 1.32, 1.6, 1.84, 2.22];
    FL.forEach((f) => {
      f.p0 = pAtX(f.R, 420 + PW / 2 + 8, 1);
      f.b0 = pAtX(f.RB, 1480 - RPW / 2 - 8, -1);
      f.b1 = pAtX(f.RB, 420 + RPW / 2 + 8, -1);
    });
    const SX = 1480 - PW / 2 - 8;
    return {
      t0: T0 - 0.12,
      t1: T1 + 0.2,
      root,
      update(t) {
        enterX(tg, t, O(0.05));
        h1.set(E.outExpo(seg(t, O(0.1), O(0.6))));
        h2.set(E.outExpo(seg(t, O(0.2), O(0.7))));
        enterX(epLab, t, O(0.18));
        pop(ep, t, O(0.24), 0.8);
        d1.set(E.outExpo(seg(t, O(0.34), O(0.84))));
        d2.set(E.outExpo(seg(t, O(0.42), O(0.92))));
        enterY(d3, t, O(0.52), 12);
        enterX(lCall, t, O(0.42), 20);
        enterX(cW, t, O(0.44));
        enterX(cA, t, O(0.5));
        pop(gate, t, O(0.52), 0.88);
        enterX(svc, t, O(0.6), -40);
        enterX(lSvc, t, O(0.62), -20);
        const wd = E.inOutCubic(seg(t, O(0.6), O(0.95)));
        base.forEach(({ e }) => {
          e.style.opacity = wd;
          e.setAttribute("stroke-dashoffset", (-(t - T0) * 40).toFixed(1));
        });
        ports.forEach((p, i) => {
          const k = spring(seg(t, O(0.7 + i * 0.03), O(1.1 + i * 0.03)));
          p.style.opacity = seg(t, O(0.7 + i * 0.03), O(0.76 + i * 0.03));
          p.style.transform = `scale(${k})`;
        });
        [...stepper.children].forEach((s, i) => enterY(s, t, O(0.7 + i * 0.05), 16));

        const fl = t < O(FL[1].appear) ? FL[0] : FL[1];
        const A = (x) => O(x);
        // request packet
        let show1 = false;
        if (t >= A(fl.appear) && t < A(fl.hit) + 0.02) {
          let x,
            y,
            sx = 1,
            org = "0% 50%";
          if (t < A(fl.go2[0])) {
            [x, y] = fl.R.at(lerp(fl.p0, 1, E.inOutCubic(seg(t, A(fl.go[0]), A(fl.go[1])))));
            sx = E.outCubic(seg(t, A(fl.appear), A(fl.appear) + 0.12));
          } else {
            const [a, b] = fl.go2.map(A),
              m = a + 0.75 * (b - a);
            x = lerp(960, SX, E.inOutCubic(seg(t, a, m)));
            y = LANE;
            sx = 1 - E.inCubic(seg(t, m, b));
            org = "100% 50%";
          }
          css(pk, {
            display: "flex",
            left: x - PW / 2 + "px",
            top: y - 23 + "px",
            opacity: Math.min(1, sx * 4),
            transform: `scaleX(${Math.max(0.001, sx)})`,
            transformOrigin: org,
          });
          show1 = true;
          const au = qk(pk, "au"),
            ok = t >= A(fl.auth);
          if (au.dataset.s !== String(ok)) {
            au.dataset.s = String(ok);
            au.innerHTML = ok ? icOk : icKey;
            au.style.background = ok ? "#2b8a3e" : "#3a3a44";
          }
          au.style.transform = `scale(${ok ? lerp(1.4, 1, E.outBack(seg(t, A(fl.auth), A(fl.auth) + 0.2))) : 1})`;
          const pe = qk(pk, "p");
          if (pe.textContent !== fl.path) pe.textContent = fl.path;
          const sl = qk(pk, "sl"),
            filled = t >= A(fl.tok[1]);
          if (sl.dataset.s !== String(filled)) {
            sl.dataset.s = String(filled);
            sl.innerHTML = filled ? icLock : "";
            css(sl, {
              background: filled ? RED : "transparent",
              border: filled ? "none" : "1.5px dashed rgba(255,255,255,.35)",
              boxShadow: filled ? "0 0 16px rgba(250,82,82,.7)" : "none",
            });
          }
          sl.style.transform = `scale(${filled ? lerp(1.35, 1, E.outBack(seg(t, A(fl.tok[1]), A(fl.tok[1]) + 0.2))) : 1})`;
        }
        if (!show1) pk.style.display = "none";
        // the secret leaves the vault only towards the service
        const tp = seg(t, A(fl.tok[0]), A(fl.tok[1]));
        if (tp > 0 && tp < 1) {
          const sx = 720 + 18 + 14 + 10 + 15,
            sy = 470 + 282 + 46 + 23,
            ex = 960 + PW / 2 - 7 - 15,
            ey = LANE;
          css(tok, {
            display: "flex",
            left: lerp(sx, ex, E.inOutCubic(tp)) - 15 + "px",
            top: lerp(sy, ey, E.outCubic(tp)) - 15 + "px",
            transform: `scale(${1 + 0.35 * Math.sin(tp * Math.PI)})`,
          });
        } else tok.style.display = "none";
        // response packet (no secret on the way back)
        const bp = seg(t, A(fl.back[0]), A(fl.back[1]));
        if (bp > 0 && bp < 1) {
          const [x, y] = fl.RB.at(lerp(fl.b0, fl.b1, E.inOutCubic(seg(bp, 0.12, 0.88))));
          const te = qk(rp, "t");
          if (te.textContent !== fl.res) te.textContent = fl.res;
          const g0 = seg(bp, 0, 0.12),
            g1 = seg(bp, 0.88, 1),
            sx = g0 < 1 ? E.outCubic(g0) : 1 - E.inCubic(g1);
          css(rp, {
            display: "flex",
            left: x - RPW / 2 + "px",
            top: y - 23 + "px",
            opacity: Math.min(1, sx * 4),
            transform: `scaleX(${Math.max(0.001, sx)})`,
            transformOrigin: g0 < 1 ? "100% 50%" : "0% 50%",
          });
        } else rp.style.display = "none";
        // trails
        Object.entries(TR).forEach(([k, tr]) => {
          let p = 0,
            a = 0;
          FL.forEach((f) => {
            const fade = 1 - seg(t, A(f.end), A(f.end) + 0.25);
            if (k === f.tr && t >= A(f.go[0])) {
              p = E.inOutCubic(seg(t, A(f.go[0]), A(f.go[1])));
              a = fade;
            }
            if (k === "s" && t >= A(f.go2[0]) && t < A(f.end) + 0.25) {
              p = E.inOutCubic(seg(t, A(f.go2[0]), A(f.go2[1])));
              a = fade;
            }
            if (k === f.trb && t >= A(f.back[0])) {
              p = E.inOutCubic(seg(t, A(f.back[0]), A(f.back[1])));
              a = fade;
            }
          });
          const L = tr.r.len;
          [tr.g, tr.e].forEach((e) => {
            e.setAttribute("stroke-dasharray", `${L} ${L + 10}`);
            e.setAttribute("stroke-dashoffset", (L * (1 - p)).toFixed(1));
            e.style.opacity = p > 0 ? a : 0;
          });
        });
        // gate checks
        checks.forEach((_, i) => {
          const c = qk(gate, "cs" + i),
            okT = A([1.42, 1.5, 1.58][i]);
          const want = t >= okT ? "ok" : t >= A(1.3) ? "spin" : "idle";
          if (c.dataset.s !== want) {
            c.dataset.s = want;
            c.innerHTML =
              want === "ok"
                ? check
                : want === "spin"
                  ? spin
                  : `<span style="width:10px;height:10px;border-radius:50%;background:#3a3a43"></span>`;
          }
          c.style.transform =
            want === "spin"
              ? `rotate(${t * 720}deg)`
              : want === "ok"
                ? `scale(${lerp(1.5, 1, E.outBack(seg(t, okT, okT + 0.2)))})`
                : "";
          const row = qk(gate, "ck" + i),
            gl = pulse(t, A(2.96) + i * 0.03, 6) + 0.8 * pulse(t, okT, 5);
          row.style.background = `rgba(105,219,124,${(0.12 * gl).toFixed(3)})`;
          row.style.borderRadius = "10px";
        });
        const vg = Math.max(
          ...FL.map((f) => seg(t, A(f.tok[0]) - 0.08, A(f.tok[0])) * (1 - seg(t, A(f.tok[1]), A(f.tok[1]) + 0.2))),
        );
        qk(gate, "vault").style.borderColor = `rgba(250,82,82,${(0.35 + 0.5 * vg).toFixed(3)})`;
        qk(gate, "vk").style.boxShadow = `0 0 ${(22 * vg).toFixed(1)}px rgba(250,82,82,${(0.9 * vg).toFixed(3)})`;
        const nr = Math.max(...FL.map((f) => pulse(t, A(lerp(f.back[0], f.back[1], 0.42)), 5)));
        qk(gate, "nr").style.transform = `scale(${1 + 0.12 * nr})`;
        qk(gate, "nr").style.boxShadow = `0 0 ${(20 * nr).toFixed(1)}px rgba(250,82,82,${(0.8 * nr).toFixed(3)})`;
        // service log + caller results
        FL.forEach((f, i) => {
          enterY(qk(svc, "lg" + i), t, A(f.hit), 12);
          pop(qk(svc, "st" + i), t, A(f.hit) + 0.06, 0.5);
          pop(qk(f.c, "res"), t, A(f.back[1]) - 0.02, 0.7);
          const on = t >= A(f.appear) && t < A(f.back[1]) + 0.3;
          f.c.style.borderColor = on ? "rgba(250,82,82,.6)" : "rgba(255,255,255,.1)";
        });
        const hit = Math.max(...FL.map((f) => pulse(t, A(f.hit), 6)));
        svc.style.borderColor = `rgba(250,82,82,${(0.1 + 0.7 * hit).toFixed(3)})`;
        svc.style.boxShadow = `0 24px 60px rgba(0,0,0,.45), 0 0 ${(50 * hit).toFixed(1)}px rgba(250,82,82,${(0.45 * hit).toFixed(3)})`;
        // numbered steps follow the first round trip
        const cur = stepAt.reduce((k, a, i) => (t >= A(a) ? i : k), -1);
        STEPS.forEach((_, i) => {
          const n = qk(stepper, "n" + i),
            l = qk(stepper, "l" + i),
            lit = i <= cur,
            now = i === cur && t < A(2.7);
          css(n, {
            background: lit ? RED : "transparent",
            border: lit ? "none" : "2px solid #3a3a43",
            color: lit ? "#fff" : "#6f6f7c",
            boxShadow: now ? "0 0 20px rgba(250,82,82,.7)" : "none",
          });
          n.style.transform = `scale(${lit ? lerp(1.4, 1, E.outBack(seg(t, A(stepAt[i]), A(stepAt[i]) + 0.25))) : 1})`;
          l.style.color = lit ? "#fff" : "#6f6f7c";
        });
      },
    };
  })();

  // ════════════════════════════ SCENE FD-B — THE FRONT DOOR, LIVE: one prompt, seven services (2 bars) ════════════════════════════
  const SFD = (() => {
    const T0 = 13 * BAR,
      T1 = 15 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "DEMO", "INTEGRATION REQUESTS");
    const h1 = riseLine(root, "One prompt,", { x: 104, y: 164, w: 900, size: 98, weight: 830 });
    const h2 = riseLine(root, "seven services.", { x: 104, y: 276, w: 900, size: 98, weight: 830, color: RED });
    const s1 = riseLine(root, "An agent deployed ntfy, then wired it", {
      x: 110,
      y: 420,
      w: 840,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const s2 = riseLine(root, "into everything, through the front door.", {
      x: 110,
      y: 466,
      w: 840,
      size: 34,
      weight: 500,
      ls: "-0.01em",
      color: "#b5b5bf",
    });
    const feats = [
      ["lock", "Credentials stay in Homarr"],
      ["route", "Locked to the integration’s URL"],
      ["circle-check", "Assistant asks before every call"],
    ].map(([i, l], k) =>
      frag(
        root,
        `<div class="abs mono" style="left:110px;top:${566 + k * 58}px;display:flex;align-items:center;gap:14px;font-size:22px;color:#e4e4ea;white-space:nowrap"><span class="center" style="display:flex;width:40px;height:40px;border-radius:11px;background:rgba(250,82,82,.14)">${tab(i, 22, RED_L)}</span>${l}</div>`,
      ),
    );
    const api = frag(
      root,
      `<div class="abs mono" style="left:110px;top:778px;display:flex;align-items:center;gap:12px;font-size:19px;white-space:nowrap;padding:12px 18px;border-radius:12px;background:#15151a;border:1px solid rgba(255,255,255,.1)"><span style="color:${RED_L};font-weight:700">integration_request</span><span style="color:${DIM}">· MCP · REST · tRPC</span></div>`,
    );
    const PROMPT =
      "Could you install a notification provider and then set it up everywhere it’s supported in my installed integrations?";
    const STEPS = [
      [`<span style="color:#e4e4ea">docker_getEndpoints</span><span style="color:${DIM}">· Docker host found</span>`],
      [
        `<span style="color:#e4e4ea">question</span><span style="color:${DIM}">· which provider? →</span><span style="color:${RED_L}">ntfy (recommended)</span>`,
      ],
      [
        `${iconImg("ntfy", 20)}<span style="color:#e4e4ea">deploy ntfy</span><span style="color:${DIM}">· running on Docker</span>`,
      ],
      [
        `<span style="color:${RED_L}">integration_request</span><span style="color:${DIM}">· sonarr · POST /api/v3/notification</span>`,
      ],
    ];
    const RES = [
      ["sonarr", "Sonarr", "Native ntfy connection", "TEST FIRED"],
      ["radarr", "Radarr", "Native ntfy connection", "TEST FIRED"],
      ["seerr", "Seerr", "JSON webhook", "SAVED"],
      ["sabNzbd", "SABnzbd", "Completion script", "DRY RUN"],
      ["qBittorrent", "qBittorrent", "AutoRun completion hook", "PERSISTED"],
      ["bazarr", "Bazarr", "ntfy provider enabled", "RESTARTED"],
      ["beszel", "Beszel", "Webhook + alerts, 8 systems", "29 ALERTS"],
    ];
    const panel = frag(
      root,
      `<div class="abs" style="left:980px;top:96px;width:850px;height:888px;border-radius:26px;background:linear-gradient(180deg,#141418,#101013);border:1px solid rgba(255,255,255,.09);overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55)">
      <div class="abs" style="left:0;top:0;width:850px;height:66px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:14px;padding:0 24px;box-sizing:border-box">
        <span class="center" style="display:flex;width:38px;height:38px;border-radius:11px;background:${RED}">${tab("plug", 21, "#fff")}</span>
        <span style="font-size:23px;font-weight:740">Your agent</span>
        <span class="mono" style="margin-left:auto;font-size:14px;color:${DIM};letter-spacing:.12em">HOMARR MCP · /api/mcp</span></div>
      <div class="abs" data-k="u" style="left:auto;right:24px;top:86px;width:660px;padding:14px 20px;border-radius:18px 18px 4px 18px;background:rgba(250,82,82,.16);border:1px solid rgba(250,82,82,.38);font-size:21px;line-height:1.42;box-sizing:border-box"><span data-k="ut"></span><span data-k="uc" style="display:inline-block;width:2px;height:22px;background:${RED_L};vertical-align:-4px;margin-left:2px"></span></div>
      <div class="abs mono" data-k="model" style="left:auto;right:26px;top:190px;font-size:13px;letter-spacing:.16em;color:${DIM}">QWEN3.8-27B · MLX · RUNNING LOCALLY</div>
      ${STEPS.map(
        (
          s,
          i,
        ) => `<div class="abs mono" data-k="st${i}" style="left:24px;top:${226 + i * 44}px;display:flex;align-items:center;gap:10px;font-size:16px;padding:7px 12px;border-radius:10px;background:#1c1c22;border:1px solid rgba(255,255,255,.07);white-space:nowrap">
        <span data-k="si${i}" class="center" style="display:flex;width:20px;height:20px"></span>${s[0]}</div>`,
      ).join("")}
      <div class="abs mono" data-k="th" style="left:24px;top:410px;width:802px;display:flex;font-size:13px;letter-spacing:.18em;color:#6f6f7c;padding:0 14px;box-sizing:border-box">
        <span style="width:196px">SERVICE</span><span style="flex:1">HOW</span><span>VERIFIED</span></div>
      ${RES.map(
        (
          r,
          i,
        ) => `<div class="abs" data-k="r${i}" style="left:24px;top:${436 + i * 50}px;width:802px;height:44px;border-radius:11px;background:${i % 2 ? "#17171c" : "#1b1b21"};display:flex;align-items:center;padding:0 14px;box-sizing:border-box;gap:12px">
        <span style="display:flex;align-items:center;gap:12px;width:184px;font-size:19px;font-weight:680;white-space:nowrap">${iconImg(r[0], 26)}${r[1]}</span>
        <span style="flex:1;font-size:17px;color:#b5b5bf;white-space:nowrap">${r[2]}</span>
        <span class="mono" data-k="v${i}" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;letter-spacing:.08em;padding:5px 10px;border-radius:8px;background:rgba(64,192,87,.16);color:#8ce99a;white-space:nowrap">${tab("check", 14, "#8ce99a", 3)}${r[3]}</span></div>`,
      ).join("")}
      <div class="abs" data-k="foot" style="left:24px;top:808px;width:802px;height:56px;border-radius:14px;background:rgba(252,196,25,.08);border:1px dashed rgba(252,196,25,.35);display:flex;align-items:center;gap:12px;padding:0 18px;box-sizing:border-box;font-size:18px;color:#ffe8a3;white-space:nowrap">
        ${tab("flame", 22, "#fcc419")}<b style="font-weight:750">Cost: $0.</b><span style="color:#d9c9a0">Local model on MLX. Only side effect: warm feet.</span></div></div>`,
    );
    const toasts = ["Sonarr", "Radarr"].map((n, i) =>
      frag(
        root,
        `<div class="abs" style="left:${110 + i * 412}px;top:868px;width:392px;height:76px;border-radius:18px;background:rgba(36,36,42,.96);border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 40px rgba(0,0,0,.55);display:flex;align-items:center;gap:14px;padding:0 16px;box-sizing:border-box;z-index:10">
      <span class="center" style="display:flex;width:44px;height:44px;border-radius:12px;background:#2a2a31">${iconImg("ntfy", 30)}</span>
      <span style="display:flex;flex-direction:column;gap:2px;flex:1"><span style="font-size:18px;font-weight:720">${n} · Test notification</span><span class="mono" style="font-size:13px;color:${DIM};letter-spacing:.08em">NTFY · NOW</span></span>${tab("bell-ringing", 22, RED_L)}</div>`,
      ),
    );
    const O = (x) => T0 + x;
    const stepT = [
      [1.05, 1.17],
      [1.25, 1.37],
      [1.45, 1.62],
      [1.7, 1.85],
    ];
    const spin = tab("loader-2", 18, RED_L),
      check = tab("circle-check", 18, "#69db7c");
    return {
      t0: T0 - 0.2,
      t1: T1,
      root,
      update(t) {
        enterX(tg, t, O(0.05));
        h1.set(E.outExpo(seg(t, O(0.1), O(0.6))));
        h2.set(E.outExpo(seg(t, O(0.2), O(0.7))));
        s1.set(E.outExpo(seg(t, O(0.35), O(0.85))));
        s2.set(E.outExpo(seg(t, O(0.42), O(0.92))));
        feats.forEach((f, k) => enterX(f, t, O(0.55 + k * 0.07)));
        enterY(api, t, O(0.8), 16);
        const pp = E.outExpo(seg(t, O(0), O(0.6)));
        panel.style.opacity = seg(t, O(-0.05), O(0.1));
        panel.style.transform = `translateX(${(1 - pp) * 140}px)`;
        const n = Math.floor(clamp((t - O(0.3)) / 0.006, 0, PROMPT.length));
        qk(panel, "ut").textContent = PROMPT.slice(0, n);
        qk(panel, "uc").style.opacity = n < PROMPT.length ? 1 : 0;
        qk(panel, "u").style.opacity = t > O(0.28) ? 1 : 0;
        enterY(qk(panel, "model"), t, O(1.0), 10);
        stepT.forEach(([a, b], i) => {
          enterY(qk(panel, "st" + i), t, O(a), 14);
          const ic = qk(panel, "si" + i),
            want = t >= O(b) ? "ok" : "spin";
          if (ic.dataset.s !== want) {
            ic.innerHTML = want === "ok" ? check : spin;
            ic.dataset.s = want;
          }
          ic.style.transform =
            t < O(b) ? `rotate(${t * 720}deg)` : `scale(${lerp(1.5, 1, E.outBack(seg(t, O(b), O(b) + 0.2)))})`;
        });
        enterY(qk(panel, "th"), t, O(1.82), 10);
        RES.forEach((_, i) => {
          const a = O(1.9 + i * 0.13);
          const r = qk(panel, "r" + i),
            p = E.outExpo(seg(t, a, a + 0.4));
          r.style.opacity = seg(t, a, a + 0.08);
          r.style.transform = `translateX(${(1 - p) * 50}px)`;
          pop(qk(panel, "v" + i), t, a + 0.1, 0.5);
        });
        toasts.forEach((e, i) => {
          const a = O(2.8 + i * 0.12),
            p = E.outBack(seg(t, a, a + 0.45));
          e.style.opacity = seg(t, a, a + 0.06);
          e.style.transform = `translateY(${(1 - p) * 60}px)`;
        });
        pop(qk(panel, "foot"), t, O(3.05), 0.85);
      },
    };
  })();

  // ════════════════════════════ SCENE 12 — BOARD EDITING, REBUILT (28.125 → 30) ════════════════════════════
  const S12 = (() => {
    const T0 = 15 * BAR,
      T1 = 16 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "REWORK", "DRAG & DROP");
    const h1 = riseLine(root, "Board editing,", { x: 104, y: 164, w: 900, size: 104, weight: 830 });
    const h2 = riseLine(root, "rebuilt.", { x: 104, y: 282, w: 900, size: 104, weight: 830, color: RED });
    const feats = ["8-direction resize", "Containers", "Multi-select", "Mobile layouts", "Fixed sidebars"].map((l, k) =>
      frag(
        root,
        `<div class="abs" style="left:110px;top:${440 + k * 62}px;display:flex;align-items:center;gap:16px;font-size:30px;font-weight:600;white-space:nowrap;color:#e4e4ea"><span data-k="d" style="width:12px;height:12px;border-radius:50%;background:#3a3a43"></span>${l}</div>`,
      ),
    );
    const seg2 = frag(
      root,
      `<div class="abs mono" style="left:1238px;top:112px;display:flex;border-radius:12px;background:#17171c;border:1px solid rgba(255,255,255,.1);padding:4px;font-size:17px;letter-spacing:.1em">
      <span data-k="b" style="padding:8px 18px;border-radius:9px">BASE</span><span data-k="m" style="padding:8px 18px;border-radius:9px">MOBILE</span></div>`,
    );
    const frame = div("abs", root);
    css(frame, {
      background: "linear-gradient(180deg,#141418,#0f0f12)",
      border: "1px solid rgba(255,255,255,.1)",
      boxShadow: "0 40px 90px rgba(0,0,0,.55)",
      overflow: "hidden",
      boxSizing: "border-box",
    });
    const fhead = frag(
      frame,
      `<div class="abs" style="left:0;top:0;width:100%;height:44px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:10px;padding:0 16px;box-sizing:border-box">${logoSVG(30)}<span style="font-size:17px;font-weight:720">Homarr</span></div>`,
    );
    void fhead;
    const D = (c, r, w, h) => ({
      x: 20 + c * 142,
      y: 60 + r * 123,
      w: w * 130 + (w - 1) * 12,
      h: h * 111 + (h - 1) * 12,
    });
    const M = (x, y, w, h) => ({ x, y, w, h });
    const item = (html, d, m, extra = "") => {
      const e = frag(frame, `<div class="wcard" style="border-radius:14px;${extra}">${html}</div>`);
      return { e, d, m };
    };
    const media = item(
      `<div class="abs" style="left:14px;top:10px;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#cfcfd6">Media ${tab("chevron-down", 16, "#8d8d97")}</div>`,
      D(0, 0, 3, 2),
      M(16, 58, 348, 132),
      "background:rgba(250,82,82,.05);border:2px dashed rgba(250,82,82,.45)",
    );
    const mt = ["sonarr", "radarr", "jellyfin", "plex"].map((k, i) => {
      const e = frag(
        media.e,
        `<div class="abs center" style="border-radius:12px;background:#1f1f25;border:1px solid rgba(255,255,255,.08)">${iconImg(k, 44)}</div>`,
      );
      return {
        e,
        d: { x: 12 + (i % 2) * 201, y: 40 + Math.floor(i / 2) * 90, w: 189, h: 80 },
        m: { x: 12 + i * 81, y: 42, w: 72, h: 72 },
      };
    });
    const clock = item(
      `<div class="abs tnum" style="left:16px;top:18px;font-size:46px;font-weight:720;letter-spacing:-.04em">14:32</div><div class="abs" style="left:17px;top:72px;font-size:14px;color:${DIM}">Saturday</div>`,
      D(3, 0, 2, 1),
      M(16, 202, 214, 100),
    );
    const weather = item(
      `<div class="abs center" style="left:0;top:0;width:100%;height:100%;flex-direction:column;gap:2px">${tab("sun", 40, "#fcc419", 1.6)}<span style="font-size:24px;font-weight:720">21°</span></div>`,
      D(5, 0, 1, 1),
      M(242, 202, 122, 100),
    );
    const dls = item(
      `<div class="abs" style="left:16px;top:14px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:650;color:#cfcfd6">${iconImg("qBittorrent", 18)}Downloads</div>${[0, 1].map((i) => `<div class="bar" style="left:16px;right:16px;top:${52 + i * 24}px"><i style="width:${[64, 38][i]}%"></i></div>`).join("")}`,
      D(3, 1, 3, 1),
      M(16, 314, 348, 100),
    );
    const cal = item(
      `<div class="abs" style="left:16px;top:14px;font-size:15px;font-weight:650;color:#cfcfd6">September</div>${Array.from({ length: 21 }, (_, i) => `<div class="abs" style="left:${16 + (i % 7) * 34}px;top:${48 + Math.floor(i / 7) * 30}px;width:24px;height:22px;border-radius:6px;background:${i === 11 ? RED : "rgba(255,255,255,.07)"}"></div>`).join("")}`,
      D(0, 2, 2, 2),
      M(16, 618, 348, 160),
    );
    const sys = item(
      `<div class="abs" style="left:16px;top:14px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:650;color:#cfcfd6">${iconImg("proxmox", 18)}System</div>
      <svg class="abs" style="left:0;top:auto;bottom:0" width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 90 L40 70 L80 80 L120 40 L160 60 L200 30 L240 55 L280 25 L320 45 L360 20 L400 35 L400 120 L0 120 Z" fill="rgba(250,82,82,.3)"/><path d="M0 90 L40 70 L80 80 L120 40 L160 60 L200 30 L240 55 L280 25 L320 45 L360 20 L400 35" fill="none" stroke="#ff6b6b" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`,
      D(4, 2, 2, 2),
      M(16, 426, 348, 180),
    );
    const handles = Array.from({ length: 8 }, () =>
      css(div("abs", frame), {
        width: "14px",
        height: "14px",
        borderRadius: "4px",
        background: "#fff",
        border: `3px solid ${RED}`,
        boxSizing: "border-box",
        zIndex: 5,
      }),
    );
    const ghost = div("abs", frame);
    css(ghost, {
      border: "2px dashed rgba(250,82,82,.8)",
      background: "rgba(250,82,82,.07)",
      borderRadius: "14px",
      boxSizing: "border-box",
    });
    const cur = mkCursor(frame);
    const items = [media, clock, weather, dls, cal, sys];
    const sysD2 = D(2, 2, 4, 2);
    const FD = { x: 950, y: 200, w: 880, h: 560, r: 20 },
      FM = { x: 1350, y: 176, w: 380, h: 800, r: 52 };
    const RS = T0 + 0.27,
      RE = T0 + 0.62,
      MS = T0 + 0.84,
      ME = T0 + 1.48;
    const L = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });
    const place = (e, r) => css(e, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        enterX(tg, t, T0 + 0.02);
        h1.set(E.outExpo(seg(t, T0 + 0.05, T0 + 0.55)));
        h2.set(E.outExpo(seg(t, T0 + 0.15, T0 + 0.65)));
        const active = t < RE + 0.1 ? 0 : t < MS ? 1 : 3;
        feats.forEach((f, k) => {
          enterX(f, t, T0 + 0.25 + k * 0.06);
          const on = k === active || (k === 1 && t > T0 + 0.5) ? 1 : 0;
          const d = q(f, '[data-k="d"]');
          d.style.background = on ? RED : "#3a3a43";
          d.style.boxShadow = on ? `0 0 14px ${RED}` : "none";
          f.style.color = on ? "#fff" : "#9a9aa5";
        });
        const mp = E.inOutCubic(seg(t, MS, ME));
        const fr = L(FD, FM, mp);
        const fe = E.outExpo(seg(t, T0 - 0.1, T0 + 0.55));
        place(frame, fr);
        frame.style.borderRadius = lerp(FD.r, FM.r, mp) + "px";
        frame.style.opacity = seg(t, T0 - 0.1, T0 + 0.05);
        frame.style.transform = `translateX(${(1 - fe) * 200}px) rotateY(${(1 - fe) * -20}deg)`;
        const onM = mp > 0.5;
        q(seg2, '[data-k="b"]').style.background = onM ? "transparent" : RED;
        q(seg2, '[data-k="m"]').style.background = onM ? RED : "transparent";
        seg2.style.opacity = seg(t, T0 + 0.2, T0 + 0.35);
        // resize System from its left edge (grows leftwards — 8-direction handles)
        const rp = E.inOutCubic(seg(t, RS + 0.05, RE));
        const settle = t > RE ? spring(seg(t, RE, RE + 0.4)) : 0;
        const sysDnow = { x: lerp(sys.d.x, sysD2.x, rp), y: sys.d.y, w: lerp(sys.d.w, sysD2.w, rp), h: sys.d.h };
        const sysDfinal = t > RE ? sysD2 : sysDnow;
        items.forEach((it) => {
          const d = it === sys ? sysDfinal : it.d;
          place(it.e, L(d, it.m, mp));
          const k = items.indexOf(it),
            a = T0 + 0.05 + k * 0.04;
          it.e.style.opacity = seg(t, a, a + 0.1);
          it.e.style.transform =
            it === sys && t > RE
              ? `scale(${1 + 0.02 * (1 - settle)})`
              : `scale(${lerp(0.85, 1, spring(seg(t, a, a + 0.5)))})`;
        });
        mt.forEach((m) => place(m.e, L(m.d, m.m, mp)));
        const hv = seg(t, RS - 0.08, RS) * (1 - seg(t, RE + 0.12, RE + 0.22));
        const r = sysDfinal;
        const hp = [
          [0, 0],
          [0.5, 0],
          [1, 0],
          [1, 0.5],
          [1, 1],
          [0.5, 1],
          [0, 1],
          [0, 0.5],
        ];
        handles.forEach((h, i) =>
          css(h, {
            left: r.x + hp[i][0] * r.w - 7 + "px",
            top: r.y + hp[i][1] * r.h - 7 + "px",
            opacity: hv,
            display: hv > 0 ? "" : "none",
          }),
        );
        const gv = seg(t, RS + 0.1, RS + 0.18) * (1 - seg(t, RE, RE + 0.06));
        place(ghost, sysD2);
        ghost.style.opacity = gv;
        const hx = r.x,
          hy = r.y + r.h / 2;
        const cin = E.inOutCubic(seg(t, T0 + 0.05, RS));
        const cx = t < RS ? lerp(hx + 320, sys.d.x, cin) : hx,
          cy = t < RS ? lerp(hy + 200, hy, cin) : hy;
        cur.set(t, cx, cy, seg(t, T0 + 0.05, T0 + 0.12) * (1 - seg(t, RE + 0.15, RE + 0.25)), [
          [RS, sys.d.x, hy],
          [RE, sysD2.x, hy],
        ]);
      },
    };
  })();

  // ════════════════════════════ SCENE 13 — SETUP STUDIO + DOCKER (30 → 31.875) ════════════════════════════
  const S13 = (() => {
    const T0 = 16 * BAR,
      T1 = 17 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const tg = tag(root, 110, 116, "NEW", "SETUP STUDIO");
    const h1 = riseLine(root, "Guided setup.", { x: 104, y: 164, w: 900, size: 104, weight: 830 });
    const h2 = riseLine(root, "Apps found for you.", { x: 104, y: 282, w: 900, size: 84, weight: 830, color: RED });
    const steps = ["Essentials", "Discover", "Connect", "Board", "Extend", "Review"];
    const stepper = frag(
      root,
      `<div class="abs" style="left:110px;top:430px;width:700px;height:520px">
      <div class="abs" style="left:21px;top:22px;width:3px;height:${5 * 86}px;background:#2a2a31"></div>
      <div class="abs" data-k="fill" style="left:21px;top:22px;width:3px;height:0;background:${RED};box-shadow:0 0 12px ${RED}"></div>
      ${steps
        .map(
          (
            s,
            i,
          ) => `<div class="abs" data-k="s${i}" style="left:0;top:${i * 86}px;display:flex;align-items:center;gap:22px;white-space:nowrap">
        <span data-k="c${i}" class="center" style="display:flex;width:44px;height:44px;border-radius:50%;background:#1d1d23;border:2px solid #3a3a43;box-sizing:border-box;font-family:JB;font-size:17px;color:#8d8d97">${i + 1}</span>
        <span style="font-size:30px;font-weight:650">${s}</span><span class="mono" style="font-size:15px;color:#6f6f7c;letter-spacing:.14em">${i + 1}/6</span></div>`,
        )
        .join("")}</div>`,
    );
    const svc = [
      ["prowlarr", "prowlarr", 1],
      ["homarr", "homarr", 0],
      ["piHole", "pihole", 1],
      [null, "nginx-proxy", 0],
      [null, "watchtower", 0],
      ["tdarr", "tdarr", 1],
      ["bazarr", "bazarr", 1],
    ];
    const panel = frag(
      root,
      `<div class="abs" style="left:980px;top:130px;width:840px;height:830px;border-radius:26px;background:linear-gradient(180deg,#141418,#101013);border:1px solid rgba(255,255,255,.09);overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55)">
      <div class="abs" style="left:30px;top:26px;display:flex;align-items:center;gap:14px;font-size:27px;font-weight:760">${tab("brand-docker", 36, "#339af0", 1.7)}Assisted Docker setup
        <span class="mono" data-k="cnt" style="font-size:14px;letter-spacing:.12em;padding:5px 10px;border-radius:7px;background:rgba(250,82,82,.14);color:${RED_L}">7 SUGGESTIONS</span></div>
      <div class="abs mono" style="left:32px;top:80px;font-size:15px;letter-spacing:.22em;color:${DIM}">DOCKER · PODMAN · HOMEPAGE LABELS</div>
      ${svc
        .map(
          (
            [k, n, ready],
            i,
          ) => `<div class="abs" data-k="row${i}" style="left:24px;top:${128 + i * 94}px;width:792px;height:80px;border-radius:16px;background:#1b1b21;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:18px;padding:0 20px;box-sizing:border-box">
        <span class="center" style="display:flex;width:48px;height:48px;border-radius:12px;background:#24242b">${k ? iconImg(k, 34) : tab(n === "watchtower" ? "refresh" : "server", 26, "#a5a5b0")}</span>
        <span style="display:flex;flex-direction:column;gap:3px;flex:1"><span style="font-size:23px;font-weight:680">${n}</span><span class="mono" style="font-size:14px;color:${ready ? "#74c0fc" : "#b197fc"};letter-spacing:.12em">${ready ? "READY TO CONNECT" : "NEW SERVICE"}</span></span>
        <span class="center mono" data-k="act${i}" style="display:flex;gap:8px;height:42px;padding:0 16px;border-radius:11px;background:rgba(250,82,82,.14);color:${RED_L};font-size:15px;font-weight:700;white-space:nowrap">${ready ? "Set up integration" : "Create app"}</span></div>`,
        )
        .join("")}</div>`,
    );
    const ST = (i) => T0 + 0.3 + i * 0.14;
    const AT = (i) => T0 + 0.62 + i * 0.12;
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        enterX(tg, t, T0 + 0.02);
        h1.set(E.outExpo(seg(t, T0 + 0.05, T0 + 0.55)));
        h2.set(E.outExpo(seg(t, T0 + 0.15, T0 + 0.65)));
        const pp = E.outExpo(seg(t, T0, T0 + 0.6));
        panel.style.opacity = seg(t, T0, T0 + 0.1);
        panel.style.transform = `perspective(1800px) rotateY(${(1 - pp) * -24}deg) translateX(${(1 - pp) * 120}px)`;
        steps.forEach((_, i) => {
          const s = qk(stepper, "s" + i);
          enterX(s, t, T0 + 0.18 + i * 0.04, 30);
          const c = qk(stepper, "c" + i),
            done = t >= ST(i);
          if (c.dataset.s !== String(done)) {
            c.dataset.s = String(done);
            c.innerHTML = done ? tab("check", 22, "#fff", 3) : String(i + 1);
            css(c, { background: done ? RED : "#1d1d23", borderColor: done ? RED : "#3a3a43" });
          }
          c.style.transform = `scale(${done ? lerp(1.35, 1, E.outBack(seg(t, ST(i), ST(i) + 0.25))) : 1})`;
        });
        qk(stepper, "fill").style.height = 5 * 86 * E.inOutCubic(seg(t, ST(0), ST(5))) + "px";
        svc.forEach(([, , ready], i) => {
          enterY(qk(panel, "row" + i), t, T0 + 0.1 + i * 0.05, 30);
          const a = qk(panel, "act" + i),
            done = t >= AT(i);
          if (a.dataset.s !== String(done)) {
            a.dataset.s = String(done);
            a.innerHTML = done ? `${tab("check", 18, "#fff", 3)}Added` : ready ? "Set up integration" : "Create app";
            css(a, { background: done ? "#2b8a3e" : "rgba(250,82,82,.14)", color: done ? "#fff" : RED_L });
          }
          a.style.transform = `scale(${done ? lerp(1.2, 1, E.outBack(seg(t, AT(i), AT(i) + 0.25))) : 1})`;
        });
        const cnt = qk(panel, "cnt"),
          all = t >= AT(6) + 0.1;
        cnt.textContent = all ? "7 ADDED" : "7 SUGGESTIONS";
        css(cnt, { background: all ? "rgba(64,192,87,.18)" : "rgba(250,82,82,.14)", color: all ? "#8ce99a" : RED_L });
      },
    };
  })();

  // ════════════════════════════ SCENE 14 — +31 INTEGRATIONS & STATISTICS (31.875 → 33.75) ════════════════════════════
  const S14 = (() => {
    const T0 = 17 * BAR,
      T1 = 18 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const NEWK = [
      "autobrr",
      "fileflows",
      "jackett",
      "jellystat",
      "komga",
      "maintainerr",
      "romm",
      "stash",
      "tubearchivist",
      "unmanic",
      "xteve",
      "yourSpotify",
      "caddy",
      "changedetection",
      "frigate",
      "gatus",
      "healthchecks",
      "netalertx",
      "netdata",
      "prometheus",
      "scrutiny",
      "syncthingRelay",
      "homebox",
      "karakeep",
      "linkwarden",
      "mealie",
      "miniflux",
      "plantit",
      "spoolman",
      "tandoor",
      "trilium",
    ];
    const cam = div("full", root);
    const tg = tag(cam, 110, 116, "NEW", "INTEGRATIONS");
    const cnt = div("abs", cam);
    css(cnt, {
      left: "96px",
      top: "170px",
      height: "300px",
      display: "flex",
      fontSize: "330px",
      fontWeight: 900,
      letterSpacing: "-0.06em",
      lineHeight: "300px",
      color: RED,
    });
    const plus = el("span", "", cnt, "+");
    css(plus, { display: "inline-block", marginRight: "6px" });
    const cols = [0, 1].map(() => {
      const m = div("mask", cnt);
      css(m, { height: "300px", display: "inline-block" });
      const s = div("", m);
      s.innerHTML = [..."01234567890"].map((d) => `<div class="tnum" style="height:300px">${d}</div>`).join("");
      return s;
    });
    const lab = riseLine(cam, "new integrations", { x: 104, y: 478, w: 760, size: 64, weight: 760, ls: "-0.03em" });
    const tot = riseLine(cam, "87 IN TOTAL · MEDIA · MONITORING · HOME", {
      x: 110,
      y: 572,
      w: 760,
      size: 20,
      weight: 500,
      ls: ".26em",
      color: "#a5a5b0",
      font: "JB",
    });
    const gridP = div("full", cam);
    css(gridP, { perspective: "1400px" });
    const tiles = NEWK.map((k, i) => {
      const c = i % 8,
        r = Math.floor(i / 8);
      const e = frag(
        gridP,
        `<div class="abs center" style="left:${846 + c * 122}px;top:${120 + r * 122}px;width:104px;height:104px;border-radius:26px;background:radial-gradient(circle at 50% 45%,#4a4a55 0%,#2a2a32 55%,#1e1e24 100%);border:1.5px solid rgba(255,255,255,.14);box-sizing:border-box;box-shadow:0 14px 30px rgba(0,0,0,.4)">${iconImg(k, 64, "filter:drop-shadow(0 0 1px rgba(255,255,255,.55)) drop-shadow(0 0 8px rgba(255,255,255,.12))")}</div>`,
      );
      return { e, c, r };
    });
    const stats = [
      ["sonarr", "Sonarr", 1284, "episodes"],
      ["paperlessNgx", "Paperless-ngx", 3912, "documents"],
      ["navidrome", "Navidrome", 18440, "songs"],
      ["homebox", "Homebox", 612, "items"],
    ];
    const strip = frag(
      cam,
      `<div class="abs" style="left:110px;top:668px;width:1700px;height:300px">
      <div class="abs mono" style="left:0;top:0;font-size:18px;letter-spacing:.26em;color:${RED_L};white-space:nowrap">STATISTICS WIDGET · COMBINE ANY METRIC</div>
      ${stats
        .map(
          (
            s,
            i,
          ) => `<div class="wcard" data-k="st${i}" style="left:${i * 430}px;top:46px;width:410px;height:190px;border-radius:22px">
        <div class="abs" style="left:24px;top:22px;display:flex;align-items:center;gap:12px;font-size:21px;font-weight:680;color:#cfcfd6">${iconImg(s[0], 30)}${s[1]}</div>
        <div class="abs tnum" data-k="v${i}" style="left:22px;top:70px;font-size:66px;font-weight:800;letter-spacing:-.04em">0</div>
        <div class="abs" style="left:24px;top:146px;font-size:19px;color:${DIM}">${s[3]}</div></div>`,
        )
        .join("")}</div>`,
    );
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        const z = E.outExpo(seg(t, T0, T0 + 0.6));
        cam.style.transform = `scale(${lerp(1.18, 1, z)})`;
        cam.style.filter = z < 0.98 ? `blur(${(1 - z) * 10}px)` : "none";
        enterX(tg, t, T0 + 0.02);
        const v = 31 * E.outQuint(seg(t, T0 + 0.05, T0 + 0.85));
        const ones = v % 10,
          carry = ones > 9 ? ones - 9 : 0;
        cols[0].style.transform = `translateY(${-(Math.floor(v / 10) + carry) * 300}px)`;
        cols[1].style.transform = `translateY(${-ones * 300}px)`;
        cnt.style.opacity = seg(t, T0, T0 + 0.1);
        lab.set(E.outExpo(seg(t, T0 + 0.2, T0 + 0.7)));
        tot.set(E.outExpo(seg(t, T0 + 0.35, T0 + 0.85)));
        tiles.forEach((o) => {
          const a = T0 + 0.08 + (o.c + o.r) * 0.035,
            p = seg(t, a, a + 0.5);
          o.e.style.opacity = seg(t, a, a + 0.08);
          o.e.style.transform = `rotateY(${(1 - E.outBack(p)) * 110}deg) translateZ(${(1 - E.outExpo(p)) * 200}px)`;
        });
        stats.forEach((s, i) => {
          const a = T0 + 0.7 + i * 0.07;
          enterY(qk(strip, "st" + i), t, a, 60);
          qk(strip, "v" + i).textContent = fmt(s[2] * E.outCubic(seg(t, a + 0.05, a + 0.6)));
        });
        enterY(q(strip, ".mono"), t, T0 + 0.62, 20);
      },
    };
  })();

  // ════════════════════════════ SCENE 15 — ALSO IN v2 (33.75 → 35.625) ════════════════════════════
  const S15 = (() => {
    const T0 = 18 * BAR,
      T1 = 19 * BAR;
    const root = div("scene", stage);
    v2bg(root);
    const a1 = riseLine(root, "Also in", { x: 100, y: 300, w: 600, size: 120, weight: 830 });
    const a2 = div("abs", root);
    box(a2, 92, 420);
    css(a2, {
      fontSize: "330px",
      fontWeight: 900,
      letterSpacing: "-0.07em",
      lineHeight: 1,
      color: RED,
      transformOrigin: "20% 70%",
    });
    a2.textContent = "v2";
    const more = riseLine(root, "AND A LOT MORE →", {
      x: 110,
      y: 820,
      w: 600,
      size: 24,
      weight: 600,
      ls: ".3em",
      color: RED_L,
      font: "JB",
    });
    const F = [
      ["layout-grid", "Board switcher", "Shift + C"],
      ["command", "Command menu", "Ctrl + K"],
      ["layout-navbar", "Custom header", "Links & shortcuts"],
      ["palette", "Instance branding", "Logo, colors, CSS"],
      ["arrows-maximize", "Advanced views", "Hold Shift"],
      ["clock", "New widgets", "Air Quality · Timer"],
      ["layout-sidebar-right", "Fixed sidebars", "Stay while you scroll"],
      ["shield-check", "Permission matrix", "Viewer · Editor · Admin"],
      ["key", "LDAP & OIDC", "Group sync"],
      ["brand-docker", "Docker & Podman", "Multi-host, labels"],
      ["bolt", "Faster boards", "Shared requests"],
      ["plug", "MCP server", "/api/mcp"],
    ];
    const gp = div("full", root);
    css(gp, { perspective: "1400px" });
    const cards = F.map(([ic, ti, su], i) => {
      const c = i % 3,
        r = Math.floor(i / 3);
      const x = 700 + c * 384,
        y = 118 + r * 196;
      const e = frag(
        gp,
        `<div class="tile" style="left:${x}px;top:${y}px;width:364px;height:176px;border-radius:22px;transform-origin:50% 0">
        <div class="abs center" style="left:24px;top:24px;width:54px;height:54px;border-radius:15px;background:rgba(250,82,82,.14)">${tab(ic, 30, RED_L, 1.8)}</div>
        <div class="abs nowrap" style="left:24px;top:94px;font-size:27px;font-weight:760;letter-spacing:-.02em">${ti}</div>
        <div class="abs mono nowrap" style="left:25px;top:132px;font-size:16px;color:${DIM};letter-spacing:.04em">${su}</div></div>`,
      );
      return { e, x, y, i };
    });
    return {
      t0: T0,
      t1: T1,
      root,
      update(t) {
        a1.set(E.outExpo(seg(t, T0 + 0.02, T0 + 0.5)));
        const vp = seg(t, T0 + 0.12, T0 + 0.5);
        a2.style.opacity = t < T0 + 0.12 ? 0 : 1;
        a2.style.transform = `scale(${lerp(2.2, 1, E.outExpo(vp))})`;
        a2.style.filter = vp < 1 ? `blur(${(1 - E.outExpo(vp)) * 14}px)` : "none";
        more.set(E.outExpo(seg(t, T0 + 1.15, T0 + 1.6)));
        cards.forEach((o) => {
          const a = T0 + 0.08 + o.i * 0.07,
            p = seg(t, a, a + 0.5);
          const cl = E.inBack(seg(t, T1 - 0.2 + (o.i % 4) * 0.012, T1 + 0.02 + (o.i % 4) * 0.012));
          const dx = (960 - (o.x + 182)) * cl,
            dy = (540 - (o.y + 88)) * cl;
          o.e.style.opacity = seg(t, a, a + 0.08) * (1 - seg(t, T1 - 0.06, T1));
          o.e.style.transform = `translate(${dx}px, ${dy}px) rotateX(${(1 - E.outBack(p)) * -95}deg) scale(${1 - 0.9 * clamp(cl)})`;
        });
        const cl = E.inBack(seg(t, T1 - 0.2, T1));
        [a1.wrap, a2, more.wrap].forEach((e) => (e.style.opacity = 1 - seg(t, T1 - 0.12, T1)));
        void cl;
      },
    };
  })();

  // ════════════════════════════ SCENE 16 — END CARD, 3D wordmark (35.625 → 37.5) ════════════════════════════
  const S16 = (() => {
    const T0 = 19 * BAR;
    const root = div("scene", stage);
    css(root, { background: "#070708" });
    const glow = div("full", root);
    css(glow, {
      background: "radial-gradient(ellipse 50% 44% at 50% 38%, rgba(250,82,82,.36), rgba(250,82,82,0) 70%)",
    });
    const rays = div("abs", root);
    box(rays, 960 - 1500, 400 - 1500, 3000, 3000);
    css(rays, {
      background:
        "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,130,130,.08) 0deg 3deg, rgba(255,130,130,0) 3deg 12deg)",
      WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,.4) 18%, transparent 42%)",
    });
    const layer3d = div("full", root);
    const content = div("full", root);
    const tagl = words(content, "A simple, yet powerful dashboard for your server.", {
      y: 780,
      size: 40,
      weight: 500,
      color: "#d5d5dc",
    });
    const pills = frag(
      content,
      `<div class="abs" style="left:0;top:866px;width:${W}px;display:flex;justify-content:center;gap:16px">
      ${["Open source", "Self-hosted", "v2 out now", "homarr.dev"].map((p, i) => `<span class="chip" style="font-size:21px;padding:11px 24px;letter-spacing:.12em;${i === 3 ? `background:${RED};border-color:${RED};color:#fff` : i === 2 ? `color:${RED_L};border-color:rgba(250,82,82,.55)` : "color:#cfcfd6;border-color:rgba(255,255,255,.22)"}">${p}</span>`).join("")}</div>`,
    );
    const pillEls = [...pills.children];
    const rings = [0, 1].map((i) =>
      css(div("abs", root), {
        borderRadius: "50%",
        boxSizing: "border-box",
        border: `${[4, 1.5][i]}px solid ${["#ff8787", "#fff"][i]}`,
      }),
    );
    const flash = div("full", root);
    css(flash, {
      background: "radial-gradient(circle at 50% 38%, #fff 0%, rgba(255,170,170,.7) 30%, rgba(250,82,82,0) 70%)",
    });
    const fade = div("full", root);
    css(fade, { background: "#000" });
    return {
      t0: T0,
      t1: T0 + BAR + 0.01,
      root,
      update(t) {
        const dt = t - T0;
        R3.attach(layer3d);
        const s = lerp(0.1, 0.74, spring(seg(t, T0, T0 + 0.9), 6, 1.8));
        const ry = lerp(-1.3, 0, spring(seg(t, T0, T0 + 1.1), 5, 1.4)) + 0.1 * Math.sin(dt * 1.3);
        R3.wordmark(t, { y: 1.05, s, ry, rx: 0.06 * Math.sin(dt * 0.9) - 0.05 });
        glow.style.opacity = clamp(0.75 + 0.6 * pulse(t, T0, 4));
        rays.style.transform = `rotate(${dt * 9}deg) scale(${lerp(0.6, 1, E.outExpo(seg(t, T0, T0 + 1)))})`;
        rays.style.opacity = E.outCubic(seg(t, T0, T0 + 0.6));
        tagl.ws.forEach((w, i) => {
          const a = T0 + 0.45 + i * 0.035,
            p = E.outExpo(seg(t, a, a + 0.5));
          w.style.transform = `translateY(${(1 - p) * 110}%)`;
        });
        pillEls.forEach((p, i) => {
          const a = T0 + 0.78 + i * 0.07,
            k = spring(seg(t, a, a + 0.6));
          p.style.transform = `scale(${k})`;
          p.style.opacity = seg(t, a, a + 0.08);
        });
        content.style.transform = `scale(${1 + 0.03 * E.outQuad(seg(t, T0, T0 + BAR))})`;
        rings.forEach((r, i) => {
          const a = T0 + i * 0.05,
            p = seg(t, a, a + 0.9),
            d = lerp(120, 2400, E.outExpo(p));
          css(r, {
            left: 960 - d / 2 + "px",
            top: 400 - d / 2 + "px",
            width: d + "px",
            height: d + "px",
            opacity: t < a ? 0 : (1 - E.outQuad(p)) * [0.9, 0.7][i],
          });
        });
        flash.style.opacity = 0.95 * pulse(t, T0, 8);
        fade.style.opacity = E.inCubic(seg(t, T0 + BAR - 0.22, T0 + BAR));
      },
    };
  })();

  // ── v2 transitions: slab wipes, vertical + horizontal whips
  const slab = div("full", stage);
  css(slab, { zIndex: 12, pointerEvents: "none", display: "none" });
  const slabs = [
    ["#ff6b6b", 0],
    [RED, 90],
    ["#1a0b0e", 240],
  ].map(([c, off]) => {
    const e = div("abs", slab);
    css(e, { width: "2600px", height: "1500px", top: "-210px", background: c });
    return { e, off };
  });
  const WIPES = [
    [9 * BAR, 1],
    [10 * BAR, -1],
    [15 * BAR, 1],
    [16 * BAR, -1],
    [18 * BAR, 1],
  ];
  function wipes(t) {
    let on = false;
    for (const [c, dir] of WIPES) {
      const p = seg(t, c - 0.2, c + 0.2);
      if (p <= 0 || p >= 1) continue;
      on = true;
      const x = lerp(-2900, 2300, E.inOutCubic(p));
      slabs.forEach(({ e, off }) => {
        e.style.left = (dir > 0 ? x - off : W - x - 2600 + off) + "px";
        e.style.transform = `skewX(${dir * -14}deg)`;
      });
    }
    slab.style.display = on ? "" : "none";
  }
  const vb = document.getElementById("vblurStd");
  function whip2(t, a, b, outS, inS, axis, dirSign) {
    // stateless: renderFrame clears the whip scenes each frame, so only the active whip writes
    if (t < a || t >= b) return;
    const span = axis === "x" ? W : H;
    const off = (tt) => -dirSign * span * E.inOutExpo(seg(tt, a, b));
    const o = off(t),
      v = (off(t + 1 / 480) - off(t - 1 / 480)) * 240;
    const bl = Math.min(90, Math.abs(v) * 0.004);
    const tr = (d) => (d === 0 ? "" : axis === "x" ? `translateX(${d}px)` : `translateY(${d}px)`);
    outS.root.style.transform = tr(o);
    inS.root.style.transform = tr(t >= b ? 0 : o + dirSign * span);
    const f = bl > 0.4 ? `url(#${axis === "x" ? "hblur2" : "vblur"})` : "none";
    outS.root.style.filter = f;
    inS.root.style.filter = f;
    if (bl > 0.4)
      (axis === "x" ? hb2 : vb).setAttribute(
        "stdDeviation",
        axis === "x" ? `${bl.toFixed(2)} 0` : `0 ${bl.toFixed(2)}`,
      );
  }
  const hb2 = document.getElementById("hblurStd2");

  // ════════════════════════════ overlays: fx particles, vignette, grain ════════════════════════════
  const cutFlash = div("full", stage);
  css(cutFlash, { background: "#fff", zIndex: 13, pointerEvents: "none", mixBlendMode: "screen" });
  const fx = el("canvas", "abs", stage);
  fx.width = W;
  fx.height = H;
  css(fx, { zIndex: 14 });
  const g = fx.getContext("2d");
  function burst(t, t0, cx, cy, n, seed, o = {}) {
    const dt = t - t0;
    if (dt < 0 || dt > 1.4) return;
    const Rn = rng(seed);
    const sp = o.speed || [500, 1700],
      life = o.life || [0.35, 0.95],
      cols = o.colors || ["#ffffff", "#ffc9c9", "#ff8787", "#fa5252"],
      wd = o.width || [1.5, 4];
    const drag = 3.4,
      trail = 0.04,
      ry = o.ry || 0.82;
    const f = (d) => (1 - Math.exp(-drag * d)) / drag;
    for (let i = 0; i < n; i++) {
      const a = Rn() * Math.PI * 2,
        v = lerp(sp[0], sp[1], Math.pow(Rn(), 0.7)),
        L = lerp(life[0], life[1], Rn()),
        c = cols[(Rn() * cols.length) | 0],
        w = lerp(wd[0], wd[1], Rn()),
        r0 = (o.r0 || 60) * Rn();
      if (dt > L) continue;
      const d1 = r0 + v * f(dt),
        d0 = r0 + v * f(Math.max(0, dt - trail));
      g.globalAlpha = Math.pow(1 - dt / L, 1.4);
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 * ry + 160 * Math.max(0, dt - trail) ** 2);
      g.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1 * ry + 160 * dt * dt);
      g.stroke();
    }
  }
  function embers(t, t0, n, seed, t1 = 1e9) {
    if (t < t0 || t > t1) return;
    const Rn = rng(seed);
    for (let i = 0; i < n; i++) {
      const x0 = Rn() * W,
        sp = 40 + Rn() * 90,
        ph = Rn() * 1400,
        sz = 1 + Rn() * 2.6,
        fl = Rn() * 10;
      const y = H + 60 - ((ph + (t - t0) * sp) % 1300);
      const x = x0 + Math.sin((t + fl) * 1.3) * 22;
      g.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 6 + fl)) * seg(t, t0, t0 + 0.4);
      g.fillStyle = i % 3 ? "#ff8787" : "#ffd8a8";
      g.beginPath();
      g.arc(x, y, sz, 0, Math.PI * 2);
      g.fill();
    }
  }
  const vign = div("full", stage);
  css(vign, {
    background: "radial-gradient(ellipse 78% 72% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)",
    zIndex: 15,
    pointerEvents: "none",
  });
  const grain = el("canvas", "abs", stage);
  grain.width = 960;
  grain.height = 540;
  css(grain, {
    width: W + "px",
    height: H + "px",
    zIndex: 16,
    mixBlendMode: "overlay",
    opacity: 0.075,
    pointerEvents: "none",
  });
  const gg = grain.getContext("2d");
  const grainFrames = [];
  {
    const Rn = rng(99);
    for (let k = 0; k < 6; k++) {
      const id = gg.createImageData(960, 540),
        d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 128 + (Rn() - 0.5) * 230;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      grainFrames.push(id);
    }
  }
  // whip pan S6 → S7 with directional blur
  const hb = document.getElementById("hblurStd");
  const WA = 10.98,
    WB = 11.42;
  const whipOff = (t) => -W * E.inOutExpo(seg(t, WA, WB));
  function whip(t) {
    const o = whipOff(t),
      v = (whipOff(t + 1 / 480) - whipOff(t - 1 / 480)) * 240;
    const bl = Math.min(90, Math.abs(v) * 0.004);
    S6.root.style.transform = `translateX(${o}px)`;
    S7.root.style.transform = `translateX(${o + W}px)`;
    const f = bl > 0.4 ? "url(#hblur)" : "none";
    S6.root.style.filter = f;
    S7.root.style.filter = f;
    hb.setAttribute("stdDeviation", `${bl.toFixed(2)} 0`);
  }

  const scenes = [S1, S2, S34, S5, S6, S7, S8, S9, S10, S11, SFA, SFD, S12, S13, S14, S15, S16];
  const whipScenes = [S8, S9, S11, SFA, SFD];
  window.renderFrame = (t, u = t) => {
    t = clamp(t, 0, 20 * BAR);
    for (const s of scenes) {
      const on = t >= s.t0 && t < s.t1;
      show(s.root, on);
      if (on) s.update(t);
    }
    whip(t);
    for (const s of whipScenes) {
      s.root.style.transform = "";
      s.root.style.filter = "";
    }
    whip2(t, 14.8, 15.2, S8, S9, "y", 1);
    whip2(t, 11 * BAR - 0.1, 11 * BAR + 0.3, S11, SFA, "x", 1);
    whip2(t, 13 * BAR - 0.2, 13 * BAR + 0.2, SFA, SFD, "y", 1);
    wipes(t);
    cutFlash.style.opacity = 0.7 * pulse(t, 2 * BAR, 32) + 0.6 * pulse(t, 5 * BAR, 30) + 0.6 * pulse(t, 17 * BAR, 30);
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    burst(t, IMP, 960, 540, 150, 7, { r0: 120 });
    burst(t, 2 * BAR, 960, 540, 90, 21, { speed: [700, 2200], life: [0.25, 0.6], r0: 30 });
    burst(t, 7 * BAR, 960, 560, 170, 11, { r0: 90 });
    burst(t, 19 * BAR, 960, 420, 170, 13, { r0: 90 });
    embers(t, 7 * BAR, 70, 5, 8 * BAR + 0.2);
    embers(t, 19 * BAR, 70, 6);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    gg.putImageData(grainFrames[Math.floor(u * 24) % 6], 0, 0);
  };

  window.ready = (async () => {
    await Promise.all([...document.images].map((i) => i.decode().catch(() => console.warn("img fail", i.src))));
    const sample = "Homarr Добро Καλώς Chào mừng ようこそ 환영합니다 欢迎使用 歡迎來到 ברוכים ↓ 0123456789";
    await Promise.all(
      [
        "300 20px Inter",
        "500 20px Inter",
        "800 20px Inter",
        "900 20px Inter",
        "500 20px JB",
        "700 20px JB",
        "800 20px NJP",
        "800 20px NKR",
        "800 20px NSC",
        "800 20px NTC",
        "800 20px NHE",
      ].map((f) => document.fonts.load(f, sample)),
    );
    await document.fonts.ready;
    // measure language reel rows while visible
    S7.root.style.display = "";
    S7.fit();
    fits.forEach((f) => f());
    R3.warm();
    S7.root.style.display = "none";
    window.renderFrame(0);
    return true;
  })();
})();
