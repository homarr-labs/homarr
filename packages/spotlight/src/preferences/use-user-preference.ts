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
import type { UserPreferenceKey } from "@homarr/settings";
import { useSettings } from "@homarr/settings";
import { useChangeLocale, useCurrentLocale, useI18n } from "@homarr/translation/client";

const optimisticPreferenceKeys = new Set<UserPreferenceKey>([
  "defaultSearchEngineId",
  "openSearchInNewTab",
  "ddgBangs",
  "firstDayOfWeek",
  "homeBoardId",
  "mobileHomeBoardId",
  "pingIconsEnabled",
]);

const optimisticPreferencesRef: { current: Partial<Record<UserPreferenceKey, unknown>> } = { current: {} };
let optimisticPreferencesVersion = 0;
const optimisticPreferenceListeners = new Set<() => void>();

const searchPreferenceKeys = ["defaultSearchEngineId", "openSearchInNewTab", "ddgBangs"] as const;
const homeBoardPreferenceKeys = ["homeBoardId", "mobileHomeBoardId"] as const;

const notifyOptimisticPreferenceListeners = () => {
  optimisticPreferencesVersion += 1;
  optimisticPreferenceListeners.forEach((listener) => listener());
};

const subscribeToOptimisticPreferenceChanges = (listener: () => void) => {
  optimisticPreferenceListeners.add(listener);
  return () => optimisticPreferenceListeners.delete(listener);
};

const setOptimisticPreference = (preferenceKey: UserPreferenceKey, value: unknown) => {
  optimisticPreferencesRef.current[preferenceKey] = value;
  notifyOptimisticPreferenceListeners();
};

const clearOptimisticPreferences = (keys: readonly UserPreferenceKey[]) => {
  let changed = false;
  keys.forEach((preferenceKey) => {
    changed ||= preferenceKey in optimisticPreferencesRef.current;
    delete optimisticPreferencesRef.current[preferenceKey];
  });
  if (!changed) return;

  notifyOptimisticPreferenceListeners();
};

const getEffectivePreferenceValue = (preferenceKey: UserPreferenceKey, settings: SettingsContextProps): unknown => {
  const optimisticValue = optimisticPreferencesRef.current[preferenceKey];
  if (optimisticValue !== undefined) {
    return optimisticValue;
  }

  const settingsValues: Partial<Record<UserPreferenceKey, unknown>> = {
    defaultSearchEngineId: settings.defaultSearchEngineId,
    openSearchInNewTab: settings.openSearchInNewTab,
    ddgBangs: settings.ddgBangs,
    firstDayOfWeek: settings.firstDayOfWeek,
    homeBoardId: settings.homeBoardId,
    mobileHomeBoardId: settings.mobileHomeBoardId,
    pingIconsEnabled: settings.pingIconsEnabled,
  };

  return settingsValues[preferenceKey];
};

