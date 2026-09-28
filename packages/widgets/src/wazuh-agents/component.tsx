"use client";

import { useMemo, useState } from "react";
import { Anchor, Badge, Center, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconBrandAndroid,
  IconBrandApple,
  IconBrandDebian,
  IconBrandRedhat,
  IconBrandUbuntu,
  IconBrandWindows,
  IconChevronDown,
  IconChevronUp,
  IconDevicesPc,
  IconServer,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import type { WazuhAgent } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import { WazuhChip } from "../wazuh/_shared/badges";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhRelativeTime, WazuhSkeleton, WazuhStatTile, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

type SortKey = "status" | "name" | "ip" | "os" | "version" | "lastKeepAlive";
type StatusFilter = "all" | "active" | "disconnected" | "inactive";

const statusOrder: Record<WazuhAgent["status"], number> = {
  disconnected: 0,
  pending: 1,
  never_connected: 2,
  unknown: 3,
  active: 4,
};

const getOsIcon = (platform: string | null, name: string | null): TablerIcon => {
  const value = `${platform ?? ""} ${name ?? ""}`.toLowerCase();
  if (value.includes("windows")) return IconBrandWindows;
  if (value.includes("ubuntu")) return IconBrandUbuntu;
  if (value.includes("debian")) return IconBrandDebian;
  if (value.includes("darwin") || value.includes("mac")) return IconBrandApple;
  if (value.includes("android")) return IconBrandAndroid;
  if (/(rhel|red ?hat|centos|rocky|alma|fedora|amzn|oracle)/.test(value)) return IconBrandRedhat;
  return IconServer;
};

// Keep the OS cell readable in narrow columns: "Microsoft Windows 11 Pro" -> "Windows 11 Pro", "Debian GNU/Linux" -> "Debian".
const shortOsName = (name: string | null) =>
  name
    ?.replace(/^Microsoft\s+/i, "")
    .replace(/\s*GNU\/Linux/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim() ?? null;

const parseVersion = (value: string | null) =>
  (value ?? "")
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

const compareVersions = (left: string | null, right: string | null) => {
  const [a, b] = [parseVersion(left), parseVersion(right)];
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const ipToNumber = (ip: string | null) =>
  (ip ?? "").split(".").reduce((total, part) => total * 256 + (Number.parseInt(part, 10) || 0), 0);

const compareIps = (left: string | null, right: string | null) => ipToNumber(left) - ipToNumber(right);

const sorters: Record<SortKey, (left: WazuhAgent, right: WazuhAgent) => number> = {
  status: (left, right) => statusOrder[left.status] - statusOrder[right.status] || left.name.localeCompare(right.name),
  name: (left, right) => left.name.localeCompare(right.name),
  ip: (left, right) => compareIps(left.ip, right.ip),
  os: (left, right) => (left.osName ?? "~").localeCompare(right.osName ?? "~") || left.name.localeCompare(right.name),
  version: (left, right) => compareVersions(left.version, right.version) || left.name.localeCompare(right.name),
  // Most recent first by default.
  lastKeepAlive: (left, right) => (right.lastKeepAlive ?? "").localeCompare(left.lastKeepAlive ?? ""),
};

type SortState = { key: SortKey; descending: boolean };

const SortHeader = ({
  column,
  label,
  ariaLabel,
  sort,
  onSort,
}: {
  column: SortKey;
  label: string;
  ariaLabel?: string;
  sort: SortState;
  onSort: (column: SortKey) => void;
}) => (
  <button type="button" className={classes.sortButton} onClick={() => onSort(column)} aria-label={ariaLabel ?? label}>
    {label}
    {sort.key === column &&
      (sort.descending ? <IconChevronUp size={11} stroke={2.5} /> : <IconChevronDown size={11} stroke={2.5} />)}
  </button>
);

const snapshotColor = (ageMs: number) => {
  if (ageMs < 20 * 60_000) return "green";
  if (ageMs < 2 * 60 * 60_000) return "yellow";
  return "red";
};

export default function WazuhAgentsWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhAgents">) {
  const t = useI18n("widget.wazuhAgents");
  const locale = useCurrentIntlLocale();
  const now = useWidgetNow("minute");
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getAgents.useQuery(
    { integrationId },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);

  const [filter, setFilter] = useState<StatusFilter>(options.statusFilter);
  const [sort, setSort] = useState<SortState>({ key: options.sortBy, descending: false });
  const handleSort = (column: SortKey) =>
    setSort((current) => ({ key: column, descending: current.key === column ? !current.descending : false }));

  const agents = result?.data?.agents;
  const newestVersion = useMemo(
    () =>
      (agents ?? []).reduce<string | null>(
        (newest, agent) => (compareVersions(agent.version, newest) > 0 ? agent.version : newest),
        null,
      ),
    [agents],
  );
  const visibleAgents = useMemo(() => {
    const filtered = (agents ?? []).filter((agent) => {
      if (filter === "all") return true;
      if (filter === "inactive") return agent.status !== "active";
      return agent.status === filter;
    });
    const sorted = filtered.toSorted(sorters[sort.key]);
    return sort.descending ? sorted.toReversed() : sorted;
  }, [agents, filter, sort]);

  const compact = height < 170 || width < 260;

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconDevicesPc} title={t("title")} compact={compact} iconColor="teal">
        <WazuhSkeleton variant="tiles" rows={4} />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const overview = result.data;
  const counts = overview.counts;
  const snapshotAgeMs = (now ?? new Date()).getTime() - new Date(overview.asOf).getTime();
  const showTable = height >= 190;
  const showIp = width >= 380;
  const showOs = width >= 460;
  const showVersion = options.showVersion && width >= 600;
  const showGroups = options.showGroups && width >= 720;
  const toggleFilter = (value: StatusFilter) => setFilter((current) => (current === value ? "all" : value));

  const sourceBadge =
    overview.source === "api" ? (
      <Badge size="sm" variant="dot" color="green" radius="sm">
        {t("live")}
      </Badge>
    ) : (
      <Tooltip
        label={
          snapshotAgeMs > 2 * 60 * 60_000
            ? t("staleSnapshot", { time: new Date(overview.asOf).toLocaleString(locale) })
            : t("snapshotHint", { time: new Date(overview.asOf).toLocaleString(locale) })
        }
        withArrow
        multiline
        w={260}
      >
        <Badge size="sm" variant="dot" color={snapshotColor(snapshotAgeMs)} radius="sm">
          {width >= 300
            ? t("snapshot", { age: dayjs(overview.asOf).fromNow(true) })
            : dayjs(overview.asOf).fromNow(true)}
        </Badge>
      </Tooltip>
    );

  return (
    <WazuhWidgetFrame
      icon={IconDevicesPc}
      title={t("total", { count: String(counts.total) })}
      href={links?.agents}
      compact={compact}
      iconColor="teal"
      headerRight={sourceBadge}
    >
      <Stack h="100%" gap={8}>
        <Group gap={6} wrap="nowrap" grow>
          <WazuhStatTile
            label={t("status.active")}
            value={String(counts.active)}
            color="green"
            active={filter === "active"}
            onClick={() => toggleFilter("active")}
            compact={compact}
          />
          <WazuhStatTile
            label={t("status.disconnected")}
            value={String(counts.disconnected)}
            color="red"
            active={filter === "disconnected"}
            onClick={() => toggleFilter("disconnected")}
            compact={compact}
          />
          {width >= 300 && (
            <WazuhStatTile
              label={t("status.neverConnected")}
              value={String(counts.neverConnected)}
              color="gray"
              active={filter === "inactive"}
              onClick={() => toggleFilter("inactive")}
              compact={compact}
            />
          )}
          {width >= 380 && (
            <WazuhStatTile
              label={t("status.pending")}
              value={String(counts.pending)}
              color="yellow"
              compact={compact}
            />
          )}
        </Group>

        {showTable &&
          (visibleAgents.length === 0 ? (
            <Center style={{ flex: 1 }}>
              <Text size="sm" c="dimmed">
                {filter === "disconnected" ? t("noDisconnected") : t("empty")}
              </Text>
            </Center>
          ) : (
            <ScrollArea style={{ flex: 1 }} type="auto" scrollbarSize={6}>
              <table className={classes.table}>
                <colgroup>
                  <col style={{ width: 22 }} />
                  <col />
                  {/* Relative widths so the columns keep their proportions at every widget size. */}
                  {showIp && <col style={{ width: "15%" }} />}
                  {showOs && <col style={{ width: showGroups ? "23%" : "27%" }} />}
                  {showVersion && <col style={{ width: "9%" }} />}
                  <col style={{ width: showIp ? "14%" : "30%" }} />
                  {showGroups && <col style={{ width: "11%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <SortHeader
                        column="status"
                        label=""
                        ariaLabel={t("column.status")}
                        sort={sort}
                        onSort={handleSort}
                      />
                    </th>
                    <th>
                      <SortHeader column="name" label={t("column.name")} sort={sort} onSort={handleSort} />
                    </th>
                    {showIp && (
                      <th>
                        <SortHeader column="ip" label={t("column.ip")} sort={sort} onSort={handleSort} />
                      </th>
                    )}
                    {showOs && (
                      <th>
                        <SortHeader column="os" label={t("column.os")} sort={sort} onSort={handleSort} />
                      </th>
                    )}
                    {showVersion && (
                      <th>
                        <SortHeader column="version" label={t("column.version")} sort={sort} onSort={handleSort} />
                      </th>
                    )}
                    <th>
                      <SortHeader
                        column="lastKeepAlive"
                        label={t("column.lastKeepAlive")}
                        sort={sort}
                        onSort={handleSort}
                      />
                    </th>
                    {showGroups && <th>{t("column.groups")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleAgents.map((agent) => {
                    const OsIcon = getOsIcon(agent.osPlatform, agent.osName);
                    const outdated =
                      agent.version !== null &&
                      newestVersion !== null &&
                      compareVersions(agent.version, newestVersion) < 0;
                    return (
                      <tr key={agent.id}>
                        <td aria-label={t(`statusLabel.${agent.status}`)}>
                          <Tooltip label={t(`statusLabel.${agent.status}`)} withArrow openDelay={200}>
                            <span className={classes.statusDot} data-status={agent.status} />
                          </Tooltip>
                        </td>
                        <td title={`${agent.name} (${agent.id})`}>
                          {links ? (
                            <Anchor
                              href={links.agent(agent.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              c="inherit"
                              fw={500}
                            >
                              {agent.name}
                            </Anchor>
                          ) : (
                            <Text size="xs" fw={500} span>
                              {agent.name}
                            </Text>
                          )}
                          {width >= 520 && (
                            <Text span size="10px" c="dimmed" ml={6} className={classes.mono}>
                              {agent.id}
                            </Text>
                          )}
                        </td>
                        {showIp && (
                          <td className={classes.mono} title={agent.ip ?? undefined}>
                            {agent.ip ?? "-"}
                          </td>
                        )}
                        {showOs && (
                          <td title={[agent.osName, agent.osVersion].filter(Boolean).join(" ")}>
                            <Group gap={5} wrap="nowrap">
                              <OsIcon size={14} stroke={1.6} style={{ flexShrink: 0, opacity: 0.85 }} />
                              <Text size="xs" truncate>
                                {shortOsName(agent.osName) ?? "-"}
                                {width >= 800 && agent.osVersion ? (
                                  <Text span size="xs" c="dimmed">
                                    {" "}
                                    {agent.osVersion}
                                  </Text>
                                ) : null}
                              </Text>
                            </Group>
                          </td>
                        )}
                        {showVersion && (
                          <td aria-label={agent.version ?? "-"}>
                            <Tooltip
                              label={
                                outdated ? t("outdated", { version: newestVersion ?? "" }) : (agent.version ?? "-")
                              }
                              withArrow
                              disabled={!agent.version}
                            >
                              <Text size="xs" c={outdated ? "yellow.5" : undefined} className={classes.mono}>
                                {agent.version ?? "-"}
                              </Text>
                            </Tooltip>
                          </td>
                        )}
                        <td>
                          <WazuhRelativeTime value={agent.lastKeepAlive} short />
                        </td>
                        {showGroups && (
                          <td>
                            <Group gap={3} wrap="nowrap" style={{ overflow: "hidden" }}>
                              {agent.groups.slice(0, 2).map((group) => (
                                <WazuhChip key={group}>{group}</WazuhChip>
                              ))}
                              {agent.groups.length > 2 && <WazuhChip>{`+${agent.groups.length - 2}`}</WazuhChip>}
                            </Group>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          ))}
      </Stack>
    </WazuhWidgetFrame>
  );
}
