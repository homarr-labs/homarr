import { describe, expect, test } from "vitest";

import { getAssistantStreamErrorMessage } from "./assistant-stream-error";

describe("assistant stream errors", () => {
  test("explains a provider-interrupted input stream without blaming tool input", () => {
    expect(getAssistantStreamErrorMessage(new Error("Error in input stream"))).toBe(
      "The model provider interrupted the streamed response before the assistant could finish. Try again.",
    );
  });

  test("explains malformed tool input without implying the action ran", () => {
    expect(getAssistantStreamErrorMessage(new Error("AI_InvalidToolInputError"))).toBe(
      "The model produced invalid tool input, so Homarr did not run the action. Try again.",
    );
    expect(getAssistantStreamErrorMessage(new Error("Invalid input for tool customWidget_previewCreate"))).toBe(
      "The model produced incomplete Custom Widget input, so Homarr did not run the action. Try again; multiline JSX will be sent as templateLines.",
    );
  });

  test("explains invalid provider model identifiers", () => {
    expect(
      getAssistantStreamErrorMessage({
        statusCode: 400,
        responseBody: JSON.stringify({
          error: {
            message: "DeepSeek: DeepSeek V4 Pro (deepseek/deepseek-v4-pro) is not a valid model ID",
          },
        }),
      }),
    ).toBe("The provider rejected the selected model. Ask an administrator to select a valid model ID.");
  });

  test.each([
    [401, "The provider rejected the configured credentials. Ask an administrator to update the API key."],
    [402, "The provider account has insufficient credits for this request."],
    [404, "The selected model or chat endpoint was not found. Ask an administrator to verify the model and API URL."],
    [429, "The model endpoint is rate limited. Wait a moment and try again."],
    [503, "The model provider is temporarily unavailable. Try again later."],
  ])("maps provider status %s to an actionable message", (statusCode, expected) => {
    expect(getAssistantStreamErrorMessage({ statusCode })).toBe(expected);
  });

  test("recognizes nested timeout errors", () => {
    expect(getAssistantStreamErrorMessage(new Error("request failed", { cause: new Error("timed out") }))).toBe(
      "The model endpoint took too long to respond. Try again.",
    );
  });

  test.each([
    [401, "The provider rejected the configured credentials. Ask an administrator to update the API key."],
    [429, "The model endpoint is rate limited. Wait a moment and try again."],
    [503, "The model provider is temporarily unavailable. Try again later."],
  ])("prefers actionable status %s over a generic input-stream phrase", (statusCode, expected) => {
    expect(getAssistantStreamErrorMessage({ statusCode, responseBody: "Error in input stream" })).toBe(expected);
  });

  test("returns the provider error instead of replacing it with a generic message", () => {
    expect(getAssistantStreamErrorMessage(new Error("Provider connection failed: certificate expired"))).toBe(
      "Provider connection failed: certificate expired",
    );
  });

  test("returns nested provider error details", () => {
    expect(
      getAssistantStreamErrorMessage({
        error: {
          message: "No endpoints found for the selected model",
        },
      }),
    ).toBe("No endpoints found for the selected model");
  });
});
