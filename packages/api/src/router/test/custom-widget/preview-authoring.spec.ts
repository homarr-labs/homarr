import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { createDb } from "@homarr/db/test";
import { users } from "@homarr/db/schema";
import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeRequest: vi.fn(async (_input: unknown) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    data: { fixtures: [{ id: "match-1", home_team: { name: "PSG" }, away_team: { name: "Lyon" } }] },
  })),
}));

vi.mock("../../custom-widget/request-executor", () => ({
  executeCustomWidgetRequest: mocks.executeRequest,
  invalidateCustomWidgetResponseCache: vi.fn(),
}));

vi.mock("../../custom-widget/request-limits", () => ({
  acquireCustomWidgetRequestLimit: vi.fn(async () => async () => undefined),
}));

import { customWidgetRouter } from "../../custom-widget/custom-widget-router";

describe("custom widget agent preview workflow", () => {
  beforeEach(() => mocks.executeRequest.mockClear());

  test("runs a named preview query and returns the real response shape to the agent", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template, ...definition } = CUSTOM_WIDGET_STARTER;
    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        requests: { fixtures: { path: "/fixtures", query: { season: 2026 } } },
        templateLines: template.split("\n"),
      },
      secrets: [],
    });

    expect(preview.queries).toEqual([
      expect.objectContaining({ requestId: "fixtures", trigger: "load", parameterNames: [] }),
    ]);
    await expect(
      caller.previewQuery({ sessionId: preview.previewSession.id, requestId: "fixtures", params: {} }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
        data: { fixtures: [expect.objectContaining({ id: "match-1" })] },
      }),
    );
    const request = mocks.executeRequest.mock.calls[0]?.[0] as { targetUrl: string | URL; kind: string } | undefined;
    expect(String(request?.targetUrl)).toBe("https://example.com/fixtures?season=2026");
    expect(request?.kind).toBe("query");
  });

  test("reports joined preview templateLines validation issues as BAD_REQUEST", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template: _template, ...definition } = CUSTOM_WIDGET_STARTER;

    const error = await caller
      .previewCreate({
        definition: {
          ...definition,
          templateLines: ["<Stack>", '  <img src="https://example.com/logo.png" />', "</Stack>"],
        },
        secrets: [],
      })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      code: "BAD_REQUEST",
      cause: { issues: [expect.objectContaining({ path: ["template"] })] },
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("revises a preview template without resending or changing its manifest", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template, ...definition } = CUSTOM_WIDGET_STARTER;
    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        requests: { fixtures: { path: "/fixtures" } },
        templateLines: template.split("\n"),
      },
      secrets: [],
    });
    const revisedTemplate = '<Stack><Text>{data.fixtures?.name}</Text><Badge>Ready</Badge></Stack>';

    const revised = await caller.previewReviseTemplate({
      sessionId: preview.previewSession.id,
      expectedRevision: 0,
      templateLines: revisedTemplate.split("\n"),
    });

    expect(revised).toMatchObject({
      success: true,
      evidenceReset: true,
      previewSession: { id: preview.previewSession.id, revision: 1 },
      queries: [expect.objectContaining({ requestId: "fixtures" })],
    });
    expect(revised).not.toHaveProperty("definition");
    expect(revised).not.toHaveProperty("template");
    await expect(caller.previewGet({ sessionId: preview.previewSession.id })).resolves.toMatchObject({
      revision: 1,
      template: revisedTemplate,
      requests: [expect.objectContaining({ id: "fixtures" })],
    });
    await expect(
      caller.previewReviseTemplate({
        sessionId: preview.previewSession.id,
        expectedRevision: 1,
        templateLines: ['<ActionButton requestId="missing">Run</ActionButton>'],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
