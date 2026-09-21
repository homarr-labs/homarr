import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { createDb } from "@homarr/db/test";
import { users } from "@homarr/db/schema";
import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { configurePreviewSessionSource } from "../../custom-widget/preview-sessions";

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

  test("returns a stable normalized template digest from focused validation", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });

    const first = await caller.validateTemplate({ template: "<Text>Ready</Text>" });
    const equivalent = await caller.validateTemplate({ template: "<Text>Ready</Text>\u200B" });
    const different = await caller.validateTemplate({ template: "<Text>Waiting</Text>" });

    expect(first).toMatchObject({
      valid: true,
      templateDigest: expect.stringMatching(/^tpl-[a-f0-9]{16}$/u),
      validationId: expect.stringMatching(/^template:tpl-[a-f0-9]{16}$/u),
    });
    expect(equivalent.templateDigest).toBe(first.templateDigest);
    expect(different.templateDigest).not.toBe(first.templateDigest);
  });

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
    expect(preview.sourceConfigurations).toEqual([
      expect.objectContaining({ sourceId: "default", nextStep: expect.stringContaining("before testing") }),
    ]);
    const defaultSource = definition.sources.default;
    if (!defaultSource || defaultSource.type === "integration") throw new Error("Starter HTTP source is missing");
    await configurePreviewSessionSource(
      preview.previewSession.id,
      userId,
      "default",
      { ...defaultSource, baseUrl: "https://sports.test", auth: defaultSource.auth ?? "none" },
      [],
    );
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
    expect(String(request?.targetUrl)).toBe("https://sports.test/fixtures?season=2026");
    expect(request?.kind).toBe("query");
  });

  test("does not request source configuration for a user-supplied HTTP URL", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template, ...definition } = CUSTOM_WIDGET_STARTER;
    const defaultSource = definition.sources.default;
    if (!defaultSource || defaultSource.type === "integration") throw new Error("Starter HTTP source is missing");

    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        sources: {
          default: {
            ...defaultSource,
            baseUrl: "https://dispatcharr.internal.test",
          },
        },
        templateLines: template.split("\n"),
      },
      secrets: [],
    });

    expect(preview.sourceConfigurations).toEqual([]);
  });

  test("does not request configuration for the required but unused static-widget source", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template: _template, ...definition } = CUSTOM_WIDGET_STARTER;

    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        sources: {
          default: { baseUrl: "https://example.com", networkScope: "public", auth: "bearer" },
        },
        requests: {},
        templateLines: ["<Text>Static dashboard note</Text>"],
      },
      secrets: [],
    });

    expect(preview.sourceConfigurations).toEqual([]);
    expect(preview.queries).toEqual([]);
    expect(preview.actions).toEqual([]);
  });

  test("does not request unused source credentials when every request disables authentication", async () => {
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
        sources: {
          default: {
            baseUrl: "https://public-endpoint.test",
            networkScope: "public",
            auth: { type: "apiKeyHeader", name: "X-API-Key" },
          },
        },
        requests: { publicStatus: { path: "/status", auth: "none" } },
        templateLines: template.split("\n"),
      },
      secrets: [],
    });

    expect(preview.sourceConfigurations).toEqual([]);
    await expect(
      caller.previewQuery({ sessionId: preview.previewSession.id, requestId: "publicStatus", params: {} }),
    ).resolves.toMatchObject({ ok: true, sourceId: "default" });
  });

  test("requires secure configuration before simulating an authenticated action-only preview", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template: _template, ...definition } = CUSTOM_WIDGET_STARTER;
    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        sources: {
          default: {
            baseUrl: "https://dispatcharr.internal.test",
            networkScope: "private",
            auth: { type: "apiKeyHeader", name: "X-API-Key" },
          },
        },
        requests: {
          restart: {
            kind: "action",
            method: "POST",
            path: "/api/admin/restart",
            confirmation: "Restart Dispatcharr?",
            permission: "full",
          },
        },
        templateLines: ['<ActionButton requestId="restart" color="red">Restart Dispatcharr</ActionButton>'],
      },
      secrets: [],
    });

    expect(preview.queries).toEqual([]);
    expect(preview.actions).toEqual([expect.objectContaining({ requestId: "restart", method: "POST" })]);
    expect(preview.sourceConfigurations).toEqual([
      expect.objectContaining({ sourceId: "default", nextStep: expect.stringContaining("before testing") }),
    ]);
    await expect(
      caller.previewAction({ sessionId: preview.previewSession.id, requestId: "restart", params: {} }),
    ).resolves.toMatchObject({
      sessionId: preview.previewSession.id,
      requestId: "restart",
      sourceId: "default",
      ok: false,
      error: expect.stringContaining("credentials are missing"),
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("addresses each blocked preview request to its exact source", async () => {
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    const session = {
      user: { id: userId, permissions: ["admin"], colorScheme: "light" },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const caller = customWidgetRouter.createCaller({ db, deviceType: undefined, session });
    const { template: _template, ...definition } = CUSTOM_WIDGET_STARTER;
    const preview = await caller.previewCreate({
      definition: {
        ...definition,
        sources: {
          default: { baseUrl: "https://primary.test", networkScope: "public", auth: "bearer" },
          secondary: { baseUrl: "https://secondary.test", networkScope: "public", auth: "basic" },
        },
        requests: {
          status: { source: "default", path: "/status" },
          restart: {
            source: "secondary",
            kind: "action",
            method: "POST",
            path: "/restart",
            confirmation: "Restart?",
            permission: "full",
          },
        },
        templateLines: [
          '<Stack><Text>{data.status?.state}</Text><ActionButton requestId="restart">Restart</ActionButton></Stack>',
        ],
      },
      secrets: [],
    });

    expect(preview.sourceConfigurations).toEqual([
      expect.objectContaining({ sourceId: "default" }),
      expect.objectContaining({ sourceId: "secondary" }),
    ]);
    await expect(
      caller.previewQuery({ sessionId: preview.previewSession.id, requestId: "status", params: {} }),
    ).resolves.toMatchObject({
      sessionId: preview.previewSession.id,
      requestId: "status",
      sourceId: "default",
      ok: false,
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    await expect(
      caller.previewAction({ sessionId: preview.previewSession.id, requestId: "restart", params: {} }),
    ).resolves.toMatchObject({
      sessionId: preview.previewSession.id,
      requestId: "restart",
      sourceId: "secondary",
      ok: false,
      requiredNextTool: "customWidget_configurationRequestUser",
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
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
    const revisedTemplate = "<Stack><Text>{data.fixtures?.name}</Text><Badge>Ready</Badge></Stack>";

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
