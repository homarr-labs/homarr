import { useLayoutEffect, useState, useSyncExternalStore } from "react";

const readyOnServer = () => true;

const getDeferredPlaceholder = (id: string) => {
  const element = document.querySelector<HTMLElement>(`[data-grid-item-id="${CSS.escape(id)}"]`);
  if (
    !element ||
    !element.querySelector("[data-homarr-widget-client-only]") ||
    typeof IntersectionObserver === "undefined"
  )
    return null;
  const rect = element.getBoundingClientRect();
  if (rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth) return null;
  return element;
};

/** Keep browser-only content idle without suspending its SSR shell's hydration. */
export const createPreparedWidgetHydration = (initialId?: string) => {
  let ready = false;
  const listeners = new Set<() => void>();
  const resume = () => {
    if (ready) return;
    ready = true;
    for (const listener of listeners) listener();
  };
  if (initialId && typeof window !== "undefined" && !getDeferredPlaceholder(initialId)) resume();
  return {
    isReady: () => ready,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    observe: (id: string) => {
      if (ready) return;
      const element = getDeferredPlaceholder(id);
      if (!element) {
        resume();
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) activate();
        },
        { rootMargin: "200px" },
      );
      const cleanup = () => {
        observer.disconnect();
        element.removeEventListener("pointerover", activate);
        element.removeEventListener("focusin", activate);
      };
      const activate = () => {
        cleanup();
        resume();
      };
      observer.observe(element);
      element.addEventListener("pointerover", activate);
      element.addEventListener("focusin", activate);
      return cleanup;
    },
  };
};

export const usePreparedWidgetHydration = (id: string, prepared: boolean) => {
  const [hydration] = useState(() => createPreparedWidgetHydration(id));
  const ready = useSyncExternalStore(hydration.subscribe, hydration.isReady, readyOnServer);
  useLayoutEffect(() => {
    if (!prepared) return;
    return hydration.observe(id);
  }, [hydration, id, prepared]);
  return !prepared || ready;
};
