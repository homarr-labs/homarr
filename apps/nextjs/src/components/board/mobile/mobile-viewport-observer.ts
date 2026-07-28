export const mobilePreloadViewportMultiplier = 2;

export const getMobilePreloadRootMargin = (viewportHeight: number) =>
  `${Math.max(0, Math.round(viewportHeight * mobilePreloadViewportMultiplier))}px 0px`;

interface MobileViewportSubscription {
  listener: (isNearViewport: boolean) => void;
  once: boolean;
}

interface ObserveMobileViewportOptions {
  once?: boolean;
}

const subscriptions = new Map<Element, Set<MobileViewportSubscription>>();

let observer: IntersectionObserver | null = null;
let observedRootMargin: string | null = null;
let isListeningForResize = false;

const stopObservingIfIdle = () => {
  if (subscriptions.size > 0) return;

  observer?.disconnect();
  observer = null;
  observedRootMargin = null;

  if (isListeningForResize) {
    window.removeEventListener("resize", handleViewportResize);
    isListeningForResize = false;
  }
};

const removeSubscription = (element: Element, subscription: MobileViewportSubscription) => {
  const elementSubscriptions = subscriptions.get(element);
  if (!elementSubscriptions) return;

  elementSubscriptions.delete(subscription);
  if (elementSubscriptions.size > 0) return;

  subscriptions.delete(element);
  observer?.unobserve(element);
  stopObservingIfIdle();
};

const handleIntersections: IntersectionObserverCallback = (entries) => {
  for (const entry of entries) {
    const elementSubscriptions = subscriptions.get(entry.target);
    if (!elementSubscriptions) continue;

    for (const subscription of elementSubscriptions) {
      subscription.listener(entry.isIntersecting);
      if (entry.isIntersecting && subscription.once) {
        removeSubscription(entry.target, subscription);
      }
    }
  }
};

const createObserver = (rootMargin: string) => {
  observer?.disconnect();
  observer = new IntersectionObserver(handleIntersections, { rootMargin });
  observedRootMargin = rootMargin;

  for (const element of subscriptions.keys()) {
    observer.observe(element);
  }
};

function handleViewportResize() {
  const rootMargin = getMobilePreloadRootMargin(window.innerHeight);
  if (rootMargin === observedRootMargin) return;

  createObserver(rootMargin);
}

const ensureObserver = () => {
  if (observer) return;

  createObserver(getMobilePreloadRootMargin(window.innerHeight));
  window.addEventListener("resize", handleViewportResize);
  isListeningForResize = true;
};

export const observeMobileViewportProximity = (
  element: Element,
  listener: (isNearViewport: boolean) => void,
  options: ObserveMobileViewportOptions = {},
) => {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    listener(true);
    return () => undefined;
  }

  const subscription: MobileViewportSubscription = {
    listener,
    once: options.once ?? false,
  };
  const elementSubscriptions = subscriptions.get(element);

  if (elementSubscriptions) {
    elementSubscriptions.add(subscription);
  } else {
    subscriptions.set(element, new Set([subscription]));
  }

  if (observer) {
    observer.observe(element);
  } else {
    ensureObserver();
  }

  return () => {
    removeSubscription(element, subscription);
  };
};
