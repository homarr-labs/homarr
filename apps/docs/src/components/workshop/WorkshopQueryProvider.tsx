import React, { type PropsWithChildren, useState } from "react";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const maxAge = 1000 * 60 * 60 * 24;

export function WorkshopQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: maxAge,
            networkMode: "offlineFirst",
            retry: 1,
            staleTime: 1000 * 60 * 5,
          },
          mutations: { networkMode: "online", retry: false },
        },
      }),
  );
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "homarr-workshop-website-cache-v1",
      storage: window.localStorage,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge,
        buster: "workshop-v1",
        dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === "success" },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
