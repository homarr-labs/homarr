import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { encryptSecret } from "@homarr/common/server";
import { integrations, integrationSecrets, integrationUserPermissions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { IntegrationPermission } from "@homarr/definitions";

import { callMcpTool, extractMcpToolsFromProcedures } from "../mcp-tools";
import { integrationTestProcedure } from "../router/integration/integration-test";
import { createTRPCRouter } from "../trpc";

vi.mock("@homarr/auth", () => ({}));
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  test: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@homarr/integrations/factory", () => ({ createIntegrationAsync: mocks.create }));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ info: mocks.log, debug: mocks.log, warn: mocks.log, error: mocks.log }),
}));

const secret = "stored-credential-never-returned";
const router = createTRPCRouter({ integration: createTRPCRouter({ test: integrationTestProcedure }) });

async function fixture(permission?: IntegrationPermission) {
  const db = createDb();
  await db.insert(users).values([{ id: "reader" }, { id: "other" }]);
  await db.insert(integrations).values({
    id: "saved",
    name: "Saved",
    kind: "sonarr",
    url: `http://localhost:8989/?token=${secret}`,
  });
  await db.insert(integrationSecrets).values({ integrationId: "saved", kind: "apiKey", value: encryptSecret(secret) });
  await db.insert(integrationUserPermissions).values({ integrationId: "saved", userId: "other", permission: "full" });
  if (permission) {
    await db.insert(integrationUserPermissions).values({ integrationId: "saved", userId: "reader", permission });
  }
  const session = {
    user: { id: "reader", permissions: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  } satisfies Session;
  const ctx = { db, session, deviceType: undefined };
  return { db, ctx, caller: router.createCaller(ctx) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ testConnectionAsync: mocks.test });
  mocks.test.mockResolvedValue({ success: true });
});

describe("saved integration connection test", () => {
  test("reuses stored credentials and native testing without modifying the integration", async () => {
    const { db, caller } = await fixture("full");
    const before = await db.query.integrations.findFirst({ with: { secrets: true } });
    await expect(caller.integration.test({ id: "saved" })).resolves.toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "saved",
        kind: "sonarr",
        decryptedSecrets: [expect.objectContaining({ kind: "apiKey", value: secret })],
      }),
    );
    expect(mocks.test).toHaveBeenCalledOnce();
    expect(await db.query.integrations.findFirst({ with: { secrets: true } })).toEqual(before);
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain(secret);
  });

  test.each([undefined, "use", "interact"] as const)(
    "denies %s access before decrypting or connecting",
    async (permission) => {
      const { caller } = await fixture(permission);
      await expect(caller.integration.test({ id: "saved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  test("requires authentication and conceals missing IDs", async () => {
    const { ctx, caller } = await fixture("full");
    await expect(
      router.createCaller({ ...ctx, session: null }).integration.test({ id: "saved" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.integration.test({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Integration not found",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test("returns safe failures without upstream causes, metadata, credentials or caller-supplied secrets", async () => {
    const { caller } = await fixture("full");
    mocks.test.mockResolvedValue({
      success: false,
      error: { type: "authorization", message: secret, cause: new Error(secret), data: { credential: secret } },
    });
    await expect(caller.integration.test({ id: "saved" })).resolves.toEqual({
      success: false,
      error: { type: "authorization" },
    });
    mocks.test.mockRejectedValue(new Error(secret));
    await expect(caller.integration.test({ id: "saved" })).resolves.toEqual({
      success: false,
      error: { type: "unknown" },
    });
    await expect(caller.integration.test({ id: "saved", secrets: [secret] } as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain(secret);
  });

  test("exposes the same saved-ID contract through MCP", async () => {
    const { ctx } = await fixture("full");
    const tool = extractMcpToolsFromProcedures(router).tools.find(({ name }) => name === "integration_test");
    expect(tool).toBeDefined();
    if (!tool) throw new Error("Missing integration_test tool");
    await expect(callMcpTool(router.createCaller(ctx), tool, { id: "saved" })).resolves.toEqual({ success: true });
  });
});
