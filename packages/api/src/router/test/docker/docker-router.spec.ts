import { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { objectKeys } from "@homarr/common";
import type { Database } from "@homarr/db";
import type { GroupPermissionKey } from "@homarr/definitions";
import { getPermissionsWithChildren } from "@homarr/definitions";
import type { DockerEndpointStatus } from "@homarr/docker";

import type { RouterInputs, RouterOutputs } from "../../..";
import { dockerRouter } from "../../docker/docker-router";

const findDockerContainerAsyncMock = vi.hoisted(() => vi.fn());
const hasDockerEndpointCapabilityMock = vi.hoisted(() => vi.fn(() => true));
const invalidateDockerCacheMock = vi.hoisted(() => vi.fn());
const resetDockerSingletonMock = vi.hoisted(() => vi.fn());
const getDockerDataAsyncMock = vi.hoisted(() =>
  vi.fn<
    () => Promise<{
      data: {
        containers: RouterOutputs["docker"]["getContainers"]["containers"];
        endpoints: DockerEndpointStatus[];
      };
      timestamp: Date;
    }>
  >(async () => ({
    data: { containers: [], endpoints: [] },
    timestamp: new Date(),
  })),
);
const findIntegrationsAsyncMock = vi.fn(
  async (): Promise<
    {
      id: string;
      name: string;
      kind: "sonarr";
      url: string;
      appId: string | null;
      items?: { itemId: string }[];
      secrets?: { kind: "apiKey" }[];
    }[]
  > => [],
);
const findAppsAsyncMock = vi.fn(
  async (): Promise<{ id: string; name: string; href: string | null; iconUrl: string }[]> => [],
);

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));
vi.mock("@homarr/docker", () => ({
  DockerSingleton: {
    getInstances: () => [
      {
        instance: {
          getContainer: () => ({
            inspect: (callback: (error: null, data: object) => void) => callback(null, {}),
            start: () => Promise.resolve(),
            stop: () => Promise.resolve(),
            restart: () => Promise.resolve(),
            remove: () => Promise.resolve(),
          }),
        },
      },
    ],
    reset: resetDockerSingletonMock,
  },
}));
vi.mock("@homarr/request-handler/docker", () => ({
  findDockerContainerAsync: findDockerContainerAsyncMock,
  hasDockerEndpointCapability: hasDockerEndpointCapabilityMock,
  getDockerEndpointsAsync: () => [],
  getContainerLogsAsync: async () => {
    await Promise.resolve();
    return "logs";
  },
  streamContainerLogsAsync: async () => {
    await Promise.resolve();
    return () => undefined;
  },
  dockerContainersRequestHandler: {
    invalidateCache: invalidateDockerCacheMock,
    handler: () => ({
      getDataAsync: getDockerDataAsyncMock,
    }),
  },
}));
vi.mock("@homarr/docker/env", () => ({
  env: {
    ENABLE_DOCKER: true,
  },
}));

const createSessionWithPermissions = (...permissions: GroupPermissionKey[]) =>
  ({
    user: {
      id: "1",
      permissions,
      colorScheme: "light",
    },
    expires: new Date().toISOString(),
  }) satisfies Session;

const procedureKeys = objectKeys(dockerRouter._def.procedures);

const validInputs: {
  [key in (typeof procedureKeys)[number]]: RouterInputs["docker"][key];
} = {
  reconcileServices: undefined,
  getServiceHealth: undefined,
  refreshInventory: undefined,
  getEndpoints: undefined,
  getContainers: undefined,
  startAll: { targets: [{ endpointId: "one", id: "1" }] },
  stopAll: { targets: [{ endpointId: "one", id: "1" }] },
  restartAll: { targets: [{ endpointId: "one", id: "1" }] },
  removeAll: { targets: [{ endpointId: "one", id: "1" }] },
  logs: { endpointId: "one", id: "1", tail: 200 },
  subscribeLogs: { endpointId: "one", id: "1", tail: 200 },
};

const database = {
  query: {
    integrations: { findMany: findIntegrationsAsyncMock },
    apps: { findMany: findAppsAsyncMock },
  },
} as unknown as Database;

const createDockerContainer = () => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
});

