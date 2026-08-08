"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Overlay, Portal } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";

import { useEditMode } from "@homarr/boards/edit-mode";

import classes from "./advanced-focus.module.css";
import { isEscapeOwnedByNestedOverlay } from "./escape";
import type { FocusRect } from "./geometry";

interface ActiveFocus {
  itemId: string;
  source: HTMLElement;
  sourceRect: FocusRect;
  activation: "preview" | "manual";
  autofocusClose: boolean;
  restorePreviewFocus: boolean;
  phase: "visible" | "closing";
}

interface OpenAdvancedFocusOptions {
  activation?: ActiveFocus["activation"];
  autofocusClose?: boolean;
}

interface AdvancedFocusContextValue {
  active: ActiveFocus | null;
  open: (itemId: string, source: HTMLElement, options?: OpenAdvancedFocusOptions) => void;
  close: (restoreFocus?: boolean) => void;
  dismiss: (itemId: string) => void;
  hover: (itemId: string, source: HTMLElement) => void;
  leave: (itemId: string) => void;
}

const AdvancedFocusContext = createContext<AdvancedFocusContextValue | null>(null);
const HOVER_DELAY_MS = 150;
const CLOSE_DURATION_MS = 180;
const interactiveSelector =
  "a[href], button, input, textarea, select, [contenteditable='true'], [role='button'], [role='link'], [role='menuitem'], [role='option']";

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable);

