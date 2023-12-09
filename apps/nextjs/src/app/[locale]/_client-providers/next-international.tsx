import type { PropsWithChildren } from "react";

import { defaultLocale } from "@alparr/translation";
import { I18nProviderClient } from "@alparr/translation/client";

export const NextInternationalProvider = ({
  children,
  locale,
}: PropsWithChildren<{ locale: string }>) => {
  return (
    <I18nProviderClient locale={locale} fallback={defaultLocale}>
      {children}
    </I18nProviderClient>
  );
};
