import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { integrations } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { widgetRouter } from "../../widgets";

// mock auth so we don't require a session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

describe("uptimeKumaRouter", () => {
  test("checks query returns data for mock integration", async () => {
    const db = createDb();
    const integration = {
      id: createId(),
      name: "mock-uptime",
      kind: "mock",
      url: "",
      externalUrl: null,
      decryptedSecrets: [],
    } as const;
    await db.insert(integrations).values(integration as any);

    const caller = widgetRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    const results = await caller.uptimeKuma.checks({ integrationIds: [integration.id] });
    expect(results).toHaveLength(1);
    expect(results[0].integration.id).toBe(integration.id);
    expect(Array.isArray(results[0].checks)).toBe(true);
    expect(results[0].checks.length).toBeGreaterThanOrEqual(0);
  });
});
