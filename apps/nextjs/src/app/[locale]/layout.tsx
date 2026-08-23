import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@gfazioli/mantine-onboarding-tour/styles.css";
import "@homarr/notifications/styles.css";
import "@homarr/spotlight/styles.css";
import "@homarr/ui/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "mantine-datatable/styles.css";
import "~/styles/color-scheme.scss";
import "~/styles/scroll-area.scss";

import { notFound } from "next/navigation";
import { ColorSchemeScript } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import { NextIntlClientProvider } from "next-intl";

import { api } from "@homarr/api/server";
import { env as authEnv } from "@homarr/auth/env";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { auth } from "@homarr/auth/next";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import { SpotlightProvider } from "@homarr/spotlight";
import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleRTL, isLocaleSupported } from "@homarr/translation";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { Analytics } from "~/components/layout/analytics";
import type { AssistantAvailability } from "~/components/assistant/assistant-gate";
import { AssistantGate } from "~/components/assistant/assistant-gate";
import { CrowdinLiveTranslation } from "~/components/layout/crowdin-live-translation";
import { env } from "~/env";

import { SearchEngineOptimization } from "~/components/layout/search-engine-optimization";
import { ServiceWorkerRegistration } from "~/components/layout/service-worker-registration";
import { ViewportHint } from "~/components/layout/viewport-hint";
import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
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

const logger = createLogger({ module: "rootLayout" });

const defaultDescription =
  "A self-hosted dashboard for the *arr stack and your entire homelab. Integrates with 50+ services, real-time widgets, no config files.";

// eslint-disable-next-line no-restricted-syntax
export const generateMetadata = async (): Promise<Metadata> => {
  const [serverSettings, colorScheme] = await Promise.all([getRscServerSettingsAsync(), getCurrentColorSchemeAsync()]);
  const { appName, faviconImageUrl, logoImageUrl } = serverSettings.branding;
  const logo = logoImageUrl ?? "/logo/logo.png";
  const favicon = faviconImageUrl ?? logo;

  return {
    title: {
      default: appName,
      template: `%s • ${appName}`,
    },
    description: defaultDescription,
    openGraph: {
      title: `${appName} Dashboard`,
      description: defaultDescription,
      url: env.HOMARR_WEBSITE_URL,
      siteName: appName,
    },
    icons: {
      icon: favicon,
      apple: logo,
    },
    appleWebApp: {
      title: appName,
      capable: true,
      startupImage: { url: logo },
      statusBarStyle: colorScheme === "dark" ? "black-translucent" : "default",
    },
  };
};

// eslint-disable-next-line no-restricted-syntax
export const generateViewport = async (): Promise<Viewport> => {
  const serverSettings = await getRscServerSettingsAsync();
  return { themeColor: serverSettings.branding.primaryColor };
};

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: SupportedLanguage }>;
}) {
  const { locale } = await props.params;
  if (!isLocaleSupported(locale)) {
    notFound();
  }

  const sessionPromise = auth();
  const serverSettingsPromise = getRscServerSettingsAsync();
  const userPromise = sessionPromise.then((session) =>
    session
      ? getRscUserSettingsAsync(session.user.id).catch((error: unknown) => {
          logger.error(new Error("Failed to load the authenticated user in the root layout", { cause: error }));
          return null;
        })
      : null,
  );
  const assistantAvailabilityPromise: Promise<AssistantAvailability> = Promise.all([
    sessionPromise,
    serverSettingsPromise,
  ]).then(([session, serverSettings]) => {
    if (!serverSettings.featureControls.assistantEnabled) return "disabled";
    if (!session) return "unauthenticated";
    return api.assistant
      .getAvailability()
      .then((availability) => (availability.enabled ? "enabled" : "unconfigured"))
      .catch(() => "error");
  });
  const [session, user, serverSettings, colorScheme, assistantAvailability] = await Promise.all([
    sessionPromise,
    userPromise,
    serverSettingsPromise,
    getCurrentColorSchemeAsync(),
    assistantAvailabilityPromise,
  ]);
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
          featureControls: serverSettings.featureControls,
        }}
        {...innerProps}
      />
    ),
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} />,
    (innerProps) => <DayJsLoader {...innerProps} />,
    (innerProps) => <NextIntlClientProvider {...innerProps} />,
    (innerProps) => (
      <CustomMantineProvider {...innerProps} defaultColorScheme={colorScheme} branding={serverSettings.branding} />
    ),
    (innerProps) => <ModalProvider {...innerProps} />,
    (innerProps) => <SpotlightProvider {...innerProps} />,
    (innerProps) => <AssistantGate availability={assistantAvailability} {...innerProps} />,
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
      </head>
      <body className={[fontSans.className, fontSans.variable].join(" ")} suppressHydrationWarning>
        <Analytics enabled={serverSettings.analytics.enableGeneral} />
        <ViewportHint />
        <StackedProvider>
          <Notifications pauseResetOnHover="notification" />
          <ServiceWorkerRegistration />
          {props.children}
        </StackedProvider>
      </body>
    </html>
  );
}
