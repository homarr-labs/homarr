import type { ComponentProps } from "react";

import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import type { SettingsProviderProps } from "@homarr/settings";
import { I18nProvider } from "@homarr/translation/client";
import type { I18nProviderProps } from "@homarr/translation/client";

import type { ProviderContributions, ProviderProps } from "../../contracts/providers";
import { SourceJotaiProvider } from "./source-jotai";
import { SourceSessionNotice, SourceSessionProvider, useSourceAuthContext } from "./source-session";
import type { SourceSessionProviderProps } from "./source-session";

export type SourceNotificationSurfaceProps = ComponentProps<typeof Notifications>;

export interface GlobalToolSourceProviders {
  readonly settings: Omit<SettingsProviderProps, "children">;
  readonly session: Omit<SourceSessionProviderProps, "children">;
  readonly locale: Omit<I18nProviderProps, "children">;
  readonly frozenPeers?: Pick<ProviderContributions, "spotlight" | "assistant">;
}

function SourceAtomProvider({ children }: ProviderProps) {
  return <SourceJotaiProvider>{children}</SourceJotaiProvider>;
}

function SourceModalProvider({ children }: ProviderProps) {
  return <ModalProvider>{children}</ModalProvider>;
}

function SourceNotifications({ children }: ProviderProps) {
  return (
    <>
      <Notifications pauseResetOnHover="notification" />
      <SourceSessionNotice />
      {children}
    </>
  );
}

export function createGlobalToolProviderContributions(sources: GlobalToolSourceProviders) {
  function SourceSettingsProvider({ children }: ProviderProps) {
    const { state } = useSourceAuthContext();
    let user: SettingsProviderProps["user"] = null;
    if (state.kind === "authenticated") user = sources.settings.user;
    return (
      <SettingsProvider serverSettings={sources.settings.serverSettings} user={user}>
        {children}
      </SettingsProvider>
    );
  }

  function SourceAuthProvider({ children }: ProviderProps) {
    return <SourceSessionProvider {...sources.session}>{children}</SourceSessionProvider>;
  }

  function SourceLocaleProvider({ children }: ProviderProps) {
    return <I18nProvider {...sources.locale}>{children}</I18nProvider>;
  }

  return Object.freeze({
    ...sources.frozenPeers,
    settings: SourceSettingsProvider,
    session: SourceAuthProvider,
    locale: SourceLocaleProvider,
    jotai: SourceAtomProvider,
    modals: SourceModalProvider,
    notifications: SourceNotifications,
  } satisfies ProviderContributions);
}
