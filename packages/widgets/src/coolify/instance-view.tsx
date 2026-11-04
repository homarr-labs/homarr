"use client";

import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Group,
  Image,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  VisuallyHidden,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconApps,
  IconCircleCheck,
  IconEye,
  IconEyeOff,
  IconSearch,
  IconServer,
  IconStack2,
} from "@tabler/icons-react";

import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import {
  buildServerResourceCounts,
  getCoolifyAttentionItems,
  getCoolifyAttentionSummary,
  getStatusColor,
  isCoolifyServerHealthy,
  parseStatus,
} from "./coolify-utils";
import classes from "./component.module.css";
import { ResourceRow } from "./resource-row";
import { ServerRow } from "./server-row";
import { ServiceApplicationRow } from "./service-application-row";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_ICON_URL } from "./types";

interface InstanceViewProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isAdvanced: boolean;
  isSingle: boolean;
  storageKey: string;
  width: number;
  height: number;
}

export function InstanceView({
  instance,
  options,
  isAdvanced,
  isSingle,
  storageKey,
  width,
  height,
}: InstanceViewProps) {
  const t = useI18n("widget.coolify");
  const tCommon = useI18n("common");
  const [search, setSearch] = useState("");
  const [showIp, setShowIp] = useLocalStorage({
    key: storageKey,
    defaultValue: false,
  });
  const info = instance.instanceInfo;
  const visibleOptions = isAdvanced ? { showServers: true, showApplications: true, showServices: true } : options;
  const attention = getCoolifyAttentionItems(info, visibleOptions);
  const trackedCount =
    (visibleOptions.showServers ? info.servers.length : 0) +
    (visibleOptions.showApplications ? info.applications.length : 0) +
    (visibleOptions.showServices ? info.services.length : 0);
  const summary = getCoolifyAttentionSummary(attention, trackedCount);
  const healthyServers = info.servers.filter(isCoolifyServerHealthy).length;
  const runningApps = info.applications.filter((app) => parseStatus(app.status ?? "") === "running").length;
  const runningServices = info.services.filter((service) => parseStatus(service.status ?? "") === "running").length;
  const baseUrl = getSafeApplicationUrl(instance.externalUrl ?? instance.integrationUrl)?.replace(/\/+$/, "") ?? "";
  const relativeTime = useTimeAgo(instance.updatedAt, 60_000);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchesSearch = (name: string, projectName?: string, environmentName?: string) =>
    [name, projectName, environmentName].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
  const applications = info.applications.filter((app) => matchesSearch(app.name, app.projectName, app.environmentName));
  const services = info.services.filter((service) =>
    matchesSearch(service.name, service.projectName, service.environmentName),
  );
  const servers = info.servers.filter((server) => matchesSearch(server.name));
  const serverResourceCounts = buildServerResourceCounts(info.servers, info.applications, info.services);
  const isMini = !isAdvanced && width < 110;
  const isTiny = !isAdvanced && height < 125;
  const isNarrow = !isAdvanced && width < 320;
  const visibleAttentionCount = Math.max(0, Math.min(3, Math.floor((height - (isTiny ? 80 : 105)) / 26)));
  const summaryLabel =
    summary.kind === "problem"
      ? t("summary.needsAttention", { count: summary.count })
      : summary.kind === "transition"
        ? t("summary.inProgress", { count: summary.count })
        : summary.kind === "unknown"
          ? t("summary.unknown", { count: summary.count })
          : t(`summary.${summary.kind}`);
  const summaryText = isNarrow
    ? summary.count > 0
      ? summary.count
      : summary.kind === "empty"
        ? "—"
        : "✓"
    : summaryLabel;
  const summaryColor =
    summary.kind === "problem"
      ? "red"
      : summary.kind === "transition"
        ? "yellow"
        : summary.kind === "healthy"
          ? "green"
          : "gray";

  if (isMini) {
    return (
      <div
        className={`${classes.instance} ${classes.mini} ${isSingle ? classes.single : ""}`}
        title={instance.integrationName}
      >
        <Image src={COOLIFY_ICON_URL} alt="Coolify" w={20} h={20} />
        <Text fw={700} fz={20} lh={1} c={summaryColor} aria-label={summaryLabel}>
          {summaryText}
        </Text>
        {height >= 120 && (
          <Stack className={classes.miniMetrics} gap={1}>
            {visibleOptions.showServers && (
              <MiniMetric
                icon={IconServer}
                label={tCommon("servers")}
                value={healthyServers}
                total={info.servers.length}
              />
            )}
            {visibleOptions.showApplications && (
              <MiniMetric
                icon={IconApps}
                label={tCommon("applications")}
                value={runningApps}
                total={info.applications.length}
              />
            )}
            {visibleOptions.showServices && (
              <MiniMetric
                icon={IconStack2}
                label={tCommon("services")}
                value={runningServices}
                total={info.services.length}
              />
            )}
          </Stack>
        )}
      </div>
    );
  }

  return (
    <div className={`${classes.instance} ${isTiny ? classes.tiny : ""} ${isSingle ? classes.single : ""}`}>
      <Group className={classes.header} gap="xs" wrap="nowrap" justify="space-between">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Image src={COOLIFY_ICON_URL} alt="" w={isTiny ? 16 : 20} h={isTiny ? 16 : 20} />
          <Anchor
            className={actionTargetClasses.root}
            component={baseUrl ? "a" : "span"}
            href={baseUrl}
            target={baseUrl ? "_blank" : undefined}
            rel={baseUrl ? SAFE_NEW_TAB_REL : undefined}
            c="inherit"
            fw={600}
            fz="sm"
            truncate="end"
          >
            {instance.integrationName}
          </Anchor>
        </Group>
        <Badge size="xs" variant="light" color={summaryColor} aria-label={summaryLabel}>
          {summaryText}
        </Badge>
      </Group>

      <Group className={classes.metrics} gap={0} wrap="nowrap">
        {visibleOptions.showServers && (
          <Metric
            icon={IconServer}
            label={tCommon("servers")}
            value={healthyServers}
            total={info.servers.length}
            isTiny={isTiny}
            isNarrow={isNarrow}
          />
        )}
        {visibleOptions.showApplications && (
          <Metric
            label={tCommon("applications")}
            value={runningApps}
            total={info.applications.length}
            isTiny={isTiny}
            isNarrow={isNarrow}
            icon={IconApps}
          />
        )}
        {visibleOptions.showServices && (
          <Metric
            icon={IconStack2}
            label={tCommon("services")}
            value={runningServices}
            total={info.services.length}
            isTiny={isTiny}
            isNarrow={isNarrow}
          />
        )}
      </Group>

      {isAdvanced ? (
        <Tabs defaultValue="overview" className={classes.details} keepMounted={false} onChange={() => setSearch("")}>
          <Tabs.List aria-label={t("details.tabs")} className={classes.tabList}>
            <Tabs.Tab value="overview">{t("details.overview")}</Tabs.Tab>
            <Tabs.Tab value="servers">
              {tCommon("servers")} ({info.servers.length})
            </Tabs.Tab>
            <Tabs.Tab value="applications">
              {tCommon("applications")} ({info.applications.length})
            </Tabs.Tab>
            <Tabs.Tab value="services">
              {tCommon("services")} ({info.services.length})
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview" className={classes.panel}>
            <ScrollArea h="100%" p="xs">
              <AttentionList
                items={attention}
                baseUrl={baseUrl}
                emptyLabel={trackedCount === 0 ? t("summary.empty") : t("summary.healthyDetail")}
              />
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="servers" className={classes.panel}>
            <DetailSearch value={search} onChange={setSearch} />
            <Group justify="flex-end" px="xs">
              <ActionIcon
                aria-label={t(showIp ? "action.hideIp" : "action.showIp")}
                aria-pressed={showIp}
                variant="subtle"
                onClick={() => setShowIp((previous) => !previous)}
              >
                {showIp ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </ActionIcon>
            </Group>
            <ScrollArea className={classes.listScroll}>
              <Stack gap="xs" p="xs">
                {servers.map((server) => (
                  <ServerRow
                    key={server.uuid}
                    server={server}
                    counts={
                      serverResourceCounts.get(server.settings?.server_id ?? server.id ?? -1) ?? {
                        apps: 0,
                        services: 0,
                      }
                    }
                    baseUrl={baseUrl}
                    showIp={showIp}
                  />
                ))}
                {servers.length === 0 && <EmptyDetail label={search ? tCommon("noResults") : t("empty.servers")} />}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="applications" className={classes.panel}>
            <DetailSearch value={search} onChange={setSearch} />
            <ScrollArea className={classes.listScroll}>
              <Stack gap="xs" p="xs">
                {applications.map((app) => (
                  <ResourceRow key={app.uuid} item={app} baseUrl={baseUrl} resourceType="application" />
                ))}
                {applications.length === 0 && (
                  <EmptyDetail label={search ? tCommon("noResults") : t("empty.applications")} />
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
          <Tabs.Panel value="services" className={classes.panel}>
            <DetailSearch value={search} onChange={setSearch} />
            <ScrollArea className={classes.listScroll}>
              <Stack gap="xs" p="xs">
                {services.map((service) => (
                  <Stack key={service.uuid} gap={2}>
                    <ResourceRow item={service} baseUrl={baseUrl} resourceType="service" />
                    {service.applications && service.applications.length > 0 && (
                      <Stack className={classes.nestedApplications} gap={4} ml="md" pl="xs">
                        <Text fz="xs" c="dimmed" fw={600}>
                          {tCommon("applications")}
                        </Text>
                        {service.applications.map((application) => (
                          <ServiceApplicationRow key={application.uuid} application={application} />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                ))}
                {services.length === 0 && <EmptyDetail label={search ? tCommon("noResults") : t("empty.services")} />}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      ) : (
        <div className={classes.compactBody}>
          {attention.length === 0 ? (
            !isTiny && (
              <Stack className={classes.healthyState} gap={4} align="center" justify="center">
                {trackedCount > 0 && height >= 180 && (
                  <IconCircleCheck size={28} color="var(--mantine-color-green-6)" />
                )}
                <Text size="xs" c="dimmed" ta="center">
                  {trackedCount === 0
                    ? t("summary.empty")
                    : height < 180
                      ? t("summary.healthy")
                      : t("summary.healthyDetail")}
                </Text>
              </Stack>
            )
          ) : (
            <AttentionList
              items={attention.slice(0, visibleAttentionCount)}
              baseUrl={baseUrl}
              emptyLabel=""
              hideEmpty
            />
          )}
          {attention.length > visibleAttentionCount && (
            <Text size="xs" c="dimmed">
              {t("summary.more", { count: attention.length - visibleAttentionCount })}
            </Text>
          )}
        </div>
      )}

      {(isAdvanced || (!isTiny && height >= 175)) && (
        <Text className={classes.footer} size="xs" c="dimmed" truncate>
          {t("footer.updated", { when: relativeTime })}
          {isAdvanced && ` · v${info.version}`}
        </Text>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  total,
  isTiny,
  isNarrow,
}: {
  icon: typeof IconServer;
  label: string;
  value: number;
  total: number;
  isTiny: boolean;
  isNarrow: boolean;
}) {
  return (
    <Stack gap={0} className={classes.metric}>
      {isNarrow ? (
        <>
          <Icon size={isTiny ? 12 : 14} aria-hidden="true" />
          <VisuallyHidden>{label}: </VisuallyHidden>
        </>
      ) : (
        <Text fz={isTiny ? 10 : "xs"} c="dimmed" truncate>
          {label}
        </Text>
      )}
      <Text fw={600} fz={isTiny ? "sm" : "lg"} lh={1.1}>
        {value}
        <Text component="span" size="xs" c="dimmed">
          /{total}
        </Text>
      </Text>
    </Stack>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  total,
}: {
  icon: typeof IconServer;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <Group className={classes.miniMetric} gap={2} wrap="nowrap" title={`${label}: ${value}/${total}`}>
      <Icon size={14} aria-hidden="true" />
      <VisuallyHidden>{label}: </VisuallyHidden>
      <Text fz={12} lh={1}>
        {value}/{total}
      </Text>
    </Group>
  );
}

function AttentionList({
  items,
  baseUrl,
  emptyLabel,
  hideEmpty = false,
}: {
  items: ReturnType<typeof getCoolifyAttentionItems>;
  baseUrl: string;
  emptyLabel: string;
  hideEmpty?: boolean;
}) {
  const t = useI18n("widget.coolify");
  if (items.length === 0)
    return hideEmpty ? null : (
      <Text size="xs" c="dimmed">
        {emptyLabel}
      </Text>
    );
  return (
    <Stack gap={4}>
      {items.map((item) => {
        const href =
          item.kind === "server"
            ? getSafeApplicationUrl(`${baseUrl}/server/${item.uuid}`)
            : item.projectUuid && item.environmentUuid
              ? getSafeApplicationUrl(
                  `${baseUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${item.kind}/${item.uuid}`,
                )
              : null;
        return (
          <Group key={`${item.kind}-${item.uuid}`} gap="xs" wrap="nowrap" className={classes.attentionRow}>
            <span
              className={classes.statusDot}
              style={{ backgroundColor: `var(--mantine-color-${getStatusColor(item.status)}-6)` }}
            />
            {href ? (
              <Anchor href={href} target="_blank" rel={SAFE_NEW_TAB_REL} c="inherit" fz="xs" truncate>
                {item.name}
              </Anchor>
            ) : (
              <Text size="xs" truncate>
                {item.name}
              </Text>
            )}
            <Text size="xs" c="dimmed" ml="auto">
              {t(`status.${item.status}`)}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

function DetailSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useI18n("widget.coolify");
  return (
    <TextInput
      aria-label={t("details.search")}
      placeholder={t("details.search")}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      leftSection={<IconSearch size={14} />}
      size="xs"
      mx="xs"
      mt="xs"
    />
  );
}

const EmptyDetail = ({ label }: { label: string }) => (
  <Text size="sm" c="dimmed" ta="center" py="xs">
    {label}
  </Text>
);
