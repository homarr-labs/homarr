"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const workshopCacheMaxAge = 1000 * 60 * 60 * 24;

export function WorkshopQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: workshopCacheMaxAge,
            networkMode: "offlineFirst",
            refetchOnReconnect: true,
            retry: 1,
            staleTime: 1000 * 60 * 5,
          },
          mutations: {
            networkMode: "online",
            retry: false,
          },
        },
      }),
  );
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "homarr-workshop-cache-v1",
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      throttleTime: 1000,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: workshopCacheMaxAge,
        buster: "workshop-v1",
        dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === "success" },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
