import { beforeEach, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { encryptSecret } from "@homarr/common/server";
import { integrations, integrationSecrets } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { integrationTestStoredConnectionProcedure } from "../../integration/integration-test-stored-connection";
import { createTRPCRouter } from "../../../trpc";

const { factory, upstreamTest } = vi.hoisted(() => ({ factory: vi.fn(), upstreamTest: vi.fn() }));
vi.mock("@homarr/integrations/factory", () => ({ createIntegrationAsync: factory }));

beforeEach(() => {
  factory.mockReset().mockResolvedValue({ testConnectionAsync: upstreamTest });
  upstreamTest.mockReset().mockResolvedValue({ success: true });
});

const setup = async (permissions: Session["user"]["permissions"] = ["integration-full-all"]) => {
  const db = createDb();
  await db.insert(integrations).values({ id: "saved", name: "Sonarr", kind: "sonarr", url: "http://sonarr:8989" });
  await db
    .insert(integrationSecrets)
    .values({ integrationId: "saved", kind: "apiKey", value: encryptSecret("private-key") });
  const session: Session = {
    user: { id: "owner", permissions, groups: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  };
  const router = createTRPCRouter({ testConnection: integrationTestStoredConnectionProcedure });
  return { db, router, caller: router.createCaller({ db, session, deviceType: undefined }) };
};

test("tests stored credentials without modifying saved configuration", async () => {
  const { db, caller } = await setup();
  const before = await db.query.integrations.findFirst({ with: { secrets: true } });
  expect(await caller.testConnection({ id: "saved" })).toEqual({ success: true });
  expect(factory).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "saved",
      decryptedSecrets: [expect.objectContaining({ kind: "apiKey", value: "private-key" })],
    }),
  );
  expect(await db.query.integrations.findFirst({ with: { secrets: true } })).toEqual(before);
});

test("denies use-only access and hides missing integrations before loading secrets", async () => {
  const { caller } = await setup(["integration-use-all"]);
  await expect(caller.testConnection({ id: "saved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(caller.testConnection({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(factory).not.toHaveBeenCalled();
});

test("requires authentication", async () => {
  const { db, router } = await setup();
  const caller = router.createCaller({ db, session: null, deviceType: undefined });
  await expect(caller.testConnection({ id: "saved" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(factory).not.toHaveBeenCalled();
});

test("returns only safe categories for upstream failures and thrown errors", async () => {
  const { caller } = await setup();
  upstreamTest.mockResolvedValueOnce({
    success: false,
    error: {
      type: "authorization",
      message: "private-key",
      data: { token: "private-key" },
      cause: new Error("private-key"),
    },
  });
  expect(await caller.testConnection({ id: "saved" })).toEqual({ success: false, error: "authorization" });
  factory.mockRejectedValueOnce(new Error("private-key"));
  expect(await caller.testConnection({ id: "saved" })).toEqual({ success: false, error: "unknown" });
  const { db } = await setup();
  await db.delete(integrationSecrets);
  const router = createTRPCRouter({ testConnection: integrationTestStoredConnectionProcedure });
  const noSecretsCaller = router.createCaller({
    db,
    session: {
      user: { id: "owner", permissions: ["integration-full-all"], groups: [], colorScheme: "light" },
      expires: new Date().toISOString(),
    },
    deviceType: undefined,
  });
  expect(await noSecretsCaller.testConnection({ id: "saved" })).toEqual({ success: false, error: "missingSecret" });
});
