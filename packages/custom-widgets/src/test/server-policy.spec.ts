import { createServer } from "node:http";
import { describe, expect, test } from "vitest";

import {
  assertJsonBudget,
  assertSafeStaticHeaders,
  classifyAddress,
  executeCustomWidgetRequest,
  resolveAndValidateHost,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "../server";

describe("custom widget network policy", () => {
  test.each([
    ["8.8.8.8", "public"],
    ["10.0.0.1", "private"],
    ["127.0.0.1", "loopback"],
    ["169.254.169.254", "blocked"],
    ["224.0.0.1", "blocked"],
    ["::ffff:127.0.0.1", "blocked"],
    ["fe80::1", "blocked"],
  ] as const)("classifies %s as %s", (address, expected) => expect(classifyAddress(address)).toBe(expected));

  test("enforces configured address scopes", async () => {
    await expect(resolveAndValidateHost("10.0.0.1", "public")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(resolveAndValidateHost("10.0.0.1", "private")).resolves.toHaveLength(1);
    await expect(resolveAndValidateHost("127.0.0.1", "private")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(resolveAndValidateHost("127.0.0.1", "loopback")).resolves.toHaveLength(1);
    await expect(resolveAndValidateHost("169.254.169.254", "loopback")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("executes a DNS-pinned request within the approved scope", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":"ok"}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
    try {
      await expect(
        executeCustomWidgetRequest({
          baseUrl: `http://127.0.0.1:${address.port}`,
          method: "GET",
          networkScope: "loopback",
          kind: "query",
        }),
      ).resolves.toMatchObject({ ok: true, status: 200, data: { status: "ok" } });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  test("allows only credential-free HTTP(S) URLs without fragments", () => {
    expect(validateCustomWidgetUrl("https://example.com/api").href).toBe("https://example.com/api");
    expect(() => validateCustomWidgetUrl("file:///etc/passwd")).toThrow("HTTP and HTTPS");
    expect(() => validateCustomWidgetUrl("https://user:password@example.com/api")).toThrow("credentials");
    expect(() => validateCustomWidgetUrl("https://example.com/api#secret")).toThrow("fragments");
  });

  test("rejects cross-origin targets and reserved headers", () => {
    expect(resolveSameOriginTarget("https://example.com/base", "https://example.com/status").pathname).toBe("/status");
    expect(() => resolveSameOriginTarget("https://example.com", "https://attacker.example")).toThrow("origin");
    for (const header of [
      "Authorization",
      "Cookie",
      "Host",
      "Proxy-Authorization",
      "Sec-Fetch-Site",
      "X-Forwarded-For",
    ]) {
      expect(() => assertSafeStaticHeaders({ [header]: "value" })).toThrow("reserved");
    }
  });

  test("rejects response JSON beyond the depth budget", () => {
    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let index = 0; index < 40; index += 1) {
      nested.child = {};
      nested = nested.child as Record<string, unknown>;
    }
    expect(() => assertJsonBudget(root)).toThrow("deeply nested");
  });
});
