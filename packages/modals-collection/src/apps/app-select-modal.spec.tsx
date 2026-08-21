// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSelectModal } from "./app-select-modal";

const AppSelectModalComponent = AppSelectModal.component;

const sampleApps = [
  {
    id: "app-1",
    name: "Sonarr",
    description: "Manage TV series downloads",
    iconUrl: "https://example.com/sonarr.png",
    href: "http://sonarr.local",
  },
  {
    id: "app-2",
    name: "Radarr",
    description: "Manage movie collections",
    iconUrl: "https://example.com/radarr.png",
    href: "http://radarr.local",
  },
  {
    id: "app-3",
    name: "Plex",
    description: "Stream your media collection",
    iconUrl: "https://example.com/plex.png",
    href: "http://plex.local",
  },
];

const mockUseQuery = vi.fn(() => ({
  data: sampleApps,
  isPending: false,
}));

const mockOpenQuickAddAppModal = vi.fn();

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    app: {
      selectable: {
        useQuery: () => mockUseQuery(),
      },
    },
  },
}));

vi.mock("@homarr/modals", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@homarr/modals");
  return {
    ...actual,
    useModalAction: () => ({
      openModal: mockOpenQuickAddAppModal,
    }),
  };
});

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, values?: { count?: number }) => {
    const count = values?.count ?? 0;
    const translations: Record<string, string> = {
      "app.action.select.search": "Search apps",
      "app.action.select.title": "Select application",
      "app.action.select.selected": "Selected",
      "app.action.select.toggle": "Click to select",
      "app.action.select.noResults": "No apps found",
      "app.action.select.selectedCount": `${count} selected`,
      "app.action.select.appsSelected": `${count} ${count === 1 ? "app" : "apps"} selected`,
      "app.action.select.customApplication": "Custom application",
      "app.action.select.application": "Application",
      "app.action.create.title": "Add custom app",
      "app.action.create.description": "Configure custom URL and icon",
      "common.action.discard": "Discard",
      "common.action.add": "Add",
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
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({
    data: sampleApps,
    isPending: false,
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("AppSelectModal", () => {
  describe("single selection mode", () => {
    it("renders app cards with name, description, and icon", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("Sonarr");
      expect(host.textContent).toContain("Radarr");
      expect(host.textContent).toContain("Plex");
      expect(host.textContent).toContain("Manage TV series downloads");
    });

    it("selects an app and closes modal when card is clicked", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const sonarrCard = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Sonarr"));
      expect(sonarrCard).toBeDefined();

      await act(async () => {
        sonarrCard?.click();
      });

      expect(onSelect).toHaveBeenCalledWith(sampleApps[0]);
      expect(closeModal).toHaveBeenCalledOnce();
    });
  });

  describe("multi selection mode", () => {
    it("toggles multiple app selections and submits batch on button click", async () => {
      const closeModal = vi.fn();
      const onSelectMany = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelectMany, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const sonarrCard = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Sonarr"));
      const radarrCard = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Radarr"));

      // Select Sonarr
      await act(async () => {
        sonarrCard?.click();
      });

      // Modal stays open, 1 app selected
      expect(closeModal).not.toHaveBeenCalled();
      expect(host.textContent).toContain("1 app selected");

      // Select Radarr
      await act(async () => {
        radarrCard?.click();
      });

      expect(host.textContent).toContain("2 apps selected");

      // Submit multi select
      const submitBtn = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Add (2)"));
      expect(submitBtn).toBeDefined();

      await act(async () => {
        submitBtn?.click();
      });

      expect(onSelectMany).toHaveBeenCalledWith([sampleApps[0], sampleApps[1]]);
      expect(closeModal).toHaveBeenCalledOnce();
    });

    it("unselects an app when clicked a second time", async () => {
      const closeModal = vi.fn();
      const onSelectMany = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelectMany, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const sonarrCard = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Sonarr"));

      // Select Sonarr
      await act(async () => {
        sonarrCard?.click();
      });
      expect(host.textContent).toContain("1 app selected");

      // Unselect Sonarr
      await act(async () => {
        sonarrCard?.click();
      });
      expect(host.textContent).not.toContain("1 app selected");
    });

    it("clears selection when Discard button is clicked", async () => {
      const closeModal = vi.fn();
      const onSelectMany = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelectMany, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const sonarrCard = Array.from(host.querySelectorAll("button")).find((btn) => btn.textContent?.includes("Sonarr"));
      await act(async () => {
        sonarrCard?.click();
      });
      expect(host.textContent).toContain("1 app selected");

      const discardBtn = Array.from(host.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Discard"),
      );
      await act(async () => {
        discardBtn?.click();
      });

      expect(host.textContent).not.toContain("app selected");
    });
  });

  describe("search and filtering", () => {
    it("filters apps in real-time by search query (case-insensitive)", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const searchInput = host.querySelector("input");
      expect(searchInput).not.toBeNull();

      // Type "plex"
      await act(async () => {
        if (searchInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(searchInput, "plex");
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      expect(host.textContent).toContain("Plex");
      expect(host.textContent).not.toContain("Sonarr");
      expect(host.textContent).not.toContain("Radarr");
    });

    it("selects the single matching app when Enter key is pressed in search input", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const searchInput = host.querySelector("input");
      await act(async () => {
        if (searchInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(searchInput, "sonarr");
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      await act(async () => {
        searchInput?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });

      expect(onSelect).toHaveBeenCalledWith(sampleApps[0]);
      expect(closeModal).toHaveBeenCalledOnce();
    });

    it("displays empty state message when search yields no results", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      const searchInput = host.querySelector("input");
      await act(async () => {
        if (searchInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(searchInput, "non-matching-query");
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      expect(host.textContent).toContain("No apps found");
    });
  });

  describe("custom app creation card", () => {
    it("renders custom app creation card when withCreate is true", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: true }} />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("Add custom app");
      expect(host.textContent).toContain("Configure custom URL and icon");
    });

    it("omits custom app creation card when withCreate is false", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: false }} />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).not.toContain("Add custom app");
    });

    it("opens QuickAddAppModal when custom app creation card is clicked in single select mode", async () => {
      const closeModal = vi.fn();
      const onSelect = vi.fn();

      await act(async () =>
        root.render(
          <MantineProvider>
            <AppSelectModalComponent actions={{ closeModal }} innerProps={{ onSelect, withCreate: true }} />
          </MantineProvider>,
        ),
      );

      const createCard = Array.from(host.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes("Add custom app"),
      );
      expect(createCard).toBeDefined();

      await act(async () => {
        createCard?.click();
      });

      expect(mockOpenQuickAddAppModal).toHaveBeenCalledOnce();

      // Trigger the onClose callback passed to QuickAddAppModal
      const options = mockOpenQuickAddAppModal.mock.calls[0]?.[0] as { onClose: (app: (typeof sampleApps)[0]) => void };
      const newCustomApp = {
        id: "custom-app-1",
        name: "Custom Home Assistant",
        description: "Local instance",
        iconUrl: "https://example.com/ha.png",
        href: "http://ha.local",
      };

      await act(async () => {
        options.onClose(newCustomApp);
      });

      expect(onSelect).toHaveBeenCalledWith(newCustomApp);
      expect(closeModal).toHaveBeenCalledOnce();
    });
  });
});
