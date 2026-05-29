"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMantineColorScheme } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { ColorScheme } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";
import type { UserPreferenceKey } from "@homarr/settings";
import { useSettings } from "@homarr/settings";
import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

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

const searchPreferenceKeys = ["defaultSearchEngineId", "openSearchInNewTab", "ddgBangs"] as const;
const homeBoardPreferenceKeys = ["homeBoardId", "mobileHomeBoardId"] as const;

const clearOptimisticPreferences = (keys: readonly UserPreferenceKey[]) => {
  keys.forEach((preferenceKey) => {
    delete optimisticPreferencesRef.current[preferenceKey];
  });
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

export const useUserPreference = (key: UserPreferenceKey) => {
  const router = useRouter();
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const { data: session } = useSession();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const currentLocale = useCurrentLocale();
  const { changeLocale } = useChangeLocale();
  const [optimisticValue, setOptimisticValue] = useState<unknown>();

  const { mutate: mutateSearchPreferences, isPending: isSearchPreferencesPending } =
    clientApi.user.changeSearchPreferences.useMutation({
      onSuccess: () => refreshAfterMutation(router),
      onError: () => clearOptimisticPreferences(searchPreferenceKeys),
    });

  const { mutate: mutateHomeBoards, isPending: isHomeBoardsPending } = clientApi.user.changeHomeBoards.useMutation({
    onSuccess: () => refreshAfterMutation(router),
    onError: () => clearOptimisticPreferences(homeBoardPreferenceKeys),
  });

  const { mutate: mutateFirstDayOfWeek, isPending: isFirstDayOfWeekPending } =
    clientApi.user.changeFirstDayOfWeek.useMutation({
      onSuccess: () => refreshAfterMutation(router),
      onError: () => clearOptimisticPreferences(["firstDayOfWeek"]),
    });

  const { mutate: mutatePingIconsEnabled, isPending: isPingIconsPending } =
    clientApi.user.changePingIconsEnabled.useMutation({
      onSuccess: () => refreshAfterMutation(router),
      onError: () => clearOptimisticPreferences(["pingIconsEnabled"]),
    });

  const userId = session?.user.id;

  const persistedValues: Record<UserPreferenceKey, unknown> = {
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
  };

  const persistedValue = persistedValues[key];

  useEffect(() => {
    delete optimisticPreferencesRef.current[key];
    setOptimisticValue(undefined);
  }, [persistedValue, key]);

  const setPersistedValue = (value: never) => {
    const currentSettings = settingsRef.current;

    const setters: Record<UserPreferenceKey, (nextValue: never) => void> = {
      colorScheme: (nextValue) => setColorScheme(nextValue as ColorScheme),
      locale: (nextValue) => changeLocale(nextValue as typeof currentLocale),
      defaultSearchEngineId: (nextValue) => {
        if (!userId) return;
        mutateSearchPreferences({
          userId,
          defaultSearchEngineId: nextValue as string | null,
          openInNewTab: getEffectivePreferenceValue("openSearchInNewTab", currentSettings) as boolean,
          ddgBangsEnabled: getEffectivePreferenceValue("ddgBangs", currentSettings) as boolean,
        });
      },
      openSearchInNewTab: (nextValue) => {
        if (!userId) return;
        mutateSearchPreferences({
          userId,
          defaultSearchEngineId: getEffectivePreferenceValue("defaultSearchEngineId", currentSettings) as string | null,
          openInNewTab: nextValue as boolean,
          ddgBangsEnabled: getEffectivePreferenceValue("ddgBangs", currentSettings) as boolean,
        });
      },
      ddgBangs: (nextValue) => {
        if (!userId) return;
        mutateSearchPreferences({
          userId,
          defaultSearchEngineId: getEffectivePreferenceValue("defaultSearchEngineId", currentSettings) as string | null,
          openInNewTab: getEffectivePreferenceValue("openSearchInNewTab", currentSettings) as boolean,
          ddgBangsEnabled: nextValue as boolean,
        });
      },
      firstDayOfWeek: (nextValue) => {
        if (!userId) return;
        mutateFirstDayOfWeek({ id: userId, firstDayOfWeek: nextValue as DayOfWeek });
      },
      homeBoardId: (nextValue) => {
        if (!userId) return;
        mutateHomeBoards({
          userId,
          homeBoardId: nextValue as string | null,
          mobileHomeBoardId: getEffectivePreferenceValue("mobileHomeBoardId", currentSettings) as string | null,
        });
      },
      mobileHomeBoardId: (nextValue) => {
        if (!userId) return;
        mutateHomeBoards({
          userId,
          homeBoardId: getEffectivePreferenceValue("homeBoardId", currentSettings) as string | null,
          mobileHomeBoardId: nextValue as string | null,
        });
      },
      pingIconsEnabled: (nextValue) => {
        if (!userId) return;
        mutatePingIconsEnabled({ id: userId, pingIconsEnabled: nextValue as boolean });
      },
      fullPreferencesPage: () => undefined,
    };

    setters[key](value);
  };

  const setValue = (value: never) => {
    if (optimisticPreferenceKeys.has(key)) {
      optimisticPreferencesRef.current[key] = value;
      setOptimisticValue(value);
    }

    setPersistedValue(value);
  };

  const pendingStates: Record<UserPreferenceKey, boolean> = {
    colorScheme: false,
    locale: false,
    defaultSearchEngineId: isSearchPreferencesPending,
    openSearchInNewTab: isSearchPreferencesPending,
    ddgBangs: isSearchPreferencesPending,
    firstDayOfWeek: isFirstDayOfWeekPending,
    homeBoardId: isHomeBoardsPending,
    mobileHomeBoardId: isHomeBoardsPending,
    pingIconsEnabled: isPingIconsPending,
    fullPreferencesPage: false,
  };

  return {
    value: optimisticPreferencesRef.current[key] ?? optimisticValue ?? persistedValue,
    setValue,
    isPending: pendingStates[key],
  };
};
