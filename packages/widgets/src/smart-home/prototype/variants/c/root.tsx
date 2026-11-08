"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DetailProvider, EntityDetail } from "../e/details";
import classes from "./styles.module.css";

interface ControlListRootProps {
  isEditMode: boolean;
  children: ReactNode;
}

export function ControlListRoot({ isEditMode, children }: ControlListRootProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(() => (isEditMode ? null : { open: setDetailId }), [isEditMode]);

  return (
    <DetailProvider value={detail}>
      <div className={classes.root} inert={isEditMode} data-editing={isEditMode || undefined}>
        {children}
      </div>
      <EntityDetail entityId={detail && detailId} onClose={() => setDetailId(null)} onOpen={setDetailId} />
    </DetailProvider>
  );
}
