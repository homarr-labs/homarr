import type { PropsWithChildren } from "react";
import { useLayoutEffect, useState } from "react";
import { IsRestoringProvider, QueryClientProvider } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useBoardRestoration } from "@homarr/boards/context";
import { useIsHydrated } from "@homarr/common";

/** Hydrate against the captured values before joining the shared live cache. */
export const PreparedWidgetQueries = ({ children }: PropsWithChildren) => {
  const hydrated = useIsHydrated();
  const { createQueryClient, isRestoring } = useBoardRestoration();
  const utils = clientApi.useUtils();
  const [hydration] = useState(() => {
    if (hydrated || typeof window === "undefined") return undefined;
    return createQueryClient();
  });
  const [ready, setReady] = useState(!hydration);
  useLayoutEffect(() => {
    if (!hydration) return;
    hydration.resume();
    setReady(true);
  }, [hydration]);

  if (!hydration) {
    let restoring = false;
    if (typeof window === "undefined") restoring = isRestoring;
    return <IsRestoringProvider value={restoring}>{children}</IsRestoringProvider>;
  }
  return (
    <QueryClientProvider client={hydration.client}>
      <clientApi.Provider client={utils.client} queryClient={hydration.client} abortOnUnmount={utils.abortOnUnmount}>
        <IsRestoringProvider value={!ready}>{children}</IsRestoringProvider>
      </clientApi.Provider>
    </QueryClientProvider>
  );
};
