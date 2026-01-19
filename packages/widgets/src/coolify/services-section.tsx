"use client";

import { Accordion, Badge, Group, Stack, Text } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";

import type { CoolifyServiceWithContext } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { getBadgeColor, parseStatus } from "./coolify-utils";
import { ResourceRow } from "./resource-row";

interface ServicesSectionProps {
  services: CoolifyServiceWithContext[];
  baseUrl: string;
  isTiny: boolean;
}

export function ServicesSection({ services, baseUrl, isTiny }: ServicesSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const runningServices = services.filter((svc) => parseStatus(svc.status ?? "") === "running").length;

  return (
    <Accordion.Item value="services">
      <Accordion.Control icon={isTiny ? null : <IconStack2 size={16} />}>
        <Group gap="xs">
          <Text size="xs">{tCommon("services")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningServices, services.length)} size="xs">
            {runningServices} / {services.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {services.length > 0 ? (
          <Stack gap={4}>
            {services.map((service) => (
              <ResourceRow key={service.uuid} item={service} baseUrl={baseUrl} isTiny={isTiny} resourceType="service" />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.services")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
