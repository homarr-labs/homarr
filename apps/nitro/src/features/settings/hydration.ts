import { createSettings } from "../../../../../packages/settings/src/creator";
import type { PublicServerSettings, UserSettings } from "../../../../../packages/settings/src/creator";
import type { RequestCulture } from "../../../../../packages/translation/src/runtime/resources";
import type { UserPreferences } from "./client";

export interface SettingsHydrationInput {
  readonly revision: string;
  readonly cacheScope: string;
  readonly serverSettings: PublicServerSettings;
  readonly user: UserSettings | null;
  readonly requestedColorScheme: UserPreferences["colorScheme"];
  readonly resolvedColorScheme: "light" | "dark";
  readonly culture: RequestCulture;
}

export function createSettingsHydrationJoin(input: SettingsHydrationInput) {
  const settings = createSettings({ user: input.user, serverSettings: input.serverSettings });
  return Object.freeze({
    revision: input.revision,
    cacheScope: input.cacheScope,
    settings: Object.freeze({
      ...settings,
      branding: Object.freeze({
        ...settings.branding,
        authBranding: Object.freeze({ ...settings.branding.authBranding }),
      }),
    }),
    requestedColorScheme: input.requestedColorScheme,
    resolvedColorScheme: input.resolvedColorScheme,
    locale: Object.freeze({ ...input.culture.resolved }),
    translation: input.culture.i18n.snapshot,
    dayjsLocale: input.culture.dayjsLocale,
    tableLocalization: input.culture.tableLocalization,
  });
}

export type SettingsHydrationJoin = ReturnType<typeof createSettingsHydrationJoin>;
