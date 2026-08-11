import { describe, expect, test } from "vitest";

import { getAssistantProviderQuotaLevel, isAssistantProviderUnavailable } from "./assistant-provider-quota";

describe("getAssistantProviderQuotaLevel", () => {
  test.each([
    [{ limit: 50, remaining: 50 }, "ok"],
    [{ limit: 50, remaining: 26 }, "ok"],
    [{ limit: 50, remaining: 25 }, "warning"],
    [{ limit: 50, remaining: 10 }, "bad"],
    [{ limit: 50, remaining: 0 }, "dead"],
  ] as const)("maps %o to %s", (usage, expected) => {
    expect(getAssistantProviderQuotaLevel(usage)).toBe(expected);
  });

  test("blocks only unavailable Homarr provider sessions", () => {
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: false, remaining: undefined })).toBe(true);
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: true, remaining: 0 })).toBe(true);
    expect(isAssistantProviderUnavailable({ provider: "homarr", signedIn: true, remaining: undefined })).toBe(false);
    expect(isAssistantProviderUnavailable({ provider: "openrouter", signedIn: false, remaining: 0 })).toBe(false);
  });
});
