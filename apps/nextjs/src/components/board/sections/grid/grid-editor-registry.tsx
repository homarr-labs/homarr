"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

import type { ContainerSectionItem, Section, SectionItem } from "~/app/[locale]/boards/_types";
import type { SectionGridPlacement } from "./use-grid-layout-actions";

export interface GridEntryElementSnapshot {
  revision: number;
  elements: ReadonlyMap<string, HTMLElement>;
}

export interface GridEntryElementStore {
  getSnapshot: () => GridEntryElementSnapshot;
  subscribe: (listener: () => void) => () => void;
  register: (id: string, element: HTMLElement | null) => void;
}

export const createGridEntryElementStore = (): GridEntryElementStore => {
  const elements = new Map<string, HTMLElement>();
  const listeners = new Set<() => void>();
  let snapshot: GridEntryElementSnapshot = { revision: 0, elements };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    register: (id, element) => {
      const current = elements.get(id);
      if (element ? current === element : current === undefined) return;

      if (element) elements.set(id, element);
      else elements.delete(id);
      snapshot = { revision: snapshot.revision + 1, elements };
      for (const listener of listeners) listener();
    },
  };
};

export interface GridEditorRenderProps {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  maxRowCount: number | null;
  placements: readonly SectionGridPlacement[];
  transactionPlacements: readonly SectionGridPlacement[];
  className: string;
  section: Exclude<Section, { kind: "container" }> | ContainerSectionItem;
  items: SectionItem[];
  innerSections: ContainerSectionItem[];
  entryElementStore: GridEntryElementStore;
}

export interface RegisteredGridEditor extends GridEditorRenderProps {
  placementMaxRowCount: number | null;
  host: HTMLElement;
  disabled: boolean;
}

interface GridEditorRegistrySnapshot {
  revision: number;
  editors: ReadonlyMap<string, RegisteredGridEditor>;
}

interface GridEditorRegistry {
  getSnapshot: () => GridEditorRegistrySnapshot;
  subscribe: (listener: () => void) => () => void;
  register: (editor: RegisteredGridEditor) => () => void;
}

const createGridEditorRegistry = (): GridEditorRegistry => {
  const editors = new Map<string, RegisteredGridEditor>();
  const listeners = new Set<() => void>();
  let snapshot: GridEditorRegistrySnapshot = { revision: 0, editors };

  const publish = () => {
    snapshot = { revision: snapshot.revision + 1, editors };
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    register: (editor) => {
      editors.set(editor.sectionId, editor);
      publish();
      return () => {
        if (editors.get(editor.sectionId) !== editor) return;
        editors.delete(editor.sectionId);
        publish();
      };
    },
  };
};

const GridEditorRegistryContext = createContext<GridEditorRegistry | null>(null);

export const GridEditorRegistryProvider = ({ children }: PropsWithChildren) => {
  const [registry] = useState(createGridEditorRegistry);
  return <GridEditorRegistryContext.Provider value={registry}>{children}</GridEditorRegistryContext.Provider>;
};

export const useGridEditorRegistry = () => {
  const registry = useContext(GridEditorRegistryContext);
  if (!registry) throw new Error("GridEditorRegistryProvider is required");
  return registry;
};

export const useRegisteredGridEditors = () => {
  const registry = useGridEditorRegistry();
  return useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot).editors;
};
