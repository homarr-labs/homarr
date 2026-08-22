"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useSyncExternalStore } from "react";

const WidgetTimestampContext = createContext<number | null>(null);
const WidgetTimeZoneContext = createContext("UTC");

interface WidgetTimeProviderProps {
  initialTimestamp: number;
  initialTimeZone: string;
}

export const WidgetTimeProvider = ({
  children,
  initialTimestamp,
  initialTimeZone,
}: PropsWithChildren<WidgetTimeProviderProps>) => (
  <WidgetTimestampContext.Provider value={initialTimestamp}>
    <WidgetTimeZoneContext.Provider value={getSupportedTimeZone(initialTimeZone)}>
      {children}
    </WidgetTimeZoneContext.Provider>
  </WidgetTimestampContext.Provider>
);

export const useWidgetInitialTimestamp = () => useContext(WidgetTimestampContext);
export const useWidgetLocalTimeZone = () => {
  const initialTimeZone = useContext(WidgetTimeZoneContext);
  return useSyncExternalStore(subscribeToTimeZone, getResolvedLocalTimeZone, () => initialTimeZone);
};

const subscribeToTimeZone = () => () => undefined;

const getResolvedLocalTimeZone = () => getSupportedTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

const getSupportedTimeZone = (timeZone: string | undefined) => {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
};
