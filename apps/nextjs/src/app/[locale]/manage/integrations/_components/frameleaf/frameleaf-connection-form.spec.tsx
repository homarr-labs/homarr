// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { FrameleafConnectionForm } from "./frameleaf-connection-form";

vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));
const fetchAsync = vi.fn();
const status = (value: string) =>
  Response.json({ status: value, callback: "https://homarr.example.test/api/integrations/frameleaf/callback" });
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchAsync);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  fetchAsync.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function render(id = "integration-a") {
  await act(() =>
    root.render(
      <MantineProvider env="test">
        <FrameleafConnectionForm integration={{ id, name: "Frameleaf", url: "https://library.example.test" }} />
      </MantineProvider>,
    ),
  );
}

test.each(["pending", "exchanging", "verifying", "refreshing"])(
  "rechecks %s and stops polling once another worker connects",
  async (transient) => {
    fetchAsync.mockResolvedValueOnce(status(transient)).mockResolvedValue(status("connected"));
    await render();
    expect(host.textContent).toContain("pending");
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(host.textContent).toContain("connected");
    expect(host.textContent).not.toContain("pending");
    const calls = fetchAsync.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fetchAsync).toHaveBeenCalledTimes(calls);
  },
);
test("uncertain refresh shows reconnect and never attempts rotation or further polling", async () => {
  fetchAsync.mockResolvedValueOnce(status("refreshing")).mockResolvedValue(status("uncertain"));
  await render();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(host.textContent).toContain("reconnect");
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(fetchAsync).toHaveBeenCalledTimes(2);
  for (const [, init] of fetchAsync.mock.calls) expect(init.method).toBeUndefined();
});
test("changing integration aborts the old status request and ignores its late response", async () => {
  let finish: ((response: Response) => void) | undefined;
  fetchAsync
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(status("disconnected"));
  await render();
  const signal = fetchAsync.mock.calls[0]?.[1].signal as AbortSignal;
  await render("integration-b");
  expect(signal.aborted).toBe(true);
  await act(async () => finish?.(status("refreshing")));
  expect(host.textContent).toContain("disconnected");
  expect(host.textContent).not.toContain("pending");
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(fetchAsync).toHaveBeenCalledTimes(2);
});
test("unmount cancels scheduled polling", async () => {
  fetchAsync.mockResolvedValue(status("refreshing"));
  await render();
  await act(() => root.unmount());
  root = createRoot(host);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(fetchAsync).toHaveBeenCalledTimes(1);
});
test("denied consent return displays the existing translated connection failure", async () => {
  window.history.replaceState(null, "", "/?frameleaf=consent");
  fetchAsync.mockResolvedValue(status("disconnected"));
  await render();
  expect(host.textContent).toContain("failed");
  expect(host.textContent).toContain("connect");
});
