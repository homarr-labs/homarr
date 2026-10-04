import { describe, expect, test } from "vitest";

import { assistantAiSdkRuntimeOptions } from "./assistant-runtime-options";

describe("assistantAiSdkRuntimeOptions", () => {
  test("preserves pending server tools across automatic agent continuations", () => {
    expect(assistantAiSdkRuntimeOptions.cancelPendingToolCallsOnSend).toBe(false);
  });
});
