import type { PropsWithChildren } from "react";
import { setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";

import "@gfazioli/mantine-onboarding-tour/styles.css";
import "@homarr/notifications/styles.css";
import "@mantine/lightbox/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "mantine-datatable/styles.css";
import "~/styles/color-scheme.scss";
import "~/styles/scroll-area.scss";

import { ColorSchemeScript } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import { NextIntlClientProvider } from "next-intl";

import { env as authEnv } from "@homarr/auth/env";
import { InitialRenderTimeProvider } from "@homarr/common";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import { SpotlightProvider } from "@homarr/spotlight";
import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleRTL } from "@homarr/translation";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { AssistantGate } from "~/components/assistant/assistant-gate";
import { CrowdinLiveTranslation } from "~/components/layout/crowdin-live-translation";
import { env } from "~/env";

import { SearchEngineOptimization } from "~/components/layout/search-engine-optimization";
import { ServiceWorkerRegistration } from "~/components/layout/service-worker-registration";
import { ViewportHint } from "~/components/layout/viewport-hint";
import { DayJsLoader } from "./_client-providers/dayjs-loader";
import { JotaiProvider } from "./_client-providers/jotai";
import { CustomMantineProvider } from "./_client-providers/mantine";
import { AuthProvider } from "./_client-providers/session";
import { TRPCReactProvider } from "./_client-providers/trpc";
import { composeWrappers } from "./compose";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

import type { RootLayoutData } from "./_root-layout-data";

export const RootLayoutView = ({
  locale,
  data: { session, user, serverSettings, colorScheme, assistantAvailability },
  children,
  preparedToken,
  initialRenderTime,
}: PropsWithChildren<{
  locale: SupportedLanguage;
  data: RootLayoutData;
  preparedToken?: string;
  initialRenderTime?: number;
}>) => {
  setRequestLocale(locale);
  const direction = isLocaleRTL(locale) ? "rtl" : "ltr";
  const publicUrls = resolveHomarrUrlConfig({
    homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
    workshopApiUrl: env.WORKSHOP_API_URL,
    workshopWebUrl: env.WORKSHOP_WEB_URL,
  });

  const StackedProvider = composeWrappers([
    (innerProps) => {
      return <AuthProvider session={session} logoutUrl={authEnv.AUTH_LOGOUT_REDIRECT_URL} {...innerProps} />;
    },
    (innerProps) => (
      <SettingsProvider
        user={
          user
            ? {
                ...user,
                // Convert type, because output schema is not smart enough to infer $type from drizzle
                firstDayOfWeek: user.firstDayOfWeek as DayOfWeek,
              }
            : null
        }
        serverSettings={{
          board: {
            homeBoardId: serverSettings.board.homeBoardId,
            mobileHomeBoardId: serverSettings.board.mobileHomeBoardId,
            enableStatusByDefault: serverSettings.board.enableStatusByDefault,
            forceDisableStatus: serverSettings.board.forceDisableStatus,
          },
          search: { defaultSearchEngineId: serverSettings.search.defaultSearchEngineId },
          user: { enableGravatar: serverSettings.user.enableGravatar },
          branding: serverSettings.branding,
        }}
        {...innerProps}
      />
    ),
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} {...innerProps} />,
    (innerProps) => <DayJsLoader {...innerProps} />,
    (innerProps) => <NextIntlClientProvider {...innerProps} />,
    (innerProps) => (
      <CustomMantineProvider {...innerProps} defaultColorScheme={colorScheme} branding={serverSettings.branding} />
    ),
    (innerProps) => <ModalProvider {...innerProps} />,
    (innerProps) => <SpotlightProvider {...innerProps} />,
    (innerProps) => (
      <AssistantGate availability={session ? assistantAvailability : "unauthenticated"} {...innerProps} />
    ),
  ]);

  return (
    <html
      lang={locale}
      dir={direction}
      style={{
        backgroundColor: colorScheme === "dark" ? "#242424" : colorScheme === "auto" ? undefined : "#fff",
      }}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme={colorScheme} />
        <meta name="homarr-website-url" content={publicUrls.homarrWebsiteUrl} />
        {session ? (
          <>
            <meta name="homarr-workshop-api-url" content={publicUrls.workshopApiUrl} />
            <meta name="homarr-workshop-web-url" content={publicUrls.workshopWebUrl} />
          </>
        ) : null}
        <SearchEngineOptimization />
        <CrowdinLiveTranslation locale={locale} />
        <style data-homarr-global-custom-css>{serverSettings.branding.customCss}</style>
      </head>
      <body
        className={[fontSans.className, fontSans.variable].join(" ")}
        suppressHydrationWarning
        data-homarr-prepared-token={preparedToken}
      >
        <ViewportHint />
        <InitialRenderTimeProvider initialTime={initialRenderTime}>
          <StackedProvider>
            <Notifications pauseResetOnHover="notification" />
            <ServiceWorkerRegistration />
            {children}
          </StackedProvider>
        </InitialRenderTimeProvider>
      </body>
    </html>
  );
};
