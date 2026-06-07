"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface WidgetSize {
  gridWidth: number;
  gridHeight: number;
}

const WidgetSizeContext = createContext<WidgetSize | null>(null);

export const useWidgetSize = () => {
  const ctx = useContext(WidgetSizeContext);
  if (!ctx) throw new Error("useWidgetSize must be used within WidgetSizeProvider");
  return ctx;
};

interface WidgetSizeProviderProps extends WidgetSize {
  children: ReactNode;
}

export const WidgetSizeProvider = ({ gridWidth, gridHeight, children }: WidgetSizeProviderProps) => (
  <WidgetSizeContext.Provider value={{ gridWidth, gridHeight }}>{children}</WidgetSizeContext.Provider>
);
