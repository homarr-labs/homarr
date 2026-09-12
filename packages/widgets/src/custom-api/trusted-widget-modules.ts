import * as React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import * as ReactJsxDevRuntime from "react/jsx-dev-runtime";

import * as WidgetSdk from "@homarr/widget-sdk";

const registryKey = Symbol.for("homarr.widget.modules.v1");
const loaders: Record<string, () => Promise<unknown>> = {
  "react-dom": () => import("react-dom"),
  "react-dom/client": () => import("react-dom/client"),
  "@mantine/core": () => import("@mantine/core"),
  "@mantine/hooks": () => import("@mantine/hooks"),
  "@mantine/charts": () => import("@mantine/charts"),
  "@mantine/dates": () => import("@mantine/dates"),
  // Old artifacts externalized Tabler. New builds bundle only the icons their source imports.
  "@tabler/icons-react": () => import("@tabler/icons-react"),
  "@tanstack/react-query": () => import("@tanstack/react-query"),
  "@homarr/widget-sdk/ui": () => import("@homarr/widget-sdk/ui"),
  "@homarr/widget-sdk/table": () => import("@homarr/widget-sdk/table"),
  "@homarr/widget-sdk/legacy": () => import("./trusted-widget-legacy"),
};
interface WidgetModuleRegistry {
  prepare(ids?: readonly string[]): Promise<void>;
  require(id: string): unknown;
}

/** Every artifact uses Homarr's React; optional UI libraries load only when its compiled imports need them. */
export function registerTrustedWidgetModules() {
  const registry = globalThis as typeof globalThis & { [registryKey]?: WidgetModuleRegistry };
  const modules: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": ReactJsxRuntime,
    "react/jsx-dev-runtime": ReactJsxDevRuntime,
    "@homarr/widget-sdk": WidgetSdk,
    "@homarr/widget-sdk/client": WidgetSdk,
  };
  const pending = new Map<string, Promise<void>>();
  // Refresh module exports after HMR; all SDK copies retain the shared context identity.
  registry[registryKey] = {
    async prepare(ids = Object.keys(loaders)) {
      await Promise.all(
        ids.map((id) => {
          if (Object.hasOwn(modules, id)) return;
          const existing = pending.get(id);
          if (existing) return existing;
          const load = loaders[id];
          if (!load) throw new Error(`Unsupported widget host module: ${id}`);
          const loading = load().then((value) => {
            modules[id] = value;
          });
          pending.set(id, loading);
          void loading.catch(() => pending.delete(id));
          return loading;
        }),
      );
    },
    require(id) {
      if (!Object.hasOwn(modules, id)) throw new Error(`Widget host module was not prepared: ${id}`);
      return modules[id];
    },
  };
}