const createAdminCaller = () =>
  dockerRouter.createCaller({
    db: database,
    deviceType: undefined,
    session: createSessionWithPermissions("admin"),
  });

describe("All procedures should only be accessible for users with admin permission", () => {
  test.each(procedureKeys)("Procedure %s should be accessible for users with admin permission", async (procedure) => {
    // Arrange
    const caller = dockerRouter.createCaller({
      db: database,
      deviceType: undefined,
      session: createSessionWithPermissions("admin"),
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).resolves.not.toThrow();
  });

  test.each(procedureKeys)("Procedure %s should not be accessible with other permissions", async (procedure) => {
    // Arrange
    const groupPermissionsWithoutAdmin = getPermissionsWithChildren(["admin"]).filter(
      (permission) => permission !== "admin",
    );
    const caller = dockerRouter.createCaller({
      db: null as unknown as Database,
      deviceType: undefined,
      session: createSessionWithPermissions(...groupPermissionsWithoutAdmin),
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Permission denied" }));
  });

  test.each(procedureKeys)("Procedure %s should not be accessible without session", async (procedure) => {
    // Arrange
    const caller = dockerRouter.createCaller({
      db: null as unknown as Database,
      deviceType: undefined,
      session: null,
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED" }));
  });
});

describe("Docker action targeting", () => {
  test.each(["startAll", "stopAll", "restartAll", "removeAll"] as const)(
    "%s requires a bounded non-empty target list",
    async (procedure) => {
      const caller = createAdminCaller();

      await expect(caller[procedure]({ targets: [] })).rejects.toThrow();
      await expect(
        caller[procedure]({
          targets: Array.from({ length: 101 }, (_, index) => ({ endpointId: "endpoint", id: String(index) })),
        }),
      ).rejects.toThrow();
    },
  );

  test("enforces endpoint capabilities before running a lifecycle action", async () => {
    hasDockerEndpointCapabilityMock.mockReturnValueOnce(false);

    const result = await createAdminCaller().stopAll({ targets: [{ endpointId: "readonly", id: "one" }] });

    expect(result).toEqual([
      {
        target: { endpointId: "readonly", id: "one" },
        success: false,
        error: "Endpoint does not permit lifecycle actions",
      },
    ]);
    expect(findDockerContainerAsyncMock).not.toHaveBeenCalled();
  });

  test("targets duplicate container IDs on their explicit endpoints", async () => {
    const first = createDockerContainer();
    const second = createDockerContainer();
    findDockerContainerAsyncMock.mockImplementation(async ({ endpointId }) =>
      endpointId === "first" ? first : second,
    );

    const result = await createAdminCaller().startAll({
      targets: [
        { endpointId: "first", id: "duplicate" },
        { endpointId: "second", id: "duplicate" },
      ],
    });

    expect(first.start).toHaveBeenCalledOnce();
    expect(second.start).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { target: { endpointId: "first", id: "duplicate" }, success: true },
      { target: { endpointId: "second", id: "duplicate" }, success: true },
    ]);
  });

  test("reports partial failures per target", async () => {
    const healthy = createDockerContainer();
    const failing = createDockerContainer();
    failing.restart.mockRejectedValue(new Error("proxy denied restart"));
    findDockerContainerAsyncMock.mockImplementation(async ({ endpointId }) =>
      endpointId === "healthy" ? healthy : failing,
    );

    const result = await createAdminCaller().restartAll({
      targets: [
        { endpointId: "healthy", id: "one" },
        { endpointId: "failing", id: "two" },
      ],
    });

    expect(result).toEqual([
      { target: { endpointId: "healthy", id: "one" }, success: true },
      {
        target: { endpointId: "failing", id: "two" },
        success: false,
        error: "proxy denied restart",
      },
    ]);
  });
});

test("distinguishes unavailable endpoints from an empty inventory", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [],
      endpoints: [{ id: "remote", name: "Remote Docker", status: "unavailable" }],
    },
    timestamp: new Date(),
  });

  const result = await createAdminCaller().getContainers();

  expect(result.containers).toEqual([]);
  expect(result.endpoints).toEqual([{ id: "remote", name: "Remote Docker", status: "unavailable" }]);
});

