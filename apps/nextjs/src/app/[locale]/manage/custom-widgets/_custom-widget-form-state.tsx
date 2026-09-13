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
import type { CustomWidgetFormDocumentStore } from "./_flow/document-store";
export { createCustomWidgetFormDocumentStore } from "./_flow/document-store";
export type { CustomWidgetFormDocumentStore } from "./_flow/document-store";

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

export function useOptionalCustomWidgetFormDocumentStore() {
  return useContext(CustomWidgetFormDocumentContext);
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
    const unsubscribeRenames = store.onNodeRenames(() => {
      clearTimeout(timeout);
      setValues(store.getValues());
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
      unsubscribeRenames();
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
  return useSyncExternalStore(store.subscribeEditor, store.getDirty, store.getDirty);
}

export function useCustomWidgetFormDocumentBridge(
  form: UseFormReturnType<CustomWidgetFormValues>,
  store: CustomWidgetFormDocumentStore,
) {
  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => store.onRestore((values) => formRef.current.setValues(values)), [store]);
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
