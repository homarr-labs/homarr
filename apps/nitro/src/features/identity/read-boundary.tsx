import { Alert } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import type { SupportedAuthProvider } from "@homarr/definitions";

import { useSessionTransition } from "../../app/session-transition";
import type { AuthenticatedReadQueryScope } from "../../query/authenticated-read";
import { SourceSessionNotice, useSourceAuthContext } from "../global-tools/source-session";
import type { SourceSessionState } from "../global-tools/source-session";
import type { IdentityPrincipal } from "./client";

export interface IdentityReadBoundaryInput {
  readonly principal: IdentityPrincipal;
  readonly authorityKey: string;
  readonly session: Extract<SourceSessionState, { kind: "authenticated" }>;
  readonly scope: AuthenticatedReadQueryScope;
  readonly enabledProviders: readonly SupportedAuthProvider[];
  readonly locallyManagedProviders: readonly SupportedAuthProvider[];
  readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
  readonly writeHoldReason: string;
  readonly transitionDescription: string;
}

const IdentityReadContext = createContext<IdentityReadBoundaryInput | null>(null);

export function useIdentityReadAvailability(input: IdentityReadBoundaryInput) {
  const auth = useSourceAuthContext();
  const blocked = useSessionTransition(input.scope.queryClient);
  const current =
    !blocked &&
    input.scope.isCurrent() &&
    input.authorityKey.length > 0 &&
    input.principal.user.id.length > 0 &&
    auth.handlers.kind === "available" &&
    auth.state.kind === "authenticated" &&
    auth.state.session === input.session.session &&
    auth.state.session.user.id === input.principal.user.id &&
    auth.state.session.user.permissions.length === input.principal.user.permissions.length &&
    auth.state.session.user.permissions.every((permission) => input.principal.user.permissions.includes(permission));
  return {
    current,
    title: auth.unavailableTitle,
    description: auth.unavailableDescription ?? input.transitionDescription,
    sourceNotice: auth.unavailableDescription !== null,
  };
}

export function IdentityReadBoundary({
  input,
  children,
}: {
  readonly input: IdentityReadBoundaryInput;
  readonly children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const availability = useIdentityReadAvailability(input);
  const captured = useMemo(
    () =>
      Object.freeze({
        ...input,
        demo: Object.freeze({ ...input.demo }),
        enabledProviders: Object.freeze([...input.enabledProviders]),
        locallyManagedProviders: Object.freeze([...input.locallyManagedProviders]),
      }),
    [input],
  );
  if (queryClient !== input.scope.queryClient) {
    throw new Error("Private identity reads require the root QueryClient");
  }
  if (!availability.current) {
    if (availability.sourceNotice) return <SourceSessionNotice />;
    return (
      <Alert component="output" title={availability.title} aria-live="polite">
        {availability.description}
      </Alert>
    );
  }
  const generation = JSON.stringify([input.authorityKey, input.scope.identity]);
  return (
    <IdentityReadContext.Provider value={captured} key={generation}>
      {children}
    </IdentityReadContext.Provider>
  );
}

export function useIdentityRead() {
  const input = useContext(IdentityReadContext);
  if (!input) throw new Error("IdentityReadBoundary with a current private read input is required");
  const { current } = useIdentityReadAvailability(input);
  if (!current) throw new Error("The captured private identity read generation is unavailable");
  input.scope.assertCurrent();
  return input;
}
