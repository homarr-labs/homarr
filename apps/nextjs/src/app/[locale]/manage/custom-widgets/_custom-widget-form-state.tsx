"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { UseFormReturnType } from "@mantine/form";

import {
  customWidgetSourcesSchema,
  getCustomWidgetRequiredSecretKinds,
  hasSameCustomWidgetSourceBinding,
} from "@homarr/custom-widgets/core";
import { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

import { areCustomWidgetValuesEqual } from "./_custom-widget-value-equality";
import { createCustomWidgetDocumentHistory, getCustomWidgetDocumentContent } from "./_custom-widget-document-history";
import type { CustomWidgetDocumentContent, CustomWidgetDocumentHistoryState } from "./_custom-widget-document-history";

export interface CustomWidgetFormDocumentStore {
  getValues(): CustomWidgetFormValues;
  setValues(values: CustomWidgetFormValues): void;
  getDirty(): boolean;
  subscribe(listener: () => void): () => void;
  markSaved(values: CustomWidgetFormValues): void;
  getHistory(): CustomWidgetDocumentHistoryState;
  undo(): CustomWidgetFormValues | null;
  redo(): CustomWidgetFormValues | null;
  resetToSaved(): CustomWidgetFormValues;
}

const documentValueKeys = customWidgetFormSchema.keyof().options;

function areDocumentValuesEqual(left: CustomWidgetFormValues, right: CustomWidgetFormValues) {
  if (Object.keys(left).length !== documentValueKeys.length) return false;
  if (Object.keys(right).length !== documentValueKeys.length) return false;
  return documentValueKeys.every(
    (key) => Object.hasOwn(left, key) && Object.hasOwn(right, key) && areCustomWidgetValuesEqual(left[key], right[key]),
  );
}

export function createCustomWidgetFormDocumentStore(
  initialValues: CustomWidgetFormValues,
): CustomWidgetFormDocumentStore {
  let values = initialValues;
  let persistedValues = initialValues;
  let dirty = false;
  const history = createCustomWidgetDocumentHistory(initialValues);
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());
  const restore = (content: CustomWidgetDocumentContent | null): CustomWidgetFormValues | null => {
    if (!content) return null;
    let secrets: CustomWidgetFormValues["secrets"] = [];
    try {
      const sources = customWidgetSourcesSchema.parse(JSON.parse(content.sources));
      const currentSources = customWidgetSourcesSchema.parse(JSON.parse(values.sources));
      secrets = values.secrets.filter((secret) => {
        const source = sources[secret.sourceId];
        const currentSource = currentSources[secret.sourceId];
        if (!source || !currentSource || !hasSameCustomWidgetSourceBinding(source, currentSource)) return false;
        const auth = typeof source.auth === "string" ? source.auth : source.auth.type;
        return getCustomWidgetRequiredSecretKinds(auth).some((kind) => kind === secret.kind);
      });
    } catch {
      // An unfinished source document cannot safely retain credential bindings.
    }
    const restored = { ...content, secrets };
    values = restored;
    dirty = !areDocumentValuesEqual(restored, persistedValues);
    notify();
    return restored;
  };

  return {
    getValues: () => values,
    setValues: (nextValues) => {
      if (Object.is(values, nextValues)) return;
      history.record(nextValues);
      values = nextValues;
      dirty = !areDocumentValuesEqual(nextValues, persistedValues);
      notify();
    },
    getDirty: () => dirty,
    getHistory: history.getState,
    undo: () => restore(history.undo()),
    redo: () => restore(history.redo()),
    resetToSaved: () => {
      history.stopCoalescing();
      const restored = {
        ...getCustomWidgetDocumentContent(persistedValues),
        secrets: persistedValues.secrets.map((secret) => ({ ...secret, value: "" })),
      };
      history.record(restored);
      values = restored;
      dirty = !areDocumentValuesEqual(restored, persistedValues);
      notify();
      return restored;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    markSaved: (savedValues) => {
      const wasDirty = dirty;
      persistedValues = savedValues;
      history.stopCoalescing();
      dirty = !areDocumentValuesEqual(values, persistedValues);
      if (wasDirty !== dirty) notify();
    },
  };
}

const CustomWidgetFormDocumentContext = createContext<CustomWidgetFormDocumentStore | null>(null);

export function CustomWidgetFormDocumentProvider({
  store,
  children,
}: {
  store: CustomWidgetFormDocumentStore;
  children: ReactNode;
}) {
  return <CustomWidgetFormDocumentContext.Provider value={store}>{children}</CustomWidgetFormDocumentContext.Provider>;
}

export function useCustomWidgetFormDocumentStore() {
  const store = useContext(CustomWidgetFormDocumentContext);
  if (!store) throw new Error("Custom widget form document provider is missing");
  return store;
}

export function useDeferredCustomWidgetFormDocumentValues() {
  const store = useCustomWidgetFormDocumentStore();
  const [values, setValues] = useState(() => store.getValues());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleUpdate = () => {
      const nextValues = store.getValues();
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        startTransition(() => {
          setValues((currentValues) => {
            if (!Object.is(store.getValues(), nextValues)) return currentValues;
            return nextValues;
          });
        });
      }, 150);
    };
    const unsubscribe = store.subscribe(scheduleUpdate);
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [store]);
  return values;
}

export function useCustomWidgetFormDocumentField<Key extends keyof CustomWidgetFormValues>(field: Key) {
  const store = useCustomWidgetFormDocumentStore();
  const getSnapshot = () => store.getValues()[field];
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useCustomWidgetFormDocumentDirty() {
  const store = useCustomWidgetFormDocumentStore();
  return useSyncExternalStore(store.subscribe, store.getDirty, store.getDirty);
}

export function useCustomWidgetFormDocumentBridge(
  form: UseFormReturnType<CustomWidgetFormValues>,
  store: CustomWidgetFormDocumentStore,
) {
  const formRef = useRef(form);
  formRef.current = form;
  return useMemo(
    () =>
      new Proxy({} as UseFormReturnType<CustomWidgetFormValues>, {
        get: (_target, property) => {
          if (property === "values") return store.getValues();
          return Reflect.get(formRef.current, property);
        },
      }),
    [store],
  );
}
