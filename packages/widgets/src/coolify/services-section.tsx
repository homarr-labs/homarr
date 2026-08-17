"use client";

import { Accordion, Anchor, Badge, Group, Stack, Text } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";

import type { CoolifyServiceWithContext } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { cleanFqdn, getBadgeColor, getStatusColor, parseStatus } from "./coolify-utils";
import { ResourceRow } from "./resource-row";

interface ServicesSectionProps {
  services: CoolifyServiceWithContext[];
  baseUrl: string;
  isTiny: boolean;
  isAdvanced: boolean;
}

export function ServicesSection({ services, baseUrl, isTiny, isAdvanced }: ServicesSectionProps) {
  const t = useScopedI18n("widget.coolify");
  const tCommon = useScopedI18n("common");
  const runningServices = services.filter((svc) => parseStatus(svc.status ?? "") === "running").length;

  return (
    <Accordion.Item value="services">
      <Accordion.Control icon={isTiny ? null : <IconStack2 style={iconSizes.md} />}>
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
              <Stack key={service.uuid} gap={2}>
                <ResourceRow item={service} baseUrl={baseUrl} isTiny={isTiny} resourceType="service" />
                {isAdvanced && service.applications && service.applications.length > 0 && (
                  <Stack gap={2} ml="lg">
                    <Text fz="10px" c="dimmed">
                      {tCommon("applications")}
                    </Text>
                    {service.applications.map((application) => (
                      <ServiceApplicationRow key={application.uuid} application={application} />
                    ))}
                  </Stack>
                )}
              </Stack>
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

type ServiceApplication = NonNullable<CoolifyServiceWithContext["applications"]>[number];

const ServiceApplicationRow = ({ application }: { application: ServiceApplication }) => {
  const t = useScopedI18n("widget.coolify");
  const status = parseStatus(application.status ?? "");
  const publicUrl = getSafeApplicationUrl(cleanFqdn(application.fqdn));
  const statusLabel =
    status === "running" ||
    status === "stopped" ||
    status === "exited" ||
    status === "starting" ||
    status === "restarting"
      ? t(`status.${status}`)
      : t("status.unknown");

  return (
    <Group gap={4} wrap="nowrap">
      <Badge size="xs" variant="dot" color={getStatusColor(status)}>
        {statusLabel}
      </Badge>
      {publicUrl ? (
        <Anchor
          className={actionTargetClasses.root}
          href={publicUrl}
          target="_blank"
          rel={SAFE_NEW_TAB_REL}
          fz="xs"
          c="inherit"
          truncate="end"
          style={{ textDecoration: "none" }}
        >
          {application.name}
        </Anchor>
      ) : (
        <Text fz="xs" truncate="end">
          {application.name}
        </Text>
      )}
    </Group>
  );
};
