// @vitest-environment jsdom

import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Badge, MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectableCard } from "./selectable-card";
import classes from "./selectable-card.module.css";

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

    it("renders only header when only header slots (icon, title, topRight) are provided", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              icon={<span data-testid="only-icon">I</span>}
              title="Only Header"
              topRight={<span data-testid="only-topright">TR</span>}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.querySelector(`.${classes.header}`)).not.toBeNull();
      expect(button?.querySelector(`.${classes.body}`)).toBeNull();
      expect(button?.querySelector(`.${classes.footer}`)).toBeNull();
      expect(host.querySelector("[data-testid='only-icon']")).not.toBeNull();
      expect(host.querySelector("[data-testid='only-topright']")).not.toBeNull();
    });

    it("renders footer when only footerLeft or only footerRight is provided", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Test" footerLeft={<span data-testid="left-only">Left</span>} />
          </MantineProvider>,
        ),
      );

      expect(host.querySelector(`.${classes.footer}`)).not.toBeNull();
      expect(host.querySelector("[data-testid='left-only']")).not.toBeNull();

      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Test" footerRight={<span data-testid="right-only">Right</span>} />
          </MantineProvider>,
        ),
      );

      expect(host.querySelector(`.${classes.footer}`)).not.toBeNull();
      expect(host.querySelector("[data-testid='right-only']")).not.toBeNull();
    });

    it("applies Styles API classes for root, header, body, and footer", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              title="Plex"
              description="Media Server"
              footerLeft={<span>Footer</span>}
              classNames={{
                root: "custom-root",
                header: "custom-header",
                body: "custom-body",
                footer: "custom-footer",
              }}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.classList.contains(classes.root)).toBe(true);
      expect(button?.classList.contains("custom-root")).toBe(true);

      const header = button?.querySelector(`.${classes.header}`);
      expect(header).not.toBeNull();
      expect(header?.classList.contains("custom-header")).toBe(true);

      const body = button?.querySelector(`.${classes.body}`);
      expect(body).not.toBeNull();
      expect(body?.classList.contains("custom-body")).toBe(true);

      const footer = button?.querySelector(`.${classes.footer}`);
      expect(footer).not.toBeNull();
      expect(footer?.classList.contains("custom-footer")).toBe(true);
    });

    it("prioritizes title without wrapping and constrains topRight badge with ellipsis", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              title="Very Long Title Name That Should Not Wrap"
              topRight={<Badge>Category Badge</Badge>}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      const header = button?.querySelector(`.${classes.header}`);
      expect(header).not.toBeNull();

      const titleText = header?.querySelector("p, span, div");
      expect(titleText?.textContent).toContain("Very Long Title Name That Should Not Wrap");

      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              title={<span data-testid="custom-title-node">Custom Title Element</span>}
              topRight={<span data-testid="custom-top-right">Top Right</span>}
            />
          </MantineProvider>,
        ),
      );

      expect(host.querySelector("[data-testid='custom-title-node']")).not.toBeNull();
      expect(host.querySelector("[data-testid='custom-top-right']")).not.toBeNull();
    });

    it("renders custom children in the body slot over description", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Test" description="This should not appear">
              <div data-testid="custom-body-children">Custom Child Content</div>
            </SelectableCard>
          </MantineProvider>,
        ),
      );

      expect(host.querySelector("[data-testid='custom-body-children']")).not.toBeNull();
      expect(host.textContent).toContain("Custom Child Content");
      expect(host.textContent).not.toContain("This should not appear");
    });

    it("renders an empty description without fallback copy", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="No Desc Item" description="" />
          </MantineProvider>,
        ),
      );

      expect(host.textContent).toContain("No Desc Item");
      expect(host.textContent).not.toContain("No description provided");
    });

    it("omits header, body, or footer when corresponding props are omitted", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.querySelector(`.${classes.header}`)).toBeNull();
      expect(button?.querySelector(`.${classes.body}`)).toBeNull();
      expect(button?.querySelector(`.${classes.footer}`)).toBeNull();
    });
  });

  describe("states", () => {
    it("handles selected state via data-selected attribute", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Selected Item" selected />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.getAttribute("data-selected")).toBe("true");

      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Unselected Item" selected={false} />
          </MantineProvider>,
        ),
      );

      expect(button?.hasAttribute("data-selected")).toBe(false);
    });

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

  describe("interactions and accessibility", () => {
    it("supports focus and click activation", async () => {
      const onClick = vi.fn();
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Interactive Card" onClick={onClick} />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      button?.focus();
      expect(document.activeElement).toBe(button);

      await act(async () => {
        button?.click();
      });
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("forwards ref to the underlying HTMLButtonElement", async () => {
      const ref = createRef<HTMLButtonElement>();
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard ref={ref} title="Ref Card" />
          </MantineProvider>,
        ),
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe("BUTTON");
    });

    it("resolves radius CSS variables via varsResolver", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Radius Card" radius="lg" />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.style.getPropertyValue("--selectable-card-radius")).toBe("var(--mantine-radius-lg)");

      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard title="Radius Card Sm" radius="sm" />
          </MantineProvider>,
        ),
      );

      expect(button?.style.getPropertyValue("--selectable-card-radius")).toBe("var(--mantine-radius-sm)");
    });

    it("passes arbitrary HTML attributes down to the button element", async () => {
      await act(async () =>
        root.render(
          <MantineProvider>
            <SelectableCard
              title="Custom Props Card"
              data-testid="my-selectable-card"
              data-custom="custom-value"
              tabIndex={0}
            />
          </MantineProvider>,
        ),
      );

      const button = host.querySelector("button");
      expect(button?.getAttribute("data-testid")).toBe("my-selectable-card");
      expect(button?.getAttribute("data-custom")).toBe("custom-value");
      expect(button?.tabIndex).toBe(0);
    });
  });
});
