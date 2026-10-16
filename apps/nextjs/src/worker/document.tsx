import { ColorSchemeScript } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";

import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleRTL } from "@homarr/translation";

import { WorkerApp } from "./app";

export function WorkerFrontendDocument({ locale, className }: { locale: SupportedLanguage; className: string }) {
  return (
    <html lang={locale} dir={isLocaleRTL(locale) ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <meta name="homarr-website-url" content="https://homarr.dev" />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className={className} suppressHydrationWarning>
        <NextIntlClientProvider>
          <WorkerApp platformPath={process.env.HOMARR_PLATFORM_PATH ?? "/platform"} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
