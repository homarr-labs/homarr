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

import { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

import { areCustomWidgetValuesEqual } from "./_custom-widget-value-equality";

export interface CustomWidgetFormDocumentStore {
  getValues(): CustomWidgetFormValues;
  setValues(values: CustomWidgetFormValues): void;
  getDirty(): boolean;
  subscribe(listener: () => void): () => void;
  markSaved(values: CustomWidgetFormValues): void;
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
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  return {
    getValues: () => values,
    setValues: (nextValues) => {
      if (Object.is(values, nextValues)) return;
      values = nextValues;
      dirty = !areDocumentValuesEqual(nextValues, persistedValues);
      notify();
    },
    getDirty: () => dirty,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    markSaved: (savedValues) => {
      const wasDirty = dirty;
      persistedValues = savedValues;
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
