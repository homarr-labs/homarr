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

import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

export interface CustomWidgetFormDocumentStore {
  getValues(): CustomWidgetFormValues;
  setValues(values: CustomWidgetFormValues): void;
  getDirty(): boolean;
  subscribe(listener: () => void): () => void;
  markSaved(values: CustomWidgetFormValues): void;
}

function areDocumentValuesEqual(left: CustomWidgetFormValues, right: CustomWidgetFormValues) {
  const secretsEqual =
    left.secrets.length === right.secrets.length &&
    left.secrets.every((secret, index) => {
      const other = right.secrets[index];
      return (
        other !== undefined &&
        secret.sourceId === other.sourceId &&
        secret.kind === other.kind &&
        secret.value === other.value &&
        secret.hasValue === other.hasValue
      );
    });
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.iconUrl === right.iconUrl &&
    left.sources === right.sources &&
    left.requests === right.requests &&
    left.options === right.options &&
    left.template === right.template &&
    secretsEqual
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
