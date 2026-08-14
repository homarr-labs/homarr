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
