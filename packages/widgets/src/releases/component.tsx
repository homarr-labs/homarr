"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Collapse, Loader, Tooltip, UnstyledButton } from "@mantine/core";
import type { MantineSize } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconChecks,
  IconChevronRight,
  IconCircleCheck,
  IconRefreshAlert,
} from "@tabler/icons-react";
import { useFormatter } from "next-intl";

import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";
import { countIssueEntries, getLatestEntry, groupEntries, sectionByKind, summarizeChangelog } from "./display";
import type { ChangelogDigest, IssueGroup, SectionEntries } from "./display";
import { getFailedServiceVersionIntegrations } from "./integration-version";
import { EntryIcon, IssueDetail, ReleaseDetail } from "./release-detail";
import type { ReleaseEntry } from "./release-entry";
import { releaseSectionKeys } from "./release-options";
import type { ReleaseLayout, ReleaseSectionKey, ReleaseSummaryMode } from "./release-options";
import { useReleaseEntries } from "./use-release-entries";

type RowVariant = "rich" | "mini" | "dense";
type Density = "micro" | "regular";
type MarkAllPlacement = "header" | "compactHeader" | "section";

const rowIconSizes: Record<RowVariant, number> = { rich: 30, mini: 22, dense: 18 };
const outdatedIconSizes: Record<RowVariant, number> = { rich: 14, mini: 14, dense: 12 };
const issueIconSizes: Record<RowVariant, number> = { rich: 16, mini: 16, dense: 12 };
const markViewedSizes: Record<RowVariant, MantineSize> = { rich: "md", mini: "sm", dense: "sm" };
const caughtUpIconSizes: Record<Density, number> = { micro: 20, regular: 24 };
const markAllSizes: Record<MarkAllPlacement, { button: MantineSize; icon: number }> = {
  header: { button: "lg", icon: 18 },
  compactHeader: { button: "md", icon: 16 },
  section: { button: "sm", icon: 14 },
};
const headerMarkAllPlacements: Record<ReleaseLayout, MarkAllPlacement> = {
  comfortable: "header",
  compact: "compactHeader",
};

const getCaughtUpIconSize = (density: Density, layout: ReleaseLayout) => {
  if (layout === "compact") return 16;
  return caughtUpIconSizes[density];
};

const getIssueKey = (group: IssueGroup) => `group:${group.key}`;

const getSectionRows = (section: SectionEntries) => [
  ...section.entries,
  ...section.issues.flatMap((group) => group.entries),
];

const getDensity = (width: number, height: number): Density => {
  if (width < 240 || height < 230) return "micro";
  return "regular";
};

const getRowVariant = (density: Density, layout: ReleaseLayout): RowVariant => {
  if (layout === "compact") return "dense";
  if (density === "micro") return "mini";
  return "rich";
};

interface PreviewLinesInput {
  density: Density;
  isSplit: boolean;
  showChangelogPreview: boolean;
  width: number;
  height: number;
}

const getPreviewLines = ({ density, isSplit, showChangelogPreview, width, height }: PreviewLinesInput) => {
  if (density === "micro" || !showChangelogPreview) return 0;
  if (isSplit && height >= 560) return 2;
  if (isSplit) return 1;
  if (width >= 340) return 2;
  return 1;
};

const getInboxDisplay = (
  options: WidgetComponentProps<"releases">["options"],
  displayMode: WidgetComponentProps<"releases">["displayMode"],
  displayScale: WidgetComponentProps<"releases">["displayScale"],
) => {
  if (displayMode === "advanced") {
    return { scale: 1, layout: "comfortable" as const, summary: "detailed" as const, sections: releaseSectionKeys };
  }
  return { scale: displayScale ?? 1, layout: options.layout, summary: options.summary, sections: options.sections };
};

