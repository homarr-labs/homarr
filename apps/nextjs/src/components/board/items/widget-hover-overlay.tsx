"use client";

import { Avatar, Group, Text, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getIconUrl } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { widgetImports } from "@homarr/widgets";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import type { Translator } from "./widget-hover-metadata";
import { collectWidgetHoverMetadata, resolveWidgetDisplayName } from "./widget-hover-metadata";
import classes from "./widget-hover-overlay.module.css";

interface WidgetHoverOverlayProps {
  item: SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const WidgetHoverOverlay = ({ item, integrations }: WidgetHoverOverlayProps) => {
  const [isEditMode] = useEditMode();
  const settings = useSettings();
  const t = useI18n();
  const { definition } = widgetImports[item.kind];
  const WidgetIcon = definition.icon;

  const translate = ((key: string) => t(key as never)) as Translator;
  const displayName = resolveWidgetDisplayName(item, settings, translate);

  const connectedIntegrations = (integrations ?? []).filter((integration) =>
    item.integrationIds.includes(integration.id),
  );
  const metadataItems = collectWidgetHoverMetadata(
    item,
    settings,
    connectedIntegrations.map((integration) => integration.kind),
    translate,
  );
  const hasIntegrations = connectedIntegrations.length > 0;
  const hasMetadata = metadataItems.length > 0;

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

        {hasIntegrations && (
          <Avatar.Group spacing="xs" className={classes.integrations}>
            {connectedIntegrations.map((integration) => (
              <Tooltip key={integration.id} label={integration.name} withArrow position="top">
                <Avatar
                  src={getIconUrl(integration.kind)}
                  size={20}
                  radius="sm"
                  className={classes.integrationAvatar}
                />
              </Tooltip>
            ))}
          </Avatar.Group>
        )}

        {hasMetadata && (
          <Group className={classes.metadata} gap={4}>
            {metadataItems.map((metadataItem) => (
              <div key={`${metadataItem.label}-${metadataItem.value}`} className={classes.metadataItem}>
                <span className={classes.metadataLabel}>{metadataItem.label}</span>
                <span className={classes.metadataValue}>{metadataItem.value}</span>
              </div>
            ))}
          </Group>
        )}
      </div>
    </div>
  );
};
