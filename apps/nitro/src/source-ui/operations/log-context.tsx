import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { logLevels } from "@homarr/core/infrastructure/logs/constants";

const fontSizeKey = "homarr-log-font-size";

const LogContext = createContext<{
  level: LogLevel;
  setLevel: (level: LogLevel) => void;
  activeLevels: LogLevel[];
  fontSize: number;
  setFontSize: (size: number) => void;
} | null>(null);

export interface OperationsLogContextProviderProps extends PropsWithChildren {
  defaultLevel: LogLevel;
}

export function OperationsLogContextProvider({ defaultLevel, children }: OperationsLogContextProviderProps) {
  const [level, setLevel] = useState(defaultLevel);
  const [fontSize, setFontSizeRaw] = useState(14);
  const activeLevels = useMemo(() => logLevels.slice(0, logLevels.indexOf(level) + 1), [level]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(fontSizeKey);
      if (!stored) return;
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) setFontSizeRaw(Math.min(Math.max(parsed, 10), 24));
    } catch {
      return;
    }
  }, []);

  const setFontSize = (size: number) => {
    const next = Math.min(Math.max(size, 10), 24);
    setFontSizeRaw(next);
    try {
      localStorage.setItem(fontSizeKey, String(next));
    } catch {
      return;
    }
  };

  return (
    <LogContext.Provider value={{ level, setLevel, activeLevels, fontSize, setFontSize }}>
      {children}
    </LogContext.Provider>
  );
}

export function useOperationsLogContext() {
  const context = useContext(LogContext);
  if (!context) throw new Error("useOperationsLogContext requires OperationsLogContextProvider");
  return context;
}
