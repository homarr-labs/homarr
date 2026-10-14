import { Card, Group, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import type { KubernetesLabelResourceType } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import classes from "./resource-tile.module.css";

export interface ResourceTileProps {
  count: number;
  contextId: string;
  label: KubernetesLabelResourceType;
  assetBase?: string;
  onNavigate?(label: KubernetesLabelResourceType): void;
}

export function ResourceTile({ assetBase = "/images/kubernetes", onNavigate, ...props }: ResourceTileProps) {
  const tResource = useI18n("kubernetes.cluster.resources");
  return (
    <Card
      component="a"
      href={`/manage/tools/kubernetes/${props.label}?context=${encodeURIComponent(props.contextId)}`}
      className={classes.cardContainer}
      onClick={(event) => {
        if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        onNavigate(props.label);
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <img src={`${assetBase}/${props.label}.svg`} alt={props.label} width={64} height={64} />
        <Group gap="xs">
          <Text size="xl" fw={700} tt="capitalize">
            {props.count} {tResource(props.label)}
          </Text>
          <IconArrowRight />
        </Group>
      </Group>
    </Card>
  );
}
