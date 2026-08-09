import { describe, expect, test } from "vitest";

import { getAssistantStreamErrorMessage } from "./assistant-stream-error";

describe("assistant stream errors", () => {
  test("explains malformed streamed tool input without implying the action ran", () => {
    expect(getAssistantStreamErrorMessage(new Error("Error in input stream"))).toBe(
      "The model produced incomplete tool input, so Homarr did not run the action. Try again; multiline custom-widget JSX will be sent as templateLines.",
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
});
