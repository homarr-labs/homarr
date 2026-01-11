"use client";

import { Accordion, Badge, Group, Stack, Text } from "@mantine/core";
import { IconCloud } from "@tabler/icons-react";

import type { CoolifyApplicationWithContext } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { getBadgeColor, parseStatus } from "./coolify-utils";
import { ResourceRow } from "./resource-row";

interface ApplicationsSectionProps {
  applications: CoolifyApplicationWithContext[];
  baseUrl: string;
  isTiny: boolean;
}

export function ApplicationsSection({ applications, baseUrl, isTiny }: ApplicationsSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const runningApps = applications.filter((app) => parseStatus(app.status) === "running").length;

  return (
    <Accordion.Item value="applications">
      <Accordion.Control icon={isTiny ? null : <IconCloud size={16} />}>
        <Group gap="xs">
          <Text size="xs">{tCommon("applications")}</Text>
          <Badge variant="dot" color={getBadgeColor(runningApps, applications.length)} size="xs">
            {runningApps} / {applications.length}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel p={4}>
        {applications.length > 0 ? (
          <Stack gap={4}>
            {applications.map((app) => (
              <ResourceRow key={app.uuid} item={app} baseUrl={baseUrl} isTiny={isTiny} resourceType="application" />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {t("empty.applications")}
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
