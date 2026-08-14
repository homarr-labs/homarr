import { Anchor, Divider, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconExternalLink } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { DETAILS_SECTION_GAP, getDetailItemLimit, getDetailsTypography } from "./layout";
import { JobsList, PlatformsList, SessionsList, SkillsList } from "./lists";
import { HERMES_CHROME_TEXT_STYLE, useHermesTheme } from "./theme";
import type { HermesAgentSuccessInstance } from "./types";

export type HermesDashboardRoutes = Record<"cron" | "profiles" | "sessions" | "skills" | "system", string | null>;

interface DetailsGridProps {
  instance: HermesAgentSuccessInstance;
  options: WidgetComponentProps<"hermesAgent">["options"];
  routes: HermesDashboardRoutes;
  linkToDashboard: boolean;
  width: number;
  columns: number;
  maxSections: number;
  itemLimit: number;
}

export function DetailsGrid({
  instance,
  options,
  routes,
  linkToDashboard,
  width,
  columns,
  maxSections,
  itemLimit,
}: DetailsGridProps) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  const { ref: detailsGridRef, height: detailsGridHeight } = useElementSize<HTMLDivElement>();
  const { overview } = instance;
  const details = overview.details;
  const enabledSectionCount = [
    options.showPlatforms,
    options.showSessions,
    options.showJobs,
    options.showSkills,
  ].filter(Boolean).length;
  const detailColumns = Math.max(1, Math.min(columns, maxSections, enabledSectionCount));
  const typography = getDetailsTypography(width, detailColumns);
  const visibleSectionCount = Math.min(maxSections, enabledSectionCount);
  const measuredColumns = Math.max(1, Math.min(columns, visibleSectionCount));
  const measuredGridRows = Math.max(1, Math.ceil(visibleSectionCount / measuredColumns));
  const measuredSectionHeight =
    detailsGridHeight > 0
      ? (detailsGridHeight - DETAILS_SECTION_GAP * Math.max(0, measuredGridRows - 1)) / measuredGridRows
      : null;
  const responsiveItemLimit =
    measuredSectionHeight === null
      ? itemLimit
      : Math.min(itemLimit, getDetailItemLimit(measuredSectionHeight, typography));
  const restrictedContent = <RestrictedText fontSize={typography.auxiliary} />;
  const sections = [
    options.showPlatforms
      ? {
          id: "platforms",
          label: t("sections.platforms"),
          href: routes.sessions,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : (
            <PlatformsList
              platforms={details?.platforms ?? []}
              maxItems={responsiveItemLimit}
              typography={typography}
            />
          ),
        }
      : null,
    options.showSessions
      ? {
          id: "sessions",
          label: t("sections.sessions"),
          href: routes.sessions,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.sessions ? (
            <SessionsList
              sessions={details?.sessions ?? []}
              totalItems={overview.summary.sessions}
              hasMore={overview.summary.sessionsHasMore}
              maxItems={responsiveItemLimit}
              typography={typography}
            />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
    options.showJobs
      ? {
          id: "jobs",
          label: t("sections.jobs"),
          href: routes.cron,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.jobs ? (
            <JobsList jobs={details?.jobs ?? []} maxItems={responsiveItemLimit} typography={typography} />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
    options.showSkills
      ? {
          id: "skills",
          label: t("sections.skills"),
          href: routes.skills,
          content: overview.detailsRestricted ? (
            restrictedContent
          ) : overview.dataAvailability.skills ? (
            <SkillsList skills={details?.skills ?? []} maxItems={responsiveItemLimit} typography={typography} />
          ) : (
            <UnavailableText fontSize={typography.auxiliary} />
          ),
        }
      : null,
  ].filter((section): section is NonNullable<typeof section> => section !== null);

  if (sections.length === 0) return null;

  const sectionPriority = ["sessions", "jobs", "skills", "platforms"];
  const visibleSections =
    maxSections >= sections.length
      ? sections
      : sectionPriority
          .flatMap((sectionId) => sections.filter((section) => section.id === sectionId))
          .slice(0, maxSections);
  const visibleColumns = Math.max(1, Math.min(columns, visibleSections.length));
  const gridRows = Math.ceil(visibleSections.length / visibleColumns);

  return (
    <SimpleGrid
      ref={detailsGridRef}
      cols={visibleColumns}
      spacing={DETAILS_SECTION_GAP}
      verticalSpacing={DETAILS_SECTION_GAP}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        overflow: "hidden",
        gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
      }}
    >
      {visibleSections.map((section) => {
        const panel = (
          <Paper
            withBorder
            radius="sm"
            p={8}
            h="100%"
            miw={0}
            style={{
              background: theme.surface,
              borderColor: theme.border,
              borderRadius: theme.radius,
              overflow: "hidden",
            }}
          >
            <Group justify="space-between" gap={4} wrap="nowrap">
              <Text
                fz={typography.heading}
                lh={1.2}
                fw={700}
                c={theme.textPrimary}
                lineClamp={1}
                title={section.label}
                style={{ ...HERMES_CHROME_TEXT_STYLE, minWidth: 0 }}
              >
                {section.label}
              </Text>
              {linkToDashboard && section.href && (
                <Text c={theme.textSecondary} lh={1}>
                  <IconExternalLink size={typography.icon} aria-hidden="true" />
                </Text>
              )}
            </Group>
            <Divider my={4} color={theme.border} />
            {section.content}
          </Paper>
        );

        if (!linkToDashboard || !section.href) {
          return (
            <div key={section.id} style={{ height: "100%", minWidth: 0 }}>
              {panel}
            </div>
          );
        }

        return (
          <Anchor
            key={section.id}
            href={section.href}
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
            aria-label={t("action.openSection", { section: section.label })}
            style={{ display: "block", height: "100%", minWidth: 0, color: "inherit" }}
          >
            {panel}
          </Anchor>
        );
      })}
    </SimpleGrid>
  );
}

function RestrictedText({ fontSize }: { fontSize: number }) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {t("empty.restricted")}
    </Text>
  );
}

function UnavailableText({ fontSize }: { fontSize: number }) {
  const t = useScopedI18n("widget.hermesAgent");
  const theme = useHermesTheme();
  return (
    <Text fz={fontSize} c={theme.textTertiary} ta="center" py={4}>
      {t("empty.unavailable")}
    </Text>
  );
}
