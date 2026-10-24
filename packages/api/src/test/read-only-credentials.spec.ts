import { expect, onTestFinished, test } from "vitest";

import { getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { hashPasswordAsync } from "@homarr/auth/security";
import { apiKeys, groupMembers, groupPermissions, groups, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { callMcpTool, extractMcpToolsFromProcedures } from "../mcp-tools";
import { customWidgetRouter } from "../router/custom-widget/custom-widget-router";
import { integrationRouter } from "../router/integration/integration-router";
import { customApiRouter } from "../router/widgets/custom-api";
import { rssFeedRouter } from "../router/widgets/rssFeed";
import { releasesRouter } from "../router/widgets/releases";
import { timetableRouter } from "../router/widgets/timetable";
import {
  createTRPCRouter,
  demoWritableProtectedProcedure,
  internalProcedure,
  permissionRequiredProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

test.each([
  ["public", publicProcedure],
  ["protected", protectedProcedure],
  ["admin", permissionRequiredProcedure.requiresPermission("admin")],
  ["internal", internalProcedure],
  ["demo-writable", demoWritableProtectedProcedure],
] as const)("read-only keys can read but cannot write through %s procedures", async (_, procedure) => {
  const db = createDb();
  onTestFinished(() => {
    db.$client.close();
  });
  await db.insert(users).values({ id: "owner", name: "Owner" });
  await db.insert(groups).values({ id: "admins", name: "admins", position: 0 });
  await db.insert(groupMembers).values({ groupId: "admins", userId: "owner" });
  await db.insert(groupPermissions).values({ groupId: "admins", permission: "admin" });
  await db.insert(apiKeys).values({
    id: "read-key",
    userId: "owner",
    apiKey: await hashPasswordAsync("secret"),
    readOnly: true,
  });
  const session = await getSessionFromApiKeyAsync(db, "read-key.secret", null, "credential-test");
  if (!session) throw new Error("Expected an authenticated API key");
  let value = "unchanged";
  const router = createTRPCRouter({
    read: procedure.query(() => value),
    write: procedure.mutation(() => {
      value = "changed";
    }),
  });
  const caller = router.createCaller({ db, session, deviceType: undefined });

  await expect(caller.read()).resolves.toBe("unchanged");
  await expect(caller.write()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.read()).resolves.toBe("unchanged");

  for (const apiKey of [undefined, { readOnly: false, oauthClientId: null }]) {
    const writable = router.createCaller({ db, session: { ...session, apiKey }, deviceType: undefined });
    await expect(writable.write()).resolves.toBeUndefined();
    await expect(writable.read()).resolves.toBe("changed");
  }
});

test("read-only keys cannot execute arbitrary upstream requests, including Custom Widget queries", async () => {
  const db = createDb();
  onTestFinished(() => {
    db.$client.close();
  });
  const router = createTRPCRouter({
    customWidget: customWidgetRouter,
    customApi: customApiRouter,
    rssFeed: rssFeedRouter,
    releases: releasesRouter,
    timetable: timetableRouter,
    integration: integrationRouter,
  });
  const caller = router.createCaller({
    db,
    deviceType: undefined,
    session: {
      user: { id: "owner", permissions: ["admin"], colorScheme: "dark" },
      expires: "2099-01-01T00:00:00Z",
      apiKey: { readOnly: true, oauthClientId: null },
    },
  });

  for (const call of [
    () => caller.customApi.getData({ itemId: "missing" }),
    () => caller.customApi.queryRequest({ itemId: "missing", requestId: "post-query", params: {} }),
    () => caller.customWidget.optionRequest({ boardId: "missing", definitionId: "missing", requestId: "post-query" }),
    () => caller.customWidget.previewQuery({ sessionId: "missing", requestId: "post-query" }),
    () => caller.integration.testConnection({ id: "missing" }),
    () => caller.integration.request({ integrationId: "missing", method: "GET", path: "/" }),
    () => caller.rssFeed.getFeeds({ urls: [], maximumAmountPosts: 1 }),
    () => caller.releases.getLatest({ repositories: [] }),
    () => caller.timetable.searchStations({ baseUrl: "not-a-url", query: "" }),
  ]) {
    await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
  }

  const catalog = extractMcpToolsFromProcedures(router);
  for (const name of ["customWidget_previewQuery", "integration_request"]) {
    const tool = catalog.tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Expected tool ${name}`);
    expect(tool.annotations?.readOnlyHint).toBe(false);
    await expect(callMcpTool(caller, tool, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
  }
});
