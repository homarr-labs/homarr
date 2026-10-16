"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Alert,
  AppShellMain,
  Button,
  Center,
  Loader,
  MantineProvider,
  Stack,
  Text,
  Title,
  v8CssVariablesResolver,
} from "@mantine/core";

import { configureWorkerTransport } from "@homarr/api/worker-link";
import { supportedLanguages } from "@homarr/translation/languages";
import { Link, theme } from "@homarr/ui";
import { WorkerConnectionPool, workerRequest } from "@homarr/worker-client";
import { ResourceFetchProvider } from "@homarr/worker-client/resources";

import { MainNavigation } from "~/components/layout/navigation";
import { ClientShell } from "~/components/layout/shell";

import { WorkerBoard } from "./board";
import { WorkerWorkspaceContext, useWorkerConnections, useWorkerWorkspace } from "./context";
import type { WorkerBootstrap } from "./context";
import { WorkerHeader } from "./header";
import { PlatformAccountProvider, errorMessage } from "./platform";
import { WorkerProviders } from "./providers";
import { DisconnectedWorkersPage } from "./workers-page";
import { useWorkerManagementLinks } from "./navigation";
import { CustomWidgetConfigurationEntry } from "~/app/[locale]/custom-widget-configuration/[token]/configuration-entry";

const WorkerManagementRouter = dynamic(
  () => import("./manage/router").then((module) => module.WorkerManagementRouter),
  {
    loading: () => (
      <Center mih="50vh">
        <Loader />
      </Center>
    ),
  },
);
const WorkerWidgetPreview = dynamic(() => import("./preview").then((module) => module.WorkerWidgetPreview));
const ScalarApiReference = dynamic(() =>
  import("~/app/[locale]/manage/tools/api/components/scalar-api-reference").then((module) => module.ScalarApiReference),
);

export function WorkerApp({ platformPath }: { platformPath: string }) {
  const [pool] = useState(() => new WorkerConnectionPool());
  const router = useRouter();
  const requestedWorkersTab = useSearchParams().get("workers");
  const [initialLink, setInitialLink] = useState("");
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);
  const manageWorkers = useCallback(() => router.push("/manage/workers"), [router]);
  const clearInitialLink = useCallback(() => setInitialLink(""), []);
  const setOrganizationId = useCallback((value: string | null) => {
    setOrganizationIdState(value);
    try {
      if (value) localStorage.setItem("homarr:worker-organization:v1", value);
      else localStorage.removeItem("homarr:worker-organization:v1");
    } catch {
      // Organization selection is optional when browser preference storage is disabled.
    }
  }, []);
  const context = useMemo(
    () => ({ pool, platformPath, manageWorkers, organizationId, setOrganizationId, initialLink, clearInitialLink }),
    [pool, platformPath, manageWorkers, organizationId, setOrganizationId, initialLink, clearInitialLink],
  );
  useEffect(() => {
    let active = true;
    configureWorkerTransport(() => pool.getConnection());
    try {
      setOrganizationIdState(localStorage.getItem("homarr:worker-organization:v1"));
    } catch {
      // Worker grants use their own storage validation before a connection is attempted.
    }
    const address = new URL(window.location.href);
    const requestedTab = address.searchParams.get("workers");
    const legacyTab = requestedTab && ["workers", "account", "organizations", "sharing", "mcp"].includes(requestedTab);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incomingWorkerId = fragment.get("worker");
    const hasSetupLink = Boolean(incomingWorkerId);
    if (hasSetupLink) setInitialLink(window.location.href);
    if (hasSetupLink || legacyTab) {
      const params = new URLSearchParams();
      if (legacyTab) params.set("tab", requestedTab);
      const search = params.toString();
      let destination = "/manage/workers";
      if (search) destination += `?${search}`;
      // Keep the private link only in memory after capturing it for the connection form.
      router.replace(destination);
    }
    void pool
      .hydrate()
      .then(async () => {
        if (!active) return;
        const primary = pool.getSnapshot().primaryWorkerId;
        // A second worker's invitation must not strand the saved primary offline.
        // Same-worker setup retains its explicit confirmation/recovery path.
        if (primary && primary !== incomingWorkerId) await pool.restore(primary);
      })
      .catch(() => {
        if (active) router.replace("/manage/workers");
      });
    return () => {
      active = false;
      configureWorkerTransport(null);
      pool.close();
    };
  }, [pool, router]);
  useEffect(() => {
    if (
      !requestedWorkersTab ||
      !["workers", "account", "organizations", "sharing", "mcp"].includes(requestedWorkersTab)
    )
      return;
    router.replace(`/manage/workers?tab=${encodeURIComponent(requestedWorkersTab)}`);
  }, [requestedWorkersTab, router]);
  return (
    <WorkerWorkspaceContext.Provider value={context}>
      <PlatformAccountProvider>
        <MantineProvider theme={theme} defaultColorScheme="auto" cssVariablesResolver={v8CssVariablesResolver}>
          <WorkerWorkspace />
        </MantineProvider>
      </PlatformAccountProvider>
    </WorkerWorkspaceContext.Provider>
  );
}