export const BoardAdvancedFocusProvider = ({ children }: PropsWithChildren) => {
  const [isEditMode] = useEditMode();
  const [active, setActive] = useState<ActiveFocus | null>(null);
  const activeRef = useRef<ActiveFocus | null>(null);
  const hoveredRef = useRef<{ itemId: string; source: HTMLElement } | null>(null);
  const shiftHeldRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverTimer = useCallback(() => {
    if (hoverTimerRef.current === null) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  }, []);

  const updateActive = useCallback((next: ActiveFocus | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const open = useCallback(
    (itemId: string, source: HTMLElement, options: OpenAdvancedFocusOptions = {}) => {
      if (isEditMode) return;
      cancelHoverTimer();
      cancelCloseTimer();
      const rect = source.getBoundingClientRect();
      updateActive({
        itemId,
        source,
        sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        activation: options.activation ?? "manual",
        autofocusClose: options.autofocusClose ?? false,
        restorePreviewFocus: options.activation === "preview" && document.activeElement === source,
        phase: "visible",
      });
    },
    [cancelCloseTimer, cancelHoverTimer, isEditMode, updateActive],
  );

  const close = useCallback(
    (restoreFocus = true) => {
      cancelHoverTimer();
      const current = activeRef.current;
      if (!current || current.phase === "closing") return;
      updateActive({ ...current, phase: "closing" });
      const closeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : CLOSE_DURATION_MS;
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        updateActive(null);
        if (restoreFocus && current.source.isConnected) requestAnimationFrame(() => current.source.focus());
      }, closeDuration);
    },
    [cancelHoverTimer, updateActive],
  );

  const startHoverTimer = useCallback(() => {
    cancelHoverTimer();
    const hovered = hoveredRef.current;
    if (!hovered || !shiftHeldRef.current || activeRef.current) return;
    hoverTimerRef.current = setTimeout(
      () => open(hovered.itemId, hovered.source, { activation: "preview" }),
      HOVER_DELAY_MS,
    );
  }, [cancelHoverTimer, open]);

  const hover = useCallback(
    (itemId: string, source: HTMLElement) => {
      hoveredRef.current = { itemId, source };
      const current = activeRef.current;
      if (current?.activation === "preview" && current.itemId !== itemId) {
        cancelCloseTimer();
        updateActive(null);
        if (current.restorePreviewFocus && current.source.isConnected) current.source.focus({ preventScroll: true });
      }
      startHoverTimer();
    },
    [cancelCloseTimer, startHoverTimer, updateActive],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const current = activeRef.current;
      if (!shiftHeldRef.current || current?.activation !== "preview") return;
      if (
        event.target instanceof Element &&
        event.target.closest(interactiveSelector)?.closest("[data-advanced-focus-surface]")
      )
        return;

      const underlyingSource = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) =>
          element instanceof HTMLElement
            ? element.matches(".grid-stack-item-content")
              ? element
              : element.closest<HTMLElement>(".grid-stack-item-content")
            : null,
        )
        .find((source) => source !== null && source !== current.source);
      const itemId = underlyingSource?.closest<HTMLElement>(".grid-stack-item[data-id]")?.dataset.id;
      if (!underlyingSource || !itemId) return;

      if (underlyingSource.hasAttribute("aria-keyshortcuts")) {
        hover(itemId, underlyingSource);
        return;
      }

      hoveredRef.current = null;
      cancelHoverTimer();
      cancelCloseTimer();
      updateActive(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    return () => window.removeEventListener("pointermove", handlePointerMove, { capture: true });
  }, [cancelCloseTimer, cancelHoverTimer, hover, updateActive]);

  const leave = useCallback(
    (itemId: string) => {
      if (hoveredRef.current?.itemId !== itemId) return;
      hoveredRef.current = null;
      cancelHoverTimer();
    },
    [cancelHoverTimer],
  );

  const dismiss = useCallback(
    (itemId: string) => {
      if (activeRef.current?.itemId !== itemId) return;
      cancelHoverTimer();
      cancelCloseTimer();
      updateActive(null);
    },
    [cancelCloseTimer, cancelHoverTimer, updateActive],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeRef.current) {
        const advancedSurface = document.querySelector("[data-advanced-focus-surface]");
        if (event.defaultPrevented || event.isComposing || isEscapeOwnedByNestedOverlay(event.target, advancedSurface))
          return;
        event.preventDefault();
        close();
        return;
      }
      if (isEditMode) return;
      if (event.key !== "Shift" || event.repeat || isEditableTarget(event.target)) return;
      if (activeRef.current?.activation === "manual") return;
      shiftHeldRef.current = true;
      startHoverTimer();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      shiftHeldRef.current = false;
      cancelHoverTimer();
      if (activeRef.current?.activation === "preview") close(false);
    };
    const handleBlur = () => {
      shiftHeldRef.current = false;
      cancelHoverTimer();
      if (activeRef.current?.activation === "preview") close(false);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      cancelHoverTimer();
      cancelCloseTimer();
    };
  }, [cancelCloseTimer, cancelHoverTimer, close, isEditMode, startHoverTimer]);

  useEffect(() => {
    if (isEditMode && activeRef.current) close(false);
  }, [close, isEditMode]);

  useIsomorphicEffect(() => {
    if (active?.activation !== "manual") return;
    const background = document.querySelectorAll<HTMLElement>("[data-advanced-focus-background]");
    background.forEach((element) => {
      element.inert = true;
    });
    return () => {
      background.forEach((element) => {
        element.inert = false;
      });
    };
  }, [active?.activation]);

  const value = useMemo(
    () => ({ active, open, close, dismiss, hover, leave }),
    [active, close, dismiss, hover, leave, open],
  );

  return (
    <AdvancedFocusContext.Provider value={value}>
      {children}
      {active?.activation === "preview" && (
        <Portal>
          <Overlay
            fixed
            data-advanced-focus-overlay
            backgroundOpacity={0.38}
            blur={0}
            zIndex="var(--homarr-z-index-widget-preview-backdrop)"
            className={`${classes.backdrop} ${active.phase === "closing" ? classes.backdropClosing : ""}`}
            aria-hidden
          />
        </Portal>
      )}
    </AdvancedFocusContext.Provider>
  );
};

export const useAdvancedFocus = () => {
  const context = useContext(AdvancedFocusContext);
  if (!context) throw new Error("useAdvancedFocus must be used within BoardAdvancedFocusProvider");
  return context;
};
