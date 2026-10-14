import type { RouterClient } from "@orpc/server";

import type { createServerSettingsProcedures } from "../../../../../packages/api/src/nitro/routers/server-settings";
import type { createUserPreferenceProcedures } from "../../../../../packages/api/src/nitro/routers/user";
import type { createSearchEngineProcedures } from "../../../../../packages/api/src/nitro/routers/search-engine";

export interface SettingsFeatureClient {
  readonly serverSettings: RouterClient<
    Pick<ReturnType<typeof createServerSettingsProcedures>, "getAll" | "getCulture" | "getBranding" | "saveSettings">
  >;
  readonly user: RouterClient<
    Pick<ReturnType<typeof createUserPreferenceProcedures>, "getPreferences" | "updatePreferences">
  >;
  readonly searchEngine: RouterClient<Pick<ReturnType<typeof createSearchEngineProcedures>, "getSelectable">>;
}

export type InstanceSettings = Awaited<ReturnType<SettingsFeatureClient["serverSettings"]["getAll"]>>;
export type UserPreferences = Awaited<ReturnType<SettingsFeatureClient["user"]["getPreferences"]>>;
export type SelectableSearchEngines = Awaited<ReturnType<SettingsFeatureClient["searchEngine"]["getSelectable"]>>;
export type PreferencePatch = Parameters<SettingsFeatureClient["user"]["updatePreferences"]>[0];

export type SettingsAccess =
  | { readonly kind: "denied"; readonly reason: string }
  | { readonly kind: "read-only"; readonly reason: string }
  | { readonly kind: "editable" };

export interface SettingsReadScope {
  readonly cacheScope: string;
  readonly access: SettingsAccess;
}
