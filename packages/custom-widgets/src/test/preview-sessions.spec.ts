import { describe, expect, it } from "vitest";

import { CustomWidgetPreviewSessionService } from "../server";
import type { CreatePreviewSessionInput } from "../server";

function createHarness() {
  let now = 1_000;
  let id = 0;
  const service = new CustomWidgetPreviewSessionService({
    createId: () => `id-${++id}`,
    encrypt: (value) => `encrypted:${value}`,
    decrypt: (value) => value.replace("encrypted:", ""),
    now: () => now,
  });
  return {
    service,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

const input: CreatePreviewSessionInput = {
  userId: "user-1",
  baseUrl: "https://example.com/api",
  authType: "bearer",
  secrets: [{ kind: "apiKey", value: "secret" }],
  networkScope: "public",
  requests: [],
};

describe("preview session service", () => {
  it("stores secrets encrypted and returns them only through the decrypting boundary", async () => {
    const { service } = createHarness();
    const created = await service.create(input);
    const session = await service.get(created.id, input.userId);
    expect(session.secrets[0]?.value).toBe("encrypted:secret");
    expect(service.getSecrets(session)).toEqual([{ kind: "apiKey", value: "secret" }]);
  });

  it("isolates sessions by user and expires them after five minutes", async () => {
    const { service, advance } = createHarness();
    const created = await service.create(input);
    await expect(service.get(created.id, "other-user")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const second = await service.create(input);
    advance(5 * 60_000 + 1);
    await expect(service.get(second.id, input.userId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates live-action approval and caps the newest-first journal", async () => {
    const { service } = createHarness();
    const created = await service.create(input);
    const approved = await service.setLiveActions(created.id, input.userId, true);
    expect(approved.liveActions).toBe(true);
    const session = await service.get(created.id, input.userId);
    for (let index = 0; index < 52; index += 1) {
      await service.appendJournal(session, {
        requestId: `request-${index}`,
        kind: "query",
        method: "GET",
        pathTemplate: "/data",
        status: 200,
        durationMs: 1,
        simulated: false,
      });
    }
    const journal = await service.getJournal(created.id, input.userId);
    expect(journal).toHaveLength(50);
    expect(journal[0]?.requestId).toBe("request-51");
    expect(journal.at(-1)?.requestId).toBe("request-2");
  });
});
