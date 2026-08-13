import { describe, expect, test } from "vitest";

import type { WidgetKind } from "@homarr/definitions";
import { widgetIntegrationSupport } from "@homarr/definitions";
import { widgetImports } from "@homarr/widgets";

import { getAssistantWidgetConfiguration } from "./assistant-widget-tool";

const settings = { enableStatusByDefault: true, forceDisableStatus: false };

describe("getAssistantWidgetConfiguration", () => {
  test("keeps server-side integration support synchronized with widget definitions", () => {
    for (const [kind, widgetImport] of Object.entries(widgetImports)) {
      const definition = widgetImport.definition;
      const expected = "supportedIntegrations" in definition ? definition.supportedIntegrations : undefined;

      expect(widgetIntegrationSupport[kind as WidgetKind], kind).toEqual(expected);
    }
  });

  test("preserves generated notebook content and fills its hidden defaults", () => {
    const result = getAssistantWidgetConfiguration(
      {
        boardId: "board-1",
        boardName: "Home",
        kind: "notebook",
        summary: "Add a Plex guide",
        options: { content: "<h2>Self-host Plex</h2><p>Use Docker.</p>" },
      },
      settings,
      [],
    );

    expect(result.integrationSupport).toBe(false);
    expect(result.value.options).toEqual({
      content: "<h2>Self-host Plex</h2><p>Use Docker.</p>",
      showToolbar: true,
      allowReadOnlyCheck: true,
    });
  });

  test("keeps only accessible, compatible integrations and respects the widget maximum", () => {
    const result = getAssistantWidgetConfiguration(
      {
        boardId: "board-1",
        boardName: "Home",
        kind: "audioStats",
        summary: "Show audio statistics",
        integrationIds: ["navidrome-private", "navidrome-1", "audiobookshelf-1", "plex-1"],
      },
      settings,
      [
        {
          id: "navidrome-1",
          name: "Navidrome",
          kind: "navidrome",
          url: "https://music.example.com",
          permissions: { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true },
        },
        {
          id: "audiobookshelf-1",
          name: "Audiobookshelf",
          kind: "audiobookshelf",
          url: "https://books.example.com",
          permissions: { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true },
        },
        {
          id: "plex-1",
          name: "Plex",
          kind: "plex",
          url: "https://plex.example.com",
          permissions: { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true },
        },
        {
          id: "navidrome-private",
          name: "Private Navidrome",
          kind: "navidrome",
          url: "https://private.example.com",
          permissions: { hasUseAccess: false, hasInteractAccess: false, hasFullAccess: false },
        },
      ],
    );

    expect(result.integrationsRequired).toBe(true);
    expect(result.integrationData.map((integration) => integration.id)).toEqual(["navidrome-1", "audiobookshelf-1"]);
    expect(result.value.integrationIds).toEqual(["navidrome-1"]);
  });

  test("treats integration-backed widgets as required unless explicitly optional", () => {
    const mediaServer = getAssistantWidgetConfiguration(
      { boardId: "board-1", boardName: "Home", kind: "mediaServer", summary: "Show Plex streams" },
      settings,
      [],
    );
    const calendar = getAssistantWidgetConfiguration(
      { boardId: "board-1", boardName: "Home", kind: "calendar", summary: "Show releases" },
      settings,
      [],
    );

    expect(mediaServer.integrationsRequired).toBe(true);
    expect(calendar.integrationsRequired).toBe(false);
  });
});
