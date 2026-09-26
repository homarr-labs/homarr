// @vitest-environment jsdom

import type { Root } from "react-dom/client";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

import { WidgetItem } from "./item-select-modal";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => {
    const translations: Record<string, string> = {
      "item.create.connectionStatus.ready": "Ready",
      "item.create.connectionStatus.needsSetup": "Needs setup",
      "item.create.connectionStatus.noConnectionRequired": "No connection required",
      "item.create.standalone": "Standalone",
      "widget.mediaServer.name": "Media Server",
      "widget.mediaServer.description": "Stream your media",
      "widget.clock.name": "Clock",
      "widget.clock.description": "Displays current time",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@homarr/definitions", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@homarr/definitions");
  return {
    ...actual,
    getIntegrationName: (kind: string) => kind.charAt(0).toUpperCase() + kind.slice(1),
  };
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("Advanced Add App - Modal Subcomponents", () => {
  describe("WidgetItem", () => {
    const FakeIcon = () => <span data-testid="widget-icon">Icon</span>;

    it("renders widget card with icon, title, description, and connection status", async () => {
      const onSelect = vi.fn();
      const item = {
        kind: "mediaServer" as WidgetKind,
        name: "Media Server",
        description: "Stream your media collection effortlessly",
        icon: FakeIcon as never,
        supportedIntegrations: ["plex" as IntegrationKind, "jellyfin" as IntegrationKind],
      };

      await act(async () =>
        root.render(
          <MantineProvider>
            <WidgetItem item={item} disabled={false} loading={false} connectionStatus="ready" onSelect={onSelect} />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button).not.toBeNull();
      expect(host.textContent).toContain("Media Server");
      expect(host.textContent).toContain("Stream your media collection effortlessly");
      expect(host.textContent).toContain("Ready");
      expect(host.querySelector("[data-testid='widget-icon']")).not.toBeNull();

      await act(async () => {
        button?.click();
      });

      expect(onSelect).toHaveBeenCalledOnce();
    });
  });
});
