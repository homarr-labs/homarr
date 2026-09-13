import { customWidgetFormSchema } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { EMPTY_EDITOR_LAYOUT } from "@homarr/custom-widgets/core";
import type { CustomWidgetEditorLayout } from "@homarr/custom-widgets/core";
import { reconcileDefinitionBindings, restoreCredentialBindings } from "./credential-bindings";
import { getNodeRenames, renameDefinitionBinding, renameEditorNode } from "./node-renames";
import { createEditorHistory, withoutCredentials } from "./history";
import { areCustomWidgetValuesEqual } from "../_custom-widget-value-equality";

export interface CustomWidgetFormDocumentStore {
  getValues(): CustomWidgetFormValues;
  setValues(values: CustomWidgetFormValues): void;
  getDirty(): boolean;
  subscribe(listener: () => void): () => void;
  markSaved(
    values: CustomWidgetFormValues,
    savedLayout?: CustomWidgetEditorLayout,
    savedSourceBindings?: Record<string, string>,
    savedRequestBindings?: Record<string, string>,
  ): void;
  initializeLayout(layout: CustomWidgetEditorLayout): void;
  getLayout(): CustomWidgetEditorLayout;
  getSourceBindings(): Record<string, string>;
  getRequestBindings(): Record<string, string>;
  setLayout(layout: CustomWidgetEditorLayout): void;
  subscribeEditor(listener: () => void): () => void;
  getRevision(): number;
  renameSourceBinding(previousId: string, nextId: string): void;
  renameRequestBinding(previousId: string, nextId: string): void;
  onNodeRenames(listener: (renames: Readonly<Record<string, string>>) => void): () => void;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
  reset(): void;
  transaction(action: () => void): void;
  onRestore(listener: (values: CustomWidgetFormValues) => void): () => void;
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
  initialLayout: CustomWidgetEditorLayout = EMPTY_EDITOR_LAYOUT,
): CustomWidgetFormDocumentStore {
  let values = initialValues;
  let persistedValues = initialValues;
  let layout = initialLayout;
  let persistedLayout = layout;
  let sourceBindings = reconcileDefinitionBindings(initialValues.sources, {});
  let persistedSourceBindings = sourceBindings;
  let requestBindings = reconcileDefinitionBindings(initialValues.requests, {});
  let persistedRequestBindings = requestBindings;
  let notifiedSources = sourceBindings;
  let notifiedRequests = requestBindings;
  let revision = 0;
  let transactionDepth = 0;
  const history = createEditorHistory();
  const listeners = new Set<() => void>();
  const editorListeners = new Set<() => void>();
  const restoreListeners = new Set<(values: CustomWidgetFormValues) => void>();
  const renameListeners = new Set<(renames: Readonly<Record<string, string>>) => void>();
  const snapshot = () => ({ content: withoutCredentials(values), layout, sourceBindings, requestBindings });
  const notifyEditor = () => {
    revision += 1;
    const renames = {
      ...getNodeRenames(notifiedSources, sourceBindings, "source"),
      ...getNodeRenames(notifiedRequests, requestBindings, "request"),
    };
    notifiedSources = sourceBindings;
    notifiedRequests = requestBindings;
    if (Object.keys(renames).length) renameListeners.forEach((listener) => listener(renames));
    editorListeners.forEach((listener) => listener());
  };
  const notify = () => {
    listeners.forEach((listener) => listener());
    notifyEditor();
  };
  const restore = (next: ReturnType<typeof snapshot> | undefined) => {
    if (!next) return;
    const changed = !areCustomWidgetValuesEqual(withoutCredentials(values), next.content);
    layout = next.layout;
    // Secrets intentionally stay in the live form, never in history.
    if (changed) {
      values = {
        ...next.content,
        secrets: restoreCredentialBindings(values.secrets, sourceBindings, next.sourceBindings, next.content.sources),
      };
      sourceBindings = next.sourceBindings;
      requestBindings = next.requestBindings;
      restoreListeners.forEach((listener) => listener(values));
      notify();
    } else {
      sourceBindings = next.sourceBindings;
      requestBindings = next.requestBindings;
      notifyEditor();
    }
  };
  return {
    getValues: () => values,
    setValues: (nextValues) => {
      if (areDocumentValuesEqual(values, nextValues)) return;
      const changed = documentValueKeys.filter((key) => !areCustomWidgetValuesEqual(values[key], nextValues[key]));
      if (transactionDepth === 0 && changed.some((key) => key !== "secrets")) {
        history.record(snapshot(), changed.join(":"));
      }
      if (changed.includes("sources")) sourceBindings = reconcileDefinitionBindings(nextValues.sources, sourceBindings);
      if (changed.includes("requests"))
        requestBindings = reconcileDefinitionBindings(nextValues.requests, requestBindings);
      values = nextValues;
      if (transactionDepth === 0) notify();
    },
    getDirty: () =>
      !areDocumentValuesEqual(values, persistedValues) || !areCustomWidgetValuesEqual(layout, persistedLayout),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    markSaved: (
      savedValues,
      savedLayout = layout,
      savedSourceBindings = sourceBindings,
      savedRequestBindings = requestBindings,
    ) => {
      persistedValues = savedValues;
      persistedLayout = savedLayout;
      persistedSourceBindings = savedSourceBindings;
      persistedRequestBindings = savedRequestBindings;
      notifyEditor();
    },
    initializeLayout: (next) => {
      layout = next;
      persistedLayout = next;
      notifyEditor();
    },
    getLayout: () => layout,
    getSourceBindings: () => sourceBindings,
    getRequestBindings: () => requestBindings,
    setLayout: (next) => {
      if (areCustomWidgetValuesEqual(layout, next)) return;
      if (transactionDepth === 0) history.record(snapshot(), "");
      layout = next;
      if (transactionDepth === 0) notifyEditor();
    },
    subscribeEditor: (listener) => {
      editorListeners.add(listener);
      return () => {
        editorListeners.delete(listener);
      };
    },
    getRevision: () => revision,
    renameSourceBinding: (previousId, nextId) => {
      sourceBindings = renameDefinitionBinding(sourceBindings, previousId, nextId);
      layout = renameEditorNode(layout, `source:${previousId}`, `source:${nextId}`);
    },
    renameRequestBinding: (previousId, nextId) => {
      requestBindings = renameDefinitionBinding(requestBindings, previousId, nextId);
      layout = renameEditorNode(layout, `request:${previousId}`, `request:${nextId}`);
    },
    onNodeRenames: (listener) => {
      renameListeners.add(listener);
      return () => {
        renameListeners.delete(listener);
      };
    },
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
    undo: () => restore(history.undo(snapshot())),
    redo: () => restore(history.redo(snapshot())),
    reset: () => {
      history.record(snapshot(), "");
      restore({
        content: withoutCredentials(persistedValues),
        layout: persistedLayout,
        sourceBindings: persistedSourceBindings,
        requestBindings: persistedRequestBindings,
      });
    },
    transaction: (action) => {
      const previous = snapshot();
      const previousValues = values;
      transactionDepth += 1;
      try {
        action();
      } catch (error) {
        layout = previous.layout;
        values = previousValues;
        sourceBindings = previous.sourceBindings;
        requestBindings = previous.requestBindings;
        restoreListeners.forEach((listener) => listener(values));
        throw error;
      } finally {
        transactionDepth -= 1;
        if (transactionDepth === 0 && !areCustomWidgetValuesEqual(previous, snapshot())) {
          history.record(previous, "");
          if (!areCustomWidgetValuesEqual(previous.content, withoutCredentials(values))) notify();
          else notifyEditor();
        } else if (transactionDepth === 0 && !areDocumentValuesEqual(previousValues, values)) notify();
      }
    },
    onRestore: (listener) => {
      restoreListeners.add(listener);
      return () => {
        restoreListeners.delete(listener);
      };
    },
  };
}
