"use client";

import { Badge, Box, Center, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconDeviceDesktop, IconShieldBolt, IconShieldCheck, IconWorld } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { isPrivateIp, WazuhChip, WazuhLevelBadge } from "../wazuh/_shared/badges";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhRelativeTime, WazuhPendingState, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import { getWazuhSeverityForLevel, wazuhSeverities, wazuhSeverityColors } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

export default function WazuhAlertsWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhAlerts">) {
  const t = useI18n("widget.wazuhAlerts");
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getAlerts.useQuery(
    { integrationId, minLevel: options.minLevel, limit: options.limit, hours: options.hours },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 260;
  const title = t("title", { level: String(options.minLevel), hours: String(options.hours) });

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconShieldBolt} title={title} compact={compact} iconColor="orange">
        <WazuhPendingState />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const alerts = result.data;
  const wide = width >= 440;
  const showChips = options.showMitre && width >= 300;
  const severityCounts = wazuhSeverities
    .map((severity) => ({
      severity,
      count: alerts.filter((alert) => getWazuhSeverityForLevel(alert.level) === severity).length,
    }))
    .filter((entry) => entry.count > 0);

  return (
    <WazuhWidgetFrame
      icon={IconShieldBolt}
      title={title}
      href={links?.events({ query: `rule.level >= ${options.minLevel}`, from: `now-${options.hours}h` })}
      compact={compact}
      iconColor="orange"
      headerRight={
        <Group gap={4} wrap="nowrap">
          {width >= 360 &&
            severityCounts.length > 1 &&
            severityCounts.map(({ severity, count }) => (
              <Badge key={severity} size="xs" variant="light" color={wazuhSeverityColors[severity]} radius="sm">
                {count}
              </Badge>
            ))}
          <Badge size="sm" variant="light" color="gray" radius="sm">
            {alerts.length}
          </Badge>
        </Group>
      }
    >
      {alerts.length === 0 ? (
        <Center h="100%">
          <Stack align="center" gap={4}>
            <IconShieldCheck size={28} stroke={1.5} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="dimmed" ta="center">
              {t("empty")}
            </Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea h="100%" type="auto" scrollbarSize={6} offsetScrollbars="y">
          <Stack gap={1}>
            {alerts.map((alert) => {
              const href = links?.alert({ alertId: alert.alertId, timestamp: alert.timestamp, agentId: alert.agentId });
              const meta = [
                options.showAgent && alert.agentName ? (
                  <Group key="agent" gap={3} wrap="nowrap" className={classes.nowrap}>
                    <IconDeviceDesktop size={11} />
                    <span>{alert.agentName}</span>
                  </Group>
                ) : null,
                options.showSourceIp && alert.sourceIp ? (
                  <Group
                    key="ip"
                    gap={3}
                    wrap="nowrap"
                    className={classes.nowrap}
                    c={isPrivateIp(alert.sourceIp) ? undefined : "red.4"}
                  >
                    <IconWorld size={11} />
                    <span className={classes.mono}>{alert.sourceIp}</span>
                  </Group>
                ) : null,
                options.showRuleId && alert.ruleId ? (
                  <span key="rule" className={`${classes.mono} ${classes.nowrap}`}>
                    {t("rule", { id: alert.ruleId })}
                  </span>
                ) : null,
              ].filter(Boolean);
              const chips = showChips ? alert.mitre.techniques.slice(0, wide ? 3 : 1) : [];
              const extraChips = showChips ? alert.mitre.techniques.length - chips.length : 0;
              return (
                <Box
                  key={alert.id}
                  component={href ? "a" : "div"}
                  {...(href ? { href, target: "_blank", rel: "noopener noreferrer", title: t("openInDashboard") } : {})}
                  className={classes.row}
                  style={{ alignItems: "flex-start", paddingBlock: compact ? 3 : 5 }}
                >
                  <WazuhLevelBadge level={alert.level} />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" fw={500} lineClamp={wide ? 1 : 2} title={alert.description} lh={1.35}>
                      {alert.description}
                    </Text>
                    {(meta.length > 0 || chips.length > 0) && (
                      <Group gap={8} wrap="nowrap" c="dimmed" fz={11} style={{ overflow: "hidden" }}>
                        {meta}
                        {chips.length > 0 && (
                          <Group gap={3} wrap="nowrap" style={{ overflow: "hidden", minWidth: 0 }}>
                            {chips.map((technique, index) => (
                              <WazuhChip
                                key={technique}
                                color="violet"
                                title={[alert.mitre.ids[index], technique, alert.mitre.tactics.join(", ")]
                                  .filter(Boolean)
                                  .join(" · ")}
                              >
                                {technique}
                              </WazuhChip>
                            ))}
                            {extraChips > 0 && <WazuhChip>{`+${extraChips}`}</WazuhChip>}
                          </Group>
                        )}
                      </Group>
                    )}
                  </Stack>
                  <WazuhRelativeTime value={alert.timestamp} short={!wide} />
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>
      )}
    </WazuhWidgetFrame>
  );
}
