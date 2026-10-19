const noop = () => undefined;

/** Defer browser-only placeholders; hydrate meaningful prepared content normally. */
export const createPreparedWidgetHydration = () => {
  let resolveReady: () => void = noop;
  let ready = false;
  const completion = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const resume = () => {
    ready = true;
    resolveReady();
  };
  return {
    completion,
    observe: (id: string, skipRestoration: () => void) => {
      if (ready) return;
      const element = document.querySelector<HTMLElement>(`[data-grid-item-id="${CSS.escape(id)}"]`);
      if (
        !element ||
        !element.querySelector("[data-homarr-widget-client-only]") ||
        typeof IntersectionObserver === "undefined"
      ) {
        resume();
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth) {
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
