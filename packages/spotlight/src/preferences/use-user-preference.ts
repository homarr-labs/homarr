"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMantineColorScheme } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { ColorScheme } from "@homarr/definitions";
import { showErrorNotification } from "@homarr/notifications";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { userPreferenceDefinitions, userPreferenceDefinitionByKey } from "@homarr/settings";
import type { UserPreferenceKey } from "@homarr/settings";
import { useSettings } from "@homarr/settings";
import { useChangeLocale, useCurrentLocale, useI18n } from "@homarr/translation/client";

// --- Optimistic store (module-level, shared across all hook instances) ---

const optimisticRef: { current: Partial<Record<UserPreferenceKey, unknown>> } = { current: {} };
let optimisticVersion = 0;
const optimisticListeners = new Set<() => void>();

const notifyListeners = () => {
  optimisticVersion += 1;
  optimisticListeners.forEach((fn) => fn());
};

const subscribeOptimistic = (listener: () => void) => {
  optimisticListeners.add(listener);
  return () => optimisticListeners.delete(listener);
};

const setOptimistic = (key: UserPreferenceKey, value: unknown) => {
  optimisticRef.current[key] = value;
  notifyListeners();
};

const clearOptimistic = (keys: readonly UserPreferenceKey[]) => {
  let changed = false;
  for (const key of keys) {
    changed ||= key in optimisticRef.current;
    delete optimisticRef.current[key];
  }
  if (changed) notifyListeners();
};

const CLIENT_ONLY_GROUPS = new Set(["colorScheme", "locale"]);

const isDbBacked = (key: UserPreferenceKey) => {
  const group = userPreferenceDefinitionByKey[key].mutationGroup;
  return group !== null && !CLIENT_ONLY_GROUPS.has(group);
};

const getGroupKeys = (key: UserPreferenceKey): UserPreferenceKey[] => {
  const group = userPreferenceDefinitionByKey[key].mutationGroup;
  if (!group) return [key];
  return userPreferenceDefinitions.filter((d) => d.mutationGroup === group).map((d) => d.key);
};

// --- Hook ---

export const useUserPreferences = () => {
  const router = useRouter();
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const { data: session } = useSession();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const currentLocale = useCurrentLocale();
  const { changeLocale } = useChangeLocale();
  const t = useI18n();
  const userId = session?.user.id;
  const pendingRef = useRef<Record<string, boolean>>({});
  const prevUserIdRef = useRef(userId);

  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    clearOptimistic(userPreferenceDefinitions.map((d) => d.key));
  }, [userId]);

  useSyncExternalStore(
    subscribeOptimistic,
    () => optimisticVersion,
    () => optimisticVersion,
  );

  const refresh = () => router.refresh();

  const searchMutation = clientApi.user.changeSearchPreferences.useMutation({ onSuccess: refresh });
  const homeBoardsMutation = clientApi.user.changeHomeBoards.useMutation({ onSuccess: refresh });
  const firstDayMutation = clientApi.user.changeFirstDayOfWeek.useMutation({ onSuccess: refresh });
  const pingMutation = clientApi.user.changePingIconsEnabled.useMutation({ onSuccess: refresh });

  const getEffective = (key: UserPreferenceKey): unknown =>
    key in optimisticRef.current ? optimisticRef.current[key] : settingsRef.current[key as keyof SettingsContextProps];

  const pick = (field: UserPreferenceKey, changedKey: UserPreferenceKey, value: unknown) =>
    field === changedKey ? value : getEffective(field);

  const groupDispatchers: Record<string, (uid: string, key: UserPreferenceKey, value: unknown) => Promise<unknown>> = {
    searchPreferences: (uid, key, value) =>
      searchMutation.mutateAsync({
        userId: uid,
        defaultSearchEngineId: pick("defaultSearchEngineId", key, value) as string | null,
        openInNewTab: pick("openSearchInNewTab", key, value) as boolean,
        ddgBangsEnabled: pick("ddgBangs", key, value) as boolean,
      }),
    homeBoards: (uid, key, value) =>
      homeBoardsMutation.mutateAsync({
        userId: uid,
        homeBoardId: pick("homeBoardId", key, value) as string | null,
        mobileHomeBoardId: pick("mobileHomeBoardId", key, value) as string | null,
      }),
    firstDayOfWeek: (uid, _key, value) => firstDayMutation.mutateAsync({ id: uid, firstDayOfWeek: value as DayOfWeek }),
    pingIconsEnabled: (uid, _key, value) => pingMutation.mutateAsync({ id: uid, pingIconsEnabled: value as boolean }),
  };

  const groupPending: Record<string, boolean> = {
    searchPreferences: searchMutation.isPending,
    homeBoards: homeBoardsMutation.isPending,
    firstDayOfWeek: firstDayMutation.isPending,
    pingIconsEnabled: pingMutation.isPending,
  };

  const persistedValues = useMemo<Record<UserPreferenceKey, unknown>>(() => {
    const values: Record<string, unknown> = {
      colorScheme: colorScheme as ColorScheme,
      locale: currentLocale,
      fullPreferencesPage: userId ? `/manage/users/${userId}/general` : null,
    };
    for (const def of userPreferenceDefinitions) {
      if (def.key in values) continue;
      values[def.key] = settings[def.key as keyof SettingsContextProps];
    }
    return values as Record<UserPreferenceKey, unknown>;
  }, [colorScheme, currentLocale, userId, settings]);

  useEffect(() => {
    const matchedKeys = Object.entries(persistedValues)
      .filter(([key, value]) => optimisticRef.current[key as UserPreferenceKey] === value)
      .map(([key]) => key as UserPreferenceKey);
    clearOptimistic(matchedKeys);
  }, [persistedValues]);

  const getValue = (key: UserPreferenceKey) =>
    key in optimisticRef.current ? optimisticRef.current[key] : persistedValues[key];

  const isPreferencePending = (key: UserPreferenceKey): boolean => {
    const group = userPreferenceDefinitionByKey[key].mutationGroup;
    if (!group || CLIENT_ONLY_GROUPS.has(group)) return false;
    return (groupPending[group] ?? false) || (pendingRef.current[group] ?? false);
  };

  const clientSetters: Partial<Record<UserPreferenceKey, (value: unknown) => void>> = {
    colorScheme: (value) => setColorScheme(value as ColorScheme),
    locale: (value) => changeLocale(value as typeof currentLocale),
    fullPreferencesPage: () => undefined,
  };

  const setValueAsync = async (key: UserPreferenceKey, value: unknown) => {
    if (isDbBacked(key) && !userId) return;
    if (isPreferencePending(key)) return;

    const clientSetter = clientSetters[key];
    if (clientSetter) {
      clientSetter(value);
      return;
    }

    const group = userPreferenceDefinitionByKey[key].mutationGroup;
    if (!group) return;
    const dispatcher = groupDispatchers[group];
    if (!dispatcher || !userId) return;

    setOptimistic(key, value);

    pendingRef.current[group] = true;
    try {
      await dispatcher(userId, key, value);
    } catch {
      clearOptimistic(getGroupKeys(key));
      showErrorNotification({
        message: t("search.mode.command.group.preferences.notification.error.message"),
      });
    } finally {
      pendingRef.current[group] = false;
    }
  };

  return {
    getPreference(preferenceKey: UserPreferenceKey) {
      return {
        value: getValue(preferenceKey),
        setValue: (value: never) => setValueAsync(preferenceKey, value),
        isPending: isPreferencePending(preferenceKey),
      };
    },
  };
};

export const useUserPreference = (key: UserPreferenceKey) => useUserPreferences().getPreference(key);
