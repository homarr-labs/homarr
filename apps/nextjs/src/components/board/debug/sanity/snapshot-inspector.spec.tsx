import { act, createElement } from "react";
import type { PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { SnapshotInspector } from "./snapshot-inspector";

vi.mock("@mantine/core", () => ({
  Button: ({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) =>
    createElement("button", { onClick }, children),
  Alert: ({ children }: PropsWithChildren) => createElement("div", null, children),
}));
vi.mock("../snapshot", () => ({ parseBoardSnapshot: async (text: string) => JSON.parse(text) }));

test("subscribes before the preview exists and sends only its current snapshot to the matching frame", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const subscribe = vi.spyOn(window, "addEventListener");
  const snapshot = { schemaVersion: 1, captured: "first" };
  const text = JSON.stringify({ snapshot, payload: { viewport: { width: 640, height: 480 } } });
  const ready = { type: "homarr-board-preview-ready" };

  try {
    await act(() => root.render(createElement(SnapshotInspector, { text, label: "After" })));
    expect(host.querySelector("iframe")).toBeNull();
    expect(subscribe.mock.calls.some(([event]) => event === "message")).toBe(true);

    await act(async () => host.querySelector("button")?.click());
    const frame = host.querySelector("iframe");
    expect(frame?.contentWindow).toBeTruthy();
    if (!frame?.contentWindow) throw new Error("Expected the snapshot preview frame");
    const target = frame.contentWindow;
    const post = vi.spyOn(target, "postMessage").mockImplementation(() => undefined);

    window.dispatchEvent(new MessageEvent("message", { data: ready, source: target, origin: "https://other.test" }));
    window.dispatchEvent(new MessageEvent("message", { data: ready, source: window, origin: location.origin }));
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "other" }, source: target, origin: location.origin }),
    );
    expect(post).not.toHaveBeenCalled();

    window.dispatchEvent(new MessageEvent("message", { data: ready, source: target, origin: location.origin }));
    expect(post).toHaveBeenCalledExactlyOnceWith(
      { type: "homarr-board-snapshot", text: JSON.stringify(snapshot) },
      location.origin,
    );

    await act(() => host.querySelector("button")?.click());
    expect(host.querySelector("iframe")).toBeNull();
    window.dispatchEvent(new MessageEvent("message", { data: ready, source: target, origin: location.origin }));
    expect(post).toHaveBeenCalledTimes(1);

    const nextSnapshot = { schemaVersion: 1, captured: "second" };
    const nextText = JSON.stringify({ snapshot: nextSnapshot, payload: { viewport: { width: 640, height: 480 } } });
    await act(() => root.render(createElement(SnapshotInspector, { text: nextText, label: "After" })));
    await act(async () => host.querySelector("button")?.click());
    const reopened = host.querySelector("iframe")?.contentWindow;
    if (!reopened) throw new Error("Expected the reopened preview frame");
    const nextPost = vi.spyOn(reopened, "postMessage").mockImplementation(() => undefined);
    window.dispatchEvent(new MessageEvent("message", { data: ready, source: target, origin: location.origin }));
    expect(nextPost).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent("message", { data: ready, source: reopened, origin: location.origin }));
    expect(nextPost).toHaveBeenCalledExactlyOnceWith(
      { type: "homarr-board-snapshot", text: JSON.stringify(nextSnapshot) },
      location.origin,
    );
  } finally {
    await act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  }
});
