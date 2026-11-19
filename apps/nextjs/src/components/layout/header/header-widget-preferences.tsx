"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { clientApi, fetchApi } from "@homarr/api/client";
import type { HeaderPreferences, HeaderWidgetItem } from "@homarr/validation/user";

interface PendingWidgetSave {
  item: HeaderWidgetItem;
  resolve: () => void;
  reject: (error: unknown) => void;
}

interface HeaderWidgetPreferencesContextValue {
  preferences: HeaderPreferences;
  save: (item: HeaderWidgetItem) => Promise<void>;
  savingItemIds: string[];
}

const HeaderWidgetPreferencesContext = createContext<HeaderWidgetPreferencesContextValue | null>(null);

const replaceWidget = (preferences: HeaderPreferences, item: HeaderWidgetItem): HeaderPreferences => {
  const zones = { ...preferences.zones };
  for (const zone of ["left", "center", "right"] as const) {
    zones[zone] = zones[zone].map((candidate) => {
      if (candidate.type === "widget" && candidate.id === item.id && candidate.kind === item.kind) return item;
      return candidate;
    });
  }
  return { ...preferences, zones };
};

export const HeaderWidgetPreferencesProvider = ({
  children,
  initialPreferences,
  userId,
}: PropsWithChildren<{
  initialPreferences: HeaderPreferences;
  userId: string | null;
}>) => {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);
  const confirmedPreferences = useRef(initialPreferences);
  const localWriteStarted = useRef(false);
  const readGeneration = useRef(0);
  const mutationGeneration = useRef(0);
  const pending = useRef<PendingWidgetSave[]>([]);
  const processing = useRef(false);
  const router = useRouter();
  const mutation = clientApi.user.changeHeaderWidgetPreferences.useMutation();

  const updateOptimisticPreferences = useCallback(() => {
    setPreferences(
      pending.current.reduce((value, operation) => replaceWidget(value, operation.item), confirmedPreferences.current),
    );
    setSavingItemIds(pending.current.map((operation) => operation.item.id));
  }, []);

  const reconcileServerPreferences = useCallback(async () => {
    const requestedRead = ++readGeneration.current;
    // Queue completion always performs a fresh read after its final mutation.
    if (!userId || processing.current) return;
    const requestedMutation = mutationGeneration.current;
    try {
      const { headerPreferences } = await fetchApi.user.getPreferences.query({ userId });
      if (
        requestedRead !== readGeneration.current ||
        requestedMutation !== mutationGeneration.current ||
        processing.current
      )
        return;
      confirmedPreferences.current = headerPreferences;
      updateOptimisticPreferences();
    } catch {
      // Preserve the last confirmed result until the next refresh or save.
    }
  }, [userId, updateOptimisticPreferences]);

  useEffect(() => {
    if (localWriteStarted.current) {
      // RSC payloads have no ordering token. After a local write they only
      // invalidate; a fresh authenticated read determines the current state.
      void reconcileServerPreferences();
    } else {
      confirmedPreferences.current = initialPreferences;
      updateOptimisticPreferences();
    }
    return () => {
      readGeneration.current += 1;
    };
  }, [initialPreferences, reconcileServerPreferences, updateOptimisticPreferences]);

  const processQueue = async () => {
    if (processing.current || !userId) return;
    localWriteStarted.current = true;
    processing.current = true;
    while (pending.current.length > 0) {
      const operation = pending.current[0];
      if (!operation) break;
      mutationGeneration.current += 1;
      try {
        const next = await mutation.mutateAsync({ id: userId, item: operation.item });
        confirmedPreferences.current = next;
        operation.resolve();
      } catch (error) {
        operation.reject(error);
      }
      mutationGeneration.current += 1;
      pending.current.shift();
      updateOptimisticPreferences();
    }
    processing.current = false;
    void reconcileServerPreferences();
    router.refresh();
  };

  const save = (item: HeaderWidgetItem) => {
    if (!userId) return Promise.reject(new Error("Authentication required"));
    return new Promise<void>((resolve, reject) => {
      pending.current.push({ item, resolve, reject });
      updateOptimisticPreferences();
      void processQueue();
    });
  };

  return (
    <HeaderWidgetPreferencesContext.Provider value={{ preferences, save, savingItemIds }}>
      {children}
    </HeaderWidgetPreferencesContext.Provider>
  );
};

export const useHeaderWidgetPreferences = () => {
  const context = useContext(HeaderWidgetPreferencesContext);
  if (!context) throw new Error("Header widget preferences provider is required");
  return context;
};
