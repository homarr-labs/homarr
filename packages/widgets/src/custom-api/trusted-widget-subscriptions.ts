import type { WidgetSubscriptionObserver } from "@homarr/widget-sdk/shared";

interface SharedSubscription {
  itemId: string;
  listeners: Set<WidgetSubscriptionObserver>;
  start(observer: WidgetSubscriptionObserver): () => void;
  stop(): void;
  generation: number;
  latest?: { value: unknown };
  timer?: ReturnType<typeof setTimeout>;
}

const subscriptions = new Map<string, SharedSubscription>();
const focusTransitionGraceMs = 500;

/** One live connection per viewer, placement, revision and request, with a single retained event. */
export function subscribeSharedWidget(
  key: string,
  itemId: string,
  start: SharedSubscription["start"],
  observer: WidgetSubscriptionObserver,
) {
  let shared = subscriptions.get(key);
  let created = false;
  if (!shared) {
    shared = { itemId, listeners: new Set(), start, stop: () => undefined, generation: 0 };
    subscriptions.set(key, shared);
    created = true;
  }
  const entry = shared;
  clearTimeout(entry.timer);
  entry.timer = undefined;
  entry.listeners.add(observer);
  if (entry.latest) observer.next(entry.latest.value);
  if (created) connect(key, entry);
  return () => {
    entry.listeners.delete(observer);
    if (entry.listeners.size > 0 || subscriptions.get(key) !== entry) return;
    entry.timer = setTimeout(() => dispose(key, entry), focusTransitionGraceMs);
  };
}

function connect(key: string, entry: SharedSubscription) {
  const generation = ++entry.generation;
  const active = () => subscriptions.get(key) === entry && entry.generation === generation;
  try {
    const stop = entry.start({
      next(value) {
        if (!active()) return;
        entry.latest = { value };
        entry.listeners.forEach((listener) => listener.next(value));
      },
      error(error) {
        if (!active()) return;
        dispose(key, entry);
        entry.listeners.forEach((listener) => listener.error(error));
        entry.listeners.clear();
      },
      complete() {
        if (!active()) return;
        dispose(key, entry);
        entry.listeners.forEach((listener) => listener.complete());
        entry.listeners.clear();
      },
    });
    if (subscriptions.get(key) !== entry) stop();
    else entry.stop = stop;
  } catch (error) {
    dispose(key, entry);
    const failure = error instanceof Error ? error : new Error(String(error));
    entry.listeners.forEach((listener) => listener.error(failure));
    entry.listeners.clear();
  }
}

function dispose(key: string, entry: SharedSubscription) {
  entry.generation++;
  if (subscriptions.get(key) === entry) subscriptions.delete(key);
  clearTimeout(entry.timer);
  entry.latest = undefined;
  entry.stop();
  entry.stop = () => undefined;
}

/** Binding and activation events discard the retained event and reopen authorized server handlers. */
export function refreshSharedWidgetSubscriptions(itemId: string) {
  for (const [key, entry] of subscriptions) {
    if (entry.itemId !== itemId) continue;
    entry.generation++;
    entry.stop();
    entry.stop = () => undefined;
    entry.latest = undefined;
    if (entry.listeners.size === 0) dispose(key, entry);
    else connect(key, entry);
  }
}

export function clearSharedWidgetSubscriptions(itemId: string, error: Error) {
  for (const [key, entry] of subscriptions) {
    if (entry.itemId !== itemId) continue;
    dispose(key, entry);
    entry.listeners.forEach((listener) => listener.error(error));
    entry.listeners.clear();
  }
}
