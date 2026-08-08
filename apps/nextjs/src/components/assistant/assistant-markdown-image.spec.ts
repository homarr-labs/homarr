import { describe, expect, test } from "vitest";

import { getSafeAssistantMarkdownImageSource } from "./assistant-markdown-image";

describe("getSafeAssistantMarkdownImageSource", () => {
  test("allows Homarr-relative and ordinary remote images", () => {
    expect(getSafeAssistantMarkdownImageSource("/logo/logo.png")).toBe("/logo/logo.png");
    expect(getSafeAssistantMarkdownImageSource("https://cdn.example.com/icons/discord.svg")).toBe(
      "https://cdn.example.com/icons/discord.svg",
    );
  });

  test("rejects unsafe protocols, protocol-relative URLs, and embedded credentials", () => {
    expect(getSafeAssistantMarkdownImageSource("javascript:alert(1)")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("data:image/svg+xml;base64,PHN2Zy8+")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("//example.com/icon.svg")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("https://user:secret@example.com/icon.svg")).toBeNull();
  });
});
