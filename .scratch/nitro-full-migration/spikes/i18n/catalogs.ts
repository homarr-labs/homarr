import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

import deepmerge from "deepmerge";
import type { AbstractIntlMessages } from "use-intl/core";

import { fallbackLocale, supportedLanguages } from "../../../../packages/translation/src/languages";
import type { SupportedLanguage } from "../../../../packages/translation/src/languages";

export type Catalog = { readonly [key: string]: string | Catalog };
export type LoadedCatalog = {
  locale: SupportedLanguage;
  hash: string;
  raw: Catalog;
  messages: Catalog;
};

const directory = new URL("../../../../packages/translation/src/lang/", import.meta.url);

function validate(value: unknown): Catalog {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Catalog must be a nested string object");
  }
  const result: Record<string, string | Catalog> = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = typeof child === "string" ? child : validate(child);
  }
  return Object.freeze(result);
}

export function removeEmptyTranslations(catalog: Catalog): Catalog {
  return Object.fromEntries(
    Object.entries(catalog).flatMap<[string, string | Catalog]>(([key, value]) =>
      typeof value === "string" ? (value.trim() === "" ? [] : [[key, value]]) : [[key, removeEmptyTranslations(value)]],
    ),
  );
}

export function leaves(catalog: Catalog, prefix = ""): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : leaves(value, path);
  });
}

export async function loadCatalogs(): Promise<LoadedCatalog[]> {
  const discovered = (await readdir(directory)).filter((file) => file.endsWith(".json")).toSorted();
  const expected = supportedLanguages.map((locale) => `${locale}.json`).toSorted();
  if (JSON.stringify(discovered) !== JSON.stringify(expected) || discovered.length !== 36) {
    throw new Error("Catalog discovery does not match the exact 36 supported identities");
  }
  const rawCatalogs = await Promise.all(
    supportedLanguages.map(async (locale) => {
      const content = await readFile(new URL(`${locale}.json`, directory), "utf8");
      const parsed: unknown = JSON.parse(content);
      return { locale, hash: createHash("sha256").update(content).digest("hex"), raw: validate(parsed) };
    }),
  );
  const english = rawCatalogs.find(({ locale }) => locale === fallbackLocale);
  if (!english) throw new Error("English fallback is absent");
  return rawCatalogs.map((catalog) => {
    const selected = removeEmptyTranslations(catalog.raw);
    const messages = validate(catalog.locale === fallbackLocale ? selected : deepmerge(english.raw, selected));
    return { ...catalog, messages };
  });
}

export function engineMessages(catalog: Catalog): AbstractIntlMessages {
  return catalog;
}
