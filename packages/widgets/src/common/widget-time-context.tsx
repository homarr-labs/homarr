"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const WidgetTimeContext = createContext<number | null>(null);

export const WidgetTimeProvider = ({ children, initialTimestamp }: PropsWithChildren<{ initialTimestamp: number }>) => (
  <WidgetTimeContext.Provider value={initialTimestamp}>{children}</WidgetTimeContext.Provider>
);

export const useWidgetInitialTimestamp = () => useContext(WidgetTimeContext);
