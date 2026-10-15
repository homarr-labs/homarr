"use client";

import { createContext, createElement, useContext, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";

const InitialRenderTimeContext = createContext<number | undefined>(undefined);
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export const InitialRenderTimeProvider = ({ initialTime, children }: PropsWithChildren<{ initialTime?: number }>) =>
  createElement(InitialRenderTimeContext.Provider, { value: initialTime }, children);

export const useInitialRenderTime = () => useContext(InitialRenderTimeContext);

// Cached HTML and its first browser render must use the same clock. Switch to
// real time immediately after hydration, without hiding the retained content.
export const useHydrationTime = () => {
  const initialTime = useInitialRenderTime();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (hydrated) return undefined;
  return initialTime;
};
