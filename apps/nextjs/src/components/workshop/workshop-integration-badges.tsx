"use client";

import { Badge, Group, Image } from "@mantine/core";

import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import type { HttpIntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

export function WorkshopIntegrationBadges({ kinds }: { kinds: readonly HttpIntegrationKind[] }) {
  const t = useI18n("workshop");
  if (kinds.length === 0) return null;

  return (
    <Group component="ul" gap={6} m={0} p={0} style={{ listStyle: "none" }} aria-label={t("integrations")}>
      {kinds.map((kind) => (
        <Badge
          component="li"
          key={kind}
          size="sm"
          variant="light"
          tt="none"
          leftSection={<Image src={getIconUrl(kind)} alt="" w={12} h={12} fit="contain" loading="lazy" />}
        >
          {getIntegrationName(kind)}
        </Badge>
      ))}
    </Group>
  );
}
