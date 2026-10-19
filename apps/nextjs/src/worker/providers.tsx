"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Stack } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import { MutationCache, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { clientApi, FetchApiProvider } from "@homarr/api/client";
import { createWorkerLink } from "@homarr/api/worker-link";
import {
  dashboardSupportingQueryPolicies,
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { IntegrationProvider } from "@homarr/auth/client";
import { registerWorkerRevalidation } from "@homarr/common/client";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsProvider } from "@homarr/settings";
import { SpotlightProvider } from "@homarr/spotlight";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";
import { widgetQueryRefetchIntervals } from "@homarr/widgets/refetch-intervals";
import { workerRequest } from "@homarr/worker-client";
import type { WorkerConnection } from "@homarr/worker-client";

import { DayJsLoader } from "~/app/[locale]/_client-providers/dayjs-loader";
import { JotaiProvider } from "~/app/[locale]/_client-providers/jotai";
import { CustomMantineProvider } from "~/app/[locale]/_client-providers/mantine";
import { AuthProvider } from "~/app/[locale]/_client-providers/session";
import { AssistantGate } from "~/components/assistant/assistant-gate";

import { WorkerBootstrapContext, useWorkerWorkspace } from "./context";
import type { WorkerBootstrap } from "./context";
import { WorkerMetadata } from "./metadata";

const bootstrapQueryKey = ["worker-frontend-bootstrap"] as const;

/** The entire normal Homarr component tree uses the selected encrypted worker. */
export function WorkerProviders({ bootstrap, children }: PropsWithChildren<{ bootstrap: WorkerBootstrap }>) {
  const { pool, manageWorkers } = useWorkerWorkspace();
  const [connection] = useState(() => pool.getConnection());
  const disconnect = useCallback(() => {
    const worker = pool.getWorker();
    if (worker) pool.disconnect(worker.workerId);
    manageWorkers();
  }, [pool, manageWorkers]);
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      mutationCache: new MutationCache({
        onSuccess: async () => {
          await client.invalidateQueries({ queryKey: bootstrapQueryKey });
        },
      }),
      defaultOptions: {
        queries: { retry: 1, staleTime: queryCacheDefaultStaleTimeMs, gcTime: queryCacheDefaultGcTimeMs },
      },
    });
    client.setQueryDefaults([["widget"]], {
      refetchInterval: queryCacheDefaultRefetchIntervalMs,
      refetchOnWindowFocus: false,
    });
    for (const entry of widgetQueryRefetchIntervals) {
      const options: { refetchInterval?: number | false; staleTime?: number } = {};
      if (entry.intervalSeconds === null) options.refetchInterval = false;
      else if (typeof entry.intervalSeconds === "number") options.refetchInterval = entry.intervalSeconds * 1_000;
      if ("staleTimeSeconds" in entry) options.staleTime = entry.staleTimeSeconds * 1_000;
      client.setQueryDefaults(entry.queryKey, options);
    }
    for (const { queryKey, ...options } of dashboardSupportingQueryPolicies) client.setQueryDefaults(queryKey, options);
    return client;
  });
  const [apiClient] = useState(() =>
    clientApi.createClient({
      link: createWorkerLink({
        fetch: connection.fetch,
        fetchSubscription: connection.fetchSubscription,
        browserWeather: bootstrap.runtime.browserWeather,
      }),
    }),
  );
  useEffect(() => () => queryClient.clear(), [queryClient]);
  useEffect(
    () =>
      registerWorkerRevalidation(async () => {
        await queryClient.invalidateQueries();
      }),
    [queryClient],
  );
  return (
    <clientApi.Provider client={apiClient} queryClient={queryClient}>
      <FetchApiProvider value={apiClient}>
        <QueryClientProvider client={queryClient}>
          <LiveWorkerProviders initialBootstrap={bootstrap} connection={connection} disconnect={disconnect}>
            {children}
          </LiveWorkerProviders>
        </QueryClientProvider>
      </FetchApiProvider>
    </clientApi.Provider>
  );
}

function LiveWorkerProviders({
  initialBootstrap,
  connection,
  disconnect,
  children,
}: PropsWithChildren<{
  initialBootstrap: WorkerBootstrap;
  connection: WorkerConnection;
  disconnect: () => void;
}>) {
  const query = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: ({ signal }) => workerRequest<WorkerBootstrap>(connection, "/remote/frontend/bootstrap", { signal }),
    initialData: initialBootstrap,
    staleTime: queryCacheDefaultStaleTimeMs,
    refetchInterval: queryCacheDefaultRefetchIntervalMs,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const bootstrap = query.data;
  const user = useMemo(() => {
    if (!bootstrap.user) return null;
    return { ...bootstrap.user, firstDayOfWeek: bootstrap.user.firstDayOfWeek as DayOfWeek };
  }, [bootstrap.user]);

  if (query.isError)
    return (
      <Alert color="red" title="Unable to refresh this worker" role="alert" m="lg">
        <Stack align="flex-start">
          {query.error.message}
          <Button onClick={() => void query.refetch()} loading={query.isFetching}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );

  return (
    <WorkerBootstrapContext.Provider value={bootstrap}>
      <AuthProvider session={bootstrap.session} logoutUrl={undefined} onSignOut={disconnect} workerSession>
        <SettingsProvider user={user} serverSettings={bootstrap.serverSettings}>
          <JotaiProvider>
            <DayJsLoader>
              <CustomMantineProvider defaultColorScheme="auto" branding={bootstrap.serverSettings.branding}>
                <ModalProvider>
                  <SpotlightProvider>
                    <AssistantGate availability={bootstrap.assistantAvailability}>
                      <IntegrationProvider integrations={bootstrap.integrationPermissions}>
                        <DemoReadOnlyProvider value={false}>
                          <Notifications pauseResetOnHover="notification" />
                          <WorkerMetadata />
                          {children}
                        </DemoReadOnlyProvider>
                      </IntegrationProvider>
                    </AssistantGate>
                  </SpotlightProvider>
                </ModalProvider>
              </CustomMantineProvider>
            </DayJsLoader>
          </JotaiProvider>
        </SettingsProvider>
      </AuthProvider>
    </WorkerBootstrapContext.Provider>
  );
}
