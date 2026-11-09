"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { UnstyledButton } from "@mantine/core";

import type { LobsterScene } from "./scene";
import classes from "./playable-lobster.module.css";

interface PlayableLobsterProps {
  size: number | string;
  label: string;
  color?: string;
  idleSpin?: boolean;
  onPoke?: () => void;
  className?: string;
  style?: CSSProperties;
}

export const PlayableLobster = ({
  size,
  label,
  color = "#fa5252",
  idleSpin = false,
  onPoke,
  className,
  style,
}: PlayableLobsterProps) => {
  const host = useRef<HTMLSpanElement>(null);
  const scene = useRef<LobsterScene | null>(null);
  const drag = useRef({ x: 0, y: 0, lastX: 0, lastTime: 0, velocity: 0, active: false, moved: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    const load = async () => {
      try {
        const [{ createLobsterScene }, response] = await Promise.all([
          import("./scene"),
          fetch("/logo/homarr.svg", { signal: controller.signal }),
        ]);
        if (!response.ok || !host.current) return;
        const svg = await response.text();
        if (controller.signal.aborted || !host.current) return;
        const model = createLobsterScene(host.current, svg, { color, idleSpin });
        scene.current = model;
        dispose = model.dispose;
        setReady(true);
      } catch {
        setReady(false);
      }
    };
    void load();
    return () => {
      controller.abort();
      dispose?.();
      scene.current = null;
    };
  }, [color, idleSpin]);

  const poke = () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    scene.current?.poke();
    onPoke?.();
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      active: true,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!drag.current.active) {
      scene.current?.look(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      );
      return;
    }
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 5) return;
    drag.current.moved = true;
    const now = performance.now();
    const elapsed = Math.max(now - drag.current.lastTime, 1) / 1000;
    drag.current.velocity = ((event.clientX - drag.current.lastX) * 0.018) / elapsed;
    drag.current.lastX = event.clientX;
    drag.current.lastTime = now;
    scene.current?.spin(dx * 0.018, dy * 0.012);
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    scene.current?.release(drag.current.moved ? drag.current.velocity : 0);
  };

  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const model = scene.current;
    if (!model) return;
    const actions: Partial<Record<string, () => void>> = {
      ArrowLeft: () => model.release(-6),
      ArrowRight: () => model.release(6),
      ArrowUp: () => model.spin(0, -0.15),
      ArrowDown: () => model.spin(0, 0.15),
      r: () => model.reset(),
    };
    const action = actions[event.key];
    if (!action) return;
    action();
    event.preventDefault();
  };

  return (
    <UnstyledButton
      className={[classes.lobster, className].filter(Boolean).join(" ")}
      style={{ ...style, width: size, height: size }}
      aria-label={label}
      onClick={poke}
      onPointerDown={startDrag}
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onPointerEnter={() => scene.current?.setHovered(true)}
      onPointerLeave={() => scene.current?.setHovered(false)}
      onKeyDown={keyDown}
    >
      <span className={classes.canvas} ref={host} aria-hidden="true">
        {!ready && <img src="/logo/logo.png" alt="" draggable={false} className={classes.fallback} />}
      </span>
    </UnstyledButton>
  );
};
