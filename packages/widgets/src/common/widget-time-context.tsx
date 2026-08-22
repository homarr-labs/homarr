"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface WidgetTimeContextValue {
  initialTimestamp: number | null;
  localTimeZone: string | null;
}

const WidgetTimeContext = createContext<WidgetTimeContextValue>({ initialTimestamp: null, localTimeZone: null });

interface WidgetTimeProviderProps {
  initialTimestamp: number;
  initialTimeZone: string;
}

export const WidgetTimeProvider = ({
  children,
  initialTimestamp,
  initialTimeZone,
}: PropsWithChildren<WidgetTimeProviderProps>) => {
  const [localTimeZone, setLocalTimeZone] = useState(() => getSupportedTimeZone(initialTimeZone));

  useEffect(() => {
    setLocalTimeZone(getResolvedLocalTimeZone());
  }, []);

  const value = useMemo(() => ({ initialTimestamp, localTimeZone }), [initialTimestamp, localTimeZone]);
  return <WidgetTimeContext.Provider value={value}>{children}</WidgetTimeContext.Provider>;
};

export const useWidgetInitialTimestamp = () => useContext(WidgetTimeContext).initialTimestamp;
export const useWidgetLocalTimeZone = () => useContext(WidgetTimeContext).localTimeZone;

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
