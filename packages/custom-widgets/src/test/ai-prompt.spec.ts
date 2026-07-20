import { describe, expect, test } from "vitest";

import { buildCustomWidgetAiPrompt, buildCustomWidgetFixPrompt, buildCustomWidgetMcpPrompt } from "../core/ai-prompt";
import { CUSTOM_WIDGET_SKILL_MD } from "../core/authoring-resources";
import { CUSTOM_WIDGET_STARTER } from "../core/examples";

describe("buildCustomWidgetAiPrompt", () => {
  test("can embed the portable skill for standalone chat models", () => {
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      undefined,
      undefined,
      "Create a status widget",
      undefined,
      CUSTOM_WIDGET_SKILL_MD,
    );

    expect(prompt).toContain("Use this embedded Homarr Custom Widget skill while authoring:");
    expect(prompt).toContain("# Homarr Custom Widget");
    expect(prompt).toContain("installed Mantine components can differ by Homarr release.");
    expect(prompt.endsWith(CUSTOM_WIDGET_SKILL_MD)).toBe(true);
  });

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
    expect(prompt.length).toBeLessThanOrEqual(8_000);
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
});

describe("buildCustomWidgetFixPrompt", () => {
  test("includes the complete current widget and redacted iteration evidence", () => {
    const secret = "literal-sensitive-value";
    const prompt = buildCustomWidgetFixPrompt({
      currentConfig: {
        name: "Large widget",
        template: `<Text>${"x".repeat(9_000)}</Text>`,
        secrets: [{ value: secret }],
      },
      request: `Fix it with password='${secret}'`,
      diagnostics: `Header apiKey='${secret}' is invalid`,
      journal: [{ requestId: "load", authorization: secret }],
    });
    expect(prompt).toContain("x".repeat(9_000));
    expect(prompt).toContain("Validation diagnostics");
    expect(prompt).not.toContain(secret);
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
