import { describe, expect, test } from "vitest";

import { toProviderOptionsKey } from "./assistant-provider-options";

describe("toProviderOptionsKey", () => {
  test("converts the hyphenated provider name to the camelCase AI SDK provider option key", () => {
    expect(toProviderOptionsKey("homarr-openrouter")).toBe("homarrOpenrouter");
  });

  test("matches the @ai-sdk/openai-compatible camelCase conversion", () => {
    expect(toProviderOptionsKey("homarr-anthropic")).toBe("homarrAnthropic");
    expect(toProviderOptionsKey("homarr-google-gemini")).toBe("homarrGoogleGemini");
  });

  test("leaves names without separators unchanged", () => {
    expect(toProviderOptionsKey("homarr")).toBe("homarr");
  });
});
