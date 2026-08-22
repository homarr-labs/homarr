import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { useWidgetNow } from "./use-widget-now";
import { useWidgetLocalTimeZone, WidgetTimeProvider } from "./widget-time-context";

const TimeProbe = () => (
  <time>
    {useWidgetNow("minute")?.toISOString() ?? "missing"}|{useWidgetLocalTimeZone()}
  </time>
);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WidgetTimeProvider", () => {
  test("hydrates with server time and timezone before switching to browser values", async () => {
    vi.useFakeTimers();
    const serverTimestamp = new Date("2026-08-22T12:34:00.000Z").getTime();
    const clientTimestamp = serverTimestamp + 60_000;
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const serverTimeZone = browserTimeZone === "UTC" ? "Europe/Paris" : "UTC";
    vi.setSystemTime(serverTimestamp);
    const content = (
      <WidgetTimeProvider initialTimestamp={serverTimestamp} initialTimeZone={serverTimeZone}>
        <TimeProbe />
      </WidgetTimeProvider>
    );
    const html = renderToString(content);
    const host = document.createElement("div");
    host.innerHTML = html;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.setSystemTime(clientTimestamp);

    expect(host.textContent).toBe(`2026-08-22T12:34:00.000Z|${serverTimeZone}`);
    const root = hydrateRoot(host, content);
    await act(async () => undefined);
    expect(host.textContent).toBe(`2026-08-22T12:35:00.000Z|${browserTimeZone}`);
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
