import { act, createElement, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BoardGridPortalHost, useBoardGridPortalHost } from "../grid-portal-host";

const mocks = vi.hoisted(() => ({
  board: {
    items: [{ id: "weather", layouts: [{ layoutId: "desktop", sectionId: "root" }] }],
    sections: [],
  },
}));

vi.mock("@homarr/auth/client", () => ({
  useIntegrations: () => undefined,
}));

vi.mock("@homarr/boards/context", () => ({
  useCurrentLayout: () => "desktop",
  useRequiredBoard: () => mocks.board,
}));

describe("board grid portal host", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.board = {
      items: [{ id: "weather", layouts: [{ layoutId: "desktop", sectionId: "root" }] }],
      sections: [],
    };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("keeps a portal across relocation and prunes it after permanent deletion", () => {
    const acquired: HTMLElement[] = [];

    renderHost(root, true, 0, acquired);
    expect(getContainerCount(container)).toBe("1");

    mocks.board = {
      items: [{ id: "weather", layouts: [{ layoutId: "desktop", sectionId: "other" }] }],
      sections: [],
    };
    renderHost(root, true, 1, acquired);
    expect(getContainerCount(container)).toBe("1");
    expect(new Set(acquired).size).toBe(1);

    mocks.board = { items: [], sections: [] };
    renderHost(root, false, 2, acquired);
    expect(getContainerCount(container)).toBe("0");
  });
});

const renderHost = (root: Root, acquire: boolean, revision: number, acquired: HTMLElement[]) => {
  act(() => {
    root.render(
      createElement(BoardGridPortalHost, null, createElement(PortalRegistryProbe, { acquire, revision, acquired })),
    );
  });
};

const PortalRegistryProbe = ({
  acquire,
  revision,
  acquired,
}: {
  acquire: boolean;
  revision: number;
  acquired: HTMLElement[];
}) => {
  const portalHost = useBoardGridPortalHost();

  useLayoutEffect(() => {
    if (acquire) acquired.push(portalHost.acquireContainer("weather"));
  }, [acquire, acquired, portalHost, revision]);

  return createElement("span", { "data-container-count": String(portalHost.containers.size) });
};

const getContainerCount = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-container-count]")?.dataset.containerCount;
