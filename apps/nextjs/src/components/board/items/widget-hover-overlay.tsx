"use client";

import { Avatar, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getIconUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import classes from "./widget-hover-overlay.module.css";

interface WidgetHoverOverlayProps {
  item: SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const WidgetHoverOverlay = ({ item, integrations }: WidgetHoverOverlayProps) => {
  const [isEditMode] = useEditMode();
  const t = useI18n();
  const { definition } = widgetImports[item.kind];
  const WidgetIcon = definition.icon;

  const displayName = item.advancedOptions.title?.trim() || t(`widget.${item.kind}.name`);

  const connectedIntegrations = (integrations ?? []).filter((integration) =>
    item.integrationIds.includes(integration.id),
  );

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

        {connectedIntegrations.length > 0 && (
          <Avatar.Group spacing="xs" className={classes.integrations}>
            {connectedIntegrations.map((integration) => (
              <Tooltip key={integration.id} label={integration.name} withArrow position="top">
                <Avatar
                  src={getIconUrl(integration.kind)}
                  size={18}
                  radius="sm"
                  className={classes.integrationAvatar}
                />
              </Tooltip>
            ))}
          </Avatar.Group>
        )}
      </div>
    </div>
  );
};
