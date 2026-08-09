import { describe, expect, test } from "vitest";

import { repairCustomWidgetToolInput } from "./assistant-tool-input-repair";

describe("repairCustomWidgetToolInput", () => {
  test("repairs literal newlines generated inside a multiline Custom JSX template", () => {
    const input = `{"definition":{"template":"<Stack>
  <Text>{data.fixtures?.length} fixtures</Text>
</Stack>"}}`;
    const repaired = repairCustomWidgetToolInput({ toolName: "customWidget_previewCreate", input });

    expect(repaired).not.toBeNull();
    expect(JSON.parse(repaired?.input ?? "")).toEqual({
      definition: { template: "<Stack>\n  <Text>{data.fixtures?.length} fixtures</Text>\n</Stack>" },
    });
  });

  test("repairs every JSON-forbidden control character inside a Custom Widget string", () => {
    const repaired = repairCustomWidgetToolInput({
      toolName: "customWidget_validate",
      input: '{"value":"before\u0000\b\fafter"}',
    });

    expect(JSON.parse(repaired?.input ?? "")).toEqual({ value: "before\u0000\b\fafter" });
  });

  test("does not alter unrelated tools or guess at truncated JSON", () => {
    expect(repairCustomWidgetToolInput({ toolName: "app_create", input: '{"name":"Wiki\npedia"}' })).toBeNull();
    expect(
      repairCustomWidgetToolInput({ toolName: "customWidget_create", input: '{"template":"<Text>broken' }),
    ).toBeNull();
  });

  test.each([
    "customWidget_getSkill",
    "customWidget_schema",
    "customWidget_getAuthoringPrompt",
    "customWidget_getComponentCatalog",
    "customWidget_list",
  ])("normalizes malformed or provider-specific no-input arguments for %s", (toolName) => {
    expect(repairCustomWidgetToolInput({ toolName, input: "null" })?.input).toBe("{}");
    expect(repairCustomWidgetToolInput({ toolName, input: "[]" })?.input).toBe("{}");
    expect(repairCustomWidgetToolInput({ toolName, input: '{"unexpected":true}' })?.input).toBe("{}");
    expect(repairCustomWidgetToolInput({ toolName, input: '"' })?.input).toBe("{}");
    expect(repairCustomWidgetToolInput({ toolName, input: "{}" })).toBeNull();
  });
});
