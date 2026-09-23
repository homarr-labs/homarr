import { describe, expect, test } from "vitest";

import {
  assertJsonBudget,
  assertSafeStaticHeaders,
  resolveAndValidateHost,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "../../custom-widget/request-executor";

describe("custom widget request executor", () => {
  test("accepts self-hosted destinations regardless of legacy network scope", async () => {
    for (const scope of ["public", "private", "loopback", "any"] as const) {
      for (const address of ["10.0.0.1", "127.0.0.1", "100.64.0.1", "169.254.169.254", "::ffff:127.0.0.1", "fe80::1"]) {
        await expect(resolveAndValidateHost(address, scope)).resolves.toHaveLength(1);
      }
    }
  });

  test("accepts custom proxy, browser and forwarding headers", () => {
    expect(() =>
      assertSafeStaticHeaders({
        "Proxy-Custom": "value",
        "Sec-Fetch-Site": "same-origin",
        "X-Forwarded-For": "127.0.0.1",
      }),
    ).not.toThrow();
  });

  test("accepts credential-free HTTP(S) URLs and discards fragments", () => {
    expect(validateCustomWidgetUrl("https://example.com/api").href).toBe("https://example.com/api");
    expect(() => validateCustomWidgetUrl("file:///etc/passwd")).toThrow("Only HTTP and HTTPS");
    expect(() => validateCustomWidgetUrl("https://user:password@example.com/api")).toThrow("credentials");
    expect(validateCustomWidgetUrl("https://example.com/api#section").href).toBe("https://example.com/api");
  });

  test("rejects cross-origin named request targets", () => {
    expect(resolveSameOriginTarget("https://example.com/base", "https://example.com/status").pathname).toBe("/status");
    expect(() => resolveSameOriginTarget("https://example.com/base", "https://attacker.example/status")).toThrow(
      "origin",
    );
  });

  test.each(["Authorization", "Cookie", "Host", "Proxy-Authorization"])("rejects the reserved %s header", (header) => {
    expect(() => assertSafeStaticHeaders({ [header]: "value" })).toThrow("reserved");
  });

  test("rejects response JSON that exceeds the depth budget", () => {
    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let index = 0; index < 40; index += 1) {
      nested.child = {};
      nested = nested.child as Record<string, unknown>;
    }
    expect(() => assertJsonBudget(root)).toThrow("deeply nested");
  });
});
