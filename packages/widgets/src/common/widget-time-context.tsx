"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

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
}: PropsWithChildren<WidgetTimeProviderProps>) => {
  const timeZone = useMemo(() => getSupportedTimeZone(initialTimeZone), [initialTimeZone]);

  return (
    <WidgetTimestampContext.Provider value={initialTimestamp}>
      <WidgetTimeZoneContext.Provider value={timeZone}>{children}</WidgetTimeZoneContext.Provider>
    </WidgetTimestampContext.Provider>
  );
};

export const useWidgetInitialTimestamp = () => useContext(WidgetTimestampContext);

export const useWidgetLocalTimeZone = () => {
  const initialTimeZone = useContext(WidgetTimeZoneContext);
  return useSyncExternalStore(subscribeToTimeZone, getResolvedLocalTimeZone, () => initialTimeZone);
};

const subscribeToTimeZone = () => () => undefined;

let resolvedLocalTimeZone: string | undefined;

const getResolvedLocalTimeZone = () => {
  resolvedLocalTimeZone ??= getSupportedTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return resolvedLocalTimeZone;
};

const getSupportedTimeZone = (timeZone: string | undefined) => {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
};
