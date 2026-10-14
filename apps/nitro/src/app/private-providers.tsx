import type { MantineColorSchemeManager } from "@mantine/core";
import type { ComponentType } from "react";

import { SettingsProvider } from "@homarr/settings";
import type { CulturePreferences, RequestCulture } from "@homarr/translation/runtime";

import type { ProviderContributions, ProviderProps } from "../contracts/providers";
import { createGlobalToolProviderContributions } from "../features/global-tools/source-providers";
import type { GlobalToolSourceProviders } from "../features/global-tools/source-providers";
import type { SourceSessionHandlers } from "../features/global-tools/source-session";
import { IdentityReadBoundary, useIdentityReadAvailability } from "../features/identity/read-boundary";
import type { IdentityReadBoundaryInput } from "../features/identity/read-boundary";
import { createSettingsFormatting } from "../features/settings/culture";
import { beginSessionTransition, runSessionTransition } from "./session-transition";

export interface PrivateProviderInput extends IdentityReadBoundaryInput {
  readonly settings: GlobalToolSourceProviders["settings"] & {
    readonly user: NonNullable<GlobalToolSourceProviders["settings"]["user"]>;
  };
  readonly settingsUserId: string;
  readonly culture: RequestCulture;
  readonly culturePreferences: CulturePreferences;
  readonly capturedClock: number;
  readonly locale: GlobalToolSourceProviders["locale"] & {
    readonly onChangeLocale: NonNullable<GlobalToolSourceProviders["locale"]["onChangeLocale"]>;
  };
  readonly sessionHandlers: Extract<SourceSessionHandlers, { kind: "available" }>;
  readonly refreshAuthority: () => Promise<void>;
  readonly logoutUrl?: string;
  readonly unavailableTitle: string;
  readonly expiredDescription: string;
  readonly colorSchemeManager: MantineColorSchemeManager;
  readonly frozenPeers: Required<NonNullable<GlobalToolSourceProviders["frozenPeers"]>>;
}

