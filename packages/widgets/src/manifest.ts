import type { ComponentType } from "react";

import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds as declaredWidgetKinds } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";

import type { WidgetComponentProps, WidgetDefinition } from "./definition";
import type { WidgetOptionDefinition } from "./options";
import type { WidgetImports } from "./registry";
import { widgetModuleLoaders } from "./registry";

type RegisteredWidgetModule = WidgetImports[WidgetKind];
type RegisteredWidgetComponentModule = Awaited<ReturnType<RegisteredWidgetModule["componentLoader"]>>;
type WidgetDefinitionFor<TKind extends WidgetKind> = WidgetImports[TKind]["definition"] & WidgetDefinition;

type WidgetComponentModule<TKind extends WidgetKind> = {
  default: ComponentType<WidgetComponentProps<TKind>>;
};

export type WidgetModule<TKind extends WidgetKind> = {
  definition: WidgetDefinitionFor<TKind>;
  componentLoader: () => Promise<WidgetComponentModule<TKind>>;
};

export type WidgetResources<TKind extends WidgetKind = WidgetKind> = {
  definition: WidgetDefinitionFor<TKind>;
  Component: ComponentType<WidgetComponentProps<TKind>>;
};

type RegisteredWidgetResources = {
  definition: RegisteredWidgetModule["definition"];
  Component: RegisteredWidgetComponentModule["default"];
};

type WidgetManifestValue<TKind extends WidgetKind> = {
  module: WidgetModule<TKind>;
  component: WidgetComponentModule<TKind>;
  resources: WidgetResources<TKind>;
  definition: WidgetDefinitionFor<TKind>;
};

type RegisteredWidgetManifestValue = {
  module: RegisteredWidgetModule;
  component: RegisteredWidgetComponentModule;
  resources: RegisteredWidgetResources;
  definition: WidgetDefinition;
};

const definitionPromises = new Map<WidgetKind, Promise<WidgetDefinition>>();

export const widgetKinds = [...declaredWidgetKinds];

export const createRetryableLoader = <TKey, TValue>(loaders: ReadonlyMap<TKey, () => Promise<TValue>>) => {
  const promises = new Map<TKey, Promise<TValue>>();

  return (key: TKey) => {
    const existing = promises.get(key);
    if (existing) return existing;

    const loader = loaders.get(key);
    if (!loader) throw new Error(`No loader is registered for ${String(key)}`);

    const promise = loader();
    promises.set(key, promise);
    void promise.catch(() => {
      if (promises.get(key) === promise) promises.delete(key);
    });
    return promise;
  };
};

const loadRegisteredWidgetModule = createRetryableLoader(
  new Map<WidgetKind, () => Promise<RegisteredWidgetModule>>(objectEntries(widgetModuleLoaders)),
);

// ponytail: TypeScript cannot correlate a generic key with the matching value
// in a Map. The registry itself is checked against WidgetImports, so this
// assertion only restores that already-verified relationship after caching.
const correlateWidgetPromise = <TKind extends WidgetKind, TType extends keyof WidgetManifestValue<TKind>>(
  _kind: TKind,
  _type: TType,
  promise: Promise<RegisteredWidgetManifestValue[TType]>,
) => promise as Promise<WidgetManifestValue<TKind>[TType]>;

export const loadWidgetModule = <TKind extends WidgetKind>(kind: TKind) =>
  correlateWidgetPromise(kind, "module", loadRegisteredWidgetModule(kind));

const loadRegisteredWidgetComponent = createRetryableLoader(
  new Map<WidgetKind, () => Promise<RegisteredWidgetComponentModule>>(
    widgetKinds.map((kind) => [
      kind,
      async () => {
        const widgetModule = await loadRegisteredWidgetModule(kind);
        return widgetModule.componentLoader();
      },
    ]),
  ),
);

export const loadWidgetComponent = <TKind extends WidgetKind>(kind: TKind) =>
  correlateWidgetPromise(kind, "component", loadRegisteredWidgetComponent(kind));

const loadRegisteredWidgetResources = createRetryableLoader(
  new Map<WidgetKind, () => Promise<RegisteredWidgetResources>>(
    widgetKinds.map((kind) => [
      kind,
      async () => {
        const [{ definition }, { default: Component }] = await Promise.all([
          loadRegisteredWidgetModule(kind),
          loadRegisteredWidgetComponent(kind),
        ]);
        return { definition, Component };
      },
    ]),
  ),
);

export const loadWidgetResources = <TKind extends WidgetKind>(kind: TKind) =>
  correlateWidgetPromise(kind, "resources", loadRegisteredWidgetResources(kind));

export const loadWidgetDefinition = <TKind extends WidgetKind>(kind: TKind) => {
  const existing = definitionPromises.get(kind);
  if (existing) {
    return correlateWidgetPromise(kind, "definition", existing);
  }

  const promise = loadRegisteredWidgetModule(kind).then(({ definition }) => definition);
  definitionPromises.set(kind, promise);
  void promise.catch(() => {
    if (definitionPromises.get(kind) === promise) definitionPromises.delete(kind);
  });
  return correlateWidgetPromise(kind, "definition", promise);
};

let allWidgetDefinitionsPromise: Promise<Map<WidgetKind, WidgetDefinition>> | undefined;

export const loadAllWidgetDefinitions = () => {
  if (allWidgetDefinitionsPromise) return allWidgetDefinitionsPromise;

  const promise = Promise.all(widgetKinds.map(async (kind) => [kind, await loadWidgetDefinition(kind)] as const)).then(
    (entries) => new Map(entries),
  );
  allWidgetDefinitionsPromise = promise;
  void promise.catch(() => {
    if (allWidgetDefinitionsPromise === promise) allWidgetDefinitionsPromise = undefined;
  });

  return promise;
};

export const reduceWidgetOptionsWithDefinition = (
  definition: WidgetDefinition,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  currentValue: Record<string, unknown> = {},
) => {
  const options: Record<string, WidgetOptionDefinition> = definition.createOptions(settings);
  const result: Record<string, unknown> = {};
  for (const [key, value] of objectEntries(options)) {
    result[key] = currentValue[key] ?? value.defaultValue;
  }
  return result;
};
