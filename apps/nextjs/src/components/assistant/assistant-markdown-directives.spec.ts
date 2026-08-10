import { describe, expect, test } from "vitest";

import { resolveAssistantDirectiveEntity, transformAssistantMarkdownDirectives } from "./assistant-markdown-directives";

describe("assistant markdown directives", () => {
  test("turns assistant item citations into typed inline elements", () => {
    const directive: {
      type: string;
      name: string;
      attributes: { name: string };
      children: { type: string; value: string }[];
      data?: Record<string, unknown>;
    } = {
      type: "textDirective",
      name: "app",
      attributes: { name: "app-1" },
      children: [{ type: "text", value: "Discord" }],
    };
    transformAssistantMarkdownDirectives({ type: "root", children: [directive] });

    expect(directive.data).toEqual({
      hName: "span",
      hProperties: {
        "data-assistant-directive": "true",
        "data-directive-id": "app-1",
        "data-directive-label": "Discord",
        "data-directive-type": "app",
      },
    });
  });

  test("resolves shorthand citations only when their label is unambiguous", () => {
    const entities = [
      { id: "app-1", type: "app" as const, label: "Discord", description: "Chat", iconUrl: "/discord.svg" },
      { id: "board-1", type: "board" as const, label: "Home", description: "Home board" },
    ];

    expect(resolveAssistantDirectiveEntity(entities, { id: "Discord", label: "Discord", type: "app" })?.id).toBe(
      "app-1",
    );
    expect(resolveAssistantDirectiveEntity(entities, { id: "Home", label: "Home", type: "board" })?.id).toBe("board-1");
  });
});
