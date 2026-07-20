import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildCustomWidgetAiPrompt,
  buildCustomWidgetMcpPrompt,
  CUSTOM_WIDGET_MANTINE_VERSION,
} from "../core/ai-prompt";
import { CUSTOM_WIDGET_STARTER } from "../core/examples";

describe("buildCustomWidgetAiPrompt", () => {
  test("is concise and describes the one-widget v2 contract", () => {
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      null,
      null,
      "Create a Portainer widget",
      "https://example.com/docs",
    );
    expect(prompt).toContain("homarr-custom-widget-v2");
    expect(prompt).toContain("Return exactly two fenced blocks");
    expect(prompt).toContain("Never include credentials");
    expect(prompt).toContain("Every declared parameter needs an explicit value source");
    expect(prompt).toContain('"optionsBinding"');
    expect(prompt).toContain("Never infer a binding from matching names");
    expect(prompt).toContain("Create a Portainer widget");
    expect(prompt.startsWith("Please create this Homarr Custom JSX v2 widget:\n\nCreate a Portainer widget")).toBe(
      true,
    );
    expect(prompt).not.toMatch(/\bMCP\b|homarr:\/\/|customWidget_|\btools?\b/iu);
    expect(prompt.length).toBeLessThanOrEqual(8_000);
  });

  test("keeps release metadata lightweight and synchronized", async () => {
    const mantinePackage = JSON.parse(
      await readFile(resolve(import.meta.dirname, "../../../../node_modules/@mantine/core/package.json"), "utf8"),
    ) as { version: string };
    const source = await readFile(resolve(import.meta.dirname, "../core/ai-prompt.ts"), "utf8");

    expect(CUSTOM_WIDGET_MANTINE_VERSION).toBe(mantinePackage.version);
    expect(source).not.toContain("skill-content.generated.json");
    expect(source).not.toContain("component-catalog.generated.json");
    expect(source).toContain('from "./component-catalog"');
    expect(source).not.toContain('from "./authoring-resources"');
  });

  test("includes an existing widget without exposing secret fields", () => {
    const secret = "TOP-SECRET-123";
    const source = CUSTOM_WIDGET_STARTER.sources[0];
    if (!source) throw new Error("Starter widget requires one source");
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      JSON.stringify({ token: secret }),
      {
        ...CUSTOM_WIDGET_STARTER,
        sources: [{ ...source, baseUrl: `https://user:${secret}@example.com?api_key=${secret}` }],
        secrets: [{ sourceId: "default", kind: "apiKey", value: secret }],
      },
      `Improve it with API key: ${secret}`,
      `https://example.com/docs?token=${secret}`,
    );
    expect(prompt).toContain('"$schema": "homarr-custom-widget-v2"');
    expect(prompt).not.toContain(secret);
    expect(prompt).not.toContain("user:");
    expect(prompt).not.toContain("api_key=");
  });

  test("redacts camel-case credentials and invalid structured editor drafts", () => {
    const prompt = buildCustomWidgetAiPrompt(undefined, null, {
      sources: '[{"baseUrl":"https://user:password@example.com?accessToken=VALUE"}]',
      requests: '[{"bodyTemplate":{"clientSecret":"VALUE"}}]',
      template: "<Text>accessToken: VALUE</Text>",
    });
    expect(prompt).not.toContain("password@");
    expect(prompt).not.toContain('clientSecret": "VALUE');
    expect(prompt).not.toContain("accessToken: VALUE");
  });

  test("redacts malformed URLs without recursing", () => {
    expect(buildCustomWidgetAiPrompt(undefined, null, null, "Inspect http://[", null)).toContain("[REDACTED_URL]");
  });

  test("preserves balanced fences and the output contract when optional content exceeds the prompt budget", () => {
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      JSON.stringify({ items: Array.from({ length: 2_000 }, (_, index) => ({ index, label: `item-${index}` })) }),
      { ...CUSTOM_WIDGET_STARTER, template: `<Stack>${"<Text>Large widget</Text>".repeat(1_000)}</Stack>` },
      "Improve this large widget",
    );

    expect(prompt.length).toBeLessThanOrEqual(8_000);
    expect(prompt).toContain("content omitted to fit the prompt budget");
    expect(prompt.match(/```/gu)?.length ?? 0).toBe(4);
    expect(prompt.endsWith("Homarr will validate the result after it is pasted into the workbench.")).toBe(true);
  });
});

describe("buildCustomWidgetMcpPrompt", () => {
  test("describes tool-driven iteration without embedding the copy/paste output contract", () => {
    const prompt = buildCustomWidgetMcpPrompt("Create two Portainer widgets", "https://example.com/docs");
    expect(prompt).toContain("customWidget_previewCreate");
    expect(prompt).toContain("homarr://custom-widgets/schema");
    expect(prompt).toContain("Create two Portainer widgets");
    expect(prompt).not.toContain("Return exactly two fenced blocks");
    expect(prompt.length).toBeLessThan(8_000);
  });
});
