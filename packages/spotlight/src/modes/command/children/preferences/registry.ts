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

import { userPreferenceDefinitions } from "@homarr/settings";
import type { UserPreferenceKey } from "@homarr/settings";
import type { TablerIcon } from "@homarr/ui";

import type { createChildrenOptions } from "../../../../lib/children";
import { languageChildrenOptions } from "../language";
import { createBoardChildrenOptions } from "./board";
import { colorSchemeChildrenOptions } from "./color-scheme";
import { firstDayOfWeekChildrenOptions } from "./first-day-of-week";
import { searchEngineChildrenOptions } from "./search-engine";

type ChildrenPreferenceKey =
  | "colorScheme"
  | "locale"
  | "defaultSearchEngineId"
  | "firstDayOfWeek"
  | "homeBoardId"
  | "mobileHomeBoardId";

type PreferenceChildrenOptionsFactory = ReturnType<typeof createChildrenOptions<Record<string, unknown>>>;

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

export const preferenceChildrenOptionsByKey: Record<ChildrenPreferenceKey, PreferenceChildrenOptionsFactory> = {
  colorScheme: colorSchemeChildrenOptions,
  locale: languageChildrenOptions,
  defaultSearchEngineId: searchEngineChildrenOptions,
  firstDayOfWeek: firstDayOfWeekChildrenOptions,
  homeBoardId: createBoardChildrenOptions({ preferenceKey: "homeBoardId" }),
  mobileHomeBoardId: createBoardChildrenOptions({ preferenceKey: "mobileHomeBoardId" }),
};

export const visiblePreferenceDefinitions = (isAuthenticated: boolean) =>
  userPreferenceDefinitions.filter((definition) => definition.guest || isAuthenticated);
