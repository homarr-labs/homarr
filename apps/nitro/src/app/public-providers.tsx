import type { MantineColorSchemeManager } from "@mantine/core";
import { createContext, useContext } from "react";

import { parseCookies, setClientCookie } from "@homarr/common";
import { colorSchemeCookieKey } from "@homarr/definitions";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import { I18nProvider } from "@homarr/translation/client";
import { createCultureFormatter, loadRequestCulture } from "@homarr/translation/runtime";
import type { RequestCulture } from "@homarr/translation/runtime";

import type { ProviderContributions, ProviderProps } from "../contracts/providers";
import type { Bootstrap } from "../contracts/render";
import { SourceJotaiProvider } from "../features/global-tools/source-jotai";
import { SourceSessionProvider } from "../features/global-tools/source-session";

type PublicCulture = {
  readonly culture: RequestCulture;
  readonly formatter: ReturnType<typeof createCultureFormatter>;
};

const PublicCultureContext = createContext<PublicCulture | null>(null);

export function usePublicCulture() {
  const value = useContext(PublicCultureContext);
  if (!value) throw new Error("Public culture provider is required");
  return value;
}

export function reconstructPublicCulture(bootstrap: Bootstrap) {
  const { resolved, translation } = bootstrap.culture;
  if (bootstrap.snapshot.session.kind !== "anonymous") throw new Error("Private hydration is not joined");
  if (
    translation.locale !== resolved.catalogLocale ||
    bootstrap.snapshot.locale !== resolved.catalogLocale ||
    bootstrap.snapshot.direction !== resolved.direction
  ) {
    throw new Error("Public locale snapshot is inconsistent");
  }
  return loadRequestCulture(
    { ...resolved, cookieLocale: resolved.cookieLocale },
    {
      now: new Date(translation.nowEpoch),
      timeZone: translation.timeZone,
      formats: translation.formats,
    },
  );
}

function applyDocumentColorScheme(colorScheme: Bootstrap["colorScheme"]) {
  let resolved = colorScheme;
  if (resolved === "auto") {
    resolved = "light";
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) resolved = "dark";
  }
  document.documentElement.dataset.mantineColorScheme = resolved;
  let backgroundColor = "#fff";
  if (resolved === "dark") backgroundColor = "#242424";
  document.documentElement.style.backgroundColor = backgroundColor;
}

export function createPublicColorSchemeManager(bootstrap: Bootstrap): MantineColorSchemeManager {
  let current = bootstrap.colorScheme;
  let detach: (() => void) | undefined;
  function read() {
    if (typeof document === "undefined") return current;
    const value = parseCookies(document.cookie)[colorSchemeCookieKey];
    if (value === "light" || value === "dark" || value === "auto") return value;
    return bootstrap.colorScheme;
  }
  return {
    get: () => read(),
    set(value) {
      current = value;
      setClientCookie(colorSchemeCookieKey, value, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
      applyDocumentColorScheme(value);
    },
    subscribe(onUpdate) {
      detach?.();
      const onFocus = () => {
        const next = read();
        if (next !== current) {
          current = next;
          onUpdate(next);
        }
        applyDocumentColorScheme(next);
      };
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onMediaChange = () => {
        if (read() === "auto") applyDocumentColorScheme("auto");
      };
      window.addEventListener("focus", onFocus);
      media.addEventListener("change", onMediaChange);
      detach = () => {
        window.removeEventListener("focus", onFocus);
        media.removeEventListener("change", onMediaChange);
      };
    },
    unsubscribe() {
      detach?.();
      detach = undefined;
    },
    clear() {
      setClientCookie(colorSchemeCookieKey, "", { maxAge: 0, path: "/", sameSite: "lax" });
      current = bootstrap.colorScheme;
      applyDocumentColorScheme(current);
    },
  };
}

export function publicColorSchemeScript(colorScheme: Bootstrap["colorScheme"]) {
  return `var colorScheme=${JSON.stringify(colorScheme)};if(colorScheme==="auto"){colorScheme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-mantine-color-scheme",colorScheme);document.documentElement.style.backgroundColor=colorScheme==="dark"?"#242424":"#fff";`;
}

export function createPublicProviderBinding(bootstrap: Bootstrap, culture: RequestCulture) {
  if (bootstrap.snapshot.session.kind !== "anonymous") throw new Error("Public providers require an anonymous request");
  const t = culture.i18n.getI18n();
  const value: PublicCulture = {
    culture,
    formatter: createCultureFormatter(culture, bootstrap.culture.preferences, {
      now: () => bootstrap.culture.capturedClock,
    }),
  };
  async function onChangeLocale(locale: RequestCulture["resolved"]["catalogLocale"]) {
    const location = new URL(window.location.href);
    if (location.origin !== bootstrap.routing.origin) throw new Error("Locale change origin does not match the host");
    const response = await fetch(new URL("/api/preferences/locale", bootstrap.routing.origin), {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (response.status !== 204) throw new Error(t("common.notification.update.error"));
    const prefix = bootstrap.routing.localePrefix;
    if (prefix && (location.pathname === prefix || location.pathname.startsWith(`${prefix}/`))) {
      location.pathname = `/${locale}${location.pathname.slice(prefix.length)}`;
      window.location.replace(location.href);
      return;
    }
    window.location.reload();
  }
  function PublicSessionProvider({ children }: ProviderProps) {
    return (
      <SourceSessionProvider
        state={{ kind: "anonymous" }}
        handlers={{ kind: "held", reason: t("common.error") }}
        unavailableTitle={t("common.error")}
        expiredDescription={t("common.error")}
      >
        {children}
      </SourceSessionProvider>
    );
  }
  function PublicSettingsProvider({ children }: ProviderProps) {
    return (
      <SettingsProvider serverSettings={bootstrap.publicSettings} user={null}>
        {children}
      </SettingsProvider>
    );
  }
  function PublicLocaleProvider({ children }: ProviderProps) {
    return (
      <I18nProvider snapshot={culture.i18n.snapshot} onChangeLocale={onChangeLocale}>
        <PublicCultureContext.Provider value={value}>{children}</PublicCultureContext.Provider>
      </I18nProvider>
    );
  }
  function PublicAtomProvider({ children }: ProviderProps) {
    return <SourceJotaiProvider>{children}</SourceJotaiProvider>;
  }
  function PublicModalProvider({ children }: ProviderProps) {
    return <ModalProvider>{children}</ModalProvider>;
  }
  function PublicNotifications({ children }: ProviderProps) {
    return (
      <>
        <Notifications pauseResetOnHover="notification" />
        {children}
      </>
    );
  }
  const providers = {
    session: PublicSessionProvider,
    settings: PublicSettingsProvider,
    locale: PublicLocaleProvider,
    jotai: PublicAtomProvider,
    modals: PublicModalProvider,
    notifications: PublicNotifications,
  } satisfies ProviderContributions;
  return { providers, colorSchemeManager: createPublicColorSchemeManager(bootstrap) };
}

export type PublicProviderBinding = ReturnType<typeof createPublicProviderBinding>;
