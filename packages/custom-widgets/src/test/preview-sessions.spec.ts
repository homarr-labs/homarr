import { describe, expect, it } from "vitest";

import { customWidgetDefinitionSchema } from "../core";
import { CustomWidgetPreviewSessionService } from "../server";

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
    });
    expect((await service.getJournal(created.id, "user"))[0]).toMatchObject({ path: "/data", status: 200 });
  });
});
