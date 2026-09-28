"use client";

import { Anchor, Badge, Box, Center, Group, Progress, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { WazuhVulnerabilityOverview } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhPendingState, WazuhStatTile, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import type { WazuhDashboardLinks } from "../wazuh/_shared/links";
import { formatWazuhCount, getVulnerabilitySeverityColor } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

const severityKeys = ["critical", "high", "medium", "low"] as const;
const severityColors = { critical: "red", high: "orange", medium: "yellow", low: "blue" } as const;

const cveHref = (id: string, reference: string | null, links: WazuhDashboardLinks | null) =>
  links?.vulnerabilities({ cve: id }) ?? reference ?? `https://www.cve.org/CVERecord?id=${encodeURIComponent(id)}`;

const CveList = ({
  data,
  links,
  width,
}: {
  data: WazuhVulnerabilityOverview;
  links: WazuhDashboardLinks | null;
  width: number;
}) => {
  const t = useI18n("widget.wazuhVulnerabilities");
  const showPackages = width >= 300;
  return (
    <Stack gap={1}>
      <Group gap={8} wrap="nowrap" px={6} pb={2}>
        <Text className={classes.sectionLabel} style={{ flex: 1 }}>
          {t("topCves")}
        </Text>
        <Text className={classes.sectionLabel} w={34} ta="right">
          {t("score")}
        </Text>
        <Text className={classes.sectionLabel} w={44} ta="right">
          {t("agentsShort")}
        </Text>
      </Group>
      {data.topCves.map((cve) => (
        <Box
          key={cve.id}
          component="a"
          href={cveHref(cve.id, cve.reference, links)}
          target="_blank"
          rel="noopener noreferrer"
          className={classes.row}
          style={{ paddingBlock: 3 }}
        >
          <Box className={classes.dot} bg={getVulnerabilitySeverityColor(cve.severity)} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fz={12} fw={700} ff="monospace" lh={1.35} truncate>
              {cve.id}
            </Text>
            {showPackages && cve.packages.length > 0 && (
              <Text fz={11} lh={1.35} c="dimmed" truncate title={cve.packages.join(", ")}>
                {cve.packages.join(", ")}
              </Text>
            )}
          </Stack>
          <Tooltip label={cve.severity} withArrow openDelay={300}>
            <Badge
              size="sm"
              radius="sm"
              w={34}
              px={0}
              variant="light"
              color={getVulnerabilitySeverityColor(cve.severity)}
              className={classes.numeric}
            >
              {cve.score !== null ? cve.score.toFixed(1) : "-"}
            </Badge>
          </Tooltip>
          <Text size="xs" fw={600} w={44} ta="right" className={classes.numeric}>
            {cve.agents}
          </Text>
        </Box>
      ))}
    </Stack>
  );
};

const AgentList = ({
  data,
  links,
  locale,
}: {
  data: WazuhVulnerabilityOverview;
  links: WazuhDashboardLinks | null;
  locale: string;
}) => {
  const t = useI18n("widget.wazuhVulnerabilities");
  const max = Math.max(1, ...data.topAgents.map((agent) => agent.total));
  return (
    <Stack gap={1}>
      <Group gap={8} wrap="nowrap" px={6} pb={2}>
        <Text className={classes.sectionLabel} style={{ flex: 1 }}>
          {t("topAgents")}
        </Text>
        <Text className={classes.sectionLabel}>{t("criticalHigh")}</Text>
      </Group>
      {data.topAgents.map((agent) => (
        <Box
          key={agent.id}
          component={links ? "a" : "div"}
          {...(links
            ? { href: links.vulnerabilities({ agentId: agent.id }), target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className={classes.row}
          style={{ flexDirection: "column", alignItems: "stretch", gap: 3, paddingBlock: 3 }}
        >
          <Group gap={8} wrap="nowrap">
            <Text size="xs" fw={500} truncate style={{ flex: 1 }}>
              {agent.name}
            </Text>
            <Text size="xs" className={classes.numeric}>
              <Text span c="red.5" fw={700} size="xs">
                {formatWazuhCount(agent.critical, locale)}
              </Text>
              <Text span c="dimmed" size="xs">
                {" / "}
              </Text>
              <Text span c="orange.5" fw={700} size="xs">
                {formatWazuhCount(agent.high, locale)}
              </Text>
            </Text>
            <Text size="xs" c="dimmed" w={44} ta="right" className={classes.numeric}>
              {formatWazuhCount(agent.total, locale)}
            </Text>
          </Group>
          <Progress.Root size={4} radius="xl" w={`${Math.max((agent.total / max) * 100, 4)}%`}>
            <Progress.Section value={(agent.critical / agent.total) * 100} color="red.7" />
            <Progress.Section value={(agent.high / agent.total) * 100} color="orange.6" />
            <Progress.Section
              value={((agent.total - agent.critical - agent.high) / agent.total) * 100}
              color="dark.3"
            />
          </Progress.Root>
        </Box>
      ))}
    </Stack>
  );
};

export default function WazuhVulnerabilitiesWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhVulnerabilities">) {
  const t = useI18n("widget.wazuhVulnerabilities");
  const tShared = useI18n("widget.wazuh");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getVulnerabilities.useQuery(
    {
      integrationId,
      cveLimit: options.cveLimit,
      agentLimit: options.agentLimit,
      cveOrder: options.cveOrder,
      minSeverity: options.minSeverity,
    },
    { staleTime: 5 * 60_000, refetchInterval: 5 * 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 260;

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconBug} title={t("title")} compact={compact} iconColor="red">
        <WazuhPendingState />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const data = result.data;
  const scored = severityKeys.reduce((total, key) => total + data.counts[key], 0);
  const sideBySide = width >= 620;
  const showLists = height >= 200;
  const showAgents = options.showAgents && data.topAgents.length > 0 && (sideBySide || height >= 420);

  return (
    <WazuhWidgetFrame
      icon={IconBug}
      title={t("title")}
      href={links?.vulnerabilities()}
      compact={compact}
      iconColor="red"
      headerRight={
        <Tooltip
          label={t("totalTooltip", { count: data.total.toLocaleString(locale), agents: String(data.affectedAgents) })}
          withArrow
        >
          <Badge size="sm" variant="light" color="gray" radius="sm">
            {t("affected", { count: String(data.affectedAgents) })}
          </Badge>
        </Tooltip>
      }
    >
      {data.total === 0 ? (
        <Center h="100%">
          <Text size="sm" c="dimmed">
            {t("empty")}
          </Text>
        </Center>
      ) : (
        <Stack h="100%" gap={8}>
          <Group gap={6} wrap="nowrap" grow>
            {severityKeys.slice(0, width >= 340 ? 4 : 2).map((key) => (
              <WazuhStatTile
                key={key}
                label={tShared(`severity.${key}`)}
                value={formatWazuhCount(data.counts[key], locale)}
                color={severityColors[key]}
                compact={compact}
                href={links?.vulnerabilities()}
              />
            ))}
          </Group>
          {height >= 150 && scored > 0 && (
            <Tooltip
              label={t("distribution", { unscored: formatWazuhCount(data.counts.unscored, locale) })}
              withArrow
              openDelay={300}
            >
              <Progress.Root size={6} radius="xl">
                {severityKeys.map((key) => (
                  <Progress.Section
                    key={key}
                    value={(data.counts[key] / scored) * 100}
                    color={`${severityColors[key]}.7`}
                  />
                ))}
              </Progress.Root>
            </Tooltip>
          )}
          {showLists && (
            <ScrollArea style={{ flex: 1 }} type="auto" scrollbarSize={6} offsetScrollbars="y">
              {sideBySide ? (
                <Group align="flex-start" gap="md" wrap="nowrap">
                  <Box style={{ flex: 3, minWidth: 0 }}>
                    <CveList data={data} links={links} width={width * 0.58} />
                  </Box>
                  {showAgents && (
                    <Box style={{ flex: 2, minWidth: 0 }}>
                      <AgentList data={data} links={links} locale={locale} />
                    </Box>
                  )}
                </Group>
              ) : (
                <Stack gap="sm">
                  <CveList data={data} links={links} width={width} />
                  {showAgents && <AgentList data={data} links={links} locale={locale} />}
                </Stack>
              )}
            </ScrollArea>
          )}
          {!showLists && data.topCves[0] && (
            <Anchor
              href={cveHref(data.topCves[0].id, data.topCves[0].reference, links)}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              c="dimmed"
              truncate
            >
              {t("worst", {
                id: data.topCves[0].id,
                score: data.topCves[0].score?.toFixed(1) ?? "-",
                agents: String(data.topCves[0].agents),
              })}
            </Anchor>
          )}
        </Stack>
      )}
    </WazuhWidgetFrame>
  );
}
