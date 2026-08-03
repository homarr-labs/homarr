import { describe, expect, test } from "vitest";

import { integrationCreateSchema, integrationUpdateSchema } from "./integration";

describe("integration schemas", () => {
  test("create defaults omitted options to an empty object", () => {
    const result = integrationCreateSchema.parse({
      name: "SABnzbd",
      url: "https://sabnzbd.example.com",
      kind: "sabNzbd",
      secrets: [],
      attemptSearchEngineCreation: false,
    });

    expect(result.options).toEqual({});
  });

  test("update preserves omitted options as undefined", () => {
    const result = integrationUpdateSchema.parse({
      id: "tz4a98xxat96iws9zmbrgj3a",
      name: "SABnzbd",
      url: "https://sabnzbd.example.com",
      secrets: [],
      appId: null,
    });

    expect(result.options).toBeUndefined();
  });
});
