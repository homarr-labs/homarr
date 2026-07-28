import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getMobilePreloadRootMargin, observeMobileViewportProximity } from "./mobile-viewport-observer";

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  readonly observedElements = new Set<Element>();
  readonly rootMargin: string;
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? "0px";
    IntersectionObserverMock.instances.push(this);
  }

  observe(element: Element) {
    this.observedElements.add(element);
  }

  unobserve(element: Element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.disconnected = true;
    this.observedElements.clear();
  }

  emit(element: Element, isIntersecting: boolean) {
    this.callback([{ target: element, isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

describe("observeMobileViewportProximity", () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600, writable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shares one observer across cards and recreates it once when the viewport margin changes", () => {
    const firstElement = document.createElement("div");
    const secondElement = document.createElement("div");
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const stopObservingFirst = observeMobileViewportProximity(firstElement, firstListener);
    const stopObservingSecond = observeMobileViewportProximity(secondElement, secondListener);

    expect(IntersectionObserverMock.instances).toHaveLength(1);
    expect(IntersectionObserverMock.instances[0]?.observedElements).toEqual(new Set([firstElement, secondElement]));
    expect(IntersectionObserverMock.instances[0]?.rootMargin).toBe(getMobilePreloadRootMargin(600));

    IntersectionObserverMock.instances[0]?.emit(firstElement, true);
    expect(firstListener).toHaveBeenCalledWith(true);
    expect(secondListener).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("resize"));
    expect(IntersectionObserverMock.instances).toHaveLength(1);

    window.innerHeight = 700;
    window.dispatchEvent(new Event("resize"));

    expect(IntersectionObserverMock.instances).toHaveLength(2);
    expect(IntersectionObserverMock.instances[0]?.disconnected).toBe(true);
    expect(IntersectionObserverMock.instances[1]?.observedElements).toEqual(new Set([firstElement, secondElement]));
    expect(IntersectionObserverMock.instances[1]?.rootMargin).toBe(getMobilePreloadRootMargin(700));

    stopObservingFirst();
    stopObservingSecond();
    expect(IntersectionObserverMock.instances[1]?.disconnected).toBe(true);
  });

  test("removes one-time subscriptions after their card first becomes near", () => {
    const element = document.createElement("div");
    const listener = vi.fn();

    const stopObserving = observeMobileViewportProximity(element, listener, { once: true });
    IntersectionObserverMock.instances[0]?.emit(element, true);

    expect(listener).toHaveBeenCalledOnce();
    expect(IntersectionObserverMock.instances[0]?.disconnected).toBe(true);
    stopObserving();
  });

  test("mounts content immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const listener = vi.fn();

    const stopObserving = observeMobileViewportProximity(document.createElement("div"), listener);

    expect(listener).toHaveBeenCalledWith(true);
    stopObserving();
  });
});
