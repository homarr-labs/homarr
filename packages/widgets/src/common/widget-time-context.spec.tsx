// @vitest-environment jsdom

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { useWidgetNow } from "./use-widget-now";
import { WidgetTimeProvider } from "./widget-time-context";

const TimeProbe = () => <time>{useWidgetNow("minute")?.toISOString() ?? "missing"}</time>;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WidgetTimeProvider", () => {
  test("uses the same non-placeholder timestamp for server rendering and hydration", async () => {
    vi.useFakeTimers();
    const timestamp = new Date("2026-08-22T12:34:00.000Z").getTime();
    vi.setSystemTime(timestamp);
    const content = (
      <WidgetTimeProvider initialTimestamp={timestamp}>
        <TimeProbe />
      </WidgetTimeProvider>
    );
    const html = renderToString(content);
    const host = document.createElement("div");
    host.innerHTML = html;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(host.textContent).toBe("2026-08-22T12:34:00.000Z");
    const root = hydrateRoot(host, content);
    await act(async () => undefined);
    expect(host.textContent).toBe("2026-08-22T12:34:00.000Z");
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
