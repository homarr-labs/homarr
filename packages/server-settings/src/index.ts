import type { ColorScheme } from "@homarr/definitions";
import type { SupportedLanguage } from "@homarr/translation";

export const defaultServerSettingsKeys = [
  "analytics",
  "crawlingAndIndexing",
  "board",
  "appearance",
  "culture",
] as const;

export type ServerSettingsRecord = {
  [key in (typeof defaultServerSettingsKeys)[number]]: Record<string, unknown>;
};

export const defaultServerSettings = {
  analytics: {
    enableGeneral: true,
    enableWidgetData: false,
    enableIntegrationData: false,
    enableUserData: false,
  },
  crawlingAndIndexing: {
    noIndex: true,
    noFollow: true,
    noTranslate: true,
    noSiteLinksSearchBox: false,
  },
  board: {
    defaultBoardId: null as string | null,
  },
  appearance: {
    defaultColorScheme: "light" as ColorScheme,
  },
  culture: {
    defaultLocale: "en" as SupportedLanguage,
  },
} satisfies ServerSettingsRecord;

export type ServerSettings = typeof defaultServerSettings;
