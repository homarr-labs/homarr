import { describe, expect, test } from "vitest";

import { buildAiPrompt } from "./_copy-ai-prompt-button";

const schema = {
  type: "object",
  required: ["name", "url", "displayType", "displayConfig"],
};

describe("buildAiPrompt", () => {
  test("asks Homarr Assistant to create a definition and includes the user's request", () => {
    const prompt = buildAiPrompt(
      schema,
      '{"status":"online"}',
      {
        $schema: "homarr-custom-widget-v2",
        name: "Status",
        url: "https://example.com/status",
      },
      "Show a compact green status when the service is online.",
    );

    expect(prompt).toContain("`customWidget_create`");
    expect(prompt).toContain("`secrets: []`");
    expect(prompt).toContain("do not ask for typed confirmation");
    expect(prompt).toContain('```json\n{"status":"online"}\n```');
    expect(prompt).toContain('"name": "Status"');
    expect(prompt).toContain("Show a compact green status when the service is online.");
  });

  test("asks Homarr Assistant to update the selected definition without replacing its secrets", () => {
    const prompt = buildAiPrompt(
      schema,
      null,
      {
        name: "Existing widget",
        authType: "bearer",
      },
      "Use a progress bar.",
      "widget-definition-id",
    );

    expect(prompt).toContain("custom widget definition `widget-definition-id`");
    expect(prompt).toContain("`customWidget_update`");
    expect(prompt).toContain("Preserve configured secrets by omitting the `secrets` field");
    expect(prompt).not.toContain('"secrets"');
  });

  test("keeps copy-to-clipboard prompts useful before a request is entered", () => {
    const prompt = buildAiPrompt(schema);

    expect(prompt).toContain("PASTE_YOUR_API_RESPONSE_HERE");
    expect(prompt).toContain("Describe what you want the widget to show or change here.");
  });
});
