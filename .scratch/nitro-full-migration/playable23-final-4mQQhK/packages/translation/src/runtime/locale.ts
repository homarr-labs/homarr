import { localeCookieKey } from "@homarr/definitions/cookie";

import { getIntlLocale, isLocaleRTL } from "../config";
import { fallbackLocale, supportedLanguages } from "../languages";
import type { SupportedLanguage } from "../languages";
import { isLocaleSupported } from "../standalone/catalogs";

export interface LocalePreferenceStore {
  get(name: typeof localeCookieKey): string | undefined;
}

export interface LocaleCookieEffect {
  kind: "cookie";
  name: typeof localeCookieKey;
  value: SupportedLanguage;
  options: { maxAge: number; sameSite: "lax"; path: string };
}

export interface LocaleRequestResources {
  preferences: LocalePreferenceStore;
  readDefaultLocale(): Promise<string>;
}

export interface ResolvedLocale {
  catalogLocale: SupportedLanguage;
  intlLocale: string;
  direction: "rtl" | "ltr";
  source: "explicit" | "cookie" | "configuration" | "fallback";
  defaultLocale: SupportedLanguage;
  cookieLocale: string | undefined;
}

export async function resolveRequestLocale(
  resources: LocaleRequestResources,
  explicitLocale?: string,
): Promise<ResolvedLocale> {
  const cookieLocale = resources.preferences.get(localeCookieKey);
  const supportedCookie = cookieLocale !== undefined && isLocaleSupported(cookieLocale) ? cookieLocale : undefined;
  const configuredLocale = supportedCookie ? undefined : await resources.readDefaultLocale();
  const defaultLocale =
    configuredLocale !== undefined && isLocaleSupported(configuredLocale) ? configuredLocale : fallbackLocale;
  const explicit =
    explicitLocale === undefined
      ? undefined
      : supportedLanguages.find((locale) => locale.toLowerCase() === explicitLocale.toLowerCase());
  const catalogLocale = explicit ?? supportedCookie ?? defaultLocale;
  return {
    catalogLocale,
    intlLocale: getIntlLocale(catalogLocale),
    direction: isLocaleRTL(catalogLocale) ? "rtl" : "ltr",
    source: explicit
      ? "explicit"
      : supportedCookie
        ? "cookie"
        : configuredLocale === defaultLocale
          ? "configuration"
          : "fallback",
    defaultLocale,
    cookieLocale,
  };
}

export function createLocaleCookieEffect(locale: SupportedLanguage, basePath: string): LocaleCookieEffect {
  return {
    kind: "cookie",
    name: localeCookieKey,
    value: locale,
    options: { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: basePath || "/" },
  };
}

export function syncLocalePreference(
  resolved: ResolvedLocale,
  basePath: string,
  effect: (value: LocaleCookieEffect) => void,
): void {
  if (
    resolved.cookieLocale !== undefined
      ? resolved.cookieLocale !== resolved.catalogLocale
      : resolved.defaultLocale !== resolved.catalogLocale
  ) {
    effect(createLocaleCookieEffect(resolved.catalogLocale, basePath));
  }
}
