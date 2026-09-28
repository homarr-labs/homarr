"use client";

import { Badge, Box, Center, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconDeviceDesktop, IconListNumbers, IconTarget, IconWorld } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { WazuhTopListEntry, WazuhTopListKind } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { isPrivateIp, WazuhChip, WazuhLevelBadge } from "../wazuh/_shared/badges";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhPendingState, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import type { WazuhDashboardLinks } from "../wazuh/_shared/links";
import { formatWazuhCount, getWazuhSeverityForLevel, wazuhSeverityChartColors } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

const kindIcons: Record<WazuhTopListKind, TablerIcon> = {
  rules: IconListNumbers,
  agents: IconDeviceDesktop,
  sourceIps: IconWorld,
  mitreTactics: IconTarget,
  mitreTechniques: IconTarget,
};

const kindColors: Record<WazuhTopListKind, string> = {
  rules: "blue",
  agents: "teal",
  sourceIps: "cyan",
  mitreTactics: "violet",
  mitreTechniques: "violet",
};

const getEntryHref = (
  kind: WazuhTopListKind,
  entry: WazuhTopListEntry,
  links: WazuhDashboardLinks | null,
  range: string,
): string | undefined => {
  if (!links) return undefined;
  switch (kind) {
    case "rules":
      return links.events({ query: `rule.id:${entry.key}`, from: `now-${range}` });
    case "agents":
      return entry.detail ? links.agent(entry.detail) : undefined;
    case "sourceIps":
      return links.events({ query: `data.srcip:"${entry.key}"`, from: `now-${range}` });
    default:
      return links.mitre;
  }
};

export default function WazuhTopListWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhTopList">) {
  const t = useI18n("widget.wazuhTopList");
  const tShared = useI18n("widget.wazuh");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getTopList.useQuery(
    { integrationId, kind: options.kind, range: options.range, limit: options.limit, minLevel: options.minLevel },
    { staleTime: 60_000, refetchInterval: 2 * 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 240;
  const title = t(`title.${options.kind}`, { range: tShared(`range.${options.range}`) });
  const Icon = kindIcons[options.kind];

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={Icon} title={title} compact={compact} iconColor={kindColors[options.kind]}>
        <WazuhPendingState />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const list = result.data;
  const max = Math.max(1, ...list.entries.map((entry) => entry.count));
  const headerHref =
    options.kind === "mitreTactics" || options.kind === "mitreTechniques"
      ? links?.mitre
      : options.kind === "agents"
        ? links?.agents
        : links?.events({ from: `now-${options.range}` });
  const showDetailColumn = width >= 300;
  const showAgentsColumn = width >= 380 && options.kind !== "agents";

  return (
    <WazuhWidgetFrame
      icon={Icon}
      title={title}
      href={headerHref}
      compact={compact}
      iconColor={kindColors[options.kind]}
      headerRight={
        <Tooltip label={t("totalTooltip", { count: list.total.toLocaleString(locale) })} withArrow>
          <Badge size="sm" variant="light" color="gray" radius="sm">
            {formatWazuhCount(list.total, locale)}
          </Badge>
        </Tooltip>
      }
    >
      {list.entries.length === 0 ? (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            {t(`empty.${options.kind}`)}
          </Text>
        </Center>
      ) : (
        <ScrollArea h="100%" type="auto" scrollbarSize={6} offsetScrollbars="y">
          <Stack gap={1}>
            {list.entries.map((entry, index) => {
              const href = getEntryHref(options.kind, entry, links, options.range);
              const severity = entry.maxLevel !== null ? getWazuhSeverityForLevel(entry.maxLevel) : "low";
              const share = entry.count / max;
              const isIp = options.kind === "sourceIps";
              return (
                <Box
                  key={entry.key}
                  component={href ? "a" : "div"}
                  {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={classes.row}
                  style={{ flexDirection: "column", alignItems: "stretch", gap: 3, paddingBlock: compact ? 2 : 4 }}
                >
                  <Group gap={8} wrap="nowrap">
                    <Text size="xs" c="dimmed" w={14} ta="right" className={classes.numeric}>
                      {index + 1}
                    </Text>
                    {options.kind === "rules" && entry.maxLevel !== null && <WazuhLevelBadge level={entry.maxLevel} />}
                    <Text
                      size="xs"
                      fw={500}
                      truncate
                      style={{ flex: 1, minWidth: 0 }}
                      className={isIp ? classes.mono : undefined}
                      title={entry.label}
                    >
                      {entry.label}
                    </Text>
                    {isIp && width >= 260 && (
                      <WazuhChip color={isPrivateIp(entry.key) ? undefined : "red"}>
                        {isPrivateIp(entry.key) ? t("private") : t("public")}
                      </WazuhChip>
                    )}
                    {showDetailColumn && entry.detail && options.kind !== "agents" && (
                      <Text size="xs" c="dimmed" className={`${classes.mono} ${classes.nowrap}`}>
                        {options.kind === "rules" ? `#${entry.detail}` : entry.detail}
                      </Text>
                    )}
                    {showAgentsColumn && entry.agents !== null && (
                      <Tooltip label={t("agents", { count: String(entry.agents) })} withArrow openDelay={300}>
                        <Text size="xs" c="dimmed" className={classes.numeric}>
                          <IconDeviceDesktop size={11} style={{ verticalAlign: -1, marginRight: 2 }} />
                          {entry.agents}
                        </Text>
                      </Tooltip>
                    )}
                    <Text size="xs" fw={700} miw={40} ta="right" className={classes.numeric}>
                      {formatWazuhCount(entry.count, locale)}
                    </Text>
                  </Group>
                  {options.showBars && (
                    <Box pl={22}>
                      <div className={classes.bar}>
                        <div
                          className={classes.barFill}
                          style={{
                            width: `${Math.max(share * 100, 1)}%`,
                            background:
                              options.kind === "mitreTactics" || options.kind === "mitreTechniques"
                                ? "var(--mantine-color-violet-5)"
                                : `var(--mantine-color-${wazuhSeverityChartColors[severity].replace(".", "-")})`,
                          }}
                        />
                      </div>
                    </Box>
                  )}
                </Box>
              );
            })}
            {list.others > 0 && height >= 200 && (
              <Text size="xs" c="dimmed" ta="center" mt={4}>
                {t("others", { count: formatWazuhCount(list.others, locale) })}
              </Text>
            )}
          </Stack>
        </ScrollArea>
      )}
    </WazuhWidgetFrame>
  );
}
