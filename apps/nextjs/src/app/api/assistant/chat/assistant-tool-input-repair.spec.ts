import { describe, expect, test } from "vitest";

import { repairAssistantToolInput } from "./assistant-tool-input-repair";

describe("repairAssistantToolInput", () => {
  test("repairs literal newlines generated inside a multiline Custom JSX template", () => {
    const input = `{"definition":{"template":"<Stack>
  <Text>{data.fixtures?.length} fixtures</Text>
</Stack>"}}`;
    const repaired = repairAssistantToolInput({ toolName: "customWidget_previewCreate", input });

    expect(repaired).not.toBeNull();
    expect(JSON.parse(repaired?.input ?? "")).toEqual({
      definition: { template: "<Stack>\n  <Text>{data.fixtures?.length} fixtures</Text>\n</Stack>" },
    });
  });

  test("repairs every JSON-forbidden control character inside a Custom Widget string", () => {
    const repaired = repairAssistantToolInput({
      toolName: "customWidget_validate",
      input: '{"value":"before\u0000\b\fafter"}',
    });

    expect(JSON.parse(repaired?.input ?? "")).toEqual({ value: "before\u0000\b\fafter" });
  });

  test("unwraps a complete stringified preview definition without changing its contents", () => {
    const definition = {
      $schema: "homarr-custom-widget-v2",
      name: "Media research",
      templateLines: ["<Stack>", "  <Text>Ready</Text>", "</Stack>"],
    };
    const repaired = repairAssistantToolInput({
      toolName: "customWidget_previewCreate",
      input: JSON.stringify({ definition: JSON.stringify(definition) }),
    });

    expect(JSON.parse(repaired?.input ?? "")).toEqual({ definition });
  });

  test("keeps only templateLines when a provider duplicates the Assistant JSX format", () => {
    const repaired = repairAssistantToolInput({
      toolName: "customWidget_validateTemplate",
      input: JSON.stringify({
        template: "<Text>stale</Text>",
        templateLines: ["<Text>", "  Ready", "</Text>"],
      }),
    });

    expect(JSON.parse(repaired?.input ?? "")).toEqual({
      templateLines: ["<Text>", "  Ready", "</Text>"],
    });
  });

  test("does not alter unrelated tools or guess at truncated JSON", () => {
    expect(repairAssistantToolInput({ toolName: "app_create", input: '{"name":"Wiki\npedia"}' })).toBeNull();
    expect(
      repairAssistantToolInput({ toolName: "customWidget_create", input: '{"template":"<Text>broken' }),
    ).toBeNull();
  });

  test("recovers a truncated read-only icon search after the model omits the closing object delimiter", () => {
    expect(
      repairAssistantToolInput({
        toolName: "icon_findIcons",
        input: '{"searchText":"homarr","limitPerGroup":6',
      }),
    ).toEqual({
      toolName: "icon_findIcons",
      input: '{"searchText":"homarr","limitPerGroup":6}',
    });
  });

  test("does not guess icon search text when the streamed string itself is incomplete", () => {
    expect(repairAssistantToolInput({ toolName: "icon_findIcons", input: '{"searchText":"homar' })).toBeNull();
  });

  test.each([
    ["customWidget_previewQuery", { previewId: "preview-1", requestId: "search" }, { sessionId: "preview-1", requestId: "search" }],
    [
      "customWidget_previewAction",
      { previewSessionId: "preview-1", requestId: "requestMovie", params: { mediaId: 603 } },
      { sessionId: "preview-1", requestId: "requestMovie", params: { mediaId: 603 } },
    ],
    ["customWidget_previewJournal", { previewSession: { id: "preview-1" } }, { sessionId: "preview-1" }],
    [
      "customWidget_previewReviseTemplate",
      { previewSessionId: "preview-1", templateLines: ["<Text>Ready</Text>"] },
      { sessionId: "preview-1", templateLines: ["<Text>Ready</Text>"] },
    ],
    ["customWidget_createFromPreview", { previewSession: "preview-1" }, { previewSessionId: "preview-1" }],
  ])("repairs safe preview-session aliases for %s", (toolName, input, expected) => {
    const repaired = repairAssistantToolInput({ toolName, input: JSON.stringify(input) });

    expect(JSON.parse(repaired?.input ?? "")).toEqual(expected);
  });

  test.each([
    "customWidget_getSkill",
    "customWidget_schema",
    "customWidget_getAuthoringPrompt",
    "customWidget_getComponentCatalog",
    "customWidget_list",
  ])("normalizes malformed or provider-specific no-input arguments for %s", (toolName) => {
    expect(repairAssistantToolInput({ toolName, input: "null" })?.input).toBe("{}");
    expect(repairAssistantToolInput({ toolName, input: "[]" })?.input).toBe("{}");
    expect(repairAssistantToolInput({ toolName, input: '{"unexpected":true}' })?.input).toBe("{}");
    expect(repairAssistantToolInput({ toolName, input: '"' })?.input).toBe("{}");
    expect(repairAssistantToolInput({ toolName, input: "{}" })).toBeNull();
  });
});
