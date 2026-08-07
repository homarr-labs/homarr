import type { PropsWithChildren } from "react";
import type { DayOfWeek } from "@mantine/dates";
import { NextIntlClientProvider } from "next-intl";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { env } from "@homarr/auth/env";
import { auth } from "@homarr/auth/next";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import { SpotlightProvider } from "@homarr/spotlight";

import { Analytics } from "~/components/layout/analytics";
import { ServiceWorkerRegistration } from "~/components/layout/service-worker-registration";
import { DayJsLoader } from "./_client-providers/dayjs-loader";
import { JotaiProvider } from "./_client-providers/jotai";
import { CustomMantineProvider } from "./_client-providers/mantine";
import { AuthProvider } from "./_client-providers/session";
import { TRPCReactProvider } from "./_client-providers/trpc";
import { composeWrappers } from "./compose";

const logger = createLogger({ module: "sessionScopedProviders" });

export async function SessionScopedProviders({ children }: PropsWithChildren) {
  const session = await auth();

  const [user, serverSettings] = await Promise.all([
    session
      ? getRscUserSettingsAsync(session.user.id).catch((error: unknown) => {
          logger.error(new Error("Failed to load the authenticated user in the root layout", { cause: error }));
          return null;
        })
      : Promise.resolve(null),
    getRscServerSettingsAsync(),
  ]);

  const StackedProvider = composeWrappers([
    (innerProps) => <AuthProvider session={session} logoutUrl={env.AUTH_LOGOUT_REDIRECT_URL} {...innerProps} />,
    (innerProps) => (
      <SettingsProvider
        user={
          user
            ? {
                ...user,
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
        }}
        {...innerProps}
      />
    ),
    (innerProps) => <JotaiProvider {...innerProps} />,
    (innerProps) => <TRPCReactProvider {...innerProps} />,
    (innerProps) => <DayJsLoader {...innerProps} />,
    (innerProps) => <NextIntlClientProvider {...innerProps} />,
    (innerProps) => <CustomMantineProvider {...innerProps} />,
    (innerProps) => <ModalProvider {...innerProps} />,
    (innerProps) => <SpotlightProvider {...innerProps} />,
  ]);

  return (
    <StackedProvider>
      <Analytics enabled={serverSettings.analytics.enableGeneral} />
      <Notifications pauseResetOnHover="notification" />
      <ServiceWorkerRegistration />
      {children}
    </StackedProvider>
  );
}
