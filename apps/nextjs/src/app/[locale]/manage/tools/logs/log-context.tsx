"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";

import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { logLevels } from "@homarr/core/infrastructure/logs/constants";

const FONT_SIZE_KEY = "homarr-log-font-size";
const DEFAULT_FONT_SIZE = 14;

const parseStoredFontSize = (stored: string | undefined) => {
  if (!stored) return DEFAULT_FONT_SIZE;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 10), 24) : DEFAULT_FONT_SIZE;
};

const LogContext = createContext<{
  level: LogLevel;
  setLevel: (level: LogLevel) => void;
  activeLevels: LogLevel[];
  fontSize: number;
  setFontSize: (size: number) => void;
} | null>(null);

interface LogContextProviderProps extends PropsWithChildren {
  defaultLevel: LogLevel;
}

export const LogContextProvider = ({ defaultLevel, children }: LogContextProviderProps) => {
  const [level, setLevel] = useState(defaultLevel);
  const [fontSize, setFontSize] = useLocalStorage({
    key: FONT_SIZE_KEY,
    defaultValue: DEFAULT_FONT_SIZE,
    deserialize: parseStoredFontSize,
    sync: false,
  });
  const activeLevels = useMemo(() => logLevels.slice(0, logLevels.indexOf(level) + 1), [level]);

  return (
    <LogContext.Provider value={{ level, setLevel, activeLevels, fontSize, setFontSize }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogContext must be used within a LogContextProvider");
  }
  return context;
};
