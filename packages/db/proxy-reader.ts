import { eq } from "drizzle-orm";
import { parse } from "superjson";

import { defaultServerSettings } from "@homarr/server-settings";

import type { PersistenceRuntime } from "./runtime";

export interface ProxyReader {
  closeAsync(): Promise<void>;
  getOnboardingStepAsync(): Promise<string>;
  getDefaultLocaleAsync(): Promise<string>;
}

export const createProxySettingsReader = (runtime: Pick<PersistenceRuntime, "runAsync">): ProxyReader => {
  let closed = false;
  const assertOpen = () => {
    if (closed) throw new Error("The proxy settings reader is closed");
  };
  return {
    async closeAsync() {
      closed = true;
    },
    async getOnboardingStepAsync() {
      assertOpen();
      return runtime.runAsync(
        async (database, schema) =>
          (await database.select({ step: schema.onboarding.step }).from(schema.onboarding).limit(1))[0]?.step ??
          "start",
      );
    },
    async getDefaultLocaleAsync() {
      assertOpen();
      return runtime.runAsync(async (database, schema) => {
        const rows = await database
          .select({ value: schema.serverSettings.value })
          .from(schema.serverSettings)
          .where(eq(schema.serverSettings.settingKey, "culture"))
          .limit(1);
        const value = rows[0]?.value;
        if (typeof value === "string") {
          try {
            const culture: unknown = parse(value);
            if (
              typeof culture === "object" &&
              culture !== null &&
              "defaultLocale" in culture &&
              typeof culture.defaultLocale === "string"
            )
              return culture.defaultLocale;
          } catch {}
        }
        return defaultServerSettings.culture.defaultLocale;
      });
    },
  };
};

let reader: ProxyReader | undefined;

export const configureProxySettingsReader = (next: ProxyReader) => {
  if (reader) throw new Error("The proxy settings reader is already configured");
  reader = next;
};

const getReader = () => {
  if (!reader) throw new Error("The proxy settings reader has not been explicitly configured");
  return reader;
};

export const getOnboardingStepForProxyAsync = () => getReader().getOnboardingStepAsync();
export const getDefaultLocaleForProxyAsync = () => getReader().getDefaultLocaleAsync();
export const closeProxySettingsReaderAsync = async () => {
  const previous = reader;
  reader = undefined;
  await previous?.closeAsync();
};
