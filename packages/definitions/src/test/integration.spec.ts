import { beforeEach, describe, expect, it, vi } from "vitest";

import { objectEntries } from "@homarr/common";

import { integrationDefs } from "../integration";

describe("Icon url's of integrations should be valid and return 200", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
  });

  objectEntries(integrationDefs).forEach(([integration, { iconUrl }]) => {
    it(`should return 200 for ${integration}`, { concurrent: true, retry: 2, timeout: 15_000 }, async () => {
      const res = await fetch(iconUrl);
      expect(res.status).toBe(200);
    });
  });
});
