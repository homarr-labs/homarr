// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Badge, MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectableCard } from "./selectable-card";

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

describe("SelectableCard", () => {
  describe("rendering slots", () => {
    it("renders as a native button with default button type and accessible slots", async () => {
      const onClick = vi.fn();
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              aria-label="Sonarr Card"
              icon={<span data-testid="card-icon">Icon</span>}
              title="Sonarr"
              topRight={<Badge data-testid="card-topright">Media</Badge>}
              description="Manage TV series downloads"
              footerLeft={<span data-testid="card-footer-left">Left Meta</span>}
              footerRight={<span data-testid="card-footer-right">Right Meta</span>}
              onClick={onClick}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.type).toBe("button");
      expect(button?.getAttribute("aria-label")).toBe("Sonarr Card");
      expect(host.querySelector("[data-testid='card-icon']")).not.toBeNull();
      expect(host.textContent).toContain("Sonarr");
      expect(host.querySelector("[data-testid='card-topright']")).not.toBeNull();
      expect(host.textContent).toContain("Manage TV series downloads");
      expect(host.querySelector("[data-testid='card-footer-left']")).not.toBeNull();
      expect(host.querySelector("[data-testid='card-footer-right']")).not.toBeNull();

      await act(async () => button?.click());
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("states", () => {
    it("handles disabled state and prevents click handlers", async () => {
      const onClick = vi.fn();
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Disabled Item" disabled onClick={onClick} />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.disabled).toBe(true);

      await act(async () => button?.click());
      expect(onClick).not.toHaveBeenCalled();
    });

    it("handles loading state by disabling the button and showing LoadingOverlay", async () => {
      const onClick = vi.fn();
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Loading Item" loading onClick={onClick} />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.disabled).toBe(true);

      await act(async () => button?.click());
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
