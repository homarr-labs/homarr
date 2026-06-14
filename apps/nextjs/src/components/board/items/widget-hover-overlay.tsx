"use client";

import { Text } from "@mantine/core";

import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { resolveWidgetDisplayName } from "./widget-hover-metadata";
import classes from "./widget-hover-overlay.module.css";

interface WidgetHoverOverlayProps {
  item: SectionItem;
}

export const WidgetHoverOverlay = ({ item }: WidgetHoverOverlayProps) => {
  const [isEditMode] = useEditMode();
  const settings = useSettings();
  const t = useI18n();
  const { definition } = widgetImports[item.kind];
  const WidgetIcon = definition.icon;

  const displayName = resolveWidgetDisplayName(item, settings, (key) => t(key as never));

  if (!isEditMode) {
    return null;
  }

  return (
    <div className={classes.wrapper}>
      <div className={classes.panel}>
        <div className={classes.nameSection}>
          <WidgetIcon size={14} stroke={1.75} className={classes.widgetIcon} />
          <Text className={classes.name} title={displayName}>
            {displayName}
          </Text>
        </div>
      </div>
    </div>
  );
};
