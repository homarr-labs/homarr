"use client";

import { useLayoutEffect, useRef } from "react";

const boardDrafts = new Map<string, Set<() => boolean>>();

export const hasUnsavedBoardDrafts = (boardId: string) =>
  Array.from(boardDrafts.get(boardId) ?? []).some((isDirty) => isDirty());

/** Read form values at navigation time, before any pending React/query notifications. */
export const useBoardDraftChanges = (boardId: string | undefined, isDirty: () => boolean) => {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useLayoutEffect(() => {
    if (!boardId) return;
    const drafts = boardDrafts.get(boardId) ?? new Set<() => boolean>();
    const readDirty = () => isDirtyRef.current();
    drafts.add(readDirty);
    boardDrafts.set(boardId, drafts);

    return () => {
      drafts.delete(readDirty);
      if (drafts.size === 0) boardDrafts.delete(boardId);
    };
  }, [boardId]);
};
