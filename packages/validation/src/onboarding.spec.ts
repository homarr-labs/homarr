import { describe, expect, test } from "vitest";

import { onboardingCreateIntegrationSchema, onboardingDiscoveredAppSchema } from "./onboarding";

describe("onboarding URL validation", () => {
  test.each(["javascript:alert(1)", "data:text/html,hello", "file:///etc/passwd"])(
    "rejects the %s scheme for integrations",
    (url) => {
      expect(onboardingCreateIntegrationSchema.safeParse({ name: "Unsafe", url }).success).toBe(false);
    },
  );

  test("accepts HTTP services and icon identifiers", () => {
    expect(
      onboardingDiscoveredAppSchema.safeParse({
        name: "Sonarr",
        sourceId: "docker:sonarr",
        href: "http://sonarr:8989",
        pingUrl: "https://sonarr.example.com/ping",
        iconUrl: "sonarr",
        description: "TV automation",
      }).success,
    ).toBe(true);
  });

  test("accepts bounded integration metadata and rejects invalid metadata", () => {
    expect(
      onboardingCreateIntegrationSchema.safeParse({
        name: "Sonarr",
        url: "http://sonarr:8989",
        pingUrl: "https://sonarr.example.com/ping",
        iconUrl: "https://icons.example/sonarr.svg",
        description: "TV automation",
      }).success,
    ).toBe(true);
    expect(
      onboardingCreateIntegrationSchema.safeParse({
        name: "Sonarr",
        url: "http://sonarr:8989",
        pingUrl: "file:///etc/passwd",
        description: "x".repeat(513),
      }).success,
    ).toBe(false);
  });

  test("rejects non-web app and ping URLs", () => {
    expect(
      onboardingDiscoveredAppSchema.safeParse({
        name: "Unsafe",
        href: "javascript:alert(1)",
        pingUrl: "file:///etc/passwd",
        iconUrl: null,
      }).success,
    ).toBe(false);
  });
});
