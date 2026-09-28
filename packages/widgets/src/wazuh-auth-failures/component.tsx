"use client";

import { Anchor, Box, Center, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { Sparkline } from "@mantine/charts";
import { IconLockExclamation, IconShieldCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { isPrivateIp, WazuhChip } from "../wazuh/_shared/badges";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhRelativeTime, WazuhSkeleton, WazuhStatTile, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import { formatWazuhCount } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

const authQuery =
  'rule.groups:"authentication_failed" or rule.groups:"authentication_failures" or rule.groups:"invalid_login" or rule.mitre.id:"T1110"';

export default function WazuhAuthFailuresWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhAuthFailures">) {
  const t = useI18n("widget.wazuhAuthFailures");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getAuthFailures.useQuery(
    { integrationId, hours: options.hours, limit: options.limit },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 260;
  const title = t("title", { hours: String(options.hours) });

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconLockExclamation} title={title} compact={compact} iconColor="red">
        <WazuhSkeleton variant="tiles" rows={3} />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const data = result.data;
  const sparkWidth = width >= 520 ? 120 : width >= 380 ? 84 : 0;
  const showIps = options.showSourceIps && width >= 340;
  const showTrend = height >= 330 && data.series.length > 1;
  // Let the overall trend grow into whatever the agent rows leave free (roughly 58px per row).
  const trendHeight = Math.min(72, Math.max(40, height - 210 - data.agents.length * 58));
  const eventsHref = links?.events({ query: authQuery, from: `now-${options.hours}h` });

  return (
    <WazuhWidgetFrame
      icon={IconLockExclamation}
      title={title}
      href={eventsHref}
      compact={compact}
      iconColor="red"
      headerRight={
        !showTrend && width >= 420 && data.series.length > 1 ? (
          <Tooltip label={t("seriesTooltip", { hours: String(data.hours) })} withArrow>
            <Box>
              <Sparkline
                w={96}
                h={20}
                data={data.series}
                curveType="monotone"
                color="red.6"
                fillOpacity={0.35}
                strokeWidth={1.4}
              />
            </Box>
          </Tooltip>
        ) : undefined
      }
    >
      {data.totals.total === 0 ? (
        <Center h="100%">
          <Stack align="center" gap={4}>
            <IconShieldCheck size={28} stroke={1.5} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="dimmed" ta="center">
              {t("empty")}
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack h="100%" gap={8}>
          <Group gap={6} wrap="nowrap" grow>
            <WazuhStatTile
              label={t("failed")}
              value={formatWazuhCount(data.totals.failed, locale)}
              color="orange"
              compact={compact}
              hint={t("failedHint")}
            />
            <WazuhStatTile
              label={t("bruteForce")}
              value={formatWazuhCount(data.totals.bruteForce, locale)}
              color="red"
              compact={compact}
              hint={t("bruteForceHint")}
            />
            {width >= 300 && (
              <WazuhStatTile
                label={t("sourceIps")}
                value={formatWazuhCount(data.totals.sourceIps, locale)}
                color="cyan"
                compact={compact}
              />
            )}
          </Group>
          {showTrend && (
            <Box>
              <Group justify="space-between" gap={6} mb={2}>
                <Text className={classes.sectionLabel}>{t("seriesTooltip", { hours: String(data.hours) })}</Text>
                <Text size="10px" c="dimmed" className={classes.numeric}>
                  {t("peak", { count: formatWazuhCount(Math.max(...data.series), locale) })}
                </Text>
              </Group>
              <Sparkline
                w="100%"
                h={trendHeight}
                data={data.series}
                curveType="monotone"
                color="red.6"
                fillOpacity={0.3}
                strokeWidth={1.4}
              />
            </Box>
          )}
          {height >= 180 && (
            <ScrollArea style={{ flex: 1 }} type="auto" scrollbarSize={6} offsetScrollbars="y">
              <Stack gap={1}>
                {data.agents.map((agent) => (
                  <Box
                    key={agent.agentName}
                    className={`${classes.row} ${classes.rowStriped}`}
                    style={{ paddingBlock: 4 }}
                  >
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        {links && agent.agentId ? (
                          <Anchor
                            href={links.events({
                              agentId: agent.agentId,
                              query: authQuery,
                              from: `now-${options.hours}h`,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            fw={600}
                            c="inherit"
                            truncate
                          >
                            {agent.agentName}
                          </Anchor>
                        ) : (
                          <Text size="xs" fw={600} truncate>
                            {agent.agentName}
                          </Text>
                        )}
                        {width >= 720 && agent.lastSeen && <WazuhRelativeTime value={agent.lastSeen} short />}
                      </Group>
                      {showIps && agent.topSourceIps.length > 0 && (
                        <Group gap={3} wrap="nowrap" style={{ overflow: "hidden" }}>
                          {agent.topSourceIps.slice(0, width >= 720 ? 3 : 2).map((source) => (
                            <WazuhChip
                              key={source.ip}
                              color={isPrivateIp(source.ip) ? undefined : "red"}
                              title={t("ipTooltip", { ip: source.ip, count: source.count.toLocaleString(locale) })}
                            >
                              {width >= 720 ? `${source.ip} · ${formatWazuhCount(source.count, locale)}` : source.ip}
                            </WazuhChip>
                          ))}
                        </Group>
                      )}
                    </Stack>
                    {sparkWidth > 0 && agent.series.length > 1 && (
                      <Sparkline
                        w={sparkWidth}
                        h={28}
                        data={agent.series}
                        curveType="monotone"
                        color={agent.bruteForce > 0 ? "red.6" : "orange.5"}
                        fillOpacity={0.3}
                        strokeWidth={1.3}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <Stack gap={0} align="flex-end" miw={62} style={{ flexShrink: 0 }}>
                      <Text size="sm" fw={700} className={classes.numeric}>
                        {formatWazuhCount(agent.total, locale)}
                      </Text>
                      <Text
                        size="10px"
                        className={classes.numeric}
                        c={agent.bruteForce > 0 ? "red.4" : "dimmed"}
                        fw={600}
                      >
                        {t("bruteForceCount", { count: formatWazuhCount(agent.bruteForce, locale) })}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Stack>
      )}
    </WazuhWidgetFrame>
  );
}
