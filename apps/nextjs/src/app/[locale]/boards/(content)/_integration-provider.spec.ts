import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BoardIntegrationProvider } from "./_integration-provider";

const mocks = vi.hoisted(() => ({
  providedIntegrations: undefined as unknown,
}));

vi.mock("@homarr/auth/client", async () => {
  const React = await import("react");

  return {
    IntegrationProvider: ({ children, integrations }: { children: React.ReactNode; integrations: unknown }) => {
      mocks.providedIntegrations = integrations;
      return React.createElement(React.Fragment, null, children);
    },
  };
});

describe("board integration provider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mocks.providedIntegrations = undefined;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("provides the permission-filtered server result without a second client query", () => {
    const initialIntegrations = [{ id: "initial" }];

    act(() => {
      root.render(
        createElement(
          BoardIntegrationProvider,
          { initialIntegrations: initialIntegrations as never },
          createElement("span", null, "board"),
        ),
      );
    });

    expect(mocks.providedIntegrations).toBe(initialIntegrations);
  });
});
