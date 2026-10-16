"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Alert,
  AppShellMain,
  Box,
  Button,
  Center,
  Loader,
  MantineProvider,
  Stack,
  Text,
  Title,
  v8CssVariablesResolver,
} from "@mantine/core";
import {
  IconAffiliate,
  IconApi,
  IconBox,
  IconBrandDocker,
  IconBrandTabler,
  IconCertificate,
  IconClipboardList,
  IconDatabaseExport,
  IconLayoutDashboard,
  IconPhoto,
  IconRobot,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { configureWorkerTransport } from "@homarr/api/worker-link";
import { supportedLanguages } from "@homarr/translation/languages";
import { Link, theme } from "@homarr/ui";
import { WorkerConnectionPool, workerRequest } from "@homarr/worker-client";
import { ResourceFetchProvider } from "@homarr/worker-client/resources";

import { MainNavigation } from "~/components/layout/navigation";
import { ClientShell } from "~/components/layout/shell";

import { WorkerBoard } from "./board";
import { WorkerWorkspaceContext, useWorkerBootstrap, useWorkerConnections, useWorkerWorkspace } from "./context";
import type { WorkerBootstrap } from "./context";
import { WorkerDock } from "./dock";
import { WorkerHeader } from "./header";
import { PlatformAccountProvider, errorMessage } from "./platform";
import { WorkerProviders } from "./providers";
import { WorkerSetup } from "./setup";
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
  const [setupOpened, setSetupOpened] = useState(false);
  const [initialLink, setInitialLink] = useState("");
  const [initialTab, setInitialTab] = useState("workers");
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);
  const manageWorkers = useCallback(() => setSetupOpened(true), []);
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
    () => ({ pool, platformPath, manageWorkers, organizationId, setOrganizationId }),
    [pool, platformPath, manageWorkers, organizationId, setOrganizationId],
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
    if (requestedTab && ["workers", "account", "organizations", "sharing", "mcp"].includes(requestedTab)) {
      setInitialTab(requestedTab);
      setSetupOpened(true);
      address.searchParams.delete("workers");
      history.replaceState(history.state, "", `${address.pathname}${address.search}${address.hash}`);
    }
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incomingWorkerId = fragment.get("worker");
    const hasSetupLink = Boolean(incomingWorkerId);
    if (hasSetupLink) {
      setInitialLink(window.location.href);
      setSetupOpened(true);
      if (!fragment.has("share"))
        history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}`);
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
        if (active) setSetupOpened(true);
      });
    return () => {
      active = false;
      configureWorkerTransport(null);
      pool.close();
    };
  }, [pool]);
  return (
    <WorkerWorkspaceContext.Provider value={context}>
      <PlatformAccountProvider>
        <MantineProvider theme={theme} defaultColorScheme="auto" cssVariablesResolver={v8CssVariablesResolver}>
          <WorkerWorkspace
            setupOpened={setupOpened}
            closeSetup={() => setSetupOpened(false)}
            initialLink={initialLink}
            initialTab={initialTab}
          />
        </MantineProvider>
      </PlatformAccountProvider>
    </WorkerWorkspaceContext.Provider>
  );
}

function WorkerWorkspace({
  setupOpened,
  closeSetup,
  initialLink,
  initialTab,
}: {
  setupOpened: boolean;
  closeSetup: () => void;
  initialLink: string;
  initialTab: string;
}) {
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
          <Box pb={68}>
            <NativeWorkspace />
          </Box>
        </WorkerProviders>
      </ResourceFetchProvider>
    );
  }
  return (
    <>
      {content}
      <WorkerDock />
      <WorkerSetup opened={setupOpened} onClose={closeSetup} initialLink={initialLink} initialTab={initialTab} />
    </>
  );
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
  const { session, runtime } = useWorkerBootstrap();
  const isAdmin = session.user.permissions.includes("admin");
  return (
    <ClientShell hasNavigation>
      <WorkerHeader hasNavigation />
      <MainNavigation
        links={[
          { icon: IconLayoutDashboard, label: "Boards", href: "/manage/boards" },
          { icon: IconBox, label: "Apps", href: "/manage/apps" },
          { icon: IconAffiliate, label: "Integrations", href: "/manage/integrations" },
          { icon: IconApi, label: "Custom widgets", href: "/manage/custom-widgets", hidden: !isAdmin },
          { icon: IconSearch, label: "Search engines", href: "/manage/search-engines" },
          { icon: IconPhoto, label: "Media", href: "/manage/medias" },
          { icon: IconUsers, label: "Users", href: "/manage/users", hidden: !isAdmin },
          { icon: IconUsers, label: "Invites", href: "/manage/users/invites", hidden: !isAdmin },
          { icon: IconUsers, label: "Groups", href: "/manage/users/groups", hidden: !isAdmin },
          {
            icon: IconBrandDocker,
            label: "Docker",
            href: "/manage/tools/docker",
            hidden: !isAdmin || !runtime.dockerEnabled,
          },
          {
            icon: IconBox,
            label: "Kubernetes",
            href: "/manage/tools/kubernetes",
            hidden: !isAdmin || !runtime.kubernetesEnabled,
          },
          { icon: IconApi, label: "API", href: "/manage/tools/api", hidden: !isAdmin },
          {
            icon: IconBrandTabler,
            label: "Logs",
            href: "/manage/tools/logs",
            hidden: !session.user.permissions.includes("other-view-logs"),
          },
          { icon: IconCertificate, label: "Certificates", href: "/manage/tools/certificates", hidden: !isAdmin },
          { icon: IconClipboardList, label: "Tasks", href: "/manage/tools/tasks", hidden: !isAdmin },
          {
            icon: IconDatabaseExport,
            label: "Backup",
            href: "/manage/tools/backup",
            hidden: !isAdmin || runtime.databaseDriver !== "better-sqlite3",
          },
          { icon: IconRobot, label: "Assistant", href: "/manage/assistant", hidden: !isAdmin },
          { icon: IconSettings, label: "Settings", href: "/manage/settings", hidden: !isAdmin },
        ]}
      />
      <AppShellMain>{children}</AppShellMain>
    </ClientShell>
  );
}
