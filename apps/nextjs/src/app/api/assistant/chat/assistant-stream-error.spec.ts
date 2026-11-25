import { NoSuchToolError, RetryError } from "ai";
import { describe, expect, test } from "vitest";

import { getAssistantStreamErrorMessage } from "./assistant-stream-error";

describe("assistant stream errors", () => {
  test.each([404, 502])("preserves Workshop upstream details through HTTP %s", (statusCode) => {
    const detail = "Upstream model service returned HTTP 404. No endpoints found matching your data policy";
    const error = Object.assign(new Error("Provider request failed"), {
      statusCode,
      responseBody: JSON.stringify({ error: { type: "homarr_provider_upstream_error", message: detail } }),
    });
    expect(getAssistantStreamErrorMessage(error)).toBe(detail);
    expect(getAssistantStreamErrorMessage(new Error("Retry failed", { cause: error }))).toBe(detail);
    expect(getAssistantStreamErrorMessage(error, true)).toBe(detail);
  });

  test("explains exhausted Homarr credits through a retry error", () => {
    const error = Object.assign(new Error("Payment Required"), { statusCode: 402 });
    const retryError = new RetryError({
      message: "Retry failed",
      reason: "errorNotRetryable",
      errors: [error],
    });
    expect(getAssistantStreamErrorMessage(retryError, true)).toBe(
      "The Homarr Assistant has run out of shared credits. Please try again later.",
    );
  });

  test.each([
    { statusCode: 502 },
    {
      statusCode: 502,
      error: {
        type: "homarr_provider_upstream_error",
        message: "Upstream model service returned HTTP 502. Bad Gateway",
      },
    },
  ])("suggests trying again after a generic Homarr 502", (error) => {
    expect(getAssistantStreamErrorMessage(error, true)).toBe(
      "The Homarr Assistant couldn’t respond. During periods of high usage, the service may run out of shared credits. Please try again later.",
    );
  });

  test("keeps the model guidance for a marker-less Homarr 502 with an invalid model", () => {
    expect(getAssistantStreamErrorMessage({ statusCode: 502, message: "The selected model is invalid" }, true)).toBe(
      "The provider rejected the selected model. Ask an administrator to select a valid model ID.",
    );
  });

  test("does not forward arbitrary upstream metadata or unmarked response bodies", () => {
    expect(getAssistantStreamErrorMessage({ statusCode: 404, responseBody: "<html>private data</html>" })).toBe(
      "The selected model or chat endpoint was not found. Ask an administrator to verify the model and API URL.",
    );
  });

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

  test("explains an unavailable authoring tool without blaming the configured model", () => {
    expect(
      getAssistantStreamErrorMessage(
        new NoSuchToolError({
          toolName: "customWidget_previewCreate",
          availableTools: ["customWidget_validateTemplate"],
        }),
      ),
    ).toBe("The requested tool is unavailable at this step. Homarr did not run the action. Try again.");
    expect(
      getAssistantStreamErrorMessage(
        new Error(
          "AI_NoSuchToolError: Model tried to call unavailable tool 'customWidget_previewCreate'; model unavailable",
        ),
      ),
    ).toBe("The requested tool is unavailable at this step. Homarr did not run the action. Try again.");
  });

  test("prefers malformed tool input over model wording in its validation details", () => {
    expect(
      getAssistantStreamErrorMessage(
        new Error("Invalid input for tool customWidget_validateTemplate: selected model is unavailable"),
      ),
    ).toBe(
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
