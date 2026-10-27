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

export const useIsHydrated = () => useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

export const useHydrationTime = () => {
  const initialTime = useInitialRenderTime();
  const hydrated = useIsHydrated();
  if (hydrated) return undefined;
  return initialTime;
};