test("keeps multiple recognized services of the same integration kind", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [
        createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr-home", publicPort: 8989 }),
        createInventoryContainer({ endpointId: "remote", id: "two", name: "sonarr-remote", publicPort: 18989 }),
      ],
      endpoints: [
        { id: "home", name: "Home", status: "available" },
        { id: "remote", name: "Remote", status: "available" },
      ] satisfies DockerEndpointStatus[],
    },
    timestamp: new Date(),
  });

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates).toHaveLength(2);
  expect(result.candidates.map(({ match }) => match?.kind)).toEqual(["sonarr", "sonarr"]);
  expect(result.candidates.map(({ candidateKey }) => candidateKey)).toEqual(["home:one", "remote:two"]);
});

test("preserves unavailable endpoints beside available service candidates", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [
        { id: "home", name: "Home", status: "available" },
        { id: "remote", name: "Remote", status: "unavailable" },
      ] satisfies DockerEndpointStatus[],
    },
    timestamp: new Date(),
  });

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates).toHaveLength(1);
  expect(result.endpoints).toContainEqual({ id: "remote", name: "Remote", status: "unavailable" });
});

test("does not adopt an ambiguous existing integration", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    { id: "first", name: "Sonarr one", kind: "sonarr", url: "http://home.example:8989", appId: null },
    { id: "second", name: "Sonarr two", kind: "sonarr", url: "http://home.example:8989", appId: null },
  ]);

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates[0]?.representation.integration).toBeNull();
  expect(result.candidates[0]?.representation.signals.ambiguous).toBe(true);
  expect(result.candidates[0]?.state).toBe("newRecognized");
  expect(result.candidates[0]?.nextAction).toBe("reviewIntegration");
});

test("prefers a unique exact integration match over duplicate name matches", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    {
      id: "exact",
      name: "Primary",
      kind: "sonarr",
      url: "http://home.example:8989",
      appId: null,
      items: [],
      secrets: [],
    },
    {
      id: "name-one",
      name: "sonarr",
      kind: "sonarr",
      url: "http://other.example:8989",
      appId: null,
      items: [],
      secrets: [],
    },
    {
      id: "name-two",
      name: "sonarr",
      kind: "sonarr",
      url: "http://third.example:8989",
      appId: null,
      items: [],
      secrets: [],
    },
  ]);

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates[0]?.representation.integration?.id).toBe("exact");
  expect(result.candidates[0]?.representation.signals.ambiguous).toBe(false);
});

test("does not fall back to a unique name when exact integration matches are ambiguous", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    { id: "named", name: "sonarr", kind: "sonarr", url: "http://home.example:8989", appId: null },
    { id: "other", name: "Other", kind: "sonarr", url: "http://home.example:8989", appId: null },
  ]);

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates[0]?.representation.integration).toBeNull();
  expect(result.candidates[0]?.representation.signals.ambiguous).toBe(true);
  expect(result.candidates[0]?.nextAction).toBe("reviewIntegration");
});

test("prefers an explicitly linked app over duplicate app matches", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    {
      id: "integration",
      name: "Sonarr",
      kind: "sonarr",
      url: "http://home.example:8989",
      appId: "linked",
      items: [],
      secrets: [],
    },
  ]);
  findAppsAsyncMock.mockResolvedValueOnce([
    { id: "linked", name: "Sonarr", href: "http://home.example:8989", iconUrl: "" },
    { id: "duplicate", name: "Sonarr duplicate", href: "http://home.example:8989", iconUrl: "" },
  ]);

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates[0]?.representation.app?.id).toBe("linked");
  expect(result.candidates[0]?.representation.signals.ambiguous).toBe(false);
  expect(result.candidates[0]?.state).toBe("linked");
});

test("marks a linked integration as moved when only its app URL still matches", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    {
      id: "integration",
      name: "Sonarr",
      kind: "sonarr",
      url: "http://old.example:8989",
      appId: "linked",
      items: [],
      secrets: [],
    },
  ]);
  findAppsAsyncMock.mockResolvedValueOnce([
    { id: "linked", name: "Sonarr", href: "http://home.example:8989", iconUrl: "" },
  ]);

  const result = await createAdminCaller().reconcileServices();

  expect(result.candidates[0]?.state).toBe("moved");
  expect(result.candidates[0]?.nextAction).toBe("reviewIntegration");
  expect(result.candidates[0]?.representation.signals).toMatchObject({
    exactIntegrationUrl: false,
    exactAppUrl: true,
    linked: true,
  });
});

