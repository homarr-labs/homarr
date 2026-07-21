import { describe, expect, it } from "vitest";

import { buildCustomWidgetAiPrompt, CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION } from "../core/ai-prompt";

describe("AI prompt", () => {
  it("is self-contained, request-first, and compact", () => {
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      null,
      null,
      "Create a beautiful Pokédex",
      "https://pokeapi.co/docs/v2",
    );
    expect(prompt.length).toBeLessThanOrEqual(12_000);
    expect(prompt.indexOf("Create a beautiful Pokédex")).toBeLessThan(prompt.indexOf("Manifest contract"));
    expect(prompt).toContain('"requests": {');
    expect(prompt).toContain("{option:name}");
    expect(prompt).toContain("Example — Service dashboard");
    expect(prompt).toContain("Example — Search and action");
    expect(prompt).toContain("visual hierarchy");
    expect(prompt).toContain('template set exactly to "__HOMARR_TEMPLATE__"');
    expect(prompt).toContain('trigger="manual"');
    expect(prompt).toContain("never write `=> {` anywhere");
    expect(prompt).toContain('"choicesFrom"');
    expect(prompt).toContain("must not shadow the reserved roots");
    expect(prompt.endsWith(CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION)).toBe(true);
  });

  it("does not claim offline MCP tools or embed the component catalog", () => {
    const prompt = buildCustomWidgetAiPrompt(undefined, null, null, "Build a widget");
    expect(prompt).not.toContain("customWidget_validate");
    expect(prompt).not.toContain("homarr://");
    expect(prompt).not.toContain("OFFLINE BUNDLE");
    expect(prompt.match(/Recommended components:/gu)).toHaveLength(1);
  });

  it("redacts secrets and preserves the final instruction when optional context is large", () => {
    const prompt = buildCustomWidgetAiPrompt(
      undefined,
      JSON.stringify({ token: "sensitive", data: "x".repeat(20_000) }),
      null,
      "Build it",
    );
    expect(prompt).not.toContain("sensitive");
    expect(prompt.endsWith(CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION)).toBe(true);
    expect(prompt.length).toBeLessThanOrEqual(12_000);
  });
});
