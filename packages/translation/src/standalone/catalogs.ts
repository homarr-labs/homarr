import deepmerge from "deepmerge";
import type { AbstractIntlMessages } from "use-intl/core";

import { fallbackLocale, supportedLanguages } from "../languages";
import type { SupportedLanguage } from "../languages";

import type { TranslationObject } from "./types";

const catalogImports = {
  ca: () => import("../lang/ca.json"),
  cn: () => import("../lang/cn.json"),
  cr: () => import("../lang/cr.json"),
  cs: () => import("../lang/cs.json"),
  da: () => import("../lang/da.json"),
  de: () => import("../lang/de.json"),
  "de-CH": () => import("../lang/de-CH.json"),
  "en-gb": () => import("../lang/en-gb.json"),
  en: () => import("../lang/en.json"),
  el: () => import("../lang/el.json"),
  es: () => import("../lang/es.json"),
  et: () => import("../lang/et.json"),
  fi: () => import("../lang/fi.json"),
  fr: () => import("../lang/fr.json"),
  he: () => import("../lang/he.json"),
  hr: () => import("../lang/hr.json"),
  hu: () => import("../lang/hu.json"),
  it: () => import("../lang/it.json"),
  ja: () => import("../lang/ja.json"),
  ko: () => import("../lang/ko.json"),
  lt: () => import("../lang/lt.json"),
  lv: () => import("../lang/lv.json"),
  nl: () => import("../lang/nl.json"),
  no: () => import("../lang/no.json"),
  pl: () => import("../lang/pl.json"),
  pt: () => import("../lang/pt.json"),
  "pt-br": () => import("../lang/pt-br.json"),
  ro: () => import("../lang/ro.json"),
  ru: () => import("../lang/ru.json"),
  sk: () => import("../lang/sk.json"),
  sl: () => import("../lang/sl.json"),
  sv: () => import("../lang/sv.json"),
  tr: () => import("../lang/tr.json"),
  zh: () => import("../lang/zh.json"),
  uk: () => import("../lang/uk.json"),
  vi: () => import("../lang/vi.json"),
} satisfies Record<SupportedLanguage, () => Promise<{ default: TranslationObject }>>;

function removeEmptyTranslations(messages: AbstractIntlMessages): AbstractIntlMessages {
  const result: AbstractIntlMessages = {};
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value !== "string") result[key] = removeEmptyTranslations(value);
    else if (value.trim() !== "") result[key] = value;
  }
  return result;
}

function freezeMessages<Value extends AbstractIntlMessages>(messages: Value): Value {
  for (const value of Object.values(messages)) {
    if (typeof value !== "string") freezeMessages(value);
  }
  return Object.freeze(messages);
}

export const isLocaleSupported = (locale: string): locale is SupportedLanguage =>
  supportedLanguages.some((supported) => supported === locale);

export async function loadMessages(locale: SupportedLanguage): Promise<TranslationObject> {
  const selected = removeEmptyTranslations((await catalogImports[locale]()).default);
  if (locale === fallbackLocale) return freezeMessages(selected) as TranslationObject;
  const english = (await catalogImports[fallbackLocale]()).default;
  return freezeMessages(deepmerge(english, selected)) as TranslationObject;
}