const refreshAfterMutation = (router: ReturnType<typeof useRouter>) => {
  router.refresh();
};

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
  const pendingGroupsRef = useRef({
    search: false,
    homeBoards: false,
    firstDayOfWeek: false,
    pingIcons: false,
  });

  useSyncExternalStore(
    subscribeToOptimisticPreferenceChanges,
    () => optimisticPreferencesVersion,
    () => optimisticPreferencesVersion,
  );

  const showPreferenceErrorNotification = () => {
    showErrorNotification({
      message: t("search.mode.command.group.preferences.notification.error.message"),
    });
  };

  const { mutateAsync: mutateSearchPreferencesAsync, isPending: isSearchPreferencesPending } =
    clientApi.user.changeSearchPreferences.useMutation({
      onSuccess: () => refreshAfterMutation(router),
    });

  const { mutateAsync: mutateHomeBoardsAsync, isPending: isHomeBoardsPending } =
    clientApi.user.changeHomeBoards.useMutation({
      onSuccess: () => refreshAfterMutation(router),
    });

  const { mutateAsync: mutateFirstDayOfWeekAsync, isPending: isFirstDayOfWeekPending } =
    clientApi.user.changeFirstDayOfWeek.useMutation({
      onSuccess: () => refreshAfterMutation(router),
    });

  const { mutateAsync: mutatePingIconsEnabledAsync, isPending: isPingIconsPending } =
    clientApi.user.changePingIconsEnabled.useMutation({
      onSuccess: () => refreshAfterMutation(router),
    });

  const userId = session?.user.id;

  const persistedValues = useMemo<Record<UserPreferenceKey, unknown>>(
    () => ({
      colorScheme: colorScheme as ColorScheme,
      locale: currentLocale,
      defaultSearchEngineId: settings.defaultSearchEngineId,
      openSearchInNewTab: settings.openSearchInNewTab,
      ddgBangs: settings.ddgBangs,
      firstDayOfWeek: settings.firstDayOfWeek,
      homeBoardId: settings.homeBoardId,
      mobileHomeBoardId: settings.mobileHomeBoardId,
      pingIconsEnabled: settings.pingIconsEnabled,
      fullPreferencesPage: userId ? `/manage/users/${userId}/general` : null,
    }),
    [
      colorScheme,
      currentLocale,
      settings.defaultSearchEngineId,
      settings.openSearchInNewTab,
      settings.ddgBangs,
      settings.firstDayOfWeek,
      settings.homeBoardId,
      settings.mobileHomeBoardId,
      settings.pingIconsEnabled,
      userId,
    ],
  );

  const getValue = (preferenceKey: UserPreferenceKey) =>
    preferenceKey in optimisticPreferencesRef.current
      ? optimisticPreferencesRef.current[preferenceKey]
      : persistedValues[preferenceKey];

  useEffect(() => {
    clearOptimisticPreferences(
      Object.entries(persistedValues)
        .filter(
          ([preferenceKey, value]) => optimisticPreferencesRef.current[preferenceKey as UserPreferenceKey] === value,
        )
        .map(([preferenceKey]) => preferenceKey as UserPreferenceKey),
    );
  }, [persistedValues]);

  const setPersistedValueAsync = async (key: UserPreferenceKey, value: never) => {
    const currentSettings = settingsRef.current;

    const setters: Record<UserPreferenceKey, (nextValue: never) => Promise<void> | void> = {
      colorScheme: (nextValue) => setColorScheme(nextValue as ColorScheme),
      locale: (nextValue) => changeLocale(nextValue as typeof currentLocale),
      defaultSearchEngineId: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.search) return;
        pendingGroupsRef.current.search = true;
        try {
          await mutateSearchPreferencesAsync({
            userId,
            defaultSearchEngineId: nextValue as string | null,
            openInNewTab: getEffectivePreferenceValue("openSearchInNewTab", currentSettings) as boolean,
            ddgBangsEnabled: getEffectivePreferenceValue("ddgBangs", currentSettings) as boolean,
          });
        } finally {
          pendingGroupsRef.current.search = false;
        }
      },
      openSearchInNewTab: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.search) return;
        pendingGroupsRef.current.search = true;
        try {
          await mutateSearchPreferencesAsync({
            userId,
            defaultSearchEngineId: getEffectivePreferenceValue("defaultSearchEngineId", currentSettings) as
              | string
              | null,
            openInNewTab: nextValue as boolean,
            ddgBangsEnabled: getEffectivePreferenceValue("ddgBangs", currentSettings) as boolean,
          });
        } finally {
          pendingGroupsRef.current.search = false;
        }
      },
      ddgBangs: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.search) return;
        pendingGroupsRef.current.search = true;
        try {
          await mutateSearchPreferencesAsync({
            userId,
            defaultSearchEngineId: getEffectivePreferenceValue("defaultSearchEngineId", currentSettings) as
              | string
              | null,
            openInNewTab: getEffectivePreferenceValue("openSearchInNewTab", currentSettings) as boolean,
            ddgBangsEnabled: nextValue as boolean,
          });
        } finally {
          pendingGroupsRef.current.search = false;
        }
      },
      firstDayOfWeek: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.firstDayOfWeek) return;
        pendingGroupsRef.current.firstDayOfWeek = true;
        try {
          await mutateFirstDayOfWeekAsync({ id: userId, firstDayOfWeek: nextValue as DayOfWeek });
        } finally {
          pendingGroupsRef.current.firstDayOfWeek = false;
        }
      },
      homeBoardId: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.homeBoards) return;
        pendingGroupsRef.current.homeBoards = true;
        try {
          await mutateHomeBoardsAsync({
            userId,
            homeBoardId: nextValue as string | null,
            mobileHomeBoardId: getEffectivePreferenceValue("mobileHomeBoardId", currentSettings) as string | null,
          });
        } finally {
          pendingGroupsRef.current.homeBoards = false;
        }
      },
      mobileHomeBoardId: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.homeBoards) return;
        pendingGroupsRef.current.homeBoards = true;
        try {
          await mutateHomeBoardsAsync({
            userId,
            homeBoardId: getEffectivePreferenceValue("homeBoardId", currentSettings) as string | null,
            mobileHomeBoardId: nextValue as string | null,
          });
        } finally {
          pendingGroupsRef.current.homeBoards = false;
        }
      },
      pingIconsEnabled: async (nextValue) => {
        if (!userId) return;
        if (pendingGroupsRef.current.pingIcons) return;
        pendingGroupsRef.current.pingIcons = true;
        try {
          await mutatePingIconsEnabledAsync({ id: userId, pingIconsEnabled: nextValue as boolean });
        } finally {
          pendingGroupsRef.current.pingIcons = false;
        }
      },
      fullPreferencesPage: () => undefined,
    };

    await setters[key](value);
  };

  const isPreferencePending = (key: UserPreferenceKey) => {
    if (searchPreferenceKeys.includes(key as never))
      return isSearchPreferencesPending || pendingGroupsRef.current.search;
    if (homeBoardPreferenceKeys.includes(key as never))
      return isHomeBoardsPending || pendingGroupsRef.current.homeBoards;
    if (key === "firstDayOfWeek") return isFirstDayOfWeekPending || pendingGroupsRef.current.firstDayOfWeek;
    if (key === "pingIconsEnabled") return isPingIconsPending || pendingGroupsRef.current.pingIcons;

    return false;
  };

  const setValueAsync = async (key: UserPreferenceKey, value: never) => {
    if (optimisticPreferenceKeys.has(key) && !userId) return;
    if (isPreferencePending(key)) return;

    if (optimisticPreferenceKeys.has(key)) {
      setOptimisticPreference(key, value);
    }

    try {
      await setPersistedValueAsync(key, value);
    } catch {
      if (searchPreferenceKeys.includes(key as never)) {
        clearOptimisticPreferences(searchPreferenceKeys);
      } else if (homeBoardPreferenceKeys.includes(key as never)) {
        clearOptimisticPreferences(homeBoardPreferenceKeys);
      } else {
        clearOptimisticPreferences([key]);
      }
      showPreferenceErrorNotification();
    }
  };

  const pendingStates: Record<UserPreferenceKey, boolean> = {
    colorScheme: false,
    locale: false,
    defaultSearchEngineId: isPreferencePending("defaultSearchEngineId"),
    openSearchInNewTab: isPreferencePending("openSearchInNewTab"),
    ddgBangs: isPreferencePending("ddgBangs"),
    firstDayOfWeek: isPreferencePending("firstDayOfWeek"),
    homeBoardId: isPreferencePending("homeBoardId"),
    mobileHomeBoardId: isPreferencePending("mobileHomeBoardId"),
    pingIconsEnabled: isPreferencePending("pingIconsEnabled"),
    fullPreferencesPage: false,
  };

  return {
    getPreference(preferenceKey: UserPreferenceKey) {
      return {
        value: getValue(preferenceKey),
        setValue: (value: never) => setValueAsync(preferenceKey, value),
        isPending: pendingStates[preferenceKey],
      };
    },
  };
};

export const useUserPreference = (key: UserPreferenceKey) => {
  const preferences = useUserPreferences();

  return preferences.getPreference(key);
};
