"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Loader, Tooltip } from "@mantine/core";
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
import {
  getEntryKind,
  getLatestEntry,
  getSectionKey,
  groupEntries,
  sectionKindByKey,
  summarizeChangelog,
} from "./display";
import type { ChangelogDigest, IssueGroup } from "./display";
import { getFailedServiceVersionIntegrations } from "./integration-version";
import { EntryIcon, hasOutdatedIntegration, IssueDetail, ReleaseDetail } from "./release-detail";
import type { ReleaseEntry } from "./release-entry";
import { releaseSectionKeys } from "./release-options";
import type { ReleaseSectionKey } from "./release-options";
import { useReleaseEntries } from "./use-release-entries";

type RowVariant = "rich" | "mini" | "dense";

const rowIconSizes: Record<RowVariant, number> = { rich: 30, mini: 22, dense: 18 };

const getIssueKey = (group: IssueGroup) => `group:${group.key}`;

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

  const isAdvanced = displayMode === "advanced";
  const scale = isAdvanced ? 1 : (displayScale ?? 1);

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
      summary={isAdvanced ? "detailed" : options.summary}
      sections={isAdvanced ? [...releaseSectionKeys] : options.sections}
      collapsedSections={options.collapsedSections}
      showChangelogPreview={options.showChangelogPreview}
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
  summary: WidgetComponentProps<"releases">["options"]["summary"];
  sections: ReleaseSectionKey[];
  collapsedSections: ReleaseSectionKey[];
  showChangelogPreview: boolean;
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
  summary,
  sections,
  collapsedSections,
  showChangelogPreview,
}: ReleasesInboxProps) => {
  const t = useI18n("widget.releases");
  const formatter = useFormatter();
  const board = useRequiredBoard();
  const hasColor = board.iconColor !== null;
  const now = useWidgetNow();
  const rootRef = useRef<HTMLDivElement>(null);

  const isMicro = width < 240 || height < 230;
  const isSplit = width >= 620 && height >= 300;
  let previewLines = 1;
  if (isMicro || !showChangelogPreview) previewLines = 0;
  else if (isSplit) previewLines = height >= 560 ? 2 : 1;
  else if (width >= 340) previewLines = 2;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState<Partial<Record<ReleaseSectionKey, boolean>>>({});
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const grouped = useMemo(() => groupEntries(entries), [entries]);
  const isVisible = (key: ReleaseSectionKey) => sections.includes(key);
  const unseen = isVisible("new") ? grouped.unseen : [];
  const issues = isVisible("attention") ? grouped.issues : [];
  const upToDate = isVisible("upToDate") ? grouped.upToDate : [];
  const quiet = isVisible("quiet") ? grouped.quiet : [];

  const digests = useMemo(
    () => new Map(entries.map((entry) => [entry.id, summarizeChangelog(entry.releaseNotes)] as const)),
    [entries],
  );
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry] as const)), [entries]);
  const issueById = new Map(issues.map((group) => [getIssueKey(group), group] as const));
  const issueByEntryId = new Map(issues.flatMap((group) => group.entries.map((entry) => [entry.id, group] as const)));
  const issueCount = issues.reduce((total, group) => total + group.entries.length, 0);
  const failingCount = grouped.issues.reduce((total, group) => total + group.entries.length, 0);
  const firstIssue = issues[0];

  const knownSelection =
    selectedId !== null && (entryById.has(selectedId) || issueById.has(selectedId)) ? selectedId : null;
  const defaultActive =
    unseen[0]?.id ?? (firstIssue && getIssueKey(firstIssue)) ?? upToDate[0]?.id ?? quiet[0]?.id ?? null;
  const activeId = knownSelection ?? defaultActive;
  const highlightedId = isSplit ? activeId : knownSelection;

  const isOpen = (key: ReleaseSectionKey) =>
    sectionOpen[key] ?? (!collapsedSections.includes(key) && (!isMicro || key === "new"));
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
    jumpTo(group ? getIssueKey(group) : entry.id, getSectionKey(getEntryKind(entry)));
  };

  const handleMarkViewed = (entry: ReleaseEntry) => {
    markViewed(entry);
    if (isSplit && activeId === entry.id) {
      setSelectedId(unseen.find((candidate) => candidate.id !== entry.id)?.id ?? null);
    } else if (selectedId === entry.id) {
      setSelectedId(null);
    }
  };

  const handleMarkAllViewed = () => {
    markAllViewed(unseen);
    setSelectedId(null);
  };

  const select = (key: string) => {
    setSelectedId((previous) => (previous === key && !isSplit ? null : key));
    if (!isSplit && selectedId !== key) setScrollTarget(key);
  };

  const rowVariant: RowVariant = isMicro ? "mini" : "rich";
  const latest = getLatestEntry(entries);
  const activeEntry = activeId ? entryById.get(activeId) : undefined;
  const activeIssue = activeId ? issueById.get(activeId) : undefined;
  const stripEntries = [...unseen, ...issues.flatMap((group) => group.entries), ...upToDate, ...quiet];
  const showHeader = summary !== "hidden";

  const markAllButton = unseen.length > 0 && (
    <Tooltip label={t("markAllViewed")} withArrow>
      <ActionIcon
        variant="light"
        size={showHeader ? "lg" : "sm"}
        radius="xl"
        onClick={handleMarkAllViewed}
        aria-label={t("markAllViewed")}
      >
        <IconChecks style={zoomCompensatedSize(showHeader ? 18 : 14)} />
      </ActionIcon>
    </Tooltip>
  );

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
      hasColor={hasColor}
      onSelect={() => select(entry.id)}
      onMarkViewed={handleMarkViewed}
    >
      <ReleaseDetail entry={entry} now={now} hasColor={hasColor} layout="inline" onMarkViewed={handleMarkViewed} />
    </EntryRow>
  );

  return (
    <div
      ref={rootRef}
      className={`releases ${classes.root}`}
      data-density={isMicro ? "micro" : "regular"}
      data-edit={isEditMode || undefined}
      style={{ ["--releases-pane-radius" as string]: `var(--mantine-radius-${board.itemRadius})` }}
    >
      {showHeader && (
        <header
          className={`releases-header ${classes.header}`}
          data-inline={(isSplit && summary === "detailed") || undefined}
        >
          <div className={classes.verdict}>
            {unseen.length > 0 && (
              <div className={classes.headline}>
                <span className={classes.big}>{unseen.length}</span>
                <span className={classes.headlineLabel}>
                  {isMicro ? t("summary.newShort") : t("summary.newReleases", { count: unseen.length })}
                </span>
              </div>
            )}
            {unseen.length === 0 && failingCount > 0 && (
              <div className={classes.headline}>
                <span className={classes.big} data-tone="warn">
                  {failingCount}
                </span>
                <span className={classes.headlineLabel}>
                  {isMicro ? t("summary.failingShort") : t("summary.failing")}
                </span>
              </div>
            )}
            {unseen.length === 0 && failingCount === 0 && (
              <div className={classes.caughtUp}>
                <IconCircleCheck style={zoomCompensatedSize(isMicro ? 20 : 24)} stroke={1.75} />
                <span>{t("summary.caughtUp")}</span>
              </div>
            )}
            <div className={classes.subline}>
              {unseen.length > 0 || failingCount > 0 || !latest?.publishedAt
                ? t("summary.tracked", { count: entries.length })
                : t("summary.latest", {
                    name: latest.name,
                    version: latest.version ?? "",
                    time: now ? formatter.relativeTime(latest.publishedAt, now) : "",
                  })}
            </div>
          </div>

          {summary === "detailed" && (
            <div className={`releases-status-bar ${classes.strip}`}>
              {stripEntries.map((entry) => {
                const kind = getEntryKind(entry);
                const group = issueByEntryId.get(entry.id);
                const isActive =
                  entry.id === highlightedId || (group !== undefined && getIssueKey(group) === highlightedId);
                const label = [entry.name, entry.version, t(`status.${kind}`)].filter(Boolean).join(" · ");
                return (
                  <Tooltip key={entry.id} label={label} withArrow openDelay={120}>
                    <button
                      type="button"
                      className={classes.segment}
                      data-kind={kind}
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
              <Tooltip label={t("summary.issues", { count: issueCount })} withArrow>
                <button
                  type="button"
                  className={classes.pill}
                  onClick={() => jumpTo(getIssueKey(firstIssue), "attention")}
                  aria-label={t("summary.issues", { count: issueCount })}
                >
                  <IconAlertTriangle style={zoomCompensatedSize(13)} />
                  {issueCount}
                </button>
              </Tooltip>
            )}
            {markAllButton}
          </div>
        </header>
      )}

      {!showHeader && failedIntegrations.length > 0 && (
        <div className={classes.floatingActions}>
          <IntegrationErrorIndicator results={failedIntegrations} />
        </div>
      )}

      <div className={classes.body} data-split={isSplit || undefined}>
        <div className={classes.list}>
          {unseen.length > 0 && (
            <Section
              sectionKey="new"
              count={unseen.length}
              isOpen={isOpen("new")}
              onToggle={() => toggleSection("new")}
              actions={showHeader ? undefined : markAllButton}
            >
              {unseen.map((entry) => renderEntry(entry, rowVariant))}
            </Section>
          )}
          {issues.length > 0 && (
            <Section
              sectionKey="attention"
              count={issueCount}
              isOpen={isOpen("attention")}
              onToggle={() => toggleSection("attention")}
            >
              {issues.map((group) => {
                const key = getIssueKey(group);
                return (
                  <IssueRow
                    key={key}
                    group={group}
                    variant={rowVariant}
                    isSelected={isSplit && activeId === key}
                    isExpanded={!isSplit && knownSelection === key}
                    onSelect={() => select(key)}
                  >
                    <IssueDetail group={group} hasColor={hasColor} layout="inline" />
                  </IssueRow>
                );
              })}
            </Section>
          )}
          {upToDate.length > 0 && (
            <Section
              sectionKey="upToDate"
              count={upToDate.length}
              isOpen={isOpen("upToDate")}
              onToggle={() => toggleSection("upToDate")}
            >
              {upToDate.map((entry) => renderEntry(entry, "dense"))}
            </Section>
          )}
          {quiet.length > 0 && (
            <Section
              sectionKey="quiet"
              count={quiet.length}
              isOpen={isOpen("quiet")}
              onToggle={() => toggleSection("quiet")}
            >
              {quiet.map((entry) => renderEntry(entry, "dense"))}
            </Section>
          )}
        </div>

        {isSplit && (
          <aside className={classes.pane}>
            {activeEntry && (
              <ReleaseDetail
                entry={activeEntry}
                now={now}
                hasColor={hasColor}
                layout="pane"
                onMarkViewed={handleMarkViewed}
              />
            )}
            {activeIssue && <IssueDetail group={activeIssue} hasColor={hasColor} layout="pane" />}
          </aside>
        )}
      </div>
    </div>
  );
};

interface SectionProps {
  sectionKey: ReleaseSectionKey;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

const Section = ({ sectionKey, count, isOpen, onToggle, actions, children }: SectionProps) => {
  const t = useI18n("widget.releases");

  return (
    <section className={`releases-section releases-section-${sectionKey} ${classes.section}`}>
      <div className={classes.sectionHead}>
        <button
          type="button"
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
          <span className={classes.swatch} data-kind={sectionKindByKey[sectionKey]} aria-hidden />
          <span>{t(`section.${sectionKey}.label`)}</span>
          <span className={classes.sectionCount}>{count}</span>
        </button>
        {actions}
      </div>
      {isOpen && <div className={classes.sectionBody}>{children}</div>}
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
  hasColor: boolean;
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
  hasColor,
  onSelect,
  onMarkViewed,
  children,
}: EntryRowProps) => {
  const t = useI18n("widget.releases");
  const formatter = useFormatter();
  const kind = getEntryKind(entry);
  const age = entry.publishedAt && now ? formatter.relativeTime(entry.publishedAt, { now, style: "narrow" }) : "";
  const isOutdated = hasOutdatedIntegration(entry);
  const outdatedIcon = isOutdated && (
    <Tooltip label={t("updateAvailable")} withArrow>
      <span className={classes.outdated} aria-label={t("updateAvailable")}>
        <IconRefreshAlert style={zoomCompensatedSize(variant === "dense" ? 12 : 14)} />
      </span>
    </Tooltip>
  );

  return (
    <div
      className={`releases-entry ${classes.rowWrap}`}
      data-key={entry.id}
      data-kind={kind}
      data-selected={isSelected || undefined}
    >
      <div className={classes.row}>
        <button
          type="button"
          className={classes.rowMain}
          data-variant={variant}
          onClick={onSelect}
          aria-expanded={isExpanded}
        >
          <EntryIcon entry={entry} size={rowIconSizes[variant]} hasColor={hasColor} />
          {variant === "dense" ? (
            <span className={classes.top}>
              <span className={classes.name}>{entry.name}</span>
              {outdatedIcon}
              <span className={classes.denseVersion}>{entry.version}</span>
              <span className={classes.age}>{age}</span>
            </span>
          ) : (
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
        </button>
        {kind === "unseen" && (
          <div className={classes.action}>
            <Tooltip label={t("markViewed")} withArrow>
              <ActionIcon
                variant="default"
                size={variant === "mini" ? "sm" : "md"}
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

  return (
    <div
      className={`releases-issue ${classes.rowWrap}`}
      data-key={getIssueKey(group)}
      data-kind="error"
      data-selected={isSelected || undefined}
    >
      <div className={classes.row}>
        <button
          type="button"
          className={classes.rowMain}
          data-variant={variant}
          onClick={onSelect}
          aria-expanded={isExpanded}
        >
          <span className={classes.issueIcon}>
            <IconAlertTriangle style={zoomCompensatedSize(16)} />
          </span>
          <span className={classes.text}>
            <span className={classes.top}>
              <span className={classes.name}>
                {t(`issue.${group.code}.title`, { provider: group.providerName ?? "" })}
              </span>
              {group.entries.length > 1 && <span className={classes.countBadge}>{group.entries.length}</span>}
            </span>
            <span className={classes.snippet}>{group.entries.map((entry) => entry.name).join(", ")}</span>
          </span>
        </button>
      </div>
      {isExpanded && <div className={classes.expand}>{children}</div>}
    </div>
  );
};
