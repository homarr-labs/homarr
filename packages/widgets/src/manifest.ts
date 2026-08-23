import type { ComponentType } from "react";

import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds as declaredWidgetKinds } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";

import type { WidgetComponentProps, WidgetDefinition } from "./definition";
import type { WidgetOptionDefinition } from "./options";
import { widgetModuleLoaders } from "./registry";

type WidgetComponentModule = {
  default: ComponentType<WidgetComponentProps<WidgetKind>>;
};

type WidgetModule = {
  definition: WidgetDefinition;
  componentLoader: () => Promise<WidgetComponentModule>;
};

export type WidgetResources = {
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
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
  new Map(Object.entries(widgetModuleLoaders) as [WidgetKind, () => Promise<WidgetModule>][]),
);

export const loadWidgetModule = (kind: WidgetKind) => loadRegisteredWidgetModule(kind);

const loadRegisteredWidgetComponent = createRetryableLoader(
  new Map(
    widgetKinds.map((kind) => [
      kind,
      async () => {
        const widgetModule = await loadWidgetModule(kind);
        return widgetModule.componentLoader();
      },
    ]),
  ),
);

export const loadWidgetComponent = (kind: WidgetKind) => loadRegisteredWidgetComponent(kind);

const loadRegisteredWidgetResources = createRetryableLoader(
  new Map(
    widgetKinds.map((kind) => [
      kind,
      async () => {
        const [{ definition }, { default: Component }] = await Promise.all([
          loadWidgetModule(kind),
          loadWidgetComponent(kind),
        ]);
        return { definition, Component } satisfies WidgetResources;
      },
    ]),
  ),
);

export const loadWidgetResources = (kind: WidgetKind) => loadRegisteredWidgetResources(kind);

export const loadWidgetDefinition = (kind: WidgetKind) => {
  const existing = definitionPromises.get(kind);
  if (existing) return existing;

  const promise = loadWidgetModule(kind).then(({ definition }) => definition);
  definitionPromises.set(kind, promise);
  void promise.catch(() => {
    if (definitionPromises.get(kind) === promise) definitionPromises.delete(kind);
  });
  return promise;
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
  const options = definition.createOptions(settings) as Record<string, WidgetOptionDefinition>;
  return objectEntries(options).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: currentValue[key] ?? value.defaultValue,
    }),
    {} as Record<string, unknown>,
  );
};
