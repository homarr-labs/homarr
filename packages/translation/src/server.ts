import { createI18nServer } from "next-international/server";

import { languageMapping } from "./lang";
import en from "./lang/en";

export const { getI18n, getScopedI18n, getStaticParams } = createI18nServer(
  languageMapping(),
  {
    fallbackLocale: en,
  },
);
