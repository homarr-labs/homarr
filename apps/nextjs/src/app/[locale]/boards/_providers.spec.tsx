import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BoardProviders } from "./_providers";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  layoutOverrideId: undefined as string | null | undefined,
  initialOpen: undefined as boolean | undefined,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@homarr/boards/context", async () => {
  const React = await import("react");

  return {
    BoardProvider: ({ children, layoutOverrideId }: { children: React.ReactNode; layoutOverrideId: string | null }) => {
      mocks.layoutOverrideId = layoutOverrideId;
      return React.createElement(React.Fragment, null, children);
    },
  };
});

vi.mock("@homarr/boards/edit-mode", async () => {
  const React = await import("react");

  return {
    EditModeProvider: ({ children, initialOpen }: { children: React.ReactNode; initialOpen: boolean }) => {
      mocks.initialOpen = initialOpen;
      return React.createElement(React.Fragment, null, children);
    },
  };
});

describe("board providers", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.layoutOverrideId = undefined;
    mocks.initialOpen = undefined;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test.each([
    ["base", "base"],
    ["custom", "custom"],
  ])("uses the requested %s layout for an explicit edit request", (_name, requestedLayoutId) => {
    mocks.searchParams = new URLSearchParams(`layout=${requestedLayoutId}&edit=true&returnTo=settings`);

    act(() => {
      root.render(
        createElement(
          BoardProviders,
          {
            initialBoard: { layouts: [{ id: "mobile" }, { id: "custom" }, { id: "base" }] } as never,
            initialLayoutId: "mobile",
            initialViewportWidth: 390,
            canModify: true,
          },
          createElement("span", null, "board"),
        ),
      );
    });

    expect(mocks.layoutOverrideId).toBe(requestedLayoutId);
    expect(mocks.initialOpen).toBe(true);
  });

  test.each([
    ["without edit mode", "layout=base", true],
    ["for an unknown layout", "layout=unknown&edit=true", true],
    ["without modify access", "layout=base&edit=true", false],
  ])("keeps viewport layout selection %s", (_name, query, canModify) => {
    mocks.searchParams = new URLSearchParams(query);

    act(() => {
      root.render(
        createElement(
          BoardProviders,
          {
            initialBoard: { layouts: [{ id: "mobile" }, { id: "base" }] } as never,
            initialLayoutId: "mobile",
            initialViewportWidth: 390,
            canModify,
          },
          createElement("span", null, "board"),
        ),
      );
    });

    expect(mocks.layoutOverrideId).toBeNull();
    expect(mocks.initialOpen).toBe(false);
  });
});