test("does not offer to create an app when existing app matches are ambiguous", async () => {
  const dockerData = {
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  } satisfies Awaited<ReturnType<typeof getDockerDataAsyncMock>>;
  getDockerDataAsyncMock.mockResolvedValueOnce(dockerData).mockResolvedValueOnce(dockerData);
  const apps = [
    { id: "first", name: "Sonarr one", href: "http://home.example:8989", iconUrl: "" },
    { id: "second", name: "Sonarr two", href: "http://home.example:8989", iconUrl: "" },
  ] satisfies Awaited<ReturnType<typeof findAppsAsyncMock>>;
  findAppsAsyncMock.mockResolvedValueOnce(apps).mockResolvedValueOnce(apps);

  const reconciliation = await createAdminCaller().reconcileServices();
  const health = await createAdminCaller().getServiceHealth();

  expect(reconciliation.candidates[0]?.representation.app).toBeNull();
  expect(reconciliation.candidates[0]?.representation.signals.ambiguous).toBe(true);
  expect(reconciliation.candidates[0]?.nextAction).toBe("viewRepresentation");
  expect(health.services[0]?.layers).toContainEqual({
    layer: "appRepresentation",
    status: "missing",
    nextAction: "viewRepresentation",
  });
});

test("invalidates the shared Docker inventory on explicit refresh", async () => {
  await createAdminCaller().refreshInventory();

  expect(invalidateDockerCacheMock).toHaveBeenCalledOnce();
  expect(resetDockerSingletonMock).toHaveBeenCalledOnce();
});

test("projects persisted service layers without inventing runtime health", async () => {
  getDockerDataAsyncMock.mockResolvedValueOnce({
    data: {
      containers: [createInventoryContainer({ endpointId: "home", id: "one", name: "sonarr", publicPort: 8989 })],
      endpoints: [{ id: "home", name: "Home", status: "available" }],
    },
    timestamp: new Date(),
  });
  findIntegrationsAsyncMock.mockResolvedValueOnce([
    {
      id: "integration",
      name: "Sonarr",
      kind: "sonarr",
      url: "http://home.example:8989",
      appId: "app",
      items: [{ itemId: "widget" }],
      secrets: [{ kind: "apiKey" }],
    },
  ]);
  findAppsAsyncMock.mockResolvedValueOnce([
    { id: "app", name: "Sonarr", href: "http://home.example:8989", iconUrl: "" },
  ]);

  const result = await createAdminCaller().getServiceHealth();

  expect(result.services[0]?.layers).toEqual(
    expect.arrayContaining([
      { layer: "docker", status: "available", nextAction: "none" },
      { layer: "integrationConfiguration", status: "configured", nextAction: "none" },
      { layer: "authentication", status: "notObserved", nextAction: "testConnection" },
      { layer: "apiRequest", status: "notObserved", nextAction: "openIntegrationDiagnostics" },
      { layer: "appRepresentation", status: "linked", nextAction: "none" },
      { layer: "widgetConfiguration", status: "linked", nextAction: "none" },
      { layer: "widgetQuery", status: "notObserved", nextAction: "openBoard" },
    ]),
  );
});

const createInventoryContainer = ({
  endpointId,
  id,
  name,
  publicPort,
}: {
  endpointId: string;
  id: string;
  name: string;
  publicPort: number;
}) => ({
  id,
  endpointId,
  endpointName: endpointId,
  resourceId: `${endpointId}:${id}`,
  name,
  host: `${endpointId}.example:2375`,
  state: "running" as const,
  image: "lscr.io/linuxserver/sonarr:latest",
  iconUrl: null,
  cpuUsage: 0,
  memoryUsage: 0,
  ports: [{ IP: "0.0.0.0", PrivatePort: 8989, PublicPort: publicPort, Type: "tcp" }],
});
