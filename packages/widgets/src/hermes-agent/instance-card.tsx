import { useMemo } from "react";
import dayjs from "dayjs";
import { Anchor, Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconActivity,
  IconCalendarTime,
  IconGitCommit,
  IconMessageCircle,
  IconPackage,
  IconPlugConnected,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";

import { getIconUrl } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { DetailsGrid } from "./details-grid";
import {
  getCardStyle,
  getCompactVersionValue,
  getContentGap,
  getContentStyle,
  getDetailsLayout,
  getLayoutMode,
  isCompactLayoutMode,
  getLogoSize,
  getMetricColumns,
  getMetricSpacing,
  scaleHermesTypography,
  getTypographyScale,
  getVisibleMetricIds,
} from "./layout";
import type { MetricDefinition } from "./metric-tile";
import { MetricTile } from "./metric-tile";
import type { HermesTheme } from "./theme";
import { HERMES_CHROME_TEXT_STYLE, HermesThemeContext } from "./theme";
import { resolveHermesTheme } from "./theme-data";
import type { HermesAgentSuccessInstance } from "./types";
import { getCompactStatusKey, getThemeStatusColor } from "./utils";

interface HermesAgentInstanceCardProps {
  instance: HermesAgentSuccessInstance;
  width: number;
  height: number;
  options: WidgetComponentProps<"hermesAgent">["options"];
}

export function HermesAgentInstanceCard({ instance, width, height, options }: HermesAgentInstanceCardProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useMemo(
    () => resolveHermesTheme(options.brandTheme, options.themePreset, options.fontFamily),
    [options.brandTheme, options.fontFamily, options.themePreset],
  );
  const { overview } = instance;
  const dashboardUrl = instance.integrationUrl?.replace(/\/+$/, "") ?? null;
  const dashboardRoutes = {
    cron: dashboardUrl ? `${dashboardUrl}/cron` : null,
    profiles: dashboardUrl ? `${dashboardUrl}/profiles` : null,
    sessions: dashboardUrl ? `${dashboardUrl}/sessions` : null,
    skills: dashboardUrl ? `${dashboardUrl}/skills` : null,
    system: dashboardUrl ? `${dashboardUrl}/system` : null,
  };
  const getModeRoute = (route: keyof typeof dashboardRoutes) =>
    overview.mode === "dashboard" ? (dashboardRoutes[route] ?? undefined) : undefined;
  const gatewayState = overview.gatewayState;
  const connectedPlatforms = overview.summary.platforms.connected;
  const enabledToolsets = overview.summary.toolsets.enabled;
  const enabledSkills = overview.summary.skills.enabled;
  const activeSessions = overview.summary.activeSessions;
  const sessionsLast24Hours = overview.summary.sessionsLast24Hours;
  const totalAgents = overview.summary.totalAgents ?? null;
  const jobSummary = overview.summary.jobs;
  const version = overview.version ?? t("unknown");
  const release = overview.release;
  const commitsBehind = overview.update?.commitsBehind;
  const layoutMode = getLayoutMode(width, height);
  const dense = isCompactLayoutMode(layoutMode);
  const isNarrowLayout = layoutMode === "micro" || layoutMode === "tall";
  const usesCompactStatus = dense && layoutMode !== "strip";
  const compactTypographyScale = dense ? Math.min(theme.typographyScale, 1.08) : theme.typographyScale;
  const typography = scaleHermesTypography(getTypographyScale(width, height, layoutMode), compactTypographyScale);
  const isMicroMetricMode = dense;
  const collapsesMetricValues = usesCompactStatus;
  const isHeightOneCompact = layoutMode === "micro" || layoutMode === "mini";
  const shouldFillMetricGrid = dense;
  const compactVersion = collapsesMetricValues || (layoutMode === "standard" && width < 380);
  const metricColumns = getMetricColumns(layoutMode, width);
  const iconSize = Math.round(
    typography.metricLabel + (layoutMode === "micro" ? 2 : layoutMode === "showcase" ? 3 : 1),
  );
  const versionValue =
    layoutMode === "strip" ? version : getCompactVersionValue(version, dense || compactVersion, compactVersion);
  const updateColor = !overview.update
    ? theme.textTertiary
    : overview.update.hasNewRelease
      ? theme.warning
      : theme.success;
  const jobsColor = jobSummary.total === 0 ? theme.textTertiary : jobSummary.failed > 0 ? theme.error : theme.success;
  const skillsColor = overview.dataAvailability.skills
    ? getRatioColor(theme, enabledSkills, overview.summary.skills.total)
    : theme.textTertiary;
  const platformsColor = getRatioColor(theme, connectedPlatforms, overview.summary.platforms.total);
  const toolsetsColor = overview.dataAvailability.toolsets
    ? getRatioColor(theme, enabledToolsets, overview.summary.toolsets.total)
    : theme.textTertiary;
  const activeAgentsColor = getNeutralCountColor(theme, overview.summary.activeAgents);
  const activeSessionsColor = getNeutralCountColor(theme, activeSessions ?? sessionsLast24Hours);
  const skillsValue = !overview.dataAvailability.skills
    ? t("unknownShort")
    : overview.summary.skills.total > 0
      ? collapsesMetricValues && enabledSkills === overview.summary.skills.total
        ? enabledSkills
        : `${enabledSkills}/${overview.summary.skills.total}`
      : "0";
  const toolsetsValue = overview.dataAvailability.toolsets
    ? `${enabledToolsets}/${overview.summary.toolsets.total}`
    : t("unknownShort");
  const jobsValue = overview.dataAvailability.jobs ? `${jobSummary.active}/${jobSummary.total}` : t("unknownShort");
  const activeSessionsValue = formatSessionCount(
    activeSessions,
    overview.summary.activeSessionsHasMore,
    t("unknownShort"),
  );
  const sessionsLast24HoursValue = formatSessionCount(
    sessionsLast24Hours,
    overview.summary.sessionsLast24HoursHasMore,
    t("unknownShort"),
  );
  const sessionsValue =
    activeSessions == null && sessionsLast24Hours == null
      ? t("unknownShort")
      : `${activeSessionsValue}/${sessionsLast24HoursValue}`;
  const agentsValue =
    totalAgents === null ? overview.summary.activeAgents : `${overview.summary.activeAgents}/${totalAgents}`;
  const updateValue = !overview.update
    ? t("unknownShort")
    : !overview.update.hasNewRelease
      ? t("update.currentShort")
      : commitsBehind != null && commitsBehind > 0
        ? `+${commitsBehind}`
        : t("update.availableShort");
  const compactStatusKey = gatewayState ? getCompactStatusKey(gatewayState) : null;
  const verboseStatusLabel = compactStatusKey
    ? t(`status.${compactStatusKey}`)
    : (gatewayState?.replaceAll("_", " ") ?? t("unknown"));
  const compactStatusLabel = compactStatusKey
    ? t(`status.short.${compactStatusKey}`)
    : abbreviateStatus(gatewayState ?? t("unknown"));
  const statusLabel = usesCompactStatus ? compactStatusLabel : verboseStatusLabel;
  const titleLabel = instance.integrationName;
  const showVersion = !isHeightOneCompact && !isNarrowLayout && layoutMode !== "strip";
  const showCardShell = layoutMode === "standard" || layoutMode === "showcase";
  const detailsLayout = getDetailsLayout(width, height, layoutMode);
  const visibleMetricIds = getVisibleMetricIds(layoutMode, overview.update !== null);
  const metrics: MetricDefinition[] = [
    {
      id: "version",
      icon: <IconPackage size={iconSize} aria-hidden="true" />,
      label: t("summary.version"),
      value: versionValue,
      title: release ? `${version} (${release})` : version,
      color: theme.textPrimary,
      href: getModeRoute("system"),
    },
    {
      id: "update",
      icon: <IconGitCommit size={iconSize} aria-hidden="true" />,
      label: t("summary.update"),
      value: updateValue,
      title: overview.update?.latestReleaseTag ?? release ?? undefined,
      color: updateColor,
      href: getModeRoute("system") ?? overview.update?.releaseUrl ?? undefined,
    },
    {
      id: "jobs",
      icon: <IconCalendarTime size={iconSize} aria-hidden="true" />,
      label: t("summary.jobs"),
      value: jobsValue,
      detail:
        overview.dataAvailability.jobs && jobSummary.failed > 0
          ? t("jobs.failed", { count: `${jobSummary.failed}` })
          : undefined,
      color: jobsColor,
      href: getModeRoute("cron"),
    },
    {
      id: "skills",
      icon: <IconSparkles size={iconSize} aria-hidden="true" />,
      label: t("summary.skills"),
      value: skillsValue,
      title: overview.dataAvailability.skills ? `${enabledSkills}/${overview.summary.skills.total}` : t("unknownShort"),
      color: skillsColor,
      href: getModeRoute("skills"),
    },
    {
      id: "platforms",
      icon: <IconPlugConnected size={iconSize} aria-hidden="true" />,
      label: t("summary.platforms"),
      value: `${connectedPlatforms}/${overview.summary.platforms.total}`,
      color: platformsColor,
      href: getModeRoute("sessions"),
    },
    {
      id: "toolsets",
      icon: <IconTools size={iconSize} aria-hidden="true" />,
      label: t("summary.toolsets"),
      value: toolsetsValue,
      color: toolsetsColor,
      href: getModeRoute("skills"),
    },
    {
      id: "agents",
      icon: <IconActivity size={iconSize} aria-hidden="true" />,
      label: t("summary.agents"),
      value: agentsValue,
      title: t("summary.agentsActivityTitle", {
        active: overview.summary.activeAgents,
        total: totalAgents ?? t("unknownShort"),
      }),
      color: activeAgentsColor,
      href: getModeRoute("profiles"),
    },
    {
      id: "sessions",
      icon: <IconMessageCircle size={iconSize} aria-hidden="true" />,
      label: t("summary.sessions"),
      value: sessionsValue,
      title: t("summary.sessionsActivityTitle", {
        active: activeSessionsValue,
        last24Hours: sessionsLast24HoursValue,
      }),
      color: activeSessionsColor,
      href: getModeRoute("sessions"),
    },
  ];
  const visibleMetrics = metrics.filter((metric) => visibleMetricIds.includes(metric.id));
  const modeBadge = (
    <Badge
      size="xs"
      variant="outline"
      title={t(`mode.${overview.mode}`)}
      styles={{
        root: { color: theme.textSecondary, borderColor: theme.border },
        label: { ...HERMES_CHROME_TEXT_STYLE, fontSize: typography.badge },
      }}
    >
      {t(`mode.${overview.mode}`)}
    </Badge>
  );

  const content = (
    <Stack
      h={showCardShell ? "100%" : height}
      gap={getContentGap(layoutMode)}
      style={{ ...getContentStyle(layoutMode, theme), minHeight: 0 }}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        gap={dense ? 4 : "xs"}
        pr={layoutMode === "strip" ? 28 : undefined}
        style={{ flexShrink: 0 }}
      >
        <Group gap={isMicroMetricMode ? 4 : "xs"} wrap="nowrap" miw={0}>
          <Avatar
            src={getIconUrl("hermesAgent")}
            alt="Hermes Agent"
            size={getLogoSize(layoutMode)}
            radius="sm"
            styles={{ root: { border: `1px solid ${theme.borderStrong}`, background: theme.surface } }}
          />
          <Stack gap={0} miw={0}>
            {overview.mode === "dashboard" && dashboardUrl ? (
              <Anchor
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                fz={typography.title}
                fw={700}
                c={theme.textPrimary}
                underline="never"
                lineClamp={1}
                title={`${instance.integrationName} ${t("meta.version", { version })}`}
                lh={1.15}
                style={{ fontFamily: theme.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Anchor>
            ) : (
              <Text
                fz={typography.title}
                fw={700}
                c={theme.textPrimary}
                lineClamp={1}
                title={`${instance.integrationName} ${t("meta.version", { version })}`}
                lh={1.15}
                style={{ fontFamily: theme.fontSans, textWrap: "balance" }}
              >
                {titleLabel}
              </Text>
            )}
            {showVersion && (
              <Text
                fz={typography.meta}
                c={theme.textSecondary}
                lh={1.2}
                lineClamp={1}
                title={t("meta.versionAndMode", { version, mode: t(`mode.${overview.mode}`) })}
              >
                {t("meta.versionAndMode", { version, mode: t(`mode.${overview.mode}`) })}
              </Text>
            )}
          </Stack>
        </Group>
        {layoutMode === "micro" ? (
          <Text
            component="output"
            aria-label={verboseStatusLabel}
            title={verboseStatusLabel}
            c={getThemeStatusColor(theme, gatewayState)}
            fz={typography.status}
            lh={1}
            style={{ flexShrink: 0 }}
          >
            ●
          </Text>
        ) : (
          <Badge
            variant={isNarrowLayout ? "light" : "dot"}
            color={getThemeStatusColor(theme, gatewayState)}
            size={dense ? "xs" : "sm"}
            maw={isNarrowLayout ? 44 : 110}
            title={verboseStatusLabel}
            styles={{
              root: {
                background: theme.surfaceRaised,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius,
              },
              label: { color: theme.textPrimary, ...HERMES_CHROME_TEXT_STYLE, fontSize: typography.status },
            }}
          >
            {statusLabel}
          </Badge>
        )}
      </Group>

      <SimpleGrid
        cols={metricColumns}
        spacing={getMetricSpacing(layoutMode)}
        verticalSpacing={getMetricSpacing(layoutMode)}
        style={
          shouldFillMetricGrid
            ? {
                flex: 1,
                minHeight: 0,
                ...(layoutMode === "tall" ? { gridAutoRows: "minmax(0, 1fr)" } : {}),
              }
            : undefined
        }
      >
        {visibleMetrics.map((metric) => (
          <MetricTile
            key={metric.id}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            title={metric.title}
            detail={metric.detail}
            color={metric.color}
            href={metric.href}
            mode={layoutMode}
            hideDetail={layoutMode === "strip" ? width < 560 : isMicroMetricMode || dense}
            typography={typography}
            tallExpanded={layoutMode === "tall" && height >= 340}
          />
        ))}
      </SimpleGrid>

      {detailsLayout && (
        <DetailsGrid
          instance={instance}
          options={options}
          routes={dashboardRoutes}
          linkToDashboard={overview.mode === "dashboard" && dashboardUrl !== null}
          width={width}
          columns={detailsLayout.columns}
          maxSections={detailsLayout.maxSections}
          itemLimit={detailsLayout.itemLimit}
        />
      )}

      {showCardShell && (
        <Group mt="auto" justify="space-between" gap="xs" wrap="nowrap">
          {overview.mode === "dashboard" && dashboardUrl ? (
            <Anchor href={dashboardUrl} target="_blank" rel="noopener noreferrer" underline="never" lh={1}>
              {modeBadge}
            </Anchor>
          ) : (
            modeBadge
          )}
          <Text
            fz={typography.footer}
            c={theme.textTertiary}
            lineClamp={1}
            title={dayjs(instance.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
          >
            {t("footer.updated", { when: dayjs(instance.updatedAt).fromNow() })}
          </Text>
        </Group>
      )}
    </Stack>
  );

  if (!showCardShell) return <HermesThemeContext.Provider value={theme}>{content}</HermesThemeContext.Provider>;

  return (
    <HermesThemeContext.Provider value={theme}>
      <Card h={height} withBorder radius="md" p="xs" style={getCardStyle(theme, options.brandTheme)}>
        {content}
      </Card>
    </HermesThemeContext.Provider>
  );
}

function getRatioColor(theme: HermesTheme, active: number, total: number) {
  if (total === 0) return theme.textTertiary;
  if (active === total) return theme.success;
  if (active > 0) return theme.warning;
  return theme.error;
}

function getNeutralCountColor(theme: HermesTheme, value: number | null) {
  return value !== null && value > 0 ? theme.textPrimary : theme.textTertiary;
}

function formatSessionCount(value: number | null | undefined, hasMore: boolean | undefined, unavailable: string) {
  return value === null || value === undefined ? unavailable : `${value}${hasMore ? "+" : ""}`;
}

function abbreviateStatus(status: string) {
  return status.length > 3 ? status.slice(0, 3).toUpperCase() : status.toUpperCase();
}
