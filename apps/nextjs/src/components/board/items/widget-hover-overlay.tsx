"use client";

import { Suspense, use } from "react";
import { Avatar, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getIconUrl, getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { loadWidgetDefinition } from "@homarr/widgets/manifest";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import classes from "./widget-hover-overlay.module.css";

interface WidgetHoverOverlayProps {
  item: SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const WidgetHoverOverlay = ({ item, integrations }: WidgetHoverOverlayProps) => {
  const [isEditMode] = useEditMode();

  if (!isEditMode) return null;

  return (
    <Suspense fallback={null}>
      <LoadedWidgetHoverOverlay item={item} integrations={integrations} />
    </Suspense>
  );
};

const LoadedWidgetHoverOverlay = ({ item, integrations }: WidgetHoverOverlayProps) => {
  const t = useI18n();
  const definition = use(loadWidgetDefinition(item.kind));
  const WidgetIcon = definition.icon;

  const displayName = item.advancedOptions.title?.trim() || getWidgetName(item.kind, t);

  const connectedIntegrations = (integrations ?? []).filter((integration) =>
    item.integrationIds.includes(integration.id),
  );

  return (
    <div className={classes.wrapper} data-board-widget-header>
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
