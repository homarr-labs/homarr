import { describe, expect, test } from "vitest";

import { normalizeAssistantMarkdown } from "./assistant-markdown";

describe("normalizeAssistantMarkdown", () => {
  test("formats the assistant capability introduction as readable sections", () => {
    const text =
      "Hey! 👋 I'm your Homarr Assistant — ready to help you manage your dashboard. Here's what I can do: - **Boards & Apps** — create, edit, organize your dashboard boards and app shortcuts - **Integrations** — work with Sonarr, Radarr, Plex, Jellyfin, Home Assistant, Pi-hole, download clients, and more - **Media** — search and request movies/shows, check streams, browse calendars - **Docker** — view, start, stop, restart containers - **System** — monitor health, DNS stats, downloads, and smart home devices What are you looking to do?";

    const normalized = normalizeAssistantMarkdown(text);
    expect(normalized).toContain("Here's what I can do:\n\n- **Boards & Apps**");
    expect(normalized).toContain("\n- **Integrations**");
    expect(normalized).toContain("\n- **System**");
    expect(normalized.endsWith("devices\n\nWhat are you looking to do?")).toBe(true);
  });

  test("turns an inline bold-label sequence into a Markdown list", () => {
    const text =
      "Here's what I can do: - **Boards & Apps** — create and organize boards - **Integrations** — work with Sonarr and Radarr - **Docker** — manage containers What would you like to do?";

    expect(normalizeAssistantMarkdown(text)).toBe(
      "Here's what I can do:\n\n- **Boards & Apps** — create and organize boards\n- **Integrations** — work with Sonarr and Radarr\n- **Docker** — manage containers\n\nWhat would you like to do?",
    );
  });

  test("supports real and escaped line breaks", () => {
    expect(normalizeAssistantMarkdown("First line\\nSecond line\nThird line")).toBe(
      "First line\nSecond line\nThird line",
    );
  });

  test("does not rewrite fenced or inline code", () => {
    const text = "Before\\n`value\\n - **one** — 1 - **two** — 2`\n```md\nA\\n - **one** — 1 - **two** — 2\n```\nAfter";

    expect(normalizeAssistantMarkdown(text)).toBe(
      "Before\n`value\\n - **one** — 1 - **two** — 2`\n```md\nA\\n - **one** — 1 - **two** — 2\n```\nAfter",
    );
  });

  test("leaves ordinary inline hyphens and single suggestions alone", () => {
    const text = "Use the well-known provider - or choose **Custom**. Try - **Boards** — list boards.";
    expect(normalizeAssistantMarkdown(text)).toBe(text);
  });
});
