// @vitest-environment jsdom

import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  FIT_CONTENT_NATURAL_ATTRIBUTE,
  FIT_CONTENT_VIEWPORT_ATTRIBUTE,
  FitContentReportContext,
  useFitContentReporter,
} from "../auto-expand/fit-to-content";

const observers: { disconnect: ReturnType<typeof vi.fn> }[] = [];

class FakeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  constructor() {
    observers.push(this);
  }
}

const Reporter = ({ enabled }: { enabled: boolean }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  useFitContentReporter({ sectionId: "media", itemId: "item-1", bodyRef, enabled });
  return (
    <div ref={bodyRef}>
      <div data-item-id="item-1">
        <div {...{ [FIT_CONTENT_VIEWPORT_ATTRIBUTE]: "" }} data-testid="viewport">
          <table {...{ [FIT_CONTENT_NATURAL_ATTRIBUTE]: "" }} data-testid="natural" />
        </div>
      </div>
    </div>
  );
};

const setHeight = (testId: string, height: number) => {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`missing ${testId}`);
  element.getBoundingClientRect = () => ({ height }) as DOMRect;
};

describe("useFitContentReporter", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", FakeObserver);
    vi.stubGlobal("MutationObserver", FakeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("CSS", { escape: (value: string) => value });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    host.remove();
    vi.unstubAllGlobals();
  });

  const render = async (report: (sectionId: string, slack: number) => void, enabled = true) => {
    await act(() =>
      root.render(
        <FitContentReportContext value={report}>
          <Reporter enabled={enabled} />
        </FitContentReportContext>,
      ),
    );
  };

  test("reports the widget's spare height and disconnects its observers on unmount", async () => {
    const report = vi.fn();
    await render(report, false);
    setHeight("viewport", 400);
    setHeight("natural", 150);
    await render(report);

    expect(report).toHaveBeenCalledWith("media", 250);
    expect(observers.length).toBeGreaterThan(0);

    await act(() => root.unmount());
    for (const observer of observers) expect(observer.disconnect).toHaveBeenCalled();
  });

  test("ignores differences of a few pixels", async () => {
    const report = vi.fn();
    await render(report, false);
    setHeight("viewport", 151);
    setHeight("natural", 150);
    await render(report);

    expect(report).not.toHaveBeenCalled();
    await act(() => root.unmount());
  });

  test("does nothing while disabled", async () => {
    const report = vi.fn();
    await render(report, false);

    expect(observers).toHaveLength(0);
    expect(report).not.toHaveBeenCalled();
    await act(() => root.unmount());
  });
});
