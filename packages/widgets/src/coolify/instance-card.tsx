"use client";

import { Accordion, Anchor, Badge, Card, Group, Image, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { ApplicationsSection } from "./applications-section";
import { buildServerResourceCounts, getBadgeColor, parseStatus } from "./coolify-utils";
import { ServersSection } from "./servers-section";
import { ServicesSection } from "./services-section";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_ICON_URL } from "./types";

interface InstanceCardProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isTiny: boolean;
  widgetKey: string;
}

export function InstanceCard({ instance, options, isTiny, widgetKey }: InstanceCardProps) {
  const t = useScopedI18n("widget.coolify");
  const cardKey = `${widgetKey}-${instance.integrationId}`;
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${cardKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${cardKey}`,
    defaultValue: ["applications"],
  });

  const servers = instance.instanceInfo.servers ?? [];
  const applications = instance.instanceInfo.applications ?? [];
  const services = instance.instanceInfo.services ?? [];

  const serverResourceCounts = buildServerResourceCounts(servers, applications, services);

  const baseUrl = instance.integrationUrl.replace(/\/+$/, "");
  const relativeTime = useTimeAgo(instance.updatedAt);

  const onlineServers = servers.filter((s) => s.is_reachable !== false).length;
  const runningApps = applications.filter((a) => parseStatus(a.status ?? "") === "running").length;
  const runningServices = services.filter((s) => parseStatus(s.status ?? "") === "running").length;

  return (
    <Card p={0} radius="sm">
      <Group
        p="xs"
        justify="space-between"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
      >
        <Group gap={4} wrap="nowrap">
          <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
          <Anchor href={baseUrl} target="_blank" fz={isTiny ? "10px" : "xs"} fw={600} c="inherit" lineClamp={1}>
            {instance.integrationName}
          </Anchor>
        </Group>
        <Group gap={4} wrap="nowrap">
          {options.showServers && (
            <Badge variant="dot" color={getBadgeColor(onlineServers, servers.length)} size="xs">
              {onlineServers}/{servers.length}
            </Badge>
          )}
          {options.showApplications && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningApps, applications.length)}
              size="xs"
            >
              {runningApps}/{applications.length}
            </Badge>
          )}
          {options.showServices && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningServices, services.length)}
              size="xs"
            >
              {runningServices}/{services.length}
            </Badge>
          )}
        </Group>
      </Group>

      <Accordion variant="filled" chevronPosition="right" multiple value={openSections} onChange={setOpenSections}>
        {options.showServers && (
          <ServersSection
            servers={servers}
            serverResourceCounts={serverResourceCounts}
            baseUrl={baseUrl}
            isTiny={isTiny}
            showIp={showIp}
            onToggleIp={() => setShowIp((prev) => !prev)}
          />
        )}
        {options.showApplications && (
          <ApplicationsSection applications={applications} baseUrl={baseUrl} isTiny={isTiny} />
        )}
        {options.showServices && (
          <ServicesSection services={services} baseUrl={baseUrl} isTiny={isTiny} />
        )}
      </Accordion>

      <Group justify="space-between" p={4} style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
        <Text size="10px" c="dimmed">
          v{instance.instanceInfo.version}
        </Text>
        <Text size="10px" c="dimmed">
          {t("footer.updated", { when: relativeTime })}
        </Text>
      </Group>
    </Card>
  );
}
