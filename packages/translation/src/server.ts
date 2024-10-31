import { getTranslations } from "next-intl/server";

export const { getI18n, getScopedI18n } = {
  getI18n: getTranslations,
  getScopedI18n: getTranslations,
};

export { getMessages as getI18nMessages } from "next-intl/server";
