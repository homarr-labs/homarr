"use client";

import { useEffect, useRef, useState } from "react";

import { useUnsavedChangesGuard } from "~/components/manage/use-unsaved-changes-guard";
import { isRecord } from "@homarr/common";

import { documentFromSource, recoveryDocument } from "./_package-document";
import type { PackageDocument } from "./_package-document";

const maximumHistoryBytes = 2_000_000;
const maximumRecoveryBytes = 1_000_000;

export function usePackageDocument(
  initial: PackageDocument,
  userId: string,
  installationId?: string,
  connectionsDirty = false,
) {
  const [document, setDocument] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [recovery, setRecovery] = useState<PackageDocument | null>(null);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const history = useRef({ entries: [JSON.stringify(initial)], index: 0, lastChange: 0, field: "" });
  const current = useRef(document);
  const key = `homarr:custom-widget-recovery:${userId}`;
  const definitionId = `package:${installationId ?? "new"}`;
  const dirty = JSON.stringify(document) !== JSON.stringify(saved);
  current.current = document;

  const syncHistory = () =>
    setHistoryState({
      undo: history.current.index > 0,
      redo: history.current.index < history.current.entries.length - 1,
    });
  const edit = (next: PackageDocument, field = "") => {
    const state = history.current;
    const serialized = JSON.stringify(next);
    if (serialized === state.entries[state.index]) return;
    const now = Date.now();
    const coalesce =
      field &&
      state.field === field &&
      now - state.lastChange < 600 &&
      state.index > 0 &&
      state.index === state.entries.length - 1;
    state.entries = state.entries.slice(0, state.index + 1);
    if (coalesce) state.entries[state.index] = serialized;
    else {
      state.entries.push(serialized);
      state.index += 1;
    }
    let size = state.entries.reduce((sum, entry) => sum + entry.length, 0);
    while (state.entries.length > 1 && (state.entries.length > 100 || size > maximumHistoryBytes)) {
      size -= state.entries.shift()?.length ?? 0;
      state.index -= 1;
    }
    state.lastChange = now;
    state.field = field;
    current.current = next;
    setDocument(next);
    syncHistory();
  };
  const move = (offset: number) => {
    const state = history.current;
    const index = state.index + offset;
    if (index < 0 || index >= state.entries.length) return;
    state.index = index;
    state.field = "";
    const entry = state.entries[index];
    if (!entry) return;
    const next = JSON.parse(entry) as PackageDocument;
    current.current = next;
    setDocument(next);
    syncHistory();
  };

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (!isRecord(stored) || stored.definitionId !== definitionId || !isRecord(stored.content)) return;
      const content = stored.content;
      if (typeof content.name !== "string" || typeof content.metadata !== "string" || !isRecord(content.files)) return;
      const next = documentFromSource(content.name, { files: content.files, _draftMetadata: content.metadata });
      if (JSON.stringify(next) !== JSON.stringify(initial)) setRecovery(next);
    } catch {
      /* Browser recovery is optional. */
    }
  }, [definitionId, initial, key]);

  useEffect(() => {
    if (recovery) return;
    const timer = setTimeout(() => {
      try {
        if (!dirty) {
          const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
          if (isRecord(stored) && stored.definitionId === definitionId) localStorage.removeItem(key);
          return;
        }
        const payload = JSON.stringify({ definitionId, content: recoveryDocument(document) });
        if (payload.length <= maximumRecoveryBytes) localStorage.setItem(key, payload);
      } catch {
        /* Storage may be unavailable or full. */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [definitionId, dirty, document, key, recovery]);

  useUnsavedChangesGuard(dirty || connectionsDirty, { navigationKey: installationId });

  const discardRecovery = () => {
    setRecovery(null);
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (isRecord(stored) && stored.definitionId === definitionId) localStorage.removeItem(key);
    } catch {
      /* Optional storage. */
    }
  };
  const markSaved = (value: PackageDocument) => {
    setSaved(value);
    history.current.field = "";
    if (JSON.stringify(current.current) === JSON.stringify(value)) discardRecovery();
  };
  return {
    document,
    dirty,
    edit,
    undo: () => move(-1),
    redo: () => move(1),
    historyState,
    reset: () => edit(saved),
    markSaved,
    recovery,
    discardRecovery,
    restoreRecovery: () => {
      if (recovery) edit(recovery);
      discardRecovery();
    },
  };
}
