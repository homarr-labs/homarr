import { describe, expect, test } from "vitest";

import { buildCustomWidgetAiPrompt } from "../core/ai-prompt";

describe("buildCustomWidgetAiPrompt", () => {
  test("describes the complete v2 named-request and render-child workflow", () => {
    const prompt = buildCustomWidgetAiPrompt({ type: "object" }, '{"serviceId":"alpha"}');

    expect(prompt).toContain('"$schema": "homarr-custom-widget-v3"');
    expect(prompt).toContain("jsxApiVersion: 2");
    expect(prompt).toContain("SubFetch can reference query requests only");
    expect(prompt).toContain("Prefer the SubFetch function-as-children API");
    expect(prompt).toContain('<SubFetch requestId="service-detail"');
    expect(prompt).toContain("ActionButton and ToggleSwitch can reference action requests only");
    expect(prompt).toContain("## Generated component reference");
    expect(prompt).toContain("## Tested examples");
    expect(prompt).toContain('{"serviceId":"alpha"}');
  });

  test("keeps an existing multiline template readable and outside JSON escaping", () => {
    const template = '<Stack gap="sm">\n  <Text>{data.name}</Text>\n</Stack>';
    const prompt = buildCustomWidgetAiPrompt({ type: "object" }, null, {
      name: "Existing",
      displayConfig: { type: "customJsx", jsxApiVersion: 2, template, requests: [] },
    });

    expect(prompt).toContain('"template": "__HOMARR_TEMPLATE__"');
    expect(prompt).toContain(`\`\`\`jsx\n${template}\n\`\`\``);
    expect(prompt).not.toContain(template.replaceAll("\n", "\\n"));
    expect(prompt).toContain("PASTE_API_RESPONSE_HERE");
  });
});
