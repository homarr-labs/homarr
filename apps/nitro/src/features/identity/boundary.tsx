import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { IdentityAuthority } from "./client";

type ReadyAuthority = Extract<IdentityAuthority, { state: "ready" }>;

interface IdentityScope extends ReadyAuthority {
  queryClient: QueryClient;
  isCurrent: () => boolean;
  retire: (reason?: string) => void;
}

const IdentityContext = createContext<IdentityScope | null>(null);

export function IdentityBoundary({ authority, children }: { authority: IdentityAuthority; children: ReactNode }) {
  if (authority.state !== "ready" || !authority.principal.user.id || !authority.authorityKey) {
    return (
      <Alert component="output" title="Identity administration unavailable" aria-live="polite">
        {authority.state === "unavailable" ? authority.reason : "A current authenticated authority is required."}
      </Alert>
    );
  }
  const key = JSON.stringify([
    authority.authorityKey,
    authority.principal.user.id,
    authority.principal.user.permissions.toSorted(),
    authority.demo,
    authority.enabledProviders,
    authority.locallyManagedProviders,
  ]);
  return (
    <IdentityLifetime key={key} authority={authority}>
      {children}
    </IdentityLifetime>
  );
}

function IdentityLifetime({ authority, children }: { authority: ReadyAuthority; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
      }),
  );
  const [retired, setRetired] = useState<string | null>(null);
  const current = useRef(true);
  useEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
      void queryClient.cancelQueries();
      queryClient.clear();
    };
  }, [queryClient]);
  if (retired)
    return (
      <Alert component="output" aria-live="polite" title="Identity authority unavailable">
        {retired}
      </Alert>
    );
  return (
    <IdentityContext.Provider
      value={{
        ...authority,
        queryClient,
        isCurrent: () => current.current,
        retire: (
          reason = "Identity data is hidden until the host supplies a new authenticated authority snapshot.",
        ) => {
          current.current = false;
          void queryClient.cancelQueries();
          queryClient.clear();
          setRetired(reason);
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const scope = useContext(IdentityContext);
  if (!scope) throw new Error("IdentityBoundary with current authority is required");
  return scope;
}

export function useIdentityKey() {
  const { authorityKey, principal } = useIdentity();
  return ["identity", authorityKey, principal.user.id] as const;
}
