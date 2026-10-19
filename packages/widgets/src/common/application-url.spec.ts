import { describe, expect, test } from "vitest";

import { getSafeApplicationUrl } from "./application-url";

describe("getSafeApplicationUrl", () => {
  test.each(["javascript:alert(1)", "data:text/html,test", "not a URL", "/relative", "./relative"])(
    "rejects unsafe or non-absolute URL %s",
    (value) => expect(getSafeApplicationUrl(value)).toBeUndefined(),
  );

  test("rejects credential-bearing URLs", () => {
    expect(getSafeApplicationUrl("https://user:password@example.com/path")).toBeUndefined();
    expect(getSafeApplicationUrl("/path", { baseUrl: "https://user:password@example.com" })).toBeUndefined();
  });

  test("allows absolute HTTP and HTTPS URLs", () => {
    expect(getSafeApplicationUrl("http://example.com/path")).toBe("http://example.com/path");
    expect(getSafeApplicationUrl("https://example.com/path?q=1#result")).toBe("https://example.com/path?q=1#result");
  });

  test("resolves feed-relative URLs only against a safe HTTP(S) base", () => {
    expect(getSafeApplicationUrl("/story", { baseUrl: "https://example.com/feed.xml?token=secret" })).toBe(
      "https://example.com/story",
    );
  });

  test.each([undefined, null, ""])("rejects missing URL %s", (value) => {
    expect(getSafeApplicationUrl(value)).toBeUndefined();
  });
});
