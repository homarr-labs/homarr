import { describe, expect, test } from "vitest";

import { getAssistantDirectiveTranslationKey, parseAssistantDirectives } from "./assistant-directives";

describe("assistant directives", () => {
  test("preserves text while parsing Homarr context references into visual segments", () => {
    expect(
      parseAssistantDirectives(
        "Open :app[Facebook]{name=p6ik48io64xh4p1kyz2kwxiw} with :integration[Jellyfin]{name=pui7uj2196m5a96tl5hues5r} on :board[defaultv2]{name=a7b4sb1qkwftzt5xppxuvceq}",
      ),
    ).toEqual([
      { kind: "text", text: "Open " },
      { kind: "mention", type: "app", label: "Facebook", id: "p6ik48io64xh4p1kyz2kwxiw" },
      { kind: "text", text: " with " },
      { kind: "mention", type: "integration", label: "Jellyfin", id: "pui7uj2196m5a96tl5hues5r" },
      { kind: "text", text: " on " },
      { kind: "mention", type: "board", label: "defaultv2", id: "a7b4sb1qkwftzt5xppxuvceq" },
    ]);
  });

  test("uses the tools label for model-context tools and a safe fallback for unknown directives", () => {
    expect(getAssistantDirectiveTranslationKey("tool")).toBe("tools");
    expect(getAssistantDirectiveTranslationKey("unknown")).toBe("context");
  });
});
