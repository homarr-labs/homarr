"use client";
import { createContext, useContext, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CustomWidgetFormDocumentStore } from "./document-store";
import { remapWorkbenchSelection } from "./node-renames";
export const WorkbenchSelectionContext = createContext<string | undefined>(undefined);
export const useWorkbenchSelection = () => useContext(WorkbenchSelectionContext);

export function useWorkbenchRenames(
  store: CustomWidgetFormDocumentStore,
  setSelected: Dispatch<SetStateAction<string>>,
  setSelection: Dispatch<SetStateAction<string[]>>,
) {
  useEffect(
    () =>
      store.onNodeRenames((renames) => {
        setSelected((id) => renames[id] ?? id);
        setSelection((ids) => remapWorkbenchSelection(ids, renames));
      }),
    [store, setSelected, setSelection],
  );
}
