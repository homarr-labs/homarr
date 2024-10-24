"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { SupportedLanguage } from ".";
import type { TranslationObject } from "./type";

export const { useI18n, useScopedI18n, useCurrentLocale, useChangeLocale } = {
  useI18n: useTranslations,
  useScopedI18n: useTranslations,
  useCurrentLocale: () => useLocale() as SupportedLanguage,
  useChangeLocale: () => {
    const locale = useLocale() as SupportedLanguage;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    return {
      changeLocale: (newLocale: SupportedLanguage) => {
        if (newLocale === locale) {
          return;
        }

        startTransition(() => {
          router.replace("/" + newLocale + pathname);
        });
      },
      isPending,
    };
  },
};

declare global {
  // Use type safe message keys with `next-intl`
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends RemoveReadonly<TranslationObject> {}
}
type RemoveReadonly<T> = {
  -readonly [P in keyof T]: T[P] extends Record<string, unknown> ? RemoveReadonly<T[P]> : T[P];
};
