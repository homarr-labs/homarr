"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import type { HeaderPreferences, HeaderWidgetItem } from "@homarr/validation/user";
import { getHeaderItemKey } from "@homarr/validation/user";

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
      if (getHeaderItemKey(candidate) === getHeaderItemKey(item)) return item;
      return candidate;
    });
  }
  return { ...preferences, zones };
};

const replayWidgetUpdates = (preferences: HeaderPreferences, items: Iterable<HeaderWidgetItem>) => {
  let next = preferences;
  for (const item of items) next = replaceWidget(next, item);
  return next;
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
  const latestServerPreferences = useRef(initialPreferences);
  const serverRevision = useRef(0);
  const successfulItems = useRef(new Map<string, HeaderWidgetItem>());
  const pending = useRef<PendingWidgetSave[]>([]);
  const processing = useRef(false);
  const router = useRouter();
  const mutation = clientApi.user.changeHeaderPreferences.useMutation();

  useEffect(() => {
    latestServerPreferences.current = initialPreferences;
    serverRevision.current += 1;
    // Server snapshots own layout and item presence. Preserve only successful
    // widget edits from this queue, and never add an item the server removed.
    confirmedPreferences.current = replayWidgetUpdates(initialPreferences, successfulItems.current.values());
    setPreferences(
      pending.current.reduce((value, operation) => replaceWidget(value, operation.item), confirmedPreferences.current),
    );
  }, [initialPreferences]);

  const updateOptimisticPreferences = () => {
    setPreferences(
      pending.current.reduce((value, operation) => replaceWidget(value, operation.item), confirmedPreferences.current),
    );
    setSavingItemIds(pending.current.map((operation) => operation.item.id));
  };

  const processQueue = async () => {
    if (processing.current || !userId) return;
    processing.current = true;
    latestServerPreferences.current = confirmedPreferences.current;
    while (pending.current.length > 0) {
      const operation = pending.current[0];
      if (!operation) break;
      try {
        let requestedRevision: number;
        do {
          requestedRevision = serverRevision.current;
          const next = replaceWidget(confirmedPreferences.current, operation.item);
          await mutation.mutateAsync({ id: userId, headerPreferences: next });
          successfulItems.current.set(operation.item.id, operation.item);
          confirmedPreferences.current = replayWidgetUpdates(
            latestServerPreferences.current,
            successfulItems.current.values(),
          );
          // A snapshot received during the request needs a corrective write,
          // including when this is the final queued operation.
        } while (requestedRevision !== serverRevision.current);
        operation.resolve();
      } catch (error) {
        operation.reject(error);
      }
      pending.current.shift();
      updateOptimisticPreferences();
    }
    successfulItems.current.clear();
    processing.current = false;
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
