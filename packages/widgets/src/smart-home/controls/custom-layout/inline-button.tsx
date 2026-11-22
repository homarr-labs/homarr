"use client";

import { Button } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import classes from "../configuration.module.css";
import { SmartHomeLayoutEditorModal } from "./editor-modal";
import type { SmartHomeControlPalette } from "../types";
import type { SmartHomeLayout } from "./schema";

interface CustomLayoutEditButtonProps {
  integrationId: string | null;
  previewSize: { width: number; height: number };
  palette: SmartHomeControlPalette;
  layout: SmartHomeLayout;
  onChange: (layout: SmartHomeLayout) => void;
}

/** In board edit mode a custom layout opens its editor directly from the widget, like the block editor does. */
export function CustomLayoutEditButton({
  integrationId,
  previewSize,
  palette,
  layout,
  onChange,
}: CustomLayoutEditButtonProps) {
  const t = useI18n("widget.smartHome-controls.layout");
  const { openModal } = useModalAction(SmartHomeLayoutEditorModal);
  return (
    <div className={classes.inlineToolbar} data-grid-no-drag>
      <Button
        size="compact-sm"
        variant="filled"
        leftSection={<IconLayoutGrid size={14} />}
        disabled={!integrationId}
        title={integrationId ? undefined : t("needsIntegration")}
        onClick={() => integrationId && openModal({ integrationId, layout, onSave: onChange, previewSize, palette })}
      >
        {t("edit")}
      </Button>
    </div>
  );
}
