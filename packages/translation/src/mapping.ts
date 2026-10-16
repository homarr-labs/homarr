import type { SupportedLanguage } from "./languages";

const enTranslations = () => import("./lang/en.json");
type EnTranslation = typeof enTranslations;

// Literal imports allow standalone bundlers to include each locale without a
// framework-specific dynamic import context.
const languageMapping = {
  ca: () => import("./lang/ca.json"),
  cn: () => import("./lang/cn.json"),
  cr: () => import("./lang/cr.json"),
  cs: () => import("./lang/cs.json"),
  da: () => import("./lang/da.json"),
  de: () => import("./lang/de.json"),
  "de-CH": () => import("./lang/de-CH.json"),
  "en-gb": () => import("./lang/en-gb.json"),
  en: enTranslations,
  el: () => import("./lang/el.json"),
  es: () => import("./lang/es.json"),
  et: () => import("./lang/et.json"),
  fi: () => import("./lang/fi.json"),
  fr: () => import("./lang/fr.json"),
  he: () => import("./lang/he.json"),
  hr: () => import("./lang/hr.json"),
  hu: () => import("./lang/hu.json"),
  it: () => import("./lang/it.json"),
  ja: () => import("./lang/ja.json"),
  ko: () => import("./lang/ko.json"),
  lt: () => import("./lang/lt.json"),
  lv: () => import("./lang/lv.json"),
  nl: () => import("./lang/nl.json"),
  no: () => import("./lang/no.json"),
  pl: () => import("./lang/pl.json"),
  pt: () => import("./lang/pt.json"),
  "pt-br": () => import("./lang/pt-br.json"),
  ro: () => import("./lang/ro.json"),
  ru: () => import("./lang/ru.json"),
  sk: () => import("./lang/sk.json"),
  sl: () => import("./lang/sl.json"),
  sv: () => import("./lang/sv.json"),
  tr: () => import("./lang/tr.json"),
  zh: () => import("./lang/zh.json"),
  uk: () => import("./lang/uk.json"),
  vi: () => import("./lang/vi.json"),
} satisfies Record<SupportedLanguage, () => Promise<{ default: unknown }>>;

export const createLanguageMapping = () => languageMapping as Record<SupportedLanguage, EnTranslation>;

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKeys = NestedKeyOf<EnTranslation>;
