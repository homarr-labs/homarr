import dayjs from "dayjs";
import { Box, Group, Stack, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import {
  IconApi,
  IconBrandDiscord,
  IconBrandSlack,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconClock,
  IconMessageCircle,
  IconTerminal2,
  IconWorld,
} from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { DetailsTypographyScale } from "./layout";
import {
  getJobDisplayState,
  getJobSortPriority,
  getOverflowList,
  getThemeStatusColor,
  sortSkillsByUsage,
} from "./utils";
import { HERMES_TECHNICAL_TEXT_STYLE, useHermesTheme } from "./theme";
import type { HermesJobDetail, HermesPlatformDetail, HermesSessionDetail, HermesSkillDetail } from "./types";

export function PlatformsList({
  platforms,
  maxItems,
  typography,
}: {
  platforms: HermesPlatformDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const sortedPlatforms = platforms.toSorted((platformA, platformB) => platformA.name.localeCompare(platformB.name));
  const { visibleItems: entries, remainingCount, remainingIsLowerBound } = getOverflowList(sortedPlatforms, maxItems);

  if (entries.length === 0 && remainingCount === 0) {
    return <EmptyText text={t("empty.platforms")} fontSize={typography.auxiliary} />;
  }

  return (
    <Stack gap={typography.rowGap}>
      {entries.map((platform) => {
        const updatedLabel = platform.updatedAt
          ? t("footer.updated", { when: dayjs(platform.updatedAt).fromNow() })
          : null;

        return (
          <Group key={platform.name} justify="space-between" wrap="nowrap" gap={4} mih={getRowMinHeight(typography)}>
            <Group gap={5} wrap="nowrap" miw={0} style={{ flex: "1 1 auto" }}>
              <Box
                component="span"
                w={typography.indicator}
                h={typography.indicator}
                style={{
                  borderRadius: "50%",
                  background: getThemeStatusColor(theme, platform.state),
                  flexShrink: 0,
                }}
                title={platform.state ?? t("unknown")}
              >
                <VisuallyHidden>{platform.state ?? t("unknown")}</VisuallyHidden>
              </Box>
              <Text
                fz={typography.item}
                fw={600}
                c={theme.textPrimary}
                lh={1.25}
                lineClamp={1}
                title={platform.name}
                style={{ flex: "1 1 auto", minWidth: 0 }}
              >
                {platform.name}
              </Text>
            </Group>
            {updatedLabel && (
              <Tooltip label={updatedLabel} openDelay={400}>
                <Box component="span" c={theme.textTertiary} style={{ display: "inline-flex", flexShrink: 0 }}>
                  <IconClock size={typography.icon} stroke={1.8} aria-hidden="true" />
                  <VisuallyHidden>{updatedLabel}</VisuallyHidden>
                </Box>
              </Tooltip>
            )}
          </Group>
        );
      })}
      <MoreRow count={remainingCount} isLowerBound={remainingIsLowerBound} typography={typography} />
    </Stack>
  );
}

export function SessionsList({
  sessions,
  totalItems,
  hasMore,
  maxItems,
  typography,
}: {
  sessions: HermesSessionDetail[];
  totalItems: number | null;
  hasMore: boolean;
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const {
    visibleItems: visibleSessions,
    remainingCount,
    remainingIsLowerBound,
  } = getOverflowList(sessions, maxItems, { totalItems, hasMore });

  if (visibleSessions.length === 0 && remainingCount === 0) {
    return <EmptyText text={t("empty.sessions")} fontSize={typography.auxiliary} />;
  }

  return (
    <Stack gap={typography.rowGap}>
      {visibleSessions.map((session) => {
        const title = session.title ?? session.id;

        return (
          <Group key={session.id} gap={5} wrap="nowrap" mih={getRowMinHeight(typography)}>
            <Text
              fz={typography.item}
              fw={500}
              c={theme.textPrimary}
              lh={1.3}
              lineClamp={1}
              title={title}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              {title}
            </Text>
            {session.source && <SessionSourceIcon source={session.source} size={typography.icon} />}
          </Group>
        );
      })}
      <MoreRow count={remainingCount} isLowerBound={remainingIsLowerBound} typography={typography} />
    </Stack>
  );
}

export function JobsList({
  jobs,
  maxItems,
  typography,
}: {
  jobs: HermesJobDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const sortedJobs = jobs.toSorted((jobA, jobB) => getJobSortPriority(jobA) - getJobSortPriority(jobB));
  const { visibleItems: visibleJobs, remainingCount, remainingIsLowerBound } = getOverflowList(sortedJobs, maxItems);

  if (visibleJobs.length === 0 && remainingCount === 0) {
    return <EmptyText text={t("empty.jobs")} fontSize={typography.auxiliary} />;
  }

  return (
    <Stack gap={typography.rowGap}>
      {visibleJobs.map((job) => {
        const name = job.name ?? t("jobs.unnamed");
        const displayState = getJobDisplayState(job);
        const status =
          displayState === "paused"
            ? t("jobs.paused")
            : displayState === "failed"
              ? t("jobs.failedLabel")
              : t("jobs.enabled");
        const color =
          displayState === "paused" ? theme.warning : displayState === "failed" ? theme.error : theme.success;
        const schedule = `${job.schedule ?? t("jobs.noSchedule")}${
          job.nextRunAt ? ` - ${t("jobs.next", { when: dayjs(job.nextRunAt).fromNow() })}` : ""
        }`;
        const description = `${name} · ${status} · ${schedule}`;

        return (
          <Group key={job.id} wrap="nowrap" mih={getRowMinHeight(typography)} miw={0}>
            <Text
              fz={typography.item}
              fw={600}
              c={color}
              lh={1.3}
              truncate="end"
              title={description}
              aria-label={description}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              {name}
            </Text>
          </Group>
        );
      })}
      <MoreRow count={remainingCount} isLowerBound={remainingIsLowerBound} typography={typography} />
    </Stack>
  );
}

function SessionSourceIcon({ source, size }: { source: string; size: number }) {
  const theme = useHermesTheme();
  const normalizedSource = source.toLowerCase();
  const iconProps = { size, stroke: 1.8, "aria-hidden": true } as const;
  const sourceIcon = normalizedSource.includes("telegram") ? (
    <IconBrandTelegram {...iconProps} color="#2aabee" />
  ) : normalizedSource.includes("discord") ? (
    <IconBrandDiscord {...iconProps} color="#5865f2" />
  ) : normalizedSource.includes("slack") ? (
    <IconBrandSlack {...iconProps} color="#e01e5a" />
  ) : normalizedSource.includes("whatsapp") ? (
    <IconBrandWhatsapp {...iconProps} color="#25d366" />
  ) : normalizedSource.includes("cron") ? (
    <IconClock {...iconProps} color={theme.warning} />
  ) : normalizedSource.includes("api") ? (
    <IconApi {...iconProps} color={theme.success} />
  ) : normalizedSource.includes("web") ? (
    <IconWorld {...iconProps} color={theme.success} />
  ) : normalizedSource.includes("cli") || normalizedSource.includes("terminal") ? (
    <IconTerminal2 {...iconProps} color={theme.textSecondary} />
  ) : (
    <IconMessageCircle {...iconProps} color={theme.textSecondary} />
  );

  return (
    <Tooltip label={source} openDelay={400}>
      <Box component="span" style={{ display: "inline-flex", flexShrink: 0 }}>
        {sourceIcon}
        <VisuallyHidden>{source}</VisuallyHidden>
      </Box>
    </Tooltip>
  );
}

export function SkillsList({
  skills,
  maxItems,
  typography,
}: {
  skills: HermesSkillDetail[];
  maxItems: number;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const enabledSkills = sortSkillsByUsage(skills.filter((skill) => skill.enabled));
  const {
    visibleItems: visibleSkills,
    remainingCount,
    remainingIsLowerBound,
  } = getOverflowList(enabledSkills, maxItems);

  if (skills.length === 0) return <EmptyText text={t("empty.skills")} fontSize={typography.auxiliary} />;
  if (enabledSkills.length === 0) {
    return <EmptyText text={t("empty.enabledSkills")} fontSize={typography.auxiliary} />;
  }

  return (
    <Stack gap={typography.rowGap}>
      {visibleSkills.map((skill) => (
        <Group key={skill.name} justify="space-between" wrap="nowrap" gap={5} mih={getRowMinHeight(typography)}>
          <Text
            fz={typography.item}
            fw={500}
            c={theme.textPrimary}
            lh={1.3}
            truncate="end"
            title={skill.category ? `${skill.name} · ${skill.category}` : skill.name}
            style={{ flex: "1 1 auto", minWidth: 0 }}
          >
            {skill.name}
          </Text>
          {skill.usage !== null && (
            <Text
              fz={typography.item}
              fw={700}
              c={theme.success}
              lh={1.3}
              title={t("skills.usage", { count: skill.usage })}
              aria-label={t("skills.usage", { count: skill.usage })}
              style={{ ...HERMES_TECHNICAL_TEXT_STYLE, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {skill.usage}
            </Text>
          )}
        </Group>
      ))}
      <MoreRow count={remainingCount} isLowerBound={remainingIsLowerBound} typography={typography} />
    </Stack>
  );
}

function MoreRow({
  count,
  isLowerBound,
  typography,
}: {
  count: number;
  isLowerBound: boolean;
  typography: DetailsTypographyScale;
}) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  if (count === 0) return null;

  const label = isLowerBound ? t("overflow.moreAtLeast", { count }) : t("overflow.more", { count });
  const title = isLowerBound ? t("overflow.moreAtLeastTitle", { count }) : label;

  return (
    <Group wrap="nowrap" mih={getRowMinHeight(typography)}>
      <Text
        fz={typography.auxiliary}
        fw={600}
        c={theme.textSecondary}
        lh={1.3}
        lineClamp={1}
        title={title}
        aria-label={title}
        style={{ ...HERMES_TECHNICAL_TEXT_STYLE, minWidth: 0 }}
      >
        {label}
      </Text>
    </Group>
  );
}

function EmptyText({ text, fontSize }: { text: string; fontSize: number }) {
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {text}
    </Text>
  );
}

function getRowMinHeight(typography: DetailsTypographyScale) {
  return Math.ceil(typography.item * 1.3);
}
