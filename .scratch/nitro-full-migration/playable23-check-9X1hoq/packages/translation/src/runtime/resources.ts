import type { MRT_Localization } from "mantine-react-table";

import { localeConfigurations } from "../config";
import type { SupportedLanguage } from "../languages";
import { loadRequestI18n } from "../standalone/server";
import type { RequestI18nOptions } from "../standalone/types";

import type { ResolvedLocale } from "./locale";

export type CultureSnapshotOptions = Omit<RequestI18nOptions, "locale">;

export interface LocaleResources {
  readonly dayjsLocale: string;
  readonly tableLocalization: Readonly<MRT_Localization>;
}

function unwrapTableLocalization(imported: MRT_Localization | { default: MRT_Localization }): MRT_Localization {
  return "default" in imported ? imported.default : imported;
}

export async function loadLocaleResources(locale: SupportedLanguage): Promise<LocaleResources> {
  const configuration = localeConfigurations[locale];
  const [dayjsLocale, importedTable] = await Promise.all([
    configuration.importDayJsLocale(),
    configuration.importMrtLocalization(),
  ]);
  const tableLocalization = unwrapTableLocalization(importedTable);
  return { dayjsLocale: dayjsLocale.name, tableLocalization: Object.freeze({ ...tableLocalization }) };
}

export async function loadRequestCulture(resolved: ResolvedLocale, options: CultureSnapshotOptions) {
  const selection = Object.freeze({ ...resolved });
  const configuration = { ...options, ...(options.now === undefined ? {} : { now: new Date(options.now) }) };
  const [i18n, resources] = await Promise.all([
    loadRequestI18n({ ...configuration, locale: selection.catalogLocale }),
    loadLocaleResources(selection.catalogLocale),
  ]);
  return Object.freeze({ resolved: selection, i18n, ...resources });
}

export type RequestCulture = Awaited<ReturnType<typeof loadRequestCulture>>;

export type CultureLoadState =
  | { kind: "idle"; revision: number }
  | { kind: "loading"; revision: number; locale: SupportedLanguage }
  | { kind: "ready"; revision: number; value: RequestCulture }
  | { kind: "failed"; revision: number; locale: SupportedLanguage; error: unknown };

export type CultureLoadResult =
  | Exclude<CultureLoadState, { kind: "idle" | "loading" }>
  | { kind: "stale"; revision: number };

export function createCultureResourceStore(loadCulture: typeof loadRequestCulture = loadRequestCulture) {
  let revision = 0;
  let state: CultureLoadState = { kind: "idle", revision };
  return {
    read: (): CultureLoadState => state,
    invalidate() {
      state = { kind: "idle", revision: ++revision };
    },
    async load(resolved: ResolvedLocale, options: CultureSnapshotOptions): Promise<CultureLoadResult> {
      const generation = ++revision;
      state = { kind: "loading", revision: generation, locale: resolved.catalogLocale };
      try {
        const value = await loadCulture(resolved, options);
        if (generation !== revision) return { kind: "stale", revision: generation };
        state = { kind: "ready", revision: generation, value };
        return state;
      } catch (error: unknown) {
        if (generation !== revision) return { kind: "stale", revision: generation };
        state = { kind: "failed", revision: generation, locale: resolved.catalogLocale, error };
        return state;
      }
    },
  };
}