export default function ReleasesWidget({
  options,
  itemId,
  integrationIds,
  width,
  height,
  displayScale,
  displayMode,
  isEditMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"releases">) {
  const t = useI18n("widget.releases");
  const board = useRequiredBoard();
  const { entries, isInitialLoading, isFetching, serviceVersionsQuery, markViewed, markAllViewed } = useReleaseEntries({
    options,
    itemId,
    boardId: board.id,
    integrationIds,
    widgetRuntimeRef,
  });
  const failedIntegrations = getFailedServiceVersionIntegrations(serviceVersionsQuery, t("runningVersions"));

  if (isInitialLoading) return <WidgetQueryLoadingState />;
  if (entries.length === 0) return <WidgetEmptyState />;

  const { scale, layout, summary, sections } = getInboxDisplay(options, displayMode, displayScale);

  return (
    <ReleasesInbox
      entries={entries}
      isFetching={isFetching}
      failedIntegrations={failedIntegrations}
      markViewed={markViewed}
      markAllViewed={markAllViewed}
      width={width * scale}
      height={height * scale}
      isEditMode={isEditMode}
      layout={layout}
      summary={summary}
      sections={sections}
      collapsedSections={options.collapsedSections}
      showChangelogPreview={options.showChangelogPreview}
      groupReleases={options.groupReleases}
    />
  );
}

interface ReleasesInboxProps {
  entries: ReleaseEntry[];
  isFetching: boolean;
  failedIntegrations: ReturnType<typeof getFailedServiceVersionIntegrations>;
  markViewed: (entry: ReleaseEntry) => void;
  markAllViewed: (entries: ReleaseEntry[]) => void;
  width: number;
  height: number;
  isEditMode: boolean;
  layout: ReleaseLayout;
  summary: ReleaseSummaryMode;
  sections: readonly ReleaseSectionKey[];
  collapsedSections: ReleaseSectionKey[];
  showChangelogPreview: boolean;
  groupReleases: boolean;
}

const ReleasesInbox = ({
  entries,
  isFetching,
  failedIntegrations,
  markViewed,
  markAllViewed,
  width,
  height,
  isEditMode,
  layout,
  summary,
  sections,
  collapsedSections,
  showChangelogPreview,
  groupReleases,
}: ReleasesInboxProps) => {
  const t = useI18n("widget.releases");
  const formatter = useFormatter();
  const board = useRequiredBoard();
  const now = useWidgetNow();
  const rootRef = useRef<HTMLDivElement>(null);

  const density = getDensity(width, height);
  const isSplit = width >= 620 && height >= 300;
  const previewLines = getPreviewLines({ density, isSplit, showChangelogPreview, width, height });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState<Partial<Record<ReleaseSectionKey, boolean>>>({});
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const grouped = useMemo(() => groupEntries(entries, sections), [entries, sections]);
  const newEntries = grouped.new.entries;
  const issues = grouped.attention.issues;
  const outdatedCount = grouped.attention.entries.length;
  const failingCount = countIssueEntries(issues);

  const digests = useMemo(
    () => new Map(entries.map((entry) => [entry.id, summarizeChangelog(entry.releaseNotes)] as const)),
    [entries],
  );
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry] as const)), [entries]);
  const issueById = new Map(issues.map((group) => [getIssueKey(group), group] as const));
  const issueByEntryId = new Map(issues.flatMap((group) => group.entries.map((entry) => [entry.id, group] as const)));
  const firstIssue = issues[0];

  const rowKeys = releaseSectionKeys.flatMap((key) => [
    ...grouped[key].entries.map((entry) => entry.id),
    ...grouped[key].issues.map(getIssueKey),
  ]);
  const knownSelection = rowKeys.find((key) => key === selectedId) ?? null;
  const activeId = knownSelection ?? rowKeys[0] ?? null;
  const highlightedId = (isSplit && activeId) || knownSelection;

  const isOpen = (key: ReleaseSectionKey) =>
    sectionOpen[key] ?? (!collapsedSections.includes(key) && (density === "regular" || key === "new"));
  const toggleSection = (key: ReleaseSectionKey) =>
    setSectionOpen((previous) => ({ ...previous, [key]: !isOpen(key) }));

  useEffect(() => {
    if (!scrollTarget) return;
    const node = rootRef.current?.querySelector(`[data-key="${CSS.escape(scrollTarget)}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setScrollTarget(null);
  }, [scrollTarget]);

  const jumpTo = (target: string, section: ReleaseSectionKey) => {
    setSectionOpen((previous) => ({ ...previous, [section]: true }));
    setSelectedId(target);
    setScrollTarget(target);
  };

  const jumpToEntry = (entry: ReleaseEntry) => {
    const group = issueByEntryId.get(entry.id);
    if (group) {
      jumpTo(getIssueKey(group), "attention");
      return;
    }
    jumpTo(entry.id, sectionByKind[entry.kind]);
  };

  const handleMarkViewed = (entry: ReleaseEntry) => {
    markViewed(entry);
    if (isSplit && activeId === entry.id) {
      setSelectedId(newEntries.find((candidate) => candidate.id !== entry.id)?.id ?? null);
    } else if (selectedId === entry.id) {
      setSelectedId(null);
    }
  };

  const handleMarkAllViewed = () => {
    markAllViewed(newEntries);
    setSelectedId(null);
  };

  const select = (key: string) => {
    if (selectedId === key && !isSplit) {
      setSelectedId(null);
      return;
    }
    setSelectedId(key);
    if (!isSplit) setScrollTarget(key);
  };

  const latest = getLatestEntry(entries);
  const activeEntry = activeId !== null && entryById.get(activeId);
  const activeIssue = activeId !== null && issueById.get(activeId);
  const stripEntries = releaseSectionKeys.flatMap((key) => getSectionRows(grouped[key]));
  const showHeader = summary !== "hidden";

  const headline = [
    {
      count: newEntries.length,
      tone: undefined,
      labels: { micro: t("summary.newShort"), regular: t("summary.newReleases", { count: newEntries.length }) },
    },
    {
      count: outdatedCount,
      tone: "warn",
      labels: { micro: t("summary.outdatedShort"), regular: t("summary.outdated", { count: outdatedCount }) },
    },
    {
      count: failingCount,
      tone: "warn",
      labels: { micro: t("summary.failingShort"), regular: t("summary.failing") },
    },
  ].find((candidate) => candidate.count > 0);

  const getSubline = () => {
    if (headline || !latest?.publishedAt) return t("summary.tracked", { count: entries.length });
    return t("summary.latest", {
      name: latest.name,
      version: latest.version ?? "",
      time: (now && formatter.relativeTime(latest.publishedAt, now)) ?? "",
    });
  };

  const renderEntry = (entry: ReleaseEntry, variant: RowVariant) => (
    <EntryRow
      key={entry.id}
      entry={entry}
      digest={digests.get(entry.id)}
      variant={variant}
      previewLines={previewLines}
      isSelected={isSplit && activeId === entry.id}
      isExpanded={!isSplit && knownSelection === entry.id}
      now={now}
      onSelect={() => select(entry.id)}
      onMarkViewed={handleMarkViewed}
    >
      <ReleaseDetail entry={entry} now={now} layout="inline" onMarkViewed={handleMarkViewed} />
    </EntryRow>
  );

  const renderIssue = (group: IssueGroup, variant: RowVariant) => {
    const key = getIssueKey(group);
    return (
      <IssueRow
        key={key}
        group={group}
        variant={variant}
        isSelected={isSplit && activeId === key}
        isExpanded={!isSplit && knownSelection === key}
        onSelect={() => select(key)}
      >
        <IssueDetail group={group} layout="inline" />
      </IssueRow>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`releases ${classes.root}`}
      data-density={density}
      data-layout={layout}
      data-narrow={width < 260 || undefined}
      data-edit={isEditMode || undefined}
      style={{ ["--releases-pane-radius" as string]: `var(--mantine-radius-${board.itemRadius})` }}
    >
      {showHeader && (
        <header
          className={`releases-header ${classes.header}`}
          data-inline={(isSplit && summary === "detailed") || undefined}
        >
          <div className={classes.verdict}>
            {headline && (
              <div className={classes.headline}>
                <span className={classes.big} data-tone={headline.tone}>
                  {headline.count}
                </span>
                <span className={classes.headlineLabel}>{headline.labels[density]}</span>
              </div>
            )}
            {!headline && (
              <div className={classes.caughtUp}>
                <IconCircleCheck style={zoomCompensatedSize(getCaughtUpIconSize(density, layout))} stroke={1.75} />
                <span>{t("summary.caughtUp")}</span>
              </div>
            )}
            <div className={classes.subline}>{getSubline()}</div>
          </div>

          {summary === "detailed" && (
            <div className={`releases-status-bar ${classes.strip}`}>
              {stripEntries.map((entry) => {
                const group = issueByEntryId.get(entry.id);
                const isActive =
                  entry.id === highlightedId || (group !== undefined && getIssueKey(group) === highlightedId);
                const label = [entry.name, entry.version, t(`status.${entry.kind}`)].filter(Boolean).join(" · ");
                return (
                  <Tooltip key={entry.id} label={label} withArrow openDelay={120}>
                    <UnstyledButton
                      className={classes.segment}
                      data-kind={entry.kind}
                      data-active={isActive || undefined}
                      onClick={() => jumpToEntry(entry)}
                      aria-label={label}
                    />
                  </Tooltip>
                );
              })}
            </div>
          )}

          <div className={classes.actions}>
            {isFetching && <Loader size="xs" color="gray" />}
            <IntegrationErrorIndicator results={failedIntegrations} />
            {firstIssue && (
              <Tooltip label={t("summary.issues", { count: failingCount })} withArrow>
                <UnstyledButton
                  className={classes.pill}
                  onClick={() => jumpTo(getIssueKey(firstIssue), "attention")}
                  aria-label={t("summary.issues", { count: failingCount })}
                >
                  <IconAlertTriangle style={zoomCompensatedSize(13)} />
                  {failingCount}
                </UnstyledButton>
              </Tooltip>
            )}
            {newEntries.length > 0 && (
              <MarkAllButton placement={headerMarkAllPlacements[layout]} onClick={handleMarkAllViewed} />
            )}
          </div>
        </header>
      )}

      {!showHeader && (failedIntegrations.length > 0 || (!groupReleases && newEntries.length > 0)) && (
        <div className={classes.floatingActions}>
          <IntegrationErrorIndicator results={failedIntegrations} />
          {!groupReleases && newEntries.length > 0 && (
            <MarkAllButton placement="section" onClick={handleMarkAllViewed} />
          )}
        </div>
      )}

      <div className={classes.body} data-split={isSplit || undefined}>
        <div className={classes.list} data-grouped={groupReleases}>
          {releaseSectionKeys.map((key) => {
            const section = grouped[key];
            const count = section.entries.length + countIssueEntries(section.issues);
            if (count === 0) return null;
            const variant = getRowVariant(density, layout);
            return (
              <Section
                key={key}
                sectionKey={key}
                groupReleases={groupReleases}
                count={count}
                isOpen={isOpen(key)}
                onToggle={() => toggleSection(key)}
                actions={
                  key === "new" && !showHeader && <MarkAllButton placement="section" onClick={handleMarkAllViewed} />
                }
              >
                {section.entries.map((entry) => renderEntry(entry, variant))}
                {section.issues.map((group) => renderIssue(group, variant))}
              </Section>
            );
          })}
        </div>

        {isSplit && (
          <aside className={classes.pane}>
            {activeEntry && (
              <ReleaseDetail entry={activeEntry} now={now} layout="pane" onMarkViewed={handleMarkViewed} />
            )}
            {activeIssue && <IssueDetail group={activeIssue} layout="pane" />}
          </aside>
        )}
      </div>
    </div>
  );
};

interface MarkAllButtonProps {
  placement: MarkAllPlacement;
  onClick: () => void;
}

const MarkAllButton = ({ placement, onClick }: MarkAllButtonProps) => {
  const t = useI18n("widget.releases");
  const size = markAllSizes[placement];

  return (
    <Tooltip label={t("markAllViewed")} withArrow>
      <ActionIcon variant="light" size={size.button} radius="xl" onClick={onClick} aria-label={t("markAllViewed")}>
        <IconChecks style={zoomCompensatedSize(size.icon)} />
      </ActionIcon>
    </Tooltip>
  );
};

interface SectionProps {
  sectionKey: ReleaseSectionKey;
  groupReleases: boolean;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

const Section = ({ sectionKey, groupReleases, count, isOpen, onToggle, actions, children }: SectionProps) => {
  const t = useI18n("widget.releases");
  if (!groupReleases) return children;

  return (
    <section className={`releases-section releases-section-${sectionKey} ${classes.section}`}>
      <div className={classes.sectionHead}>
        <UnstyledButton
          className={classes.sectionToggle}
          onClick={onToggle}
          aria-expanded={isOpen}
          title={t(`section.${sectionKey}.description`)}
        >
          <IconChevronRight
            style={zoomCompensatedSize(12)}
            className={classes.chevron}
            data-open={isOpen || undefined}
          />
          <span className={classes.swatch} data-section={sectionKey} aria-hidden />
          <span>{t(`section.${sectionKey}.label`)}</span>
          <span className={classes.sectionCount}>{count}</span>
        </UnstyledButton>
        {actions}
      </div>
      <Collapse expanded={isOpen} transitionDuration={0}>
        <div className={classes.sectionBody}>{children}</div>
      </Collapse>
    </section>
  );
};

interface EntryRowProps {
  entry: ReleaseEntry;
  digest?: ChangelogDigest;
  variant: RowVariant;
  previewLines: number;
  isSelected: boolean;
  isExpanded: boolean;
  now: Date | null;
  onSelect: () => void;
  onMarkViewed: (entry: ReleaseEntry) => void;
  children: ReactNode;
}

const EntryRow = ({
  entry,
  digest,
  variant,
  previewLines,
  isSelected,
  isExpanded,
  now,
  onSelect,
  onMarkViewed,
  children,
}: EntryRowProps) => {
  const t = useI18n("widget.releases");
  const formatter = useFormatter();
  const age = (entry.publishedAt && now && formatter.relativeTime(entry.publishedAt, { now, style: "narrow" })) || "";
  const outdatedIntegrations = entry.integrations.filter((integration) => integration.isUpToDate === false);
  const outdatedIcon = outdatedIntegrations.length > 0 && (
    <Tooltip
      label={outdatedIntegrations.map((integration) => (
        <div key={integration.id}>{`${integration.name}: ${integration.version} → ${entry.version ?? ""}`}</div>
      ))}
      withArrow
    >
      <span className={classes.outdated} aria-label={t("updateAvailable")}>
        <IconRefreshAlert style={zoomCompensatedSize(outdatedIconSizes[variant])} />
      </span>
    </Tooltip>
  );

  return (
    <div
      className={`releases-entry ${classes.rowWrap}`}
      data-key={entry.id}
      data-kind={entry.kind}
      data-selected={isSelected || undefined}
    >
      <div className={classes.row}>
        <UnstyledButton
          className={classes.rowMain}
          data-variant={variant}
          onClick={onSelect}
          aria-expanded={isExpanded}
        >
          <EntryIcon entry={entry} size={rowIconSizes[variant]} />
          {variant === "dense" && (
            <span className={classes.top}>
              <span className={classes.name}>{entry.name}</span>
              {outdatedIcon}
              <span className={classes.denseVersion}>{entry.version}</span>
              <span className={classes.age}>{age}</span>
            </span>
          )}
          {variant !== "dense" && (
            <span className={classes.text}>
              <span className={classes.top}>
                <span className={classes.name}>{entry.name}</span>
                {variant === "rich" && <span className={classes.age}>{age}</span>}
              </span>
              <span className={classes.meta}>
                <span className={classes.version}>{entry.version}</span>
                {outdatedIcon}
                {variant === "rich" && entry.isPreRelease && <span className={classes.tag}>{t("tag.preRelease")}</span>}
                {variant === "rich" && entry.resolvedFromTag && (
                  <span className={classes.tag} data-tone="code">
                    :{entry.resolvedFromTag}
                  </span>
                )}
                {variant === "rich" && digest && digest.changes >= 3 && (
                  <span className={classes.changes}>{t("changes", { count: digest.changes })}</span>
                )}
              </span>
              {variant === "rich" && previewLines > 0 && digest?.snippet && (
                <span className={classes.snippet} style={{ WebkitLineClamp: previewLines }}>
                  {digest.snippet}
                </span>
              )}
            </span>
          )}
        </UnstyledButton>
        {entry.kind === "new" && (
          <div className={classes.action}>
            <Tooltip label={t("markViewed")} withArrow>
              <ActionIcon
                variant="default"
                size={markViewedSizes[variant]}
                radius="xl"
                onClick={() => onMarkViewed(entry)}
                aria-label={t("markEntryViewed", { name: entry.name, version: entry.version ?? "" })}
              >
                <IconCheck style={zoomCompensatedSize(15)} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
      </div>
      {isExpanded && <div className={classes.expand}>{children}</div>}
    </div>
  );
};

interface IssueRowProps {
  group: IssueGroup;
  variant: RowVariant;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  children: ReactNode;
}

const IssueRow = ({ group, variant, isSelected, isExpanded, onSelect, children }: IssueRowProps) => {
  const t = useI18n("widget.releases");
  const title = t(`issue.${group.code}.title`, { provider: group.providerName ?? "" });
  const names = group.entries.map((entry) => entry.name).join(", ");
  const countBadge = group.entries.length > 1 && <span className={classes.countBadge}>{group.entries.length}</span>;

  return (
    <div
      className={`releases-issue ${classes.rowWrap}`}
      data-key={getIssueKey(group)}
      data-kind="error"
      data-selected={isSelected || undefined}
    >
      <div className={classes.row}>
        <UnstyledButton
          className={classes.rowMain}
          data-variant={variant}
          onClick={onSelect}
          aria-expanded={isExpanded}
        >
          <span className={classes.issueIcon}>
            <IconAlertTriangle style={zoomCompensatedSize(issueIconSizes[variant])} />
          </span>
          {variant === "dense" && (
            <span className={classes.top}>
              <span className={classes.name}>{names}</span>
              <span className={classes.denseVersion}>{title}</span>
            </span>
          )}
          {variant !== "dense" && (
            <span className={classes.text}>
              <span className={classes.top}>
                <span className={classes.name}>{title}</span>
                {countBadge}
              </span>
              <span className={classes.snippet}>{names}</span>
            </span>
          )}
        </UnstyledButton>
      </div>
      {isExpanded && <div className={classes.expand}>{children}</div>}
    </div>
  );
};
