"use client";

import { useSyncExternalStore } from "react";

export type InitImportMode = "legacy" | "config";

const storageKey = "homarr-init-import-mode";

const readMode = (): InitImportMode => {
  const stored = sessionStorage.getItem(storageKey);
  return stored === "config" ? "config" : "legacy";
};

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

export const setInitImportMode = (mode: InitImportMode) => {
  sessionStorage.setItem(storageKey, mode);
  window.dispatchEvent(new Event("storage"));
};

export const clearInitImportMode = () => {
  sessionStorage.removeItem(storageKey);
  window.dispatchEvent(new Event("storage"));
};

export const useInitImportMode = () =>
  useSyncExternalStore(subscribe, readMode, () => "legacy" as InitImportMode);
