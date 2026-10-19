import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { MantineProvider } from "@mantine/core";

const mocks = vi.hoisted(() => ({
  isEditMode: true,
  permissions: ["app-create"] as string[],
  createItem: vi.fn(),
  invalidateApp: vi.fn(),
  detectMetadataAsync: vi.fn(),
}));

vi.mock("@homarr/boards/edit-mode", () => ({
  useEditMode: () => [mocks.isEditMode, { open: vi.fn(), close: vi.fn() }],
}));

vi.mock("@homarr/auth/client", () => ({
  useSession: () => ({ data: { user: { permissions: mocks.permissions } } }),
}));

vi.mock("@homarr/notifications", () => ({
  showSuccessNotification: vi.fn(),
  showErrorNotification: vi.fn(),
}));

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
}));

vi.mock("./items/item-actions", () => ({
  useItemActions: () => ({ createItem: mocks.createItem }),
}));

// Deferred resolvers for app.create, one per drop, so the test controls exactly when
// each drop's work finishes, independently of the others.
let createResolvers: ((app: { id: string; name: string }) => void)[] = [];

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    useUtils: () => ({ app: { invalidate: mocks.invalidateApp } }),
    app: {
      detectMetadata: { useMutation: () => ({ mutateAsync: mocks.detectMetadataAsync }) },
      create: {
        useMutation: () => ({
          mutateAsync: () =>
            new Promise<{ id: string; name: string }>((resolve) => {
              createResolvers.push(resolve);
            }),
        }),
      },
    },
  },
}));

import { BoardAppUrlDrop } from "./board-app-url-drop";

const createDataTransfer = (url: string) => ({
  types: ["text/uri-list"],
  getData: (type: string) => (type === "text/uri-list" ? url : ""),
});

const dispatchWindowEvent = (name: string, dataTransfer: unknown) => {
  const event = new Event(name, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  window.dispatchEvent(event);
};

const dropUrl = async (url: string) => {
  await act(async () => dispatchWindowEvent("drop", createDataTransfer(url)));
};

describe("BoardAppUrlDrop", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.isEditMode = true;
    mocks.permissions = ["app-create"];
    mocks.createItem.mockClear();
    mocks.invalidateApp.mockClear();
    mocks.detectMetadataAsync.mockReset().mockResolvedValue({ name: "App", iconUrl: null });
    createResolvers = [];

    act(() => {
      root.render(createElement(MantineProvider, null, createElement(BoardAppUrlDrop)));
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("keeps the progress overlay visible until every concurrent drop finishes", async () => {
    await dropUrl("https://first.example.com");
    expect(container.textContent).toContain("board.urlDrop.resolving");

    await dropUrl("https://second.example.com");
    expect(container.textContent).toContain("board.urlDrop.resolving");
    expect(createResolvers).toHaveLength(2);

    // The first drop finishes while the second is still in flight: the overlay must stay.
    await act(async () => createResolvers[0]?.({ id: "1", name: "First" }));
    expect(container.textContent).toContain("board.urlDrop.resolving");

    // Only once the second (last remaining) drop finishes should the overlay disappear.
    await act(async () => createResolvers[1]?.({ id: "2", name: "Second" }));
    expect(container.textContent).not.toContain("board.urlDrop.resolving");
    expect(mocks.createItem).toHaveBeenCalledTimes(2);
  });
});
