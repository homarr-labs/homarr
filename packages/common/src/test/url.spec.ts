import { describe, expect, test } from "vitest";

import { buildUrl, getPortFromUrl, isAbsoluteUrl, isPath, parseExternalUrl, resolveServerUrl } from "../url";

describe("getPortFromUrl", () => {
  test.each([
    [80, "http"],
    [443, "https"],
  ])("should return %s for %s protocol without port", (expectedPort, protocol) => {
    // Arrange
    const url = new URL(`${protocol}://example.com`);

    // Act
    const port = getPortFromUrl(url);

    // Assert
    expect(port).toBe(expectedPort);
  });
  test.each([["http"], ["https"], ["anything"]])("should return the specified port for %s protocol", (protocol) => {
    // Arrange
    const expectedPort = 3000;
    const url = new URL(`${protocol}://example.com:${expectedPort}`);

    // Act
    const port = getPortFromUrl(url);

    // Assert
    expect(port).toBe(expectedPort);
  });
  test("should throw an error for unsupported protocol", () => {
    // Arrange
    const url = new URL("ftp://example.com");

    // Act
    const act = () => getPortFromUrl(url);

    // Act & Assert
    expect(act).toThrowError("Unsupported protocol: ftp:");
  });
});

describe("isAbsoluteUrl", () => {
  test.each([
    ["http://example.com", true],
    ["https://example.com", true],
    ["ftp://example.com", true],
    ["file:///path/to/file", true],
    ["mailto:johndoe@example.com", true],
    ["/relative/path", false],
    ["relative/path", false],
  ])("should return %s for URL: %s", (urlString, expected) => {
    // Act
    const result = isAbsoluteUrl(urlString);

    // Assert
    expect(result).toBe(expected);
  });
});

describe("resolveServerUrl", () => {
  test("returns explicit pingUrl when set", () => {
    expect(resolveServerUrl({ pingUrl: "http://x.local/ping", href: "/anything/" })).toBe("http://x.local/ping");
  });

  test("returns absolute href as-is when no pingUrl", () => {
    expect(resolveServerUrl({ pingUrl: null, href: "https://abs.example.com/x" })).toBe("https://abs.example.com/x");
  });

  test("returns null for path-only href (no server-side expansion)", () => {
    expect(resolveServerUrl({ pingUrl: null, href: "/cockpit/" })).toBeNull();
  });

  test("returns null for schemeless relative href", () => {
    expect(resolveServerUrl({ pingUrl: null, href: "relative/path" })).toBeNull();
  });

  test("returns null when both pingUrl and href are null", () => {
    expect(resolveServerUrl({ pingUrl: null, href: null })).toBeNull();
  });

  test("path-only href with explicit pingUrl returns the pingUrl", () => {
    // The HaLOS-shipped-card scenario: adapter sets explicit pingUrl while
    // href stays path-only for browser-side multi-hostname resolution.
    expect(resolveServerUrl({ pingUrl: "https://host.docker.internal/cockpit/", href: "/cockpit/" })).toBe(
      "https://host.docker.internal/cockpit/",
    );
  });
});

describe("buildUrl should construct url from base, path and query params", () => {
  test("should handle trailing slashes", () => {
    // Arrange
    const baseUrl = new URL("http://example.com/base/");
    const path = "/path/";

    // Act
    const url = buildUrl(baseUrl, path);

    // Assert
    expect(url.toString()).toBe("http://example.com/base/path/");
  });
  test("should preserve query params from base url", () => {
    // Arrange
    const baseUrl = new URL("http://example.com/base?x=1");
    const path = "/path";
    const queryParams = { a: "1" };

    // Act
    const url = buildUrl(baseUrl, path, queryParams);

    // Assert
    expect(url.toString()).toBe("http://example.com/base/path?x=1&a=1");
  });
  test("should preserve query params from path", () => {
    // Arrange
    const baseUrl = new URL("http://example.com/base");
    const path = "/path?y=2";
    const queryParams = { a: "1" };

    // Act
    const url = buildUrl(baseUrl, path, queryParams);

    // Assert
    expect(url.toString()).toBe("http://example.com/base/path?y=2&a=1");
  });
  test("should preserve query params from both base url and path", () => {
    // Arrange
    const baseUrl = new URL("http://example.com/base?x=1");
    const path = "/path?y=2";
    const queryParams = { a: "1" };

    // Act
    const url = buildUrl(baseUrl, path, queryParams);

    // Assert
    expect(url.toString()).toBe("http://example.com/base/path?y=2&x=1&a=1");
  });
  test("should preserve query params and ignore hash from base url", () => {
    // Arrange
    const baseUrl = new URL("http://example.com/base?x=1#123");
    const path = "/path";
    const queryParams = { a: "1" };

    // Act
    const url = buildUrl(baseUrl, path, queryParams);

    // Assert
    expect(url.toString()).toBe("http://example.com/base/path?x=1&a=1");
  });
  test.each([
    ["string", "value", "?string=value"],
    ["number", 42, "?number=42"],
    ["boolean", true, "?boolean=true"],
    ["null", null, ""],
    ["undefined", undefined, ""],
    ["date", new Date("2024-01-01T00:00:00Z"), "?date=2024-01-01T00%3A00%3A00.000Z"],
  ])("should handle query param of type %s", (key, value, expectedSearch) => {
    // Arrange
    const baseUrl = new URL("http://example.com");
    const path = "/path";
    const queryParams = { [key]: value };

    // Act
    const url = buildUrl(baseUrl, path, queryParams);

    // Assert
    expect(url.search).toBe(expectedSearch);
  });
});

describe("isPath should validate if input is a path string", () => {
  test.each([[null], [undefined], [123], [new URL("http://example.com")], [new Date()]])(
    "should return false for non-string input %s",
    (input) => {
      // Act
      const result = isPath(input);

      // Assert
      expect(result).toBe(false);
    },
  );
  test.each([["/path"], ["/x/y/z"]])("should return true for valid path %s", (path) => {
    // Act
    const result = isPath(path);

    // Assert
    expect(result).toBe(true);
  });
  test.each([[""], ["path"], ["//double-slash"]])("should return false for invalid path %s", (input) => {
    // Act
    const result = isPath(input);

    // Assert
    expect(result).toBe(false);
  });
});

describe("parseExternalUrl should parse href into URL or path", () => {
  test.each([[null], [undefined]])("should return null for %s href", (href) => {
    // Act
    const result = parseExternalUrl(href);

    // Assert
    expect(result).toBeNull();
  });
  test.each([["https://example.com/path"], ["http://example.com:8080/x#123"]])(
    "should return URL object for absolute href %s",
    (href) => {
      // Act
      const result = parseExternalUrl(href);

      // Assert
      expect(result).toBeInstanceOf(URL);
      expect(result?.toString()).toBe(href);
    },
  );
  test.each([["/path"], ["/x/y/z"]])("should return path string for path-only href %s", (path) => {
    // Act
    const result = parseExternalUrl(path);

    // Assert
    expect(typeof result).toBe("string");
    expect(result).toBe(path);
  });
});
