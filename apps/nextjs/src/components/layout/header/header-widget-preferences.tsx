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
  const pending = useRef<PendingWidgetSave[]>([]);
  const processing = useRef(false);
  const router = useRouter();
  const mutation = clientApi.user.changeHeaderPreferences.useMutation();

  useEffect(() => {
    if (processing.current) return;
    confirmedPreferences.current = initialPreferences;
    setPreferences(initialPreferences);
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
    while (pending.current.length > 0) {
      const operation = pending.current[0];
      if (!operation) break;
      const next = replaceWidget(confirmedPreferences.current, operation.item);
      try {
        await mutation.mutateAsync({ id: userId, headerPreferences: next });
        confirmedPreferences.current = next;
        operation.resolve();
      } catch (error) {
        operation.reject(error);
      }
      pending.current.shift();
      updateOptimisticPreferences();
    }
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
