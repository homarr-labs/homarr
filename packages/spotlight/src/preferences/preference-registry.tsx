"use client";

import {
  IconActivity,
  IconCalendarWeek,
  IconDeviceDesktop,
  IconExternalLink,
  IconHome,
  IconLanguage,
  IconLayoutBoard,
  IconSearch,
  IconSettings,
  IconWorldWww,
} from "@tabler/icons-react";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import { clientApi } from "@homarr/api/client";
import { colorSchemes } from "@homarr/definitions";
import type { UserPreferenceKey } from "@homarr/settings";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createChildrenOptions } from "../lib/children";
import {
  createCheckmarkPreferenceAction,
  createLoadingPreferenceAction,
  PreferenceDetailHeader,
} from "../modes/command/children/preferences/action-row";
import { createSelectablePreferenceActions } from "../modes/command/children/preferences/selectable-actions";
import { languageChildrenOptions } from "../modes/command/children/language";
import { useUserPreference } from "./use-user-preference";

dayjs.extend(localeData);

type ChildrenFactory = ReturnType<typeof createChildrenOptions<Record<string, unknown>>>;

export const preferenceIcons: Record<UserPreferenceKey, TablerIcon> = {
  colorScheme: IconDeviceDesktop,
  locale: IconLanguage,
  defaultSearchEngineId: IconSearch,
  openSearchInNewTab: IconExternalLink,
  ddgBangs: IconWorldWww,
  firstDayOfWeek: IconCalendarWeek,
  homeBoardId: IconHome,
  mobileHomeBoardId: IconLayoutBoard,
  pingIconsEnabled: IconActivity,
  fullPreferencesPage: IconSettings,
};

const createStaticChildren = (
  preferenceKey: UserPreferenceKey,
  useOptions: () => Array<{ key: string; label: string; value: unknown }>,
): ChildrenFactory =>
  createChildrenOptions<Record<string, unknown>>({
    useActions: () => {
      const { value, setValue, isPending } = useUserPreference(preferenceKey);
      return useOptions().map((opt) =>
        createCheckmarkPreferenceAction({
          key: opt.key,
          label: opt.label,
          isSelected: value === opt.value,
          onSelect: () => setValue(opt.value as never),
          isPending,
        }),
      );
    },
    DetailComponent: () => <PreferenceDetailHeader titleKey={`${preferenceKey}.children.detail.title`} />,
  });

const createAsyncSelectableChildren = <TItem,>(
  preferenceKey: UserPreferenceKey,
  useQuery: () => { data: TItem[] | undefined; isLoading: boolean },
  mapItem: (item: TItem) => { key: string; label: string; value: string },
  noneKey: string,
  unavailableKey: string,
): ChildrenFactory =>
  createChildrenOptions<Record<string, unknown>>({
    useActions: (_, query) => {
      const { value, setValue, isPending } = useUserPreference(preferenceKey);
      const result = useQuery();
      const t = useScopedI18n("search.mode.command.group.preferences.option");

      if (result.isLoading) return [createLoadingPreferenceAction()];

      return createSelectablePreferenceActions({
        query,
        currentValue: value as string | null,
        noneLabel: t(noneKey as never),
        unavailableLabel: t(unavailableKey as never),
        items: (result.data ?? []).map(mapItem),
        onSelect: (v) => setValue(v as never),
        isPending,
      });
    },
    DetailComponent: () => <PreferenceDetailHeader titleKey={`${preferenceKey}.children.detail.title`} />,
  });

const firstDayOfWeekOptions: DayOfWeek[] = [1, 6, 0];

export const preferenceChildrenOptionsByKey: Partial<Record<UserPreferenceKey, ChildrenFactory>> = {
  colorScheme: createStaticChildren("colorScheme", () => {
    const t = useScopedI18n("common.colorScheme.options");
    return colorSchemes.map((s) => ({ key: s, label: t(s), value: s }));
  }),
  locale: languageChildrenOptions,
  defaultSearchEngineId: createAsyncSelectableChildren(
    "defaultSearchEngineId",
    () => clientApi.searchEngine.getSelectable.useQuery(),
    (e) => ({ key: e.value, label: e.label, value: e.value }),
    "searchEngine.none",
    "searchEngine.unavailable",
  ),
  firstDayOfWeek: createStaticChildren("firstDayOfWeek", () =>
    firstDayOfWeekOptions.map((day) => ({
      key: day.toString(),
      label: dayjs.weekdays(false)[day] ?? day.toString(),
      value: day,
    })),
  ),
  homeBoardId: createAsyncSelectableChildren(
    "homeBoardId",
    () => clientApi.board.getAllBoards.useQuery(),
    (b) => ({ key: b.id, label: b.name, value: b.id }),
    "board.none",
    "board.unavailable",
  ),
  mobileHomeBoardId: createAsyncSelectableChildren(
    "mobileHomeBoardId",
    () => clientApi.board.getAllBoards.useQuery(),
    (b) => ({ key: b.id, label: b.name, value: b.id }),
    "board.none",
    "board.unavailable",
  ),
};
