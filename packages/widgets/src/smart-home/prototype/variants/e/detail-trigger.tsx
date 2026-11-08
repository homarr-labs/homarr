"use client";

import { useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { DetailContext, DetailEntityContext, useDetailsEnabled } from "./hooks";
import classes from "./styles.module.css";

const LONG_PRESS_MS = 520;
const LONG_PRESS_SLOP = 4;

const isDetailKey = (event: KeyboardEvent) => event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");

const startsOwnGesture = (target: EventTarget | null) =>
  target instanceof Element && target.closest("[data-gesture='true']") !== null;

interface DetailTriggerProps {
  entityId: string;
  name: string;
  children: ReactNode;
}

export function DetailTrigger({ entityId, name, children }: DetailTriggerProps) {
  const detail = useContext(DetailContext);
  const enabled = useDetailsEnabled();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!enabled || !detail || !host) return;

    let timer: number | undefined;
    let origin: { x: number; y: number } | null = null;
    let fired = false;

    const open = () => detail.open(entityId);
    const cancel = () => {
      window.clearTimeout(timer);
      origin = null;
    };
    const swallow = (event: Event) => {
      if (!fired) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      cancel();
      open();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDetailKey(event)) return;
      event.preventDefault();
      open();
    };
    const onPointerDown = (event: PointerEvent) => {
      fired = false;
      if (event.pointerType === "mouse" || event.button !== 0 || startsOwnGesture(event.target)) return;
      origin = { x: event.clientX, y: event.clientY };
      timer = window.setTimeout(() => {
        fired = true;
        origin = null;
        open();
      }, LONG_PRESS_MS);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_SLOP) cancel();
    };
    const onPointerUp = (event: PointerEvent) => {
      cancel();
      swallow(event);
    };
    const onClick = (event: MouseEvent) => {
      swallow(event);
      fired = false;
    };

    host.addEventListener("contextmenu", onContextMenu);
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("pointerdown", onPointerDown, true);
    host.addEventListener("pointermove", onPointerMove, true);
    host.addEventListener("pointerup", onPointerUp, true);
    host.addEventListener("pointercancel", cancel, true);
    host.addEventListener("click", onClick, true);
    return () => {
      cancel();
      host.removeEventListener("contextmenu", onContextMenu);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("pointerdown", onPointerDown, true);
      host.removeEventListener("pointermove", onPointerMove, true);
      host.removeEventListener("pointerup", onPointerUp, true);
      host.removeEventListener("pointercancel", cancel, true);
      host.removeEventListener("click", onClick, true);
    };
  }, [detail, enabled, entityId]);

  if (!enabled || !detail) return children;

  return (
    <DetailEntityContext.Provider value={entityId}>
      <div ref={ref} className={classes.detailHost} role="group" aria-label={name} aria-keyshortcuts="Shift+F10">
        {children}
      </div>
    </DetailEntityContext.Provider>
  );
}
