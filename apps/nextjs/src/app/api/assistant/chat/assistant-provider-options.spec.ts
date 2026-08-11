import { describe, expect, test } from "vitest";

import { assistantHomarrProviderTokenHeader } from "@homarr/definitions";

import {
  getHomarrProviderBaseUrl,
  resolveHomarrProviderToken,
  toProviderOptionsKey,
} from "./assistant-provider-options";

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

  test("accepts a Workshop token only for the matching Homarr provider endpoint", () => {
    const headers = new Headers({ [assistantHomarrProviderTokenHeader]: "workshop-token" });
    expect(
      resolveHomarrProviderToken({
        provider: "homarr",
        configuredBaseUrl: "https://homarr.dev/api/ai/v1/",
        workshopApiUrl: "https://homarr.dev",
        headers,
      }),
    ).toBe("workshop-token");
    expect(getHomarrProviderBaseUrl("https://homarr.dev/")).toBe("https://homarr.dev/api/ai/v1");
  });

  test("never forwards a Workshop token to another endpoint", () => {
    expect(() =>
      resolveHomarrProviderToken({
        provider: "homarr",
        configuredBaseUrl: "https://attacker.example/v1",
        workshopApiUrl: "https://homarr.dev",
        headers: new Headers({ [assistantHomarrProviderTokenHeader]: "workshop-token" }),
      }),
    ).toThrow("does not match");
    expect(
      resolveHomarrProviderToken({
        provider: "openrouter",
        configuredBaseUrl: "https://openrouter.ai/api/v1",
        workshopApiUrl: "https://homarr.dev",
        headers: new Headers({ [assistantHomarrProviderTokenHeader]: "workshop-token" }),
      }),
    ).toBeUndefined();
  });
});
