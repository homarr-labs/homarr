"use client";

import { useMemo, useState } from "react";

import { usePrototypeEntities } from "../../store";
import type { PrototypeVariantProps } from "../../types";
import { EntityControl, EntityDetail } from "./entity-controls";
import { DetailProvider } from "./hooks";
import { ActionsPreset, AreaPreset, OverviewPreset, SensorsPreset } from "./presets";
import classes from "./styles.module.css";
import { Empty } from "./theme";

export const variantEName = "Rich controls";

function EntityPreset({ entityId, width, height }: { entityId: string; width: number; height: number }) {
  const entity = usePrototypeEntities()[entityId];
  if (!entity) {
    return <Empty title="Entity not available" hint={`${entityId} is not in this widget's selection.`} />;
  }
  return <EntityControl entity={entity} width={width} height={height} />;
}

export function VariantE({ preset, areaId, entityId, width, height, isEditMode }: PrototypeVariantProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(() => (isEditMode ? null : { open: setDetailId }), [isEditMode]);

  return (
    <DetailProvider value={detail}>
      <div className={classes.root} data-edit={isEditMode} data-preset={preset}>
        {preset === "overview" ? <OverviewPreset width={width} height={height} /> : null}
        {preset === "area" ? <AreaPreset width={width} height={height} areaId={areaId} /> : null}
        {preset === "entity" ? <EntityPreset entityId={entityId} width={width} height={height} /> : null}
        {preset === "actions" ? <ActionsPreset width={width} height={height} /> : null}
        {preset === "sensors" ? <SensorsPreset width={width} height={height} /> : null}
      </div>
      <EntityDetail entityId={isEditMode ? null : detailId} onClose={() => setDetailId(null)} onOpen={setDetailId} />
    </DetailProvider>
  );
}
