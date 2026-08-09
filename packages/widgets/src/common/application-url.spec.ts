import { describe, expect, test } from "vitest";

import { getSafeApplicationUrl, getSafeAppHref } from "./application-url";

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

describe("getSafeAppHref", () => {
  test.each(["#section", "/boards/home", "./relative", "vscode://file/example.ts", "https://example.com/path"])(
    "allows configured app link %s",
    (value) => expect(getSafeAppHref(value)).toBe(value),
  );

  test.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "//example.com/path",
    "not a URL",
    "https://user:password@example.com/path",
  ])("rejects unsafe app link %s", (value) => expect(getSafeAppHref(value)).toBeUndefined());
});
