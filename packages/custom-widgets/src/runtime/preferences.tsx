"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CustomWidgetExtensions } from "../core/extensions-schema";
import { isCustomWidgetPreferenceValue } from "../core/extensions-schema";
type WidgetInputValue = string | number | boolean | string[] | number[];

export interface WidgetPreferencesValue {
  definitions: NonNullable<CustomWidgetExtensions["preferences"]>;
  values: Record<string, WidgetInputValue>;
  setValue(name: string, value: WidgetInputValue): void;
}
export const WidgetPreferencesContext = createContext<WidgetPreferencesValue | null>(null);
export const useWidgetPreferences = () => useContext(WidgetPreferencesContext);

const EMPTY_DEFINITIONS: NonNullable<CustomWidgetExtensions["preferences"]> = {};

export function useCustomWidgetPreferences(
  definitions = EMPTY_DEFINITIONS,
  storageKey?: string,
): WidgetPreferencesValue {
  const definitionKey = JSON.stringify(definitions);
  const parsedDefinitions = useMemo(() => JSON.parse(definitionKey) as typeof definitions, [definitionKey]);
  const defaults = useMemo(
    () => Object.fromEntries(Object.entries(parsedDefinitions).map(([name, value]) => [name, value.defaultValue])),
    [parsedDefinitions],
  );
  const [stored, setStored] = useState<{ key?: string; values: Record<string, WidgetInputValue> }>({ values: {} });
  useEffect(() => {
    let values: Record<string, WidgetInputValue> = {};
    if (storageKey) {
      try {
        const raw = localStorage.getItem(`homarr:widget-preferences:${storageKey}`);
        if (raw && raw.length <= 100_000) {
          const candidate: unknown = JSON.parse(raw);
          if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
            for (const [name, definition] of Object.entries(parsedDefinitions)) {
              const value = Reflect.get(candidate, name);
              if (isCustomWidgetPreferenceValue(definition.type, value)) values[name] = value as WidgetInputValue;
            }
          }
        }
      } catch {
        /* Browsers can disable storage; the widget remains interactive. */
      }
    }
    setStored({ key: storageKey, values });
  }, [parsedDefinitions, storageKey]);
  const values = useMemo(() => {
    if (stored.key !== storageKey) return defaults;
    return { ...defaults, ...stored.values };
  }, [defaults, storageKey, stored]);
  const setValue = useCallback(
    (name: string, value: WidgetInputValue) => {
      const definition = parsedDefinitions[name];
      if (!definition || !isCustomWidgetPreferenceValue(definition.type, value)) return;
      setStored((current) => {
        const next = { ...defaults, ...current.values, [name]: value };
        if (storageKey) {
          try {
            const serialized = JSON.stringify(next);
            if (serialized.length <= 100_000)
              localStorage.setItem(`homarr:widget-preferences:${storageKey}`, serialized);
          } catch {
            /* Keep the in-memory preference when storage is unavailable. */
          }
        }
        return { key: storageKey, values: next };
      });
    },
    [defaults, parsedDefinitions, storageKey],
  );
  return { definitions: parsedDefinitions, values, setValue };
}