function WorkerWorkspace() {
  const pathname = usePathname();
  const { pool, manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const [bootstrapResult, setBootstrap] = useState<{ scope: string; value: WorkerBootstrap } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const primary = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId);
  const connection = useMemo(() => {
    if (!primary?.connected || snapshot.primaryScope === "none") return null;
    return pool.getConnection(primary.worker.workerId);
  }, [pool, snapshot.primaryScope, primary?.connected, primary?.worker.workerId]);
  useEffect(() => {
    setBootstrap(null);
    setError("");
    if (!connection) return;
    const controller = new AbortController();
    setPending(true);
    void workerRequest<WorkerBootstrap>(connection, "/remote/frontend/bootstrap", { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setBootstrap({ scope: snapshot.primaryScope, value });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [connection, snapshot.primaryScope]);
  const bootstrap = bootstrapResult?.scope === snapshot.primaryScope ? bootstrapResult.value : null;
  const resourceFetch = useMemo(() => {
    if (!connection) return undefined;
    return connection.fetch.bind(connection) as typeof fetch;
  }, [connection]);
  let content = (
    <Center mih="100dvh" p="lg">
      <Stack align="center" maw={560}>
        <Title order={1}>Homarr</Title>
        <Text c="dimmed" ta="center">
          Your boards live on your workers. Connect one to open Homarr, then add more workers for your other services.
        </Text>
        {pending && <Loader aria-label="Opening worker" />}
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {primary?.error && (
          <Alert color="red" role="alert">
            {primary.error}
          </Alert>
        )}
        <Button onClick={manageWorkers}>Set up your workers</Button>
      </Stack>
    </Center>
  );
  if (bootstrap && connection && resourceFetch && primary?.connected) {
    content = (
      <ResourceFetchProvider
        key={snapshot.primaryScope}
        workerId={primary.worker.workerId}
        scope={snapshot.primaryScope}
        fetch={resourceFetch}
      >
        <WorkerProviders bootstrap={bootstrap}>
          <NativeWorkspace />
        </WorkerProviders>
      </ResourceFetchProvider>
    );
  }
  if ((!bootstrap || !connection) && pathname.replace(/\/$/, "").endsWith("/manage/workers")) {
    return <DisconnectedWorkersPage />;
  }
  return content;
}

function NativeWorkspace() {
  const visiblePath = usePathname();
  const segments = visiblePath.split("/").filter(Boolean);
  if (supportedLanguages.includes(segments[0] as never)) segments.shift();
  if (segments[0] === "worker-shell") segments.shift();
  const pathname = `/${segments.join("/")}`;
  if (segments[0] === "custom-widget-configuration" && segments[1])
    return <CustomWidgetConfigurationEntry token={segments[1]} />;
  if (segments[0] === "widgets" && segments[1]) return <WorkerWidgetPreview kind={segments[1]} />;
  if (pathname === "/reference/api") return <ScalarApiReference />;
  if (segments[0] === "manage" || (segments[0] === "boards" && segments[2] === "settings")) {
    return (
      <ManagementShell>
        <WorkerManagementRouter pathname={pathname} />
      </ManagementShell>
    );
  }
  let name: string | undefined;
  if (segments[0] === "boards" && segments[1]) {
    try {
      name = decodeURIComponent(segments[1]);
    } catch {
      name = segments[1];
    }
  }
  if (!segments.length || segments[0] === "boards") return <WorkerBoard name={name} />;
  return (
    <Center mih="80vh">
      <Stack align="center">
        <Text>This page is unavailable in the worker workspace.</Text>
        <Button component={Link} href="/boards">
          Open boards
        </Button>
      </Stack>
    </Center>
  );
}

function ManagementShell({ children }: { children: React.ReactNode }) {
  const links = useWorkerManagementLinks();
  return (
    <ClientShell hasNavigation>
      <WorkerHeader hasNavigation />
      <MainNavigation links={links} />
      <AppShellMain>{children}</AppShellMain>
    </ClientShell>
  );
}
