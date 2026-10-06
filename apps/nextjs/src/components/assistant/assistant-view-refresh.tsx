"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface AssistantViewRefreshContextValue {
  isRefreshing: boolean;
  refreshCurrentView: () => Promise<void>;
}

const AssistantViewRefreshContext = createContext<AssistantViewRefreshContextValue | null>(null);

export const AssistantViewRefreshProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshAgainRef = useRef(false);

  const refreshCurrentView = useCallback(() => {
    if (refreshPromiseRef.current) {
      refreshAgainRef.current = true;
      return refreshPromiseRef.current;
    }

    setIsRefreshing(true);
    const refreshPromise = (async () => {
      do {
        refreshAgainRef.current = false;
        router.refresh();
        await queryClient.invalidateQueries({ refetchType: "active" });
      } while (refreshAgainRef.current);
    })().finally(() => {
      refreshPromiseRef.current = null;
      setIsRefreshing(false);
    });
    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [queryClient, router]);

  const value = useMemo(() => ({ isRefreshing, refreshCurrentView }), [isRefreshing, refreshCurrentView]);

  return <AssistantViewRefreshContext.Provider value={value}>{children}</AssistantViewRefreshContext.Provider>;
};

export const useAssistantViewRefresh = () => {
  const value = useContext(AssistantViewRefreshContext);
  if (!value) throw new Error("useAssistantViewRefresh must be used within AssistantViewRefreshProvider");
  return value;
};
