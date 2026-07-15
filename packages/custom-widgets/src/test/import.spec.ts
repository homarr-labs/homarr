import { describe, expect, it } from "vitest";

import { parseCustomWidgetClipboard } from "../core/import";
import { customWidgetImportSchema } from "../core/schema";

const widget = {
  $schema: "homarr-custom-widget-v3",
  name: "Example",
  url: "https://example.com/api",
  authType: "none",
  method: "GET",
  displayType: "customJsx",
  displayConfig: {
    type: "customJsx",
    jsxApiVersion: 2,
    networkScope: "public",
    requests: [],
    template: "__HOMARR_TEMPLATE__",
  },
};

describe("parseCustomWidgetClipboard", () => {
  it("keeps supporting raw JSON imports", () => {
    const result = parseCustomWidgetClipboard(JSON.stringify({ ...widget, displayType: "raw" }));
    expect(result?.name).toBe("Example");
  });

  it("keeps accepting the v2 import envelope", () => {
    expect(
      customWidgetImportSchema.parse({
        ...widget,
        $schema: "homarr-custom-widget-v2",
        displayType: "raw",
        displayConfig: { type: "raw", jsonPath: "$", maxHeight: 300 },
      }).$schema,
    ).toBe("homarr-custom-widget-v2");
  });

  it("combines a JSON metadata block with a readable JSX block", () => {
    const result = parseCustomWidgetClipboard(`Here is the widget:

\`\`\`json
${JSON.stringify(widget, null, 2)}
\`\`\`

\`\`\`jsx
<Stack gap="sm">
  <Text>{data.name}</Text>
</Stack>
\`\`\``);

    expect((result?.displayConfig as Record<string, unknown> | undefined)?.template).toBe(
      '<Stack gap="sm">\n  <Text>{data.name}</Text>\n</Stack>',
    );
  });

  it("accepts case-insensitive fenced languages and CRLF line endings", () => {
    const result = parseCustomWidgetClipboard(
      `\`\`\`JSON\r\n${JSON.stringify(widget)}\r\n\`\`\`\r\n\`\`\`TSX\r\n<Text>{data.name}</Text>\r\n\`\`\``,
    );

    expect((result?.displayConfig as Record<string, unknown> | undefined)?.template).toBe("<Text>{data.name}</Text>");
  });

  it("rejects an unterminated fence with a large whitespace payload", () => {
    expect(parseCustomWidgetClipboard(`\`\`\`json\n${" ".repeat(250_000)}`)).toBeNull();
  });
});
