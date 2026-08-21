"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useEditMode } from "@homarr/boards/edit-mode";
import classes from "./section-grid.module.css";

interface GridPortalHostContextValue {
  announce: (message: string) => void;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

const GridPortalHostContext = createContext<GridPortalHostContextValue | null>(null);

/** Shared board-grid services for editor announcements and integration data. */
export const BoardGridPortalHost = ({ children }: PropsWithChildren) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const { data: integrations } = clientApi.integration.all.useQuery(undefined, {
    enabled: Boolean(session) && isEditMode,
  });
  const [announcement, setAnnouncement] = useState({ id: 0, message: "" });
  const announce = useCallback((message: string) => {
    setAnnouncement((previous) => ({ id: previous.id + 1, message }));
  }, []);
  const value = useMemo<GridPortalHostContextValue>(
    () => ({ announce, integrations }),
    [announce, integrations],
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
