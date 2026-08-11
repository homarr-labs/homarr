import { describe, expect, test } from "vitest";

import { getAssistantProviderQuotaLevel } from "./assistant-provider-quota";

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
});
