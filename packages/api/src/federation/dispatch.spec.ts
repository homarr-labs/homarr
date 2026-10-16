import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  federationConnections,
  integrationOrigins,
  integrations,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { encryptSecret } from "@homarr/common/server";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../middlewares/integration";
import { ApiError, createApiCaller, createApiRouter, publicProcedure } from "../procedure";
import type { ApiContext } from "../procedure";

const { call } = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("./client", () => ({ callFederatedProcedure: call }));

beforeEach(() => {
  call.mockReset();
});

async function setup() {
  const db = createDb();
  await db.insert(users).values([
    { id: "owner", name: "owner" },
    { id: "stranger", name: "stranger" },
  ]);
  await db.insert(federationConnections).values([
    {
      id: "source-a",
      workerId: "worker-a",
      name: "Source A",
      publicKey: "{}",
      encryptedConfiguration: encryptSecret(
        JSON.stringify({
          verifiedAuthorization: { integrationIds: ["same"], access: "full", expiresAt: Date.now() + 60_000 },
        }),
      ),
      enabled: true,
    },
    {
      id: "source-b",
      workerId: "worker-b",
      name: "Source B",
      publicKey: "{}",
      encryptedConfiguration: encryptSecret(
        JSON.stringify({
          verifiedAuthorization: { integrationIds: ["same"], access: "full", expiresAt: Date.now() + 60_000 },
        }),
      ),
      enabled: true,
    },
  ]);
  await db.insert(integrations).values([
    { id: "local", name: "Local", kind: "sabNzbd", url: "http://local" },
    { id: "alias-a", name: "A", kind: "sabNzbd", url: "https://worker.invalid" },
    { id: "alias-b", name: "B", kind: "sabNzbd", url: "https://worker.invalid" },
  ]);
  await db.insert(integrationOrigins).values([
    { integrationId: "alias-a", connectionId: "source-a", remoteIntegrationId: "same" },
    { integrationId: "alias-b", connectionId: "source-b", remoteIntegrationId: "same" },
  ]);
  const apiContext: ApiContext = {
    db,
    session: {
      user: { id: "owner", colorScheme: "dark", permissions: ["integration-full-all"] },
      expires: "2099-01-01",
    },
    deviceType: undefined,
  };
  const query = publicProcedure.concat(createManyIntegrationMiddleware("query", "sabNzbd")).query(({ context }) =>
    context.integrations.map((integration) => ({
      integrationId: integration.id,
      integrationName: integration.name,
      data: { id: "upstream-resource" },
    })),
  );
  const router = createApiRouter({
    widget: { downloads: { getJobsAndStatuses: query } },
    single: publicProcedure
      .concat(createOneIntegrationMiddleware("query", "sabNzbd"))
      .query(({ context }) => context.integration.name),
  });
  return { db, context: apiContext, router, caller: createApiCaller(router, apiContext) };
}

describe("primary worker native operation dispatch", () => {
  test("partitions local and two workers with colliding source IDs", async () => {
    const { caller } = await setup();
    call.mockImplementation(async (_context, connectionId, path, input) => {
      expect(path).toEqual(["widget", "downloads", "getJobsAndStatuses"]);
      expect(input.integrationIds).toEqual(["same"]);
      return [{ integrationId: "same", integrationName: connectionId, data: { id: "upstream-resource" } }];
    });
    const results = await caller.widget.downloads.getJobsAndStatuses({
      integrationIds: ["local", "alias-a", "alias-b"],
    });
    expect(results.map(({ integrationId }) => integrationId).toSorted()).toEqual(["alias-a", "alias-b", "local"]);
    expect(results.every(({ data }) => data.id === "upstream-resource")).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
  });

  test("an offline source preserves healthy worker results with a bounded public error", async () => {
    const { caller } = await setup();
    call.mockRejectedValue(new Error("private network address or credential"));
    const result = await caller.widget.downloads.getJobsAndStatuses({ integrationIds: ["local", "alias-a"] });
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integrationId: "local" }),
        expect.objectContaining({ integrationId: "alias-a", error: "INTEGRATION_REQUEST_FAILED" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("private network");
  });

  test("scope rejection runs before delegated execution and receives parsed selectors", async () => {
    const { context, router } = await setup();
    const authorizeProcedure = vi.fn(() => {
      throw new ApiError({ code: "FORBIDDEN", message: "Scope denied" });
    });
    context.workerAccess = { role: "owner", grantId: "owner", authorizeProcedure };
    await expect(createApiCaller(router, context).single({ integrationId: "alias-a" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(authorizeProcedure).toHaveBeenCalledWith(
      expect.objectContaining({ integrationIds: ["alias-a"], input: { integrationId: "alias-a" } }),
    );
    expect(call).not.toHaveBeenCalled();
  });

  test("a source service cannot turn a scoped request into further delegation", async () => {
    const { context, router } = await setup();
    context.workerAccess = { role: "service", grantId: "service", authorizeProcedure() {} };
    await expect(createApiCaller(router, context).single({ integrationId: "alias-a" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(call).not.toHaveBeenCalled();
  });

  test("an explicitly approved MCP service can use a primary alias through its dedicated source grant", async () => {
    const { context, router } = await setup();
    context.workerAccess = {
      role: "service",
      grantId: "mcp-grant",
      service: {
        integrationIds: ["alias-a"],
        access: "query",
        procedurePaths: ["downloads.getJobsAndStatuses"],
        audience: "https://homarr.dev/remote/mcp",
        principalId: "account:test",
        purpose: "mcp",
      },
      authorizeProcedure() {},
    };
    call.mockResolvedValue([{ integrationId: "same", data: { id: "resource" } }]);
    const caller = createApiCaller(createApiRouter({ downloads: router.widget.downloads }), context);
    const result = await caller.downloads.getJobsAndStatuses({ integrationIds: ["alias-a"] });
    expect(result).toEqual([{ integrationId: "alias-a", data: { id: "resource" } }]);
    expect(call).toHaveBeenCalledWith(
      expect.anything(),
      "source-a",
      ["widget", "downloads", "getJobsAndStatuses"],
      { integrationIds: ["same"] },
      expect.anything(),
    );
  });

  test("another user's integration permission cannot authorize this principal", async () => {
    const { db, context, router } = await setup();
    await db
      .insert(integrationUserPermissions)
      .values({ userId: "stranger", integrationId: "alias-a", permission: "full" });
    if (context.session) context.session.user.permissions = [];
    await expect(createApiCaller(router, context).single({ integrationId: "alias-a" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(call).not.toHaveBeenCalled();
  });
});