export function createPrivateProviderBinding(input: PrivateProviderInput) {
  input.scope.assertCurrent();
  const { principal, session } = input;
  if (
    !input.authorityKey ||
    !principal.user.id ||
    input.settingsUserId !== principal.user.id ||
    principal.user.id !== session.session.user.id ||
    principal.user.permissions.length !== session.session.user.permissions.length ||
    !principal.user.permissions.every((permission) => session.session.user.permissions.includes(permission))
  ) {
    throw new Error("Private providers require the matching authenticated principal and source session");
  }
  const expires = Date.parse(session.session.expires);
  if (
    !Number.isFinite(new Date(input.capturedClock).getTime()) ||
    !Number.isFinite(expires) ||
    expires <= input.capturedClock
  ) {
    throw new Error("Private providers require a live source session and the captured render clock");
  }
  if (
    input.locale.snapshot !== input.culture.i18n.snapshot ||
    input.locale.snapshot.now?.getTime() !== input.capturedClock ||
    input.culturePreferences.firstDayOfWeek !== input.settings.user.firstDayOfWeek ||
    input.culturePreferences.byteUnitSystem !== input.settings.user.byteUnitSystem
  ) {
    throw new Error("Private providers require the signed-in user's prepared settings and culture snapshot");
  }

  const read: IdentityReadBoundaryInput = Object.freeze({
    authorityKey: input.authorityKey,
    scope: input.scope,
    principal: Object.freeze({
      ...principal,
      user: Object.freeze({ ...principal.user, permissions: Object.freeze([...principal.user.permissions]) }),
    }),
    session: Object.freeze({
      kind: "authenticated",
      session: Object.freeze({
        ...session.session,
        user: Object.freeze({
          ...session.session.user,
          permissions: Object.freeze([...session.session.user.permissions]),
        }),
      }),
    }),
    demo: Object.freeze({ ...input.demo }),
    enabledProviders: Object.freeze([...input.enabledProviders]),
    locallyManagedProviders: Object.freeze([...input.locallyManagedProviders]),
    writeHoldReason: input.writeHoldReason,
    transitionDescription: input.transitionDescription,
  });
  const settings = Object.freeze({
    user: Object.freeze({ ...input.settings.user }),
    serverSettings: Object.freeze({
      board: Object.freeze({ ...input.settings.serverSettings.board }),
      search: Object.freeze({ ...input.settings.serverSettings.search }),
      user: Object.freeze({ ...input.settings.serverSettings.user }),
      branding: Object.freeze({
        ...input.settings.serverSettings.branding,
        authBranding: Object.freeze({ ...input.settings.serverSettings.branding.authBranding }),
      }),
    }),
  });
  const generation = JSON.stringify([read.authorityKey, read.scope.identity]);
  const suppliedHandlers = Object.freeze({ ...input.sessionHandlers });
  const refreshAuthority = input.refreshAuthority;
  const capturedClock = input.capturedClock;
  const changeLocale = input.locale.onChangeLocale;
  const frozenPeers = Object.freeze({ ...input.frozenPeers });
  let retirement: Promise<void> | undefined;

  function retireScope() {
    if (!retirement) retirement = read.scope.retire();
    return retirement;
  }

  function transition(operation: () => Promise<void>) {
    read.scope.assertCurrent();
    return runSessionTransition(read.scope.queryClient, async () => {
      const drain = retireScope();
      const results = await Promise.allSettled([Promise.resolve().then(operation), drain]);
      const failures: unknown[] = [];
      for (const result of results) {
        if (result.status === "rejected") failures.push(result.reason);
      }
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) throw new AggregateError(failures, "Private transition and retirement failed");
    });
  }

  const sessionHandlers = Object.freeze({
    kind: "available",
    signIn: () => transition(suppliedHandlers.signIn),
    signOut: () => transition(suppliedHandlers.signOut),
  } satisfies Extract<SourceSessionHandlers, { kind: "available" }>);
  const sources = createGlobalToolProviderContributions({
    settings,
    session: {
      state: read.session,
      handlers: sessionHandlers,
      logoutUrl: input.logoutUrl,
      unavailableTitle: input.unavailableTitle,
      expiredDescription: input.expiredDescription,
    },
    locale: Object.freeze({
      ...input.locale,
      onChangeLocale: (locale) =>
        transition(async () => {
          await changeLocale(locale);
        }),
    }),
    frozenPeers,
  });

  function gate(Provider: ComponentType<ProviderProps>) {
    return function PrivateOwner(props: ProviderProps) {
      return (
        <IdentityReadBoundary input={read}>
          <Provider {...props} key={generation} />
        </IdentityReadBoundary>
      );
    };
  }

  function PrivateSettingsProvider({ children, queryClient }: ProviderProps) {
    const { current } = useIdentityReadAvailability(read);
    if (queryClient !== read.scope.queryClient) {
      throw new Error("Private settings require the owning root QueryClient");
    }
    let user: GlobalToolSourceProviders["settings"]["user"] = null;
    if (current) user = settings.user;
    return (
      <SettingsProvider serverSettings={settings.serverSettings} user={user} key={generation}>
        {children}
      </SettingsProvider>
    );
  }

  function PrivateSessionProvider(props: ProviderProps) {
    return <sources.session {...props} key={generation} />;
  }

  const providers: ProviderContributions = Object.freeze({
    ...sources,
    session: PrivateSessionProvider,
    settings: PrivateSettingsProvider,
    jotai: gate(sources.jotai),
    modals: gate(sources.modals),
    notifications: gate(sources.notifications),
    spotlight: gate(frozenPeers.spotlight),
    assistant: gate(frozenPeers.assistant),
  });

  return Object.freeze({
    read,
    providers,
    sessionHandlers,
    colorSchemeManager: input.colorSchemeManager,
    formatting: createSettingsFormatting(input.culture, input.culturePreferences, { now: () => capturedClock }),
    refreshAuthority: () => transition(refreshAuthority),
    retire: () => {
      if (retirement) return retirement;
      beginSessionTransition(read.scope.queryClient);
      return retireScope();
    },
  });
}

export type PrivateProviderBinding = ReturnType<typeof createPrivateProviderBinding>;
