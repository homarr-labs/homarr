"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import classes from "./section-grid.module.css";

interface GridPortalHostContextValue {
  announce: (message: string) => void;
  integrations: RouterOutputs["integration"]["all"] | undefined;
  getEntryRuntime: <TRuntime>(entryId: string, createRuntime: () => TRuntime) => TRuntime;
}

const GridPortalHostContext = createContext<GridPortalHostContextValue | null>(null);

/** Shared board-grid services for editor announcements and integration data. */
export const BoardGridPortalHost = ({ children }: PropsWithChildren) => {
  const board = useRequiredBoard();
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const { data: integrations } = clientApi.integration.all.useQuery(undefined, {
    enabled: Boolean(session) && isEditMode,
  });
  const [announcement, setAnnouncement] = useState({ id: 0, message: "" });
  const entryRuntimesRef = useRef(new Map<string, unknown>());
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({ id: previous.id + 1, message }));
  }, []);
  const getEntryRuntime = useCallback(<TRuntime,>(entryId: string, createRuntime: () => TRuntime): TRuntime => {
    const existing = entryRuntimesRef.current.get(entryId);
    if (existing !== undefined) return existing as TRuntime;
    const runtime = createRuntime();
    entryRuntimesRef.current.set(entryId, runtime);
    return runtime;
  }, []);
  const liveItemIds = useMemo(() => new Set(board.items.map((item) => item.id)), [board.items]);
  useEffect(() => {
    for (const entryId of entryRuntimesRef.current.keys()) {
      if (!liveItemIds.has(entryId)) entryRuntimesRef.current.delete(entryId);
    }
  }, [liveItemIds]);
  const value = useMemo<GridPortalHostContextValue>(
    () => ({ announce, integrations, getEntryRuntime }),
    [announce, getEntryRuntime, integrations],
  );

  return (
    <GridPortalHostContext.Provider value={value}>
      {children}
      <div className={classes.liveRegion} aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.message}</span>
      </div>
    </GridPortalHostContext.Provider>
  );
};

export const useBoardGridPortalHost = () => {
  const context = useContext(GridPortalHostContext);
  if (!context) throw new Error("BoardGridPortalHost is required");
  return context;
};
