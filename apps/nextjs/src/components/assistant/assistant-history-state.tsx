"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface AssistantHistoryState {
  failedThreadIds: ReadonlySet<string>;
  setLoadFailed: (threadId: string, failed: boolean) => void;
}

export const AssistantHistoryContext = createContext<AssistantHistoryState | null>(null);

export const AssistantHistoryProvider = ({ children }: PropsWithChildren) => {
  const [failedThreadIds, setFailedThreadIds] = useState<ReadonlySet<string>>(() => new Set());
  const setLoadFailed = useCallback((threadId: string, failed: boolean) => {
    setFailedThreadIds((current) => {
      if (current.has(threadId) === failed) return current;
      const next = new Set(current);
      if (failed) next.add(threadId);
      else next.delete(threadId);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ failedThreadIds, setLoadFailed }), [failedThreadIds, setLoadFailed]);
  return <AssistantHistoryContext.Provider value={value}>{children}</AssistantHistoryContext.Provider>;
};

export const useAssistantHistoryState = () => {
  const value = useContext(AssistantHistoryContext);
  if (!value) throw new Error("useAssistantHistoryState must be used within AssistantHistoryProvider");
  return value;
};
