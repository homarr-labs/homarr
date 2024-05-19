export const defaultServerSettingsKeys = ["analytics"] as const;

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
} satisfies ServerSettingsRecord;

export type ServerSettings = typeof defaultServerSettings;
