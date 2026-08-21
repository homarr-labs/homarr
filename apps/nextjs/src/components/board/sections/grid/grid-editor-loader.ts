"use client";

import type * as GridEditorModule from "./grid-editor";

let editorModulePromise: Promise<typeof GridEditorModule> | undefined;
let editorModule: typeof GridEditorModule | undefined;

export const loadGridEditorAsync = () => {
  editorModulePromise ??= import("./grid-editor")
    .then((loadedModule) => {
      editorModule = loadedModule;
      return loadedModule;
    })
    .catch((error: unknown) => {
      editorModulePromise = undefined;
      throw error;
    });

  return editorModulePromise;
};

export const getLoadedGridEditorModule = () => editorModule;

export const scheduleGridEditorWarmup = (loadAsync: () => Promise<unknown>) => {
  let animationFrameId: number | undefined;
  let idleCallbackId: number | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let hydrationObserver: MutationObserver | undefined;
  let cancelled = false;

  const load = () => {
    if (!cancelled) void loadAsync().catch(() => undefined);
  };
  const scheduleAfterPaint = () => {
    animationFrameId = window.requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) {
        idleCallbackId = window.requestIdleCallback(load, { timeout: 2_000 });
      } else {
        timeoutId = setTimeout(load, 1_000);
      }
    });
  };
  const scheduleWhenInteractive = () => {
    if (document.querySelector('[data-board-hydrated="true"]')) {
      scheduleAfterPaint();
      return;
    }

    hydrationObserver = new MutationObserver(() => {
      if (!document.querySelector('[data-board-hydrated="true"]')) return;
      hydrationObserver?.disconnect();
      hydrationObserver = undefined;
      scheduleAfterPaint();
    });
    hydrationObserver.observe(document.documentElement, {
      attributeFilter: ["data-board-hydrated"],
      attributes: true,
      childList: true,
      subtree: true,
    });
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    scheduleWhenInteractive();
  };

  if (document.visibilityState === "visible") {
    scheduleWhenInteractive();
  } else {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    hydrationObserver?.disconnect();
    if (animationFrameId !== undefined) window.cancelAnimationFrame(animationFrameId);
    if (idleCallbackId !== undefined && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleCallbackId);
    }
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };
};
