import { describe, expect, it } from "vitest";

import { customWidgetDefinitionSchema } from "../core";
import { CustomWidgetPreviewSessionService } from "../server";
import type { PreviewSessionStore } from "../server";

const definition = customWidgetDefinitionSchema.parse({
  $schema: "homarr-custom-widget-v2",
  name: "Preview",
  sources: { default: { baseUrl: "https://example.com", networkScope: "public", auth: "bearer" } },
  requests: { data: { path: "/data" } },
  options: { limit: { label: "Limit", control: "number", default: 10 } },
  template: "<Text>{data.data?.name}</Text>",
});

describe("preview sessions", () => {
  it("stores keyed definitions and encrypted secrets", async () => {
    let id = 0;
    const service = new CustomWidgetPreviewSessionService({
      createId: () => `id-${++id}`,
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
      now: () => 1_000,
    });
    const created = await service.create({
      userId: "user",
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [{ sourceId: "default", kind: "apiKey", value: "secret" }],
    });
    const session = await service.get(created.id, "user");
    expect(session.requests.data?.path).toBe("/data");
    expect(session.secrets[0]?.value).not.toBe("secret");
    expect(service.getSecrets(session, "default")).toEqual([{ kind: "apiKey", value: "secret" }]);
  });

  it("keeps journal paths redacted and bounded to the session", async () => {
    let id = 0;
    const service = new CustomWidgetPreviewSessionService({
      createId: () => `id-${++id}`,
      encrypt: String,
      decrypt: String,
    });
    const created = await service.create({
      userId: "user",
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [],
    });
    const session = await service.get(created.id, "user");
    await service.appendJournal(session, {
      requestId: "data",
      kind: "query",
      method: "GET",
      path: "/data",
      status: 200,
      durationMs: 5,
      simulated: false,
      sessionRevision: session.revision,
    });
    expect((await service.getJournal(created.id, "user"))[0]).toMatchObject({
      path: "/data",
      status: 200,
      sessionRevision: session.revision,
    });
  });

  it("applies source deployment values without restoring stale source metadata", async () => {
    let id = 0;
    const service = new CustomWidgetPreviewSessionService({
      createId: () => `id-${++id}`,
      encrypt: String,
      decrypt: String,
    });
    const created = await service.create({
      userId: "user",
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [],
    });

    await service.configureSource(
      created.id,
      "user",
      "default",
      { baseUrl: "http://service.local", networkScope: "private", auth: "bearer" },
      [{ sourceId: "default", kind: "apiKey", value: "secret" }],
    );

    const configured = await service.get(created.id, "user");
    expect(configured.sources.default).toEqual({
      baseUrl: "http://service.local",
      networkScope: "private",
      auth: "bearer",
    });
    await expect(
      service.configureSource(
        created.id,
        "user",
        "default",
        { baseUrl: "http://service.local", networkScope: "private", auth: "none" },
        [],
      ),
    ).rejects.toThrow("authentication changed");
  });

  it("does not delete a preview when a different user looks it up", async () => {
    const values = new Map<string, unknown>();
    const store: PreviewSessionStore = {
      saveSession: async (id, value) => {
        values.set(id, value);
      },
      compareAndSwapSession: async (id, revision, value) => {
        const current = values.get(id) as { revision?: number } | undefined;
        if (current?.revision !== revision) return false;
        values.set(id, value);
        return true;
      },
      getSession: async (id) => values.get(id),
      deleteSession: async (id) => {
        values.delete(id);
      },
      appendJournal: async () => undefined,
      getJournal: async () => [],
    };
    const service = new CustomWidgetPreviewSessionService({
      createId: () => "session",
      encrypt: String,
      decrypt: String,
      store,
    });
    await service.create({
      userId: "owner",
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [],
    });

    await expect(service.get("session", "other-user")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.get("session", "owner")).resolves.toMatchObject({ id: "session" });
  });

  it("retries concurrent mutations without losing source, secret, or action state", async () => {
    const service = new CustomWidgetPreviewSessionService({
      createId: () => "session",
      encrypt: (value) => `encrypted:${value}`,
      decrypt: (value) => value.replace("encrypted:", ""),
    });
    await service.create({
      userId: "owner",
      sources: {
        ...definition.sources,
        secondary: { baseUrl: "https://secondary.example.com", networkScope: "public", auth: "basic" },
      },
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [],
    });

    await Promise.all([
      service.setLiveActions("session", "owner", true),
      service.setSecrets("session", "owner", [{ sourceId: "secondary", kind: "username", value: "operator" }]),
      service.configureSource(
        "session",
        "owner",
        "default",
        { baseUrl: "https://api.example.com", networkScope: "public", auth: "bearer" },
        [{ sourceId: "default", kind: "apiKey", value: "token" }],
      ),
    ]);

    const session = await service.get("session", "owner");
    expect(session.liveActions).toBe(true);
    expect(session.sources.default?.baseUrl).toBe("https://api.example.com");
    expect(service.getSecrets(session, "default")).toEqual([{ kind: "apiKey", value: "token" }]);
    expect(service.getSecrets(session, "secondary")).toEqual([{ kind: "username", value: "operator" }]);
  });

  it("revises only the template with optimistic concurrency and resets evidence by revision", async () => {
    const service = new CustomWidgetPreviewSessionService({
      createId: () => "session",
      encrypt: String,
      decrypt: String,
    });
    await service.create({
      userId: "owner",
      sources: definition.sources,
      requests: definition.requests,
      name: definition.name,
      template: definition.template,
      optionDefinitions: definition.options,
      options: { limit: 10 },
      secrets: [],
    });
    const original = await service.get("session", "owner");
    await service.appendJournal(original, {
      requestId: "data",
      kind: "query",
      method: "GET",
      path: "/data",
      status: 200,
      durationMs: 1,
      simulated: false,
      sessionRevision: original.revision,
    });

    const revised = await service.reviseTemplate(
      "session",
      "owner",
      '<Stack><Text>{data.data?.name}</Text><Badge>Ready</Badge></Stack>',
      0,
    );
    const session = await service.get("session", "owner");

    expect(revised).toMatchObject({ id: "session", revision: 1, evidenceReset: true });
    expect(session.template).toContain("<Badge>Ready</Badge>");
    expect(session.sources).toEqual(original.sources);
    expect(session.requests).toEqual(original.requests);
    expect(session.optionDefinitions).toEqual(original.optionDefinitions);
    expect(await service.getJournal("session", "owner")).toEqual([
      expect.objectContaining({ sessionRevision: 0 }),
    ]);
    await expect(service.reviseTemplate("session", "owner", session.template, 1)).rejects.toThrow("unchanged");
    await expect(
      service.reviseTemplate("session", "owner", "<Text>Stale edit</Text>", 0),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      service.reviseTemplate("session", "owner", '<ActionButton requestId="missing">Run</ActionButton>', 1),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
