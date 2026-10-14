import { Alert } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { ColorScheme, GroupPermissionKey } from "@homarr/definitions";

export interface SourceSession {
  readonly expires: string;
  readonly user: {
    readonly id: string;
    readonly name?: string | null;
    readonly email?: string | null;
    readonly image?: string | null;
    readonly permissions: readonly GroupPermissionKey[];
    readonly colorScheme: ColorScheme;
  };
}

export type SourceSessionState =
  | { readonly kind: "anonymous" }
  | { readonly kind: "authenticated"; readonly session: SourceSession }
  | { readonly kind: "held"; readonly reason: string };

export type SourceSessionHandlers =
  | {
      readonly kind: "available";
      readonly signIn: () => Promise<void>;
      readonly signOut: () => Promise<void>;
    }
  | { readonly kind: "held"; readonly reason: string };

export interface SourceSessionProviderProps extends PropsWithChildren {
  readonly state: SourceSessionState;
  readonly handlers: SourceSessionHandlers;
  readonly logoutUrl?: string;
  readonly unavailableTitle: string;
  readonly expiredDescription: string;
}

interface SourceAuthContextValue {
  readonly state: SourceSessionState;
  readonly handlers: SourceSessionHandlers;
  readonly logoutRedirectInProgress: { current: boolean };
  readonly logoutUrl: string | undefined;
  readonly unavailableTitle: string;
  readonly unavailableDescription: string | null;
}

const SourceAuthContext = createContext<SourceAuthContextValue | null>(null);

export function SourceSessionProvider({
  children,
  state,
  handlers,
  logoutUrl,
  unavailableTitle,
  expiredDescription,
}: SourceSessionProviderProps) {
  const logoutRedirectInProgress = useRef(false);
  const redirectStarted = useRef<SourceSession | null>(null);
  const [expiredSession, setExpiredSession] = useState<SourceSession | null>(null);
  const [redirectFailure, setRedirectFailure] = useState<SourceSession | null>(null);
  const session = state.kind === "authenticated" ? state.session : null;
  const invalidSession = session !== null && (!session.user.id || !Number.isFinite(Date.parse(session.expires)));
  const expired =
    session !== null &&
    (expiredSession === session ||
      redirectFailure === session ||
      invalidSession ||
      Date.parse(session.expires) <= Date.now());

  useEffect(() => {
    if (!session || invalidSession) return;
    let timeout: ReturnType<typeof setTimeout>;
    let active = true;

    const schedule = () => {
      const remaining = Date.parse(session.expires) - Date.now();
      if (remaining > 0) {
        timeout = setTimeout(schedule, Math.min(remaining, 2147483647));
        return;
      }
      setExpiredSession(session);
      if (handlers.kind === "available" && !logoutRedirectInProgress.current && redirectStarted.current !== session) {
        void Promise.resolve()
          .then(() => {
            if (!active || logoutRedirectInProgress.current || redirectStarted.current === session) return;
            redirectStarted.current = session;
            return handlers.signIn();
          })
          .catch(() => {
            if (active) setRedirectFailure(session);
          });
      }
    };

    schedule();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [session, invalidSession, handlers]);

  const effectiveState = useMemo<SourceSessionState>(() => {
    if (expired) return { kind: "held", reason: expiredDescription };
    return state;
  }, [expired, expiredDescription, state]);
  let unavailableDescription: string | null = null;
  if (effectiveState.kind === "held") unavailableDescription = effectiveState.reason;
  else if (handlers.kind === "held") unavailableDescription = handlers.reason;
  const value = useMemo(
    () => ({
      state: effectiveState,
      handlers,
      logoutUrl,
      logoutRedirectInProgress,
      unavailableTitle,
      unavailableDescription,
    }),
    [effectiveState, handlers, logoutUrl, unavailableTitle, unavailableDescription],
  );

  return <SourceAuthContext.Provider value={value}>{children}</SourceAuthContext.Provider>;
}

export function SourceSessionNotice() {
  const { unavailableTitle, unavailableDescription } = useSourceAuthContext();
  if (unavailableDescription === null) return null;
  return (
    <Alert color="yellow" title={unavailableTitle}>
      {unavailableDescription}
    </Alert>
  );
}

export function useSourceAuthContext() {
  const context = useContext(SourceAuthContext);
  if (!context) throw new Error("useSourceAuthContext must be used within a SourceSessionProvider");
  return context;
}
