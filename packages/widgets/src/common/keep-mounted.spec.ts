import { Accordion, MantineProvider, Tabs } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Root } from "react-dom/client";

/**
 * `health-monitoring` and `media-missing` pass `keepMounted={false}` to `Tabs` because Mantine
 * otherwise builds the inactive panel's whole subtree - two live monitoring views, or two full lists of
 * media cards, when only one is ever visible.
 *
 * That reasoning came from Mantine's documentation, not from this codebase, and it is the entire
 * justification for the prop. If a future Mantine version stops rendering inactive panels, the prop
 * becomes dead weight and the remount cost it buys is being paid for nothing. This pins the behaviour
 * in the version actually installed.
 */
describe("Mantine Tabs keepMounted", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  /** Two panels, each with a countable marker per "row", so hidden work is visible to the assertions. */
  const renderTabs = async (keepMounted: boolean | undefined) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    // `children` goes in the props object rather than as variadic arguments, because Tabs.Panel
    // declares it as a required prop.
    const panel = (value: string, marker: string) =>
      createElement(Tabs.Panel, {
        value,
        key: value,
        children: Array.from({ length: 3 }, (_unused, index) =>
          createElement("span", { className: marker, key: index }, `${marker}-${index}`),
        ),
      });

    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(
            Tabs,
            { defaultValue: "visible", ...(keepMounted === undefined ? {} : { keepMounted }) },
            createElement(
              Tabs.List,
              null,
              createElement(Tabs.Tab, { value: "visible" }, "Visible"),
              createElement(Tabs.Tab, { value: "hidden" }, "Hidden"),
            ),
            panel("visible", "shown"),
            panel("hidden", "offscreen"),
          ),
        ),
      );
    });

    return {
      shown: container.querySelectorAll(".shown").length,
      offscreen: container.querySelectorAll(".offscreen").length,
    };
  };

  it("renders the inactive panel's children by default, which is the cost being avoided", async () => {
    const counts = await renderTabs(undefined);

    expect(counts.shown).toBe(3);
    // The whole reason the widgets pass keepMounted={false}: this is not 0.
    expect(counts.offscreen).toBe(3);
  });

  it("does not render the inactive panel's children when keepMounted is false", async () => {
    const counts = await renderTabs(false);

    expect(counts.shown).toBe(3);
    expect(counts.offscreen).toBe(0);
  });
});

/**
 * `Accordion` has the same behaviour and the same prop, which the widget sweep originally missed - it
 * checked `Tabs` and not `Accordion`. Collapsed panels matter more here, because a collapsed accordion
 * section is the *normal* state rather than the exception: coolify renders three remote-data resource
 * lists this way, cluster-health its node tables, firewall its interface rows.
 */
describe("Mantine Accordion keepMounted", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  const renderAccordion = async (keepMounted: boolean | undefined) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const item = (value: string, marker: string) =>
      createElement(Accordion.Item, { value, key: value }, [
        createElement(Accordion.Control, { key: "control" }, value),
        createElement(
          Accordion.Panel,
          { key: "panel" },
          Array.from({ length: 3 }, (_unused, index) =>
            createElement("span", { className: marker, key: index }, `${marker}-${index}`),
          ),
        ),
      ]);

    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(
            Accordion,
            { defaultValue: "open", ...(keepMounted === undefined ? {} : { keepMounted }) },
            item("open", "shown"),
            item("collapsed", "offscreen"),
          ),
        ),
      );
    });

    return {
      shown: container.querySelectorAll(".shown").length,
      offscreen: container.querySelectorAll(".offscreen").length,
    };
  };

  it("renders collapsed panel children by default, which is the cost being avoided", async () => {
    const counts = await renderAccordion(undefined);

    expect(counts.shown).toBe(3);
    expect(counts.offscreen).toBe(3);
  });

  it("does not render collapsed panel children when keepMounted is false", async () => {
    const counts = await renderAccordion(false);

    expect(counts.shown).toBe(3);
    expect(counts.offscreen).toBe(0);
  });
});
