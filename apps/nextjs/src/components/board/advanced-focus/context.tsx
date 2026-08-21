"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Overlay, Portal } from "@mantine/core";
import { useIsomorphicEffect, useViewportSize } from "@mantine/hooks";

import { useEditMode } from "@homarr/boards/edit-mode";

import classes from "./advanced-focus.module.css";
import { isEscapeOwnedByNestedOverlay } from "./escape";
import type { FocusRect } from "./geometry";

interface ActiveFocus {
  itemId: string;
  source: HTMLElement;
  restoreFocusTarget: HTMLElement;
  sourceRect: FocusRect;
  activation: "preview" | "manual";
  autofocusClose: boolean;
  restorePreviewFocus: boolean;
  phase: "visible" | "closing";
}

interface OpenAdvancedFocusOptions {
  activation?: ActiveFocus["activation"];
  autofocusClose?: boolean;
  restoreFocusTarget?: HTMLElement;
}

interface AdvancedFocusContextValue {
  active: ActiveFocus | null;
  viewportSize: { width: number; height: number };
  open: (itemId: string, source: HTMLElement, options?: OpenAdvancedFocusOptions) => void;
  close: (restoreFocus?: boolean) => void;
  dismiss: (itemId: string) => void;
  hover: (itemId: string, source: HTMLElement) => void;
  leave: (itemId: string) => void;
}

const AdvancedFocusContext = createContext<AdvancedFocusContextValue | null>(null);
const HOVER_DELAY_MS = 500;
const POINTER_TRANSITION_GRACE_MS = 80;
const CLOSE_DURATION_MS = 180;

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable);

