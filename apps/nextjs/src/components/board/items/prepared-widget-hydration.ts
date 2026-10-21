const noop = () => undefined;

/** Defer browser-only placeholders; hydrate meaningful prepared content normally. */
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

export const createPreparedWidgetHydration = (initialId?: string) => {
  let resolveReady: () => void = noop;
  let ready = false;
  const completion = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const resume = () => {
    ready = true;
    resolveReady();
  };
  // Meaningful SSR content must not suspend on an artificial, already-resolved
  // Promise: React may otherwise leave its offscreen boundary dehydrated.
  if (initialId && typeof window !== "undefined" && !getDeferredPlaceholder(initialId)) resume();
  return {
    isReady: () => ready,
    completion,
    observe: (id: string, skipRestoration: () => void) => {
      if (ready) return;
      const element = getDeferredPlaceholder(id);
      if (!element) {
        resume();
        return;
      }
      skipRestoration();
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
