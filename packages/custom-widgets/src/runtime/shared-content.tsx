"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import type { CustomWidgetExtensions } from "../core/extensions-schema";
import { isCustomWidgetPreferenceValue } from "../core/extensions-schema";
import { useOptionalCustomWidgetRuntime } from "./context";
import type { CustomWidgetContentResult } from "./types";

type Value = CustomWidgetContentResult["value"];
interface ContentState extends CustomWidgetContentResult {
  baseline: Value;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  error?: string;
}
type ContentStates = Record<string, ContentState>;
interface ContentContextValue {
  definitions: NonNullable<CustomWidgetExtensions["content"]>;
  values: Record<string, Value>;
  status: Record<string, Omit<ContentState, "value" | "baseline" | "revision">>;
  setValue(name: string, value: Value): void;
  save(name: string): Promise<void>;
  reset(name: string): Promise<void>;
}
export const WidgetContentContext = createContext<ContentContextValue | null>(null);
export const useWidgetContent = () => useContext(WidgetContentContext);
const EMPTY = {};

export function useCustomWidgetContent(
  definitions: NonNullable<CustomWidgetExtensions["content"]> = EMPTY,
): ContentContextValue {
  const runtime = useOptionalCustomWidgetRuntime();
  const itemId = runtime?.itemId;
  const definitionId = runtime?.definitionId;
  const readContent = runtime?.port.readContent;
  // Receiving live query data must not reset a dirty content draft through a new host callback identity.
  const readPort = useRef(readContent);
  readPort.current = readContent;
  const canRead = Boolean(readContent);
  const writeContent = runtime?.port.writeContent;
  const serializedDefinitions = JSON.stringify(definitions);
  const declared = useMemo(() => JSON.parse(serializedDefinitions) as typeof definitions, [serializedDefinitions]);
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(declared).map(([name, declaration]) => [
          name,
          {
            value: declaration.defaultValue,
            baseline: declaration.defaultValue,
            revision: 0,
            dirty: false,
            loading: Boolean(itemId),
            saving: false,
          },
        ]),
      ),
    [declared, itemId],
  );
  const [states, setStates] = useState<ContentStates>(defaults);
  const current = useRef(states);
  // Keep action guards and submitted values current when React batches input and button events.
  const updateStates = useCallback((update: (previous: ContentStates) => ContentStates) => {
    const next = update(current.current);
    current.current = next;
    setStates(next);
  }, []);
  const generation = useRef(0);
  const pendingOperations = useRef(new Map<string, symbol>());
  const editVersions = useRef<Record<string, number>>({});
  useEffect(() => {
    const loadContent = readPort.current;
    const version = ++generation.current;
    const controller = new AbortController();
    pendingOperations.current.clear();
    editVersions.current = {};
    updateStates(() => defaults);
    if (!canRead || !itemId || !loadContent || !Object.keys(declared).length) return;
    void loadContent({ itemId }, controller.signal)
      .then(({ values }) => {
        if (version !== generation.current) return;
        updateStates((previous) => {
          const next = { ...previous };
          for (const [name, declaration] of Object.entries(declared)) {
            const saved = values[name];
            const field = next[name];
            if (!field) continue;
            next[name] = { ...field, loading: false };
            if (saved && isCustomWidgetPreferenceValue(declaration.type, saved.value)) {
              next[name] = {
                ...field,
                ...saved,
                value: field.dirty ? field.value : saved.value,
                baseline: saved.value,
                dirty: field.dirty && JSON.stringify(field.value) !== JSON.stringify(saved.value),
                loading: false,
              };
            }
          }
          return next;
        });
      })
      .catch((error: unknown) => {
        if (version !== generation.current || controller.signal.aborted) return;
        updateStates((previous) =>
          Object.fromEntries(
            Object.entries(previous).map(([name, field]) => [
              name,
              { ...field, loading: false, error: errorMessage(error) },
            ]),
          ),
        );
      });
    return () => {
      controller.abort();
      generation.current += 1;
    };
  }, [canRead, declared, defaults, definitionId, itemId, updateStates]);
  const setValue = useCallback(
    (name: string, value: Value) => {
      if (!declared[name] || !isCustomWidgetPreferenceValue(declared[name].type, value)) return;
      editVersions.current[name] = (editVersions.current[name] ?? 0) + 1;
      updateStates((previous) => {
        const field = previous[name];
        if (!field) return previous;
        return {
          ...previous,
          [name]: { ...field, value, dirty: JSON.stringify(value) !== JSON.stringify(field.baseline) },
        };
      });
    },
    [declared, updateStates],
  );
  const save = useCallback(
    async (name: string) => {
      const field = current.current[name];
      if (
        !field ||
        !field.dirty ||
        field.saving ||
        field.loading ||
        pendingOperations.current.has(name) ||
        runtime?.isEditMode
      )
        return;
      const version = generation.current;
      const operation = Symbol(name);
      pendingOperations.current.set(name, operation);
      updateStates((previous) => ({
        ...previous,
        [name]: { ...(previous[name] ?? field), saving: true, error: undefined },
      }));
      try {
        let result = { name, value: field.value, revision: field.revision + 1 };
        if (itemId) {
          if (!writeContent) throw new Error(runtime?.messages.requestFailed);
          result = await writeContent({ itemId, name, value: field.value, expectedRevision: field.revision });
        }
        if (version !== generation.current || pendingOperations.current.get(name) !== operation) return;
        updateStates((previous) => {
          const latest = previous[name] ?? field;
          return {
            ...previous,
            [name]: {
              ...latest,
              baseline: result.value,
              revision: result.revision,
              saving: false,
              dirty: JSON.stringify(latest.value) !== JSON.stringify(result.value),
            },
          };
        });
      } catch (error) {
        if (version !== generation.current || pendingOperations.current.get(name) !== operation) return;
        updateStates((previous) => ({
          ...previous,
          [name]: { ...(previous[name] ?? field), saving: false, error: errorMessage(error) },
        }));
      } finally {
        if (pendingOperations.current.get(name) === operation) pendingOperations.current.delete(name);
      }
    },
    [itemId, runtime?.isEditMode, runtime?.messages.requestFailed, writeContent, updateStates],
  );
  const reset = useCallback(
    async (name: string) => {
      const field = current.current[name];
      const declaration = declared[name];
      if (!field || !declaration || field.saving || field.loading || pendingOperations.current.has(name)) return;
      const version = generation.current;
      const editVersion = editVersions.current[name] ?? 0;
      const operation = Symbol(name);
      pendingOperations.current.set(name, operation);
      updateStates((previous) => ({
        ...previous,
        [name]: { ...(previous[name] ?? field), loading: true, error: undefined },
      }));
      try {
        let saved = { value: field.baseline, revision: field.revision };
        if (itemId && readContent)
          saved = (await readContent({ itemId })).values[name] ?? { value: declaration.defaultValue, revision: 0 };
        if (version !== generation.current || pendingOperations.current.get(name) !== operation) return;
        if (!isCustomWidgetPreferenceValue(declaration.type, saved.value))
          throw new Error(runtime?.messages.requestFailed);
        updateStates((previous) => {
          const latest = previous[name] ?? field;
          let value = saved.value;
          if ((editVersions.current[name] ?? 0) !== editVersion) value = latest.value;
          return {
            ...previous,
            [name]: {
              ...latest,
              ...saved,
              value,
              baseline: saved.value,
              dirty: JSON.stringify(value) !== JSON.stringify(saved.value),
              loading: false,
              error: undefined,
            },
          };
        });
      } catch (error) {
        if (version !== generation.current || pendingOperations.current.get(name) !== operation) return;
        updateStates((previous) => ({
          ...previous,
          [name]: { ...(previous[name] ?? field), loading: false, error: errorMessage(error) },
        }));
      } finally {
        if (pendingOperations.current.get(name) === operation) pendingOperations.current.delete(name);
      }
    },
    [declared, itemId, readContent, runtime?.messages.requestFailed, updateStates],
  );
  const values = useMemo(
    () => Object.fromEntries(Object.entries(states).map(([name, field]) => [name, field.value])),
    [states],
  );
  const status = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(states).map(([name, { loading, saving, dirty, error }]) => [
          name,
          { loading, saving, dirty, error },
        ]),
      ),
    [states],
  );
  return { definitions: declared, values, status, setValue, save, reset };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function ContentSaveButton({ name, children }: { name: string; children?: ReactNode }) {
  const content = useWidgetContent();
  const runtime = useOptionalCustomWidgetRuntime();
  const state = content?.status[name];
  return (
    <Stack gap={4}>
      <Button
        type="button"
        loading={state?.saving}
        disabled={!state?.dirty || state.loading || runtime?.isEditMode}
        onClick={() => void content?.save(name)}
      >
        {children ?? name}
      </Button>
      {state?.error && (
        <Text role="alert" size="xs" c="red">
          {state.error}
        </Text>
      )}
    </Stack>
  );
}
export function ContentResetButton({ name, children }: { name: string; children?: ReactNode }) {
  const content = useWidgetContent();
  const state = content?.status[name];
  return (
    <Button
      type="button"
      variant="subtle"
      disabled={state?.saving || state?.loading}
      onClick={() => void content?.reset(name)}
    >
      {children ?? name}
    </Button>
  );
}
