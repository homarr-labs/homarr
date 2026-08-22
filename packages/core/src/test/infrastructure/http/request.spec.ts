import { describe, expect, test } from "vitest";

import { mergeHeadersWithUserAgent } from "@homarr/core/infrastructure/http";

describe("mergeHeadersWithUserAgent", () => {
  test("should keep existing headers when given a Headers instance", () => {
    // Arrange
    const headers = new Headers({ "x-api-key": "some-api-key", Accept: "application/json" });

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("x-api-key")).toBe("some-api-key");
    expect(merged.get("accept")).toBe("application/json");
    expect(merged.get("user-agent")).toContain("Homarr/");
  });

  test("should keep existing headers when given a record", () => {
    // Arrange
    const headers = { "x-api-key": "some-api-key", Accept: "application/json" };

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("x-api-key")).toBe("some-api-key");
    expect(merged.get("accept")).toBe("application/json");
    expect(merged.get("user-agent")).toContain("Homarr/");
  });

  test("should not override an existing user-agent in any casing", () => {
    // Arrange
    const headers = new Headers({ "USER-AGENT": "custom-agent" });

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("user-agent")).toBe("custom-agent");
  });

  test("should fall back to the default user agent when no headers are provided", () => {
    // Act
    const merged = mergeHeadersWithUserAgent(undefined);

    // Assert
    expect(merged.get("user-agent")).toContain("Homarr/");
  });
});
