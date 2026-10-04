import { describe, expect, it } from "vitest";

import { MAX_CONFIGURATION_REQUEST_BODY_BYTES, readConfigurationRequestBody } from "./body";

describe("custom widget configuration request body", () => {
  it("rejects a streaming payload once it exceeds the byte budget", async () => {
    const request = new Request("http://localhost/configure", {
      method: "POST",
      body: JSON.stringify({
        baseUrl: "https://example.com",
        networkScope: "public",
        secrets: { apiKey: "x".repeat(MAX_CONFIGURATION_REQUEST_BODY_BYTES) },
      }),
    });

    await expect(readConfigurationRequestBody(request)).resolves.toEqual({ status: "too-large" });
  });

  it("strictly parses a bounded configuration object", async () => {
    const body = { baseUrl: "https://example.com", networkScope: "public", secrets: { apiKey: "secret" } };
    await expect(
      readConfigurationRequestBody(
        new Request("http://localhost/configure", { method: "POST", body: JSON.stringify(body) }),
      ),
    ).resolves.toEqual({ status: "ok", data: body });

    await expect(
      readConfigurationRequestBody(
        new Request("http://localhost/configure", {
          method: "POST",
          body: JSON.stringify({ ...body, unexpected: true }),
        }),
      ),
    ).resolves.toEqual({ status: "invalid" });
  });
});
