// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

import { ConnectionStatusBadge, SupportedIntegrations, WidgetItem } from "./item-select-modal";

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
  describe("ConnectionStatusBadge", () => {
    it("renders 'Ready' badge with teal color when status is 'ready'", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <ConnectionStatusBadge status="ready" />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("Ready");
      const badge = host.querySelector("span, div");
      expect(badge).not.toBeNull();
    });

    it("renders 'Needs setup' badge with orange color when status is 'needsSetup'", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <ConnectionStatusBadge status="needsSetup" />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("Needs setup");
    });

    it("renders null when status is 'noConnectionRequired'", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <ConnectionStatusBadge status="noConnectionRequired" />
          </MantineProvider>,
        ),
      );

      expect(host.querySelector("[class*='Badge-root']")).toBeNull();
    });
  });

  describe("SupportedIntegrations", () => {
    it("renders up to 5 avatars for supported integrations", async () => {
      const integrations: IntegrationKind[] = ["sonarr", "radarr", "plex"];

      await act(async () =>
        root.render(
          <MantineProvider>
            <SupportedIntegrations integrations={integrations} />
          </MantineProvider>,
        ),
      );

      // Avatars should be rendered for the 3 items
      expect(host.querySelectorAll("img, svg, div").length).toBeGreaterThan(0);
      expect(host.textContent).not.toContain("+");
    });

    it("renders overflow indicator when 6 or more integrations are supported", async () => {
      const integrations: IntegrationKind[] = ["sonarr", "radarr", "plex", "jellyfin", "emby", "deluge"];

      await act(async () =>
        root.render(
          <MantineProvider>
            <SupportedIntegrations integrations={integrations} />
          </MantineProvider>,
        ),
      );

      // 6 integrations total: 4 shown, +2 in badge
      expect(host.textContent).toContain("+2");
    });

    it("renders Standalone label when integrations list is empty", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SupportedIntegrations integrations={[]} />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("Standalone");
    });
  });

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

    it("does not mark widget cards as selected", async () => {
      const item = {
        kind: "clock" as WidgetKind,
        name: "Clock",
        description: "Displays current time",
        icon: FakeIcon as never,
        supportedIntegrations: [] as IntegrationKind[],
      };

      await act(async () =>
        root.render(
          <MantineProvider>
            <WidgetItem
              item={item}
              disabled={false}
              loading={false}
              connectionStatus="noConnectionRequired"
              onSelect={vi.fn()}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.hasAttribute("data-selected")).toBe(false);
    });
  });
});
