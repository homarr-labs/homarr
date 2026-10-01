"use client";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { track } from "@/lib/analytics";

import type { MascotScene } from "./scene";
import styles from "./styles.module.css";

declare global {
  interface Window {
    Kapa?: ((method: "open", options: { mode: "ai" }) => void) & {
      open?: (options: { mode: "ai" }) => void;
    };
  }
}

export default function DocsMascot() {
  const host = useRef<HTMLSpanElement>(null);
  const scene = useRef<MascotScene | null>(null);
  const drag = useRef({ x: 0, y: 0, active: false, moved: false });
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const logoUrl = "/img/mascot/homarr.svg";
  const fallbackUrl = "/img/logo.png";

  useEffect(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    async function load() {
      try {
        const { createMascotScene } = await import("./scene");
        const response = await fetch(logoUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Logo unavailable");
        const svg = await response.text();
        if (controller.signal.aborted || !host.current) return;
        const model = createMascotScene(host.current, svg);
        scene.current = model;
        dispose = model.dispose;
        setReady(true);
      } catch {
        // The static logo remains a working chat launcher without WebGL.
      }
    }
    void load();
    return () => {
      controller.abort();
      dispose?.();
      scene.current = null;
    };
  }, [logoUrl]);

  function openChat() {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    scene.current?.wink();
    if (!window.Kapa || !window.Kapa.open) {
      setMessage("Chat is still loading. Try again in a moment.");
      return;
    }
    setMessage("");
    track("Ask AI Opened", { trigger: "mascot" });
    window.Kapa("open", { mode: "ai" });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, active: true, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 5) return;
    drag.current.moved = true;
    scene.current?.rotate(dx * 0.018, dy * 0.012);
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") drag.current.moved = false;
    const model = scene.current;
    if (!model) return;
    switch (event.key) {
      case "ArrowLeft":
        model.rotate(-0.25, 0);
        break;
      case "ArrowRight":
        model.rotate(0.25, 0);
        break;
      case "ArrowUp":
        model.rotate(0, -0.15);
        break;
      case "ArrowDown":
        model.rotate(0, 0.15);
        break;
      case "w":
        model.wink();
        break;
      case "r":
        model.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div className={styles.mascot}>
      <button
        type="button"
        className={styles.launcher}
        aria-label="Ask AI"
        onClick={openChat}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerEnter={() => scene.current?.setHovered(true)}
        onPointerLeave={() => scene.current?.setHovered(false)}
        onPointerUp={() => {
          drag.current.active = false;
        }}
        onPointerCancel={() => {
          drag.current.active = false;
        }}
        onLostPointerCapture={() => {
          drag.current.active = false;
        }}
        onKeyDown={keyDown}
      >
        <span className={styles.model} ref={host} aria-hidden="true">
          {!ready && <img src={fallbackUrl} alt="" draggable={false} />}
        </span>
        <span className={styles.label}>Ask AI</span>
      </button>
      {message && <output className={styles.status}>{message}</output>}
    </div>
  );
}
