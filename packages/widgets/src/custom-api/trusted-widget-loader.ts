import type { ComponentType } from "react";

import { registerTrustedWidgetModules } from "./trusted-widget-modules";

interface WidgetModule {
  default: ComponentType;
}

const moduleLoads = new Map<string, Promise<WidgetModule>>();
const stylesheets = new Map<string, { element: HTMLLinkElement; references: number; loaded: Promise<void> }>();

function resolveArtifactUrl(path: string) {
  const url = new URL(path, window.location.origin);
  const isArtifact = url.pathname.startsWith("/api/custom-widgets/artifacts/");
  const isPreview = url.pathname.startsWith("/api/custom-widgets/previews/");
  if (url.origin !== window.location.origin || (!isArtifact && !isPreview)) {
    throw new Error("Widget artifacts must be served by this Homarr instance");
  }
  return url.href;
}

export function loadTrustedWidgetModule(path: string, attempt = 0): Promise<WidgetModule> {
  const requestedUrl = new URL(resolveArtifactUrl(path));
  // Browser module maps retain failed evaluations; an explicit Retry gets a fresh module request.
  if (attempt > 0) requestedUrl.searchParams.set("retry", String(attempt));
  const url = requestedUrl.href;
  registerTrustedWidgetModules();
  const existing = moduleLoads.get(url);
  if (existing) return existing;
  const loading = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url).then((module: unknown) => {
    if (!module || typeof module !== "object" || !("default" in module)) {
      throw new Error("A widget surface must export a React component as default");
    }
    const component = module.default;
    const wrappedTypes = [Symbol.for("react.memo"), Symbol.for("react.forward_ref"), Symbol.for("react.lazy")];
    const isWrappedComponent =
      component !== null &&
      typeof component === "object" &&
      "$$typeof" in component &&
      wrappedTypes.includes(component.$$typeof as symbol);
    if (typeof component !== "function" && !isWrappedComponent) {
      throw new Error("The widget default export is not a React component");
    }
    return module as WidgetModule;
  });
  moduleLoads.set(url, loading);
  void loading.catch(() => moduleLoads.delete(url));
  return loading;
}

export function retainTrustedWidgetStylesheet(path: string) {
  const url = resolveArtifactUrl(path);
  let entry = stylesheets.get(url);
  if (!entry) {
    const element = document.createElement("link");
    element.rel = "stylesheet";
    element.href = url;
    const loaded = new Promise<void>((resolve, reject) => {
      element.addEventListener("load", () => resolve(), { once: true });
      element.addEventListener("error", () => reject(new Error("The widget stylesheet could not be loaded")), {
        once: true,
      });
    });
    entry = { element, references: 0, loaded };
    stylesheets.set(url, entry);
    document.head.appendChild(element);
  }
  entry.references += 1;
  const retained = entry;
  let released = false;
  return {
    loaded: entry.loaded,
    release() {
      if (released) return;
      released = true;
      retained.references -= 1;
      if (retained.references > 0) return;
      retained.element.remove();
      stylesheets.delete(url);
    },
  };
}
