import { describe, expect, test } from "vitest";

import {
  assertJsonBudget,
  assertSafeStaticHeaders,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "../../custom-widget/request-executor";

describe("custom widget request executor", () => {
  test("allows only credential-free HTTP(S) URLs without fragments", () => {
    expect(validateCustomWidgetUrl("https://example.com/api").href).toBe("https://example.com/api");
    expect(() => validateCustomWidgetUrl("file:///etc/passwd")).toThrow("Only HTTP and HTTPS");
    expect(() => validateCustomWidgetUrl("https://user:password@example.com/api")).toThrow("credentials");
    expect(() => validateCustomWidgetUrl("https://example.com/api#secret")).toThrow("fragments");
  });

  test("rejects cross-origin named request targets", () => {
    expect(resolveSameOriginTarget("https://example.com/base", "https://example.com/status").pathname).toBe("/status");
    expect(() => resolveSameOriginTarget("https://example.com/base", "https://attacker.example/status")).toThrow(
      "origin",
    );
  });

  test.each(["Authorization", "Cookie", "Host", "Proxy-Authorization", "Sec-Fetch-Site", "X-Forwarded-For"])(
    "rejects the reserved %s header",
    (header) => {
      expect(() => assertSafeStaticHeaders({ [header]: "value" })).toThrow("reserved");
    },
  );

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
