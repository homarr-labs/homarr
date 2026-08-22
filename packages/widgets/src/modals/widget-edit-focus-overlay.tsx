"use client";

import { useState } from "react";
import { Box, getDefaultZIndex, Overlay, Portal } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";

import classes from "./widget-edit-modal.module.css";

interface FocusRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type WidgetInspectorSide = "left" | "right";

const focusGap = 6;

const getFocusRect = (element: HTMLElement): FocusRect | null => {
  const rect = element.getBoundingClientRect();
  const top = Math.max(4, rect.top - focusGap);
  const left = Math.max(4, rect.left - focusGap);
  const right = Math.min(window.innerWidth - 4, rect.right + focusGap);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + focusGap);

  if (right <= left || bottom <= top) return null;

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
};

const focusRectsMatch = (current: FocusRect | null, next: FocusRect | null) => {
  if (current === next) return true;
  if (!current || !next) return false;

  return (
    current.top === next.top &&
    current.left === next.left &&
    current.width === next.width &&
    current.height === next.height
  );
};

export const useWidgetEditFocus = (itemId: string | undefined, focusTargetId: string | undefined) => {
  const [focusRect, setFocusRect] = useState<FocusRect | null>(null);

  useIsomorphicEffect(() => {
    let element: HTMLElement | null = null;
    if (focusTargetId) {
      element = document.getElementById(focusTargetId);
    } else if (itemId) {
      element = document.querySelector<HTMLElement>(`[data-advanced-focus-item-id="${CSS.escape(itemId)}"]`);
      element ??= document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`);
    }

    if (!element) {
      setFocusRect(null);
      return;
    }

    let animationFrame = 0;
    const update = () => {
      animationFrame = 0;
      const nextRect = getFocusRect(element);
      setFocusRect((current) => (focusRectsMatch(current, nextRect) ? current : nextRect));
    };
    const scheduleUpdate = () => {
      if (animationFrame !== 0) return;
      animationFrame = window.requestAnimationFrame(update);
    };

    update();
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(element);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [focusTargetId, itemId]);

  const inspectorSide: WidgetInspectorSide =
    focusRect && focusRect.left + focusRect.width / 2 > window.innerWidth / 2 ? "left" : "right";

  return { focusRect, inspectorSide };
};

export const WidgetEditFocusOverlay = ({ focusRect }: { focusRect: FocusRect | null }) => (
  <Portal>
    {focusRect ? (
      <>
        <Overlay fixed backgroundOpacity={0} zIndex={getDefaultZIndex("modal")} />
        <Box
          aria-hidden
          className={classes.focusFrame}
          style={{
            top: focusRect.top,
            left: focusRect.left,
            width: focusRect.width,
            height: focusRect.height,
            zIndex: getDefaultZIndex("modal"),
          }}
        />
      </>
    ) : (
      <Overlay fixed color="#000" backgroundOpacity={0.58} blur={1} zIndex={getDefaultZIndex("modal")} />
    )}
  </Portal>
);
