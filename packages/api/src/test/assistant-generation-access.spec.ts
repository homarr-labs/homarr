import { describe, expect, test, vi } from "vitest";

vi.mock("@homarr/common/env", () => ({
  env: { SECRET_ENCRYPTION_KEY: "a".repeat(64) },
}));

import {
  createAssistantGenerationAccessToken,
  verifyAssistantGenerationAccessToken,
} from "../assistant-generation-access";

describe("assistant generation access token", () => {
  const input = {
    userId: "user-1",
    threadId: "thread-1",
    generationId: "gen-example",
  };

  test("binds a generation to its user and conversation", () => {
    const accessToken = createAssistantGenerationAccessToken(input);

    expect(accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyAssistantGenerationAccessToken(input, accessToken)).toBe(true);
    expect(verifyAssistantGenerationAccessToken({ ...input, userId: "user-2" }, accessToken)).toBe(false);
    expect(verifyAssistantGenerationAccessToken({ ...input, threadId: "thread-2" }, accessToken)).toBe(false);
    expect(verifyAssistantGenerationAccessToken({ ...input, generationId: "gen-other" }, accessToken)).toBe(false);
  });
});
