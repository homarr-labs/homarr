"use client";

import { useState } from "react";
import { Accordion, Anchor, Badge, Card, Group, Image, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { ApplicationsSection } from "./applications-section";
import classes from "./component.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { buildServerResourceCounts, getBadgeColor, isCoolifyServerOnline, parseStatus } from "./coolify-utils";
import { ServersSection } from "./servers-section";
import { ServicesSection } from "./services-section";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_ICON_URL } from "./types";

interface InstanceCardProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isTiny: boolean;
  isAdvanced: boolean;
  widgetKey: string;
}

export function InstanceCard({ instance, options, isTiny, isAdvanced, widgetKey }: InstanceCardProps) {
  const t = useI18n("widget.coolify");
  const cardKey = `${widgetKey}-${instance.integrationId}`;
  const [showIp, setShowIp] = useLocalStorage({
    key: `coolify-show-ip-${cardKey}`,
    defaultValue: false,
  });
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: `coolify-sections-${cardKey}`,
    defaultValue: ["applications"],
  });
  const [advancedOpenSections, setAdvancedOpenSections] = useState(["servers", "applications", "services"]);
  const serverResourceCounts = buildServerResourceCounts(
    instance.instanceInfo.servers,
    instance.instanceInfo.applications,
    instance.instanceInfo.services,
  );

  const baseUrl = getSafeApplicationUrl(instance.integrationUrl)?.replace(/\/+$/, "") ?? "";
  const displayUrl = baseUrl ? baseUrl.replace(/^https?:\/\//, "") : "—";
  const onlineServers = instance.instanceInfo.servers.filter(isCoolifyServerOnline).length;
  const runningApps = instance.instanceInfo.applications.filter(
    (a) => parseStatus(a.status ?? "") === "running",
  ).length;
  const runningServices = instance.instanceInfo.services.filter(
    (s) => parseStatus(s.status ?? "") === "running",
  ).length;

  return (
    <Card p={0} radius="sm" bg="transparent">
      <Group p="xs" justify="space-between" wrap="nowrap" className={classes.neutralDividerBottom}>
        <Group gap={4} wrap="nowrap" miw={0}>
          <Image src={COOLIFY_ICON_URL} alt="Coolify" w={16} h={16} />
          <Stack gap={0} miw={0}>
            <Anchor
              component={baseUrl ? "a" : "span"}
              href={baseUrl}
              target={baseUrl ? "_blank" : undefined}
              rel={baseUrl ? SAFE_NEW_TAB_REL : undefined}
              fz={isTiny ? "10px" : "xs"}
              fw={600}
              c="inherit"
              lineClamp={1}
            >
              {instance.integrationName}
            </Anchor>
            {isAdvanced && (
              <Text fz="10px" c="dimmed" truncate="end">
                {t("source.url", { url: displayUrl })}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap={4} wrap="nowrap">
          {options.showServers && (
            <Badge variant="dot" color={getBadgeColor(onlineServers, instance.instanceInfo.servers.length)} size="xs">
              {onlineServers}/{instance.instanceInfo.servers.length}
            </Badge>
          )}
          {options.showApplications && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningApps, instance.instanceInfo.applications.length)}
              size="xs"
            >
              {runningApps}/{instance.instanceInfo.applications.length}
            </Badge>
          )}
          {options.showServices && (
            <Badge
              variant="dot"
              color={getBadgeColor(runningServices, instance.instanceInfo.services.length)}
              size="xs"
            >
              {runningServices}/{instance.instanceInfo.services.length}
            </Badge>
          )}
        </Group>
      </Group>

      <Accordion
        className={classes.accordion}
        variant="filled"
        chevronPosition="right"
        multiple
        keepMounted={false}
        value={isAdvanced ? advancedOpenSections : openSections}
        onChange={isAdvanced ? setAdvancedOpenSections : setOpenSections}
      >
        {options.showServers && (
          <ServersSection
            servers={instance.instanceInfo.servers}
            serverResourceCounts={serverResourceCounts}
            baseUrl={baseUrl}
            isTiny={isTiny}
            isAdvanced={isAdvanced}
            showIp={showIp}
            onToggleIp={() => setShowIp((prev) => !prev)}
          />
        )}
        {options.showApplications && (
          <ApplicationsSection applications={instance.instanceInfo.applications} baseUrl={baseUrl} isTiny={isTiny} />
        )}
        {options.showServices && (
          <ServicesSection
            services={instance.instanceInfo.services}
            baseUrl={baseUrl}
            isTiny={isTiny}
            isAdvanced={isAdvanced}
          />
        )}
      </Accordion>

      <InstanceFooter version={instance.instanceInfo.version} updatedAt={instance.updatedAt} />
    </Card>
  );
}

const InstanceFooter = ({ version, updatedAt }: { version: string; updatedAt: Date }) => {
  const t = useI18n("widget.coolify");
  const relativeTime = useTimeAgo(updatedAt, 60_000);
  return (
    <Group justify="space-between" p={4} className={classes.neutralDividerTop}>
      <Text size="10px" c="dimmed">
        v{version}
      </Text>
      <Text size="10px" c="dimmed">
        {t("footer.updated", { when: relativeTime })}
      </Text>
    </Group>
  );
};
