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

  test("does not alter unrelated tools or guess at truncated JSON", () => {
    expect(repairCustomWidgetToolInput({ toolName: "app_create", input: '{"name":"Wiki\npedia"}' })).toBeNull();
    expect(
      repairCustomWidgetToolInput({ toolName: "customWidget_create", input: '{"template":"<Text>broken' }),
    ).toBeNull();
  });
});
