export const defaultServerSettingsKeys = ["analytics", "crawlingAndIndexing"] as const;

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
} satisfies ServerSettingsRecord;

export type ServerSettings = typeof defaultServerSettings;
