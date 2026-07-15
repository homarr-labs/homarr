import { describe, expect, test } from "vitest";

import {
  appendPreviewJournal,
  createPreviewSession,
  getPreviewJournal,
  getPreviewSession,
  getPreviewSessionSecrets,
  setPreviewSessionLiveActions,
} from "../../custom-widget/preview-sessions";

const queryRequest = {
  id: "status",
  kind: "query",
  method: "GET",
  pathTemplate: "/status/{id}",
  parameters: { id: "string" },
  auth: "inherit",
  minimumBoardPermission: "view",
} as const;

describe("custom widget preview sessions", () => {
  test("stores encrypted credentials in a short-lived user-bound manifest", async () => {
    const created = await createPreviewSession({
      userId: "admin-1",
      baseUrl: "https://example.com/api",
      authType: "bearer",
      secrets: [{ kind: "apiKey", value: "plain-secret" }],
      networkScope: "public",
      requests: [queryRequest],
    });

    const session = await getPreviewSession(created.id, "admin-1");

    expect(session.secrets[0]?.value).not.toContain("plain-secret");
    expect(getPreviewSessionSecrets(session)).toEqual([{ kind: "apiKey", value: "plain-secret" }]);
    await expect(getPreviewSession(created.id, "admin-2")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("keeps actions simulated until explicitly enabled", async () => {
    const created = await createPreviewSession({
      userId: "admin-1",
      baseUrl: "https://example.com/api",
      authType: "none",
      secrets: [],
      networkScope: "public",
      requests: [queryRequest],
    });

    expect((await getPreviewSession(created.id, "admin-1")).liveActions).toBe(false);
    await setPreviewSessionLiveActions(created.id, "admin-1", true);
    const session = await getPreviewSession(created.id, "admin-1");
    expect(session.liveActions).toBe(true);
    await appendPreviewJournal(session, {
      requestId: "status",
      kind: "query",
      method: "GET",
      pathTemplate: "/status/{id}",
      status: 200,
      durationMs: 12,
      simulated: false,
    });
    expect(await getPreviewJournal(created.id, "admin-1")).toEqual([
      expect.objectContaining({ requestId: "status", pathTemplate: "/status/{id}", durationMs: 12 }),
    ]);
  });
});
