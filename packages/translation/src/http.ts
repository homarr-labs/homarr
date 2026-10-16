import { fallbackLocale, supportedLanguages } from "./languages";
import type { SupportedLanguage } from "./languages";
import { createLanguageMapping } from "./mapping";

const languageMapping = createLanguageMapping();

const readString = (messages: unknown, path: string) => {
  let value = messages;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  if (typeof value === "string" && value.trim().length > 0) return value;
  return undefined;
};

/** Resolve plain HTTP messages without a Next.js request or React context. */
export const getHttpMessageAsync = async (requestedLocale: string | undefined, path: string): Promise<string> => {
  let locale: SupportedLanguage = fallbackLocale;
  if (supportedLanguages.includes(requestedLocale as SupportedLanguage)) locale = requestedLocale as SupportedLanguage;
  const messages = (await languageMapping[locale]()).default;
  const translated = readString(messages, path);
  if (translated !== undefined) return translated;
  const fallback = (await languageMapping[fallbackLocale]()).default;
  return readString(fallback, path) ?? path;
};
