"use client";

import type { ComponentType, PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useEditMode } from "@homarr/boards/edit-mode";

import { loadGridEditorAsync } from "./grid-editor-loader";
import { GridEditorRuntimeProvider } from "./grid-editor-runtime";

type BoardGridEditorProviderComponent = ComponentType<PropsWithChildren>;

/**
 * Keeps the dnd-kit runtime outside the read-only bundle while guaranteeing
 * that every root and nested grid shares one drag-and-drop provider.
 */
export const BoardGridEditorBoundary = ({ children }: PropsWithChildren) => {
  const [isEditMode] = useEditMode();
  const [Provider, setProvider] = useState<BoardGridEditorProviderComponent | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    if (!isEditMode || Provider) return;

    let cancelled = false;
    setHasLoadError(false);
    void loadGridEditorAsync()
      .then((module) => {
        if (!cancelled) setProvider(() => module.BoardGridEditorProvider);
      })
      .catch(() => {
        if (!cancelled) setHasLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [Provider, isEditMode]);

  if (!isEditMode) {
    return <GridEditorRuntimeProvider status="idle">{children}</GridEditorRuntimeProvider>;
  }

  if (hasLoadError) {
    return <GridEditorRuntimeProvider status="error">{children}</GridEditorRuntimeProvider>;
  }

  if (!Provider) {
    return <GridEditorRuntimeProvider status="loading">{children}</GridEditorRuntimeProvider>;
  }

  return (
    <GridEditorRuntimeProvider status="ready">
      <Provider>{children}</Provider>
    </GridEditorRuntimeProvider>
  );
};
