"use client";

import { Anchor, Group, Stack, Text } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function DawarichPlacesWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"dawarichPlaces">) {
  const t = useI18n();
  const { data: places } = clientApi.widget.dawarich.getPlaces.useQuery(
    {
      integrationId: integrationIds[0] ?? "",
      limit: options.maxPlaces,
    },
    { staleTime: 5 * 60 * 1000 },
  );

  if (!places || places.length === 0) return <WidgetEmptyState />;

  return (
    <Stack gap="xs" h="100%" p="md">
      {places.map((place) => (
        <Group key={place.id} gap="sm" align="center" className={classes.placeItem}>
          <IconMapPin size={16} />
          <Text size="sm" fw={500} style={{ flex: 1 }}>
            {place.name}
          </Text>
          <Text size="xs" c="dimmed">
            {place.visits_count} {t("widget.dawarichPlaces.visits")}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
