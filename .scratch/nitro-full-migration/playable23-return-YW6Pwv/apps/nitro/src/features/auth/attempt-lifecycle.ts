import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { AuthFrontendNavigation, AuthFrontendNavigationOptions, AuthFrontendTransport } from "./contracts";

export interface AuthAttempt {
  credentials: { name: string; password: string } | undefined;
  options: AuthFrontendNavigationOptions;
  isCurrent: () => boolean;
  releaseCredentials: () => void;
  abandon: () => void;
  finish: () => boolean;
}

interface AuthAttemptBinding {
  transport: AuthFrontendTransport;
  navigation: AuthFrontendNavigation;
  capabilityKey: string;
  reset: () => void;
}

interface AuthAttemptScope {
  binding: AuthAttemptBinding;
  active: boolean;
  attempt: AuthAttempt | null;
}

function createAuthAttempt(scope: AuthAttemptScope, currentScope: { current: AuthAttemptScope | null }): AuthAttempt {
  const controller = new AbortController();
  const isCurrent = () =>
    currentScope.current === scope && scope.active && scope.attempt === attempt && !controller.signal.aborted;
  const attempt: AuthAttempt = {
    credentials: undefined,
    options: { signal: controller.signal, isCurrent },
    isCurrent,
    releaseCredentials: () => {
      attempt.credentials = undefined;
    },
    abandon: () => {
      attempt.credentials = undefined;
      controller.abort();
    },
    finish: () => {
      const current = isCurrent();
      attempt.credentials = undefined;
      if (scope.attempt === attempt) scope.attempt = null;
      return current;
    },
  };
  return attempt;
}

export function useAuthAttemptLifecycle(
  transport: AuthFrontendTransport,
  navigation: AuthFrontendNavigation,
  capabilityKey: string,
  reset: () => void,
) {
  const currentScope = useRef<AuthAttemptScope | null>(null);
  const binding = useMemo(
    () => ({ transport, navigation, capabilityKey, reset }),
    [
      transport,
      navigation,
      capabilityKey,
      reset,
      transport.readCsrfToken,
      transport.signInCredentials,
      transport.signInLdap,
      transport.beginOidc,
      transport.signOut,
      navigation.returnTo,
      navigation.providerRedirect,
      navigation.acceptsProviderUrl,
    ],
  );

  useLayoutEffect(() => {
    const scope: AuthAttemptScope = { binding, active: true, attempt: null };
    currentScope.current = scope;
    binding.reset();

    return () => {
      scope.active = false;
      const attempt = scope.attempt;
      scope.attempt = null;
      if (currentScope.current === scope) currentScope.current = null;
      attempt?.abandon();
    };
  }, [binding]);

  return useCallback(
    (credentials?: { name: string; password: string }): AuthAttempt | null => {
      const scope = currentScope.current;
      if (!scope?.active || scope.binding !== binding || scope.attempt) return null;
      const attempt = createAuthAttempt(scope, currentScope);
      attempt.credentials = credentials;
      scope.attempt = attempt;
      return attempt;
    },
    [binding],
  );
}
