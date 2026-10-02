import { afterEach, describe, expect, test, vi } from "vitest";

import { scheduleGridEditorWarmup } from "../grid-editor-loader";

describe("grid editor warm-up", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  test("waits for board hydration, a paint, and browser idle time", async () => {
    let animationFrameCallback: FrameRequestCallback | undefined;
    let idleCallback: IdleRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrameCallback = callback;
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
      idleCallback = callback;
      return 2;
    });
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    const loadAsync = vi.fn().mockResolvedValue(undefined);

    const cancel = scheduleGridEditorWarmup(loadAsync);
    expect(animationFrameCallback).toBeUndefined();

    const canvas = document.createElement("section");
    canvas.dataset.boardHydrated = "true";
    document.body.append(canvas);
    await vi.waitFor(() => expect(animationFrameCallback).toBeDefined());
    expect(loadAsync).not.toHaveBeenCalled();

    animationFrameCallback?.(0);
    expect(idleCallback).toBeDefined();
    expect(loadAsync).not.toHaveBeenCalled();

    idleCallback?.({
      didTimeout: false,
      timeRemaining: () => 10,
    });
    expect(loadAsync).toHaveBeenCalledOnce();
    cancel();
  });

  test("does not load after cancellation", () => {
    let idleCallback: IdleRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
      idleCallback = callback;
      return 2;
    });
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    document.body.innerHTML = '<section data-board-hydrated="true"></section>';
    const loadAsync = vi.fn().mockResolvedValue(undefined);

    const cancel = scheduleGridEditorWarmup(loadAsync);
    cancel();
    idleCallback?.({ didTimeout: false, timeRemaining: () => 10 });

    expect(loadAsync).not.toHaveBeenCalled();
  });

  test("falls back to a timeout when requestIdleCallback is unavailable", async () => {
    vi.useFakeTimers();
    const requestIdleCallbackDescriptor = Object.getOwnPropertyDescriptor(window, "requestIdleCallback");
    Reflect.deleteProperty(window, "requestIdleCallback");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = '<section data-board-hydrated="true"></section>';
    const loadAsync = vi.fn().mockResolvedValue(undefined);

    const cancel = scheduleGridEditorWarmup(loadAsync);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(loadAsync).toHaveBeenCalledOnce();
    cancel();
    vi.useRealTimers();
    if (requestIdleCallbackDescriptor) {
      Object.defineProperty(window, "requestIdleCallback", requestIdleCallbackDescriptor);
    }
  });

  test("waits until the document becomes visible", () => {
    let visibilityState: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    const animationFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    const loadAsync = vi.fn().mockResolvedValue(undefined);
    document.body.innerHTML = '<section data-board-hydrated="true"></section>';

    const cancel = scheduleGridEditorWarmup(loadAsync);
    expect(animationFrame).not.toHaveBeenCalled();

    visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(animationFrame).toHaveBeenCalledOnce();
    cancel();
  });
});
