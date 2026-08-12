import { describe, expect, test } from "vitest";

import {
  getAssistantProviderQuotaLevel,
  getAssistantProviderQuotaRefreshDelay,
  isAssistantProviderUnavailable,
} from "./assistant-provider-quota";

describe("getAssistantProviderQuotaLevel", () => {
  test.each([
    [{ limit: 50, remaining: 50 }, "ok"],
    [{ limit: 50, remaining: 26 }, "ok"],
    [{ limit: 50, remaining: 25 }, "warning"],
    [{ limit: 50, remaining: 10 }, "bad"],
    [{ limit: 50, remaining: 0 }, "dead"],
    [{ limit: 0, remaining: 0 }, "dead"],
  ] as const)("maps %o to %s", (usage, expected) => {
    expect(getAssistantProviderQuotaLevel(usage)).toBe(expected);
  });
});

describe("isAssistantProviderUnavailable", () => {
  test("blocks only unavailable Homarr provider sessions", () => {
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: false, remaining: undefined })).toBe(true);
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: true, remaining: 0 })).toBe(true);
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: true, remaining: undefined })).toBe(false);
    expect(isAssistantProviderUnavailable({ provider: "openrouter", signedIn: false, remaining: 0 })).toBe(false);
  });
});

describe("getAssistantProviderQuotaRefreshDelay", () => {
  test("refreshes just after the UTC reset, or immediately when it has passed", () => {
    const reset = "2026-08-12T00:00:00.000Z";
    expect(getAssistantProviderQuotaRefreshDelay(reset, Date.parse("2026-08-11T23:59:00.000Z"))).toBe(61_000);
    expect(getAssistantProviderQuotaRefreshDelay(reset, Date.parse("2026-08-12T00:00:01.000Z"))).toBe(1_000);
  });
});
