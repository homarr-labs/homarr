// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IntegrationKind } from "@homarr/definitions";

import { IntegrationSelectGrid } from "./integration-select-grid";

vi.mock("@homarr/definitions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@homarr/definitions")>();
  return {
    ...actual,
    getWidgetKindsForIntegration: (kind: IntegrationKind) => {
      if (kind === "wud") return [];
      return actual.getWidgetKindsForIntegration(kind);
    },
  };
});

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, values?: { count?: number }) => {
    const translations: Record<string, string> = {
      "integration.page.list.search": "Search integrations",
      "common.noResults": "No results found",
      "integration.grid.noWidgets": "No widgets tied to this service",
      "integration.grid.tiedWidgets": "Tied Widgets",
      "integration.grid.connected": `${values?.count ?? 0} connected`,
      "integration.grid.more": `+${values?.count ?? 0} more`,
      "widget.mediaServer.name": "Media Server",
      "widget.calendar.name": "Calendar",
      "widget.downloads.name": "Downloads",
      "integration.category.mediaService": "Media Service",
      "integration.category.downloadClient": "Download Client",
      "integration.category.calendar": "Calendar",
      "integration.category.smartHomeServer": "Smart Home",
      "integration.category.usenet": "Usenet",
      "integration.category.torrent": "Torrent",
    };
    return translations[key] ?? key;
  },
}));

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
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("IntegrationSelectGrid", () => {
  it("renders a 4-column responsive grid of selectable integration cards", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["jellyfin", "sonarr", "radarr", "sabNzbd"]} />
        </MantineProvider>,
      ),
    );

    const cards = host.querySelectorAll("button");
    expect(cards.length).toBe(4);
    expect(host.textContent).toContain("Jellyfin");
    expect(host.textContent).toContain("Sonarr");
    expect(host.textContent).toContain("Radarr");
    expect(host.textContent).toContain("SABnzbd");
  });

  it("renders tied widgets with icons and labels inside integration cards", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["jellyfin"]} />
        </MantineProvider>,
      ),
    );

    expect(host.textContent).toContain("Tied Widgets");
    // Jellyfin is tied to Media Server widget
    expect(host.textContent).toContain("Media Server");
  });

  it("displays fallback message when integration has no tied widgets", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["wud"]} />
        </MantineProvider>,
      ),
    );

    expect(host.querySelector("button")).not.toBeNull();
    expect(host.textContent).toContain("No widgets tied to this service");
  });

  it("displays '{count} connected' in footerLeft when integration instances exist", async () => {
    const onSelect = vi.fn();
    const integrationData = [
      { kind: "jellyfin" as IntegrationKind, name: "Home Jellyfin" },
      { kind: "jellyfin" as IntegrationKind, name: "Remote Jellyfin" },
      { kind: "sonarr" as IntegrationKind, name: "Sonarr Instance" },
    ];

    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid
            onSelect={onSelect}
            allowedKinds={["jellyfin", "radarr"]}
            integrationData={integrationData}
          />
        </MantineProvider>,
      ),
    );

    // Jellyfin has 2 connected
    expect(host.textContent).toContain("2 connected");

    // Radarr has 0 connected, so it doesn't show "0 connected"
    expect(host.textContent).not.toContain("0 connected");
  });

  it("filters integrations dynamically by search input", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["jellyfin", "sonarr", "radarr", "plex"]} />
        </MantineProvider>,
      ),
    );

    const searchInput = host.querySelector("input");
    expect(searchInput).not.toBeNull();

    // Type "jelly"
    await act(async () => {
      if (searchInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(searchInput, "jelly");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const cards = host.querySelectorAll("button");
    expect(cards.length).toBe(1);
    expect(host.textContent).toContain("Jellyfin");
    expect(host.textContent).not.toContain("Sonarr");
    expect(host.textContent).not.toContain("Radarr");
  });

  it("displays empty state when no integrations match search query", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["jellyfin", "sonarr"]} />
        </MantineProvider>,
      ),
    );

    const searchInput = host.querySelector("input");
    await act(async () => {
      if (searchInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(searchInput, "nonexistent-integration-query");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(host.textContent).toContain("No results found");
    expect(host.querySelectorAll("button").length).toBe(0);
  });

  it("calls onSelect when Enter is pressed with exactly 1 search match", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["jellyfin", "sonarr"]} />
        </MantineProvider>,
      ),
    );

    const searchInput = host.querySelector("input");
    await act(async () => {
      if (searchInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(searchInput, "jelly");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await act(async () => {
      searchInput?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith("jellyfin");
  });

  it("calls onSelect when an integration card is clicked", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} allowedKinds={["sonarr"]} />
        </MantineProvider>,
      ),
    );

    const cardButton = host.querySelector("button");
    await act(async () => cardButton?.click());
    expect(onSelect).toHaveBeenCalledWith("sonarr");
  });

  it("includes mock integration when enableMockIntegration is true", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} enableMockIntegration allowedKinds={["mock", "sonarr"]} />
        </MantineProvider>,
      ),
    );

    expect(host.textContent).toContain("Mock");
    expect(host.textContent).toContain("Sonarr");
  });

  it("excludes mock integration when enableMockIntegration is false", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <IntegrationSelectGrid onSelect={onSelect} enableMockIntegration={false} />
        </MantineProvider>,
      ),
    );

    const buttons = Array.from(host.querySelectorAll("button"));
    const mockButton = buttons.find((btn) => btn.getAttribute("aria-label")?.toLowerCase() === "mock");
    expect(mockButton).toBeUndefined();
  });
});
