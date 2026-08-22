"use client";

import type { ComponentType, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useEditMode } from "@homarr/boards/edit-mode";

import { getLoadedGridEditorModule, loadGridEditorAsync } from "./grid-editor-loader";
import { useRegisteredGridEditors } from "./grid-editor-registry";
import { GridEditorRuntimeProvider } from "./grid-editor-runtime";

type BoardGridEditorProviderComponent = ComponentType<PropsWithChildren>;
type LoadedGridEditorModule = Awaited<ReturnType<typeof loadGridEditorAsync>>;

/**
 * Keeps the dnd-kit runtime outside the read-only bundle while guaranteeing
 * that every root and nested grid shares one drag-and-drop provider.
 */
export const BoardGridEditorBoundary = ({ children }: PropsWithChildren) => {
  const [isEditMode] = useEditMode();
  const [EditorModule, setEditorModule] = useState<LoadedGridEditorModule | null>(
    getLoadedGridEditorModule() ?? null,
  );
  const [hasLoadError, setHasLoadError] = useState(false);
  const resolvedEditorModule = EditorModule ?? getLoadedGridEditorModule() ?? null;

  useEffect(() => {
    if (!isEditMode || resolvedEditorModule) return;

    let cancelled = false;
    setHasLoadError(false);
    void loadGridEditorAsync()
      .then((module) => {
        if (!cancelled) setEditorModule(module);
      })
      .catch(() => {
        if (!cancelled) setHasLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditMode, resolvedEditorModule]);

  const runtimeStatus = !isEditMode
    ? "idle"
    : hasLoadError
      ? "error"
      : resolvedEditorModule
        ? "ready"
        : "loading";
  const Provider: BoardGridEditorProviderComponent | null = resolvedEditorModule?.BoardGridEditorProvider ?? null;
  const GridEditor = resolvedEditorModule?.default ?? null;

  return (
    <>
      <GridEditorRuntimeProvider status={runtimeStatus}>{children}</GridEditorRuntimeProvider>
      {isEditMode && Provider && GridEditor && (
        <Provider>
          <RegisteredGridEditors GridEditor={GridEditor} />
        </Provider>
      )}
    </>
  );
};

const RegisteredGridEditors = ({ GridEditor }: { GridEditor: LoadedGridEditorModule["default"] }) => {
  const editors = useRegisteredGridEditors();

  return Array.from(editors.values(), ({ host, disabled, ...props }) =>
    disabled ? null : createPortal(<GridEditor {...props} />, host, props.sectionId),
  );
};
