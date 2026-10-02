import { Response } from "undici";
import { describe, expect, it } from "vitest";

import { readBoundedTraefikJsonAsync } from "./traefik-bounds";

describe("readBoundedTraefikJsonAsync", () => {
  it("rejects a response that exceeds its byte budget", async () => {
    const response = new Response(JSON.stringify({ value: "x".repeat(100) }));

    await expect(readBoundedTraefikJsonAsync(response, 32)).rejects.toThrow("exceeds 32 bytes");
  });
});
