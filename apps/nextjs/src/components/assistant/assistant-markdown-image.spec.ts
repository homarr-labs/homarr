import { describe, expect, test } from "vitest";

import { getSafeAssistantAttachmentImageSource, getSafeAssistantMarkdownImageSource } from "./assistant-markdown-image";

describe("getSafeAssistantMarkdownImageSource", () => {
  test("allows Homarr-relative images without automatically loading remote images", () => {
    expect(getSafeAssistantMarkdownImageSource("/logo/logo.png")).toBe("/logo/logo.png");
    expect(getSafeAssistantMarkdownImageSource("https://cdn.example.com/icons/discord.svg")).toBeNull();
  });

  test("rejects unsafe protocols, protocol-relative URLs, and embedded credentials", () => {
    expect(getSafeAssistantMarkdownImageSource("javascript:alert(1)")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("data:image/svg+xml;base64,PHN2Zy8+")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("//example.com/icon.svg")).toBeNull();
    expect(getSafeAssistantMarkdownImageSource("https://user:secret@example.com/icon.svg")).toBeNull();
  });
});

describe("getSafeAssistantAttachmentImageSource", () => {
  test("allows persisted raster image data and same-origin image URLs", () => {
    expect(getSafeAssistantAttachmentImageSource("data:image/png;base64,iVBORw0KGgo=", "https://homarr.local")).toBe(
      "data:image/png;base64,iVBORw0KGgo=",
    );
    expect(getSafeAssistantAttachmentImageSource("/api/assistant/file/one", "https://homarr.local")).toBe(
      "/api/assistant/file/one",
    );
    expect(
      getSafeAssistantAttachmentImageSource("https://homarr.local/api/assistant/file/one", "https://homarr.local"),
    ).toBe("https://homarr.local/api/assistant/file/one");
  });

  test("rejects active image formats, unsafe schemes, and cross-origin URLs", () => {
    expect(
      getSafeAssistantAttachmentImageSource("data:image/svg+xml;base64,PHN2Zy8+", "https://homarr.local"),
    ).toBeNull();
    expect(getSafeAssistantAttachmentImageSource("javascript:alert(1)", "https://homarr.local")).toBeNull();
    expect(getSafeAssistantAttachmentImageSource("https://example.com/private.png", "https://homarr.local")).toBeNull();
  });
});