export const BoardAdvancedFocusProvider = ({ children }: PropsWithChildren) => {
  const [isEditMode] = useEditMode();
  const viewportSize = useViewportSize();
  const [active, setActive] = useState<ActiveFocus | null>(null);
  const [isHoldPending, setIsHoldPending] = useState(false);
  const activeRef = useRef<ActiveFocus | null>(null);
  const hoveredRef = useRef<{ itemId: string; source: HTMLElement } | null>(null);
  const shiftHeldRef = useRef(false);
  const keepOpenHeldRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIndicatorRef = useRef<HTMLDivElement | null>(null);
  const pointerPositionRef = useRef({ x: -100, y: -100 });
  const pointerFrameRef = useRef<number | null>(null);

  const cancelHoverTimer = useCallback(() => {
    if (hoverTimerRef.current === null) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setIsHoldPending(false);
  }, []);

  const cancelPreviewLeaveTimer = useCallback(() => {
    if (previewLeaveTimerRef.current === null) return;
    clearTimeout(previewLeaveTimerRef.current);
    previewLeaveTimerRef.current = null;
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
      cancelPreviewLeaveTimer();
      cancelCloseTimer();
      const rect = source.getBoundingClientRect();
      updateActive({
        itemId,
        source,
        restoreFocusTarget: options.restoreFocusTarget ?? source,
        sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        activation: options.activation ?? "manual",
        autofocusClose: options.autofocusClose ?? false,
        restorePreviewFocus: options.activation === "preview" && document.activeElement === source,
        phase: "visible",
      });
    },
    [cancelCloseTimer, cancelHoverTimer, cancelPreviewLeaveTimer, isEditMode, updateActive],
  );

  const close = useCallback(
    (restoreFocus = true) => {
      cancelHoverTimer();
      cancelPreviewLeaveTimer();
      const current = activeRef.current;
      if (!current || current.phase === "closing") return;
      updateActive({ ...current, phase: "closing" });
      const closeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : CLOSE_DURATION_MS;
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        updateActive(null);
        if (restoreFocus && current.restoreFocusTarget.isConnected)
          requestAnimationFrame(() => current.restoreFocusTarget.focus());
      }, closeDuration);
    },
    [cancelHoverTimer, cancelPreviewLeaveTimer, updateActive],
  );

  const schedulePreviewClose = useCallback(
    (itemId: string) => {
      if (previewLeaveTimerRef.current !== null) return;
      previewLeaveTimerRef.current = setTimeout(() => {
        previewLeaveTimerRef.current = null;
        const current = activeRef.current;
        if (current?.activation !== "preview" || current.itemId !== itemId) return;
        if (hoveredRef.current?.itemId === itemId) hoveredRef.current = null;
        close(current.restorePreviewFocus);
      }, POINTER_TRANSITION_GRACE_MS);
    },
    [close],
  );

  const startHoverTimer = useCallback(() => {
    cancelHoverTimer();
    const hovered = hoveredRef.current;
    if (!hovered || !shiftHeldRef.current || activeRef.current) return;
    if (pointerPositionRef.current.x < 0 || pointerPositionRef.current.y < 0) {
      const rect = hovered.source.getBoundingClientRect();
      pointerPositionRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    setIsHoldPending(true);
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      setIsHoldPending(false);
      const activation = keepOpenHeldRef.current ? "manual" : "preview";
      open(hovered.itemId, hovered.source, {
        activation,
        autofocusClose: activation === "manual",
        restoreFocusTarget: hovered.source,
      });
    }, HOVER_DELAY_MS);
  }, [cancelHoverTimer, open]);

  const promotePreviewToManual = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.activation !== "preview") return false;
    cancelHoverTimer();
    cancelPreviewLeaveTimer();
    cancelCloseTimer();
    updateActive({
      ...current,
      activation: "manual",
      autofocusClose: true,
      restorePreviewFocus: false,
      phase: "visible",
    });
    return true;
  }, [cancelCloseTimer, cancelHoverTimer, cancelPreviewLeaveTimer, updateActive]);

  const hover = useCallback(
    (itemId: string, source: HTMLElement) => {
      hoveredRef.current = { itemId, source };
      cancelPreviewLeaveTimer();
      const current = activeRef.current;
      if (current?.activation === "preview" && current.itemId !== itemId) {
        cancelCloseTimer();
        updateActive(null);
        if (current.restorePreviewFocus && current.source.isConnected) current.source.focus({ preventScroll: true });
      }
      startHoverTimer();
    },
    [cancelCloseTimer, cancelPreviewLeaveTimer, startHoverTimer, updateActive],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
      if (holdIndicatorRef.current && pointerFrameRef.current === null) {
        pointerFrameRef.current = requestAnimationFrame(() => {
          pointerFrameRef.current = null;
          const indicator = holdIndicatorRef.current;
          if (!indicator) return;
          indicator.style.setProperty("--advanced-focus-pointer-x", `${pointerPositionRef.current.x}px`);
          indicator.style.setProperty("--advanced-focus-pointer-y", `${pointerPositionRef.current.y}px`);
        });
      }

      const current = activeRef.current;
      if (!shiftHeldRef.current || current?.activation !== "preview") return;
      if (event.target instanceof Element && event.target.closest("[data-advanced-focus-surface], [data-portal]")) {
        cancelPreviewLeaveTimer();
        return;
      }

      const isInsideSourceRect =
        event.clientX >= current.sourceRect.left &&
        event.clientX <= current.sourceRect.left + current.sourceRect.width &&
        event.clientY >= current.sourceRect.top &&
        event.clientY <= current.sourceRect.top + current.sourceRect.height;
      if (isInsideSourceRect) {
        cancelPreviewLeaveTimer();
        return;
      }

      const underlyingSource = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) =>
          element instanceof HTMLElement
            ? element.matches("[data-advanced-focus-source]")
              ? element
              : element.closest<HTMLElement>("[data-advanced-focus-source]")
            : null,
        )
        .find((source) => source !== null && source !== current.source);
      const itemId = underlyingSource?.dataset.itemId;
      if (!underlyingSource || !itemId) {
        schedulePreviewClose(current.itemId);
        return;
      }

      if (underlyingSource.hasAttribute("data-advanced-focus-enabled")) {
        hover(itemId, underlyingSource);
        return;
      }

      hoveredRef.current = null;
      cancelHoverTimer();
      schedulePreviewClose(current.itemId);
    };

    window.addEventListener("pointermove", handlePointerMove, { capture: true });
    window.addEventListener("pointerover", handlePointerMove, { capture: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, { capture: true });
      window.removeEventListener("pointerover", handlePointerMove, { capture: true });
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
    };
  }, [cancelHoverTimer, cancelPreviewLeaveTimer, hover, schedulePreviewClose]);

  const leave = useCallback(
    (itemId: string) => {
      if (hoveredRef.current?.itemId !== itemId) return;
      hoveredRef.current = null;
      cancelHoverTimer();
      if (activeRef.current?.activation === "preview" && activeRef.current.itemId === itemId)
        schedulePreviewClose(itemId);
    },
    [cancelHoverTimer, schedulePreviewClose],
  );

  const dismiss = useCallback(
    (itemId: string) => {
      if (activeRef.current?.itemId !== itemId) return;
      cancelHoverTimer();
      cancelPreviewLeaveTimer();
      cancelCloseTimer();
      updateActive(null);
    },
    [cancelCloseTimer, cancelHoverTimer, cancelPreviewLeaveTimer, updateActive],
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
      if (event.repeat || isEditableTarget(event.target)) return;

      const isKeepOpenModifier = event.key === "Control" || event.key === "Meta";
      const hasKeepOpenShortcut = event.shiftKey && (event.ctrlKey || event.metaKey);
      if (isKeepOpenModifier && hasKeepOpenShortcut) {
        event.preventDefault();
        keepOpenHeldRef.current = true;
        if (!promotePreviewToManual()) startHoverTimer();
        return;
      }

      if (event.key !== "Shift") return;
      if (activeRef.current?.activation === "manual") return;
      shiftHeldRef.current = true;
      keepOpenHeldRef.current = hasKeepOpenShortcut;
      startHoverTimer();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control" || event.key === "Meta") {
        keepOpenHeldRef.current = false;
        return;
      }
      if (event.key !== "Shift") return;
      shiftHeldRef.current = false;
      keepOpenHeldRef.current = false;
      cancelHoverTimer();
      if (activeRef.current?.activation === "preview") close(false);
    };
    const handleBlur = () => {
      shiftHeldRef.current = false;
      keepOpenHeldRef.current = false;
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
      cancelPreviewLeaveTimer();
      cancelCloseTimer();
    };
  }, [
    cancelCloseTimer,
    cancelHoverTimer,
    cancelPreviewLeaveTimer,
    close,
    isEditMode,
    promotePreviewToManual,
    startHoverTimer,
  ]);

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
    () => ({ active, viewportSize, open, close, dismiss, hover, leave }),
    [active, close, dismiss, hover, leave, open, viewportSize],
  );

  return (
    <AdvancedFocusContext.Provider value={value}>
      {children}
      {isHoldPending && (
        <Portal>
          <div
            ref={holdIndicatorRef}
            data-advanced-focus-hold-indicator
            className={classes.holdIndicator}
            style={
              {
                "--advanced-focus-pointer-x": `${pointerPositionRef.current.x}px`,
                "--advanced-focus-pointer-y": `${pointerPositionRef.current.y}px`,
              } as CSSProperties
            }
            aria-hidden
          >
            <svg className={classes.holdIndicatorRing} viewBox="0 0 36 36">
              <circle className={classes.holdIndicatorTrack} cx="18" cy="18" r="15" pathLength="1" />
              <circle className={classes.holdIndicatorProgress} cx="18" cy="18" r="15" pathLength="1" />
            </svg>
            <span className={classes.holdIndicatorLabel}>&#8679;</span>
          </div>
        </Portal>
      )}
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
