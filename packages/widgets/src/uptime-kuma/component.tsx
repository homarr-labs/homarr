"use client";

import type { CSSProperties, ReactNode } from "react";
import { Anchor, Badge, OverflowList, ScrollArea, Text } from "@mantine/core";
import { clamp } from "@mantine/hooks";
import { IconCircleCheck, IconExternalLink, IconHeartbeat } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "@homarr/common";
import type { UptimeKumaSummary } from "@homarr/integrations/types";
import { summarizeUptimeKumaMonitors } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";
import {
  estimateSmallTextWidth,
  fitsHeadline,
  getMonitorColumnCount,
  getUptimeKumaLayout,
  showsInlineTags,
  usesInlineRows,
} from "./layout";
import type { UptimeKumaLayout } from "./layout";
import { getMonitorRowTemplate, MonitorRow } from "./monitor-row";
import type { MonitorRowVisibility } from "./monitor-row";
import { getAllMonitors, getMonitorSections, needsAttention, sortMonitors } from "./monitors";
import type { LoadedStatusPage, MonitorEntry } from "./monitors";
import type { Notice } from "./notices";
import { getNotices, NoticeIndicator, NoticeList } from "./notices";
import { formatUptime, monitorStatusColors } from "./status";
import {
  AverageUptime,
  DistributionBar,
  getAverageUptimeText,
  getOverallStatusLabel,
  getShortStatusLabel,
  OverallStatus,
  StatusBreakdown,
  SummaryLine,
  SummaryRing,
  useBreakdownLayout,
} from "./summary";

type Options = WidgetComponentProps<"uptimeKuma">["options"];

export default function UptimeKumaWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"uptimeKuma">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <UptimeKumaContent
      integrationIds={integrationIds}
      options={options}
      width={width}
      height={height}
      isAdvanced={displayMode === "advanced"}
      displayScale={displayScale}
    />
  );
}

interface UptimeKumaContentProps {
  integrationIds: string[];
  options: Options;
  width: number;
  height: number;
  isAdvanced: boolean;
  displayScale: number;
}

function UptimeKumaContent({
  integrationIds,
  options,
  width,
  height,
  isAdvanced,
  displayScale,
}: UptimeKumaContentProps) {
  const t = useI18n("widget.uptimeKuma");
  const now = useWidgetNow("minute");
  const statusPagesQuery = clientApi.widget.uptimeKuma.getStatusPages.useQuery({ integrationIds });
  const results = getUsableWidgetQueryData(statusPagesQuery);

  if (!results) return <WidgetQueryLoadingState />;

  const pages: LoadedStatusPage[] = results.flatMap(({ integrationId, statusPage }) =>
    statusPage === null ? [] : [{ integrationId, statusPage }],
  );
  const uiScale = isAdvanced ? 1 : calculateBoardUiScale(displayScale);
  const size = { width: width / uiScale, height: height / uiScale };
  const layout = getUptimeKumaLayout(size.width, size.height, isAdvanced);
  const summary = summarizeUptimeKumaMonitors(getAllMonitors(pages));
  const notices = isAdvanced || options.showIncidents ? getNotices(pages, t("notice.untitled")) : [];
  const errorIndicator = <IntegrationErrorIndicator results={results} />;

  if (summary.total === 0) {
    return (
      <Frame overlay={errorIndicator}>
        <CenteredState
          icon={<IconHeartbeat className={classes.stateIcon} aria-hidden />}
          title={t("empty.title")}
          description={layout !== "tile" && t("empty.description")}
        />
      </Frame>
    );
  }

  if (layout === "tile") {
    return (
      <Frame overlay={errorIndicator}>
        <TileLayout summary={summary} notices={notices} size={size} showUptime={options.showUptime} />
      </Frame>
    );
  }

  if (layout === "strip") {
    return (
      <Frame overlay={errorIndicator}>
        <StripLayout pages={pages} summary={summary} notices={notices} size={size} options={options} />
      </Frame>
    );
  }

  return (
    <ListLayout
      pages={pages}
      summary={summary}
      notices={notices}
      layout={layout}
      size={size}
      options={options}
      isAdvanced={isAdvanced}
      now={now}
      errorIndicator={errorIndicator}
    />
  );
}

interface Size {
  width: number;
  height: number;
}

const Frame = ({ children, overlay }: { children: ReactNode; overlay: ReactNode }) => (
  <div className={classes.frame}>
    <div className={classes.overlay}>{overlay}</div>
    {children}
  </div>
);

const CenteredState = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string | false;
}) => (
  <div className={classes.centeredState}>
    {icon}
    <Text fw={600} size="sm" ta="center">
      {title}
    </Text>
    {description && (
      <Text size="xs" c="dimmed" ta="center">
        {description}
      </Text>
    )}
  </div>
);

interface TileLayoutProps {
  summary: UptimeKumaSummary;
  notices: Notice[];
  size: Size;
  showUptime: boolean;
}

const TileLayout = ({ summary, notices, size, showUptime }: TileLayoutProps) => {
  const t = useI18n("widget.uptimeKuma");
  const showAverageUptime = showUptime && summary.averageUptime24h !== null;
  const textHeight = 26 + (showAverageUptime ? 18 : 0);
  const ringSize = clamp(Math.min(size.width - 16, size.height - 20 - textHeight), 48, 160);

  return (
    <div className={classes.tile}>
      {notices.length > 0 && (
        <div className={classes.tileNotice}>
          <NoticeIndicator notices={notices} />
        </div>
      )}
      <SummaryRing summary={summary} size={ringSize} />
      <div className={classes.tileText}>
        <OverallStatus summary={summary} short size="sm" />
        {showAverageUptime && summary.averageUptime24h !== null && (
          <Text size="xs" c="dimmed" truncate>
            {t("summary.uptimeShort", { value: formatUptime(summary.averageUptime24h) })}
          </Text>
        )}
      </div>
    </div>
  );
};

interface StripLayoutProps {
  pages: LoadedStatusPage[];
  summary: UptimeKumaSummary;
  notices: Notice[];
  size: Size;
  options: Options;
}

const stripChromeHeight = 54;
const stripHeaderReservedWidth = 20;
const stripLineHeight = 22;
const chipRowHeight = 32;
const chipOverflowWidth = 56;
const noticeIndicatorWidth = 30;

const StripLayout = ({ pages, summary, notices, size, options }: StripLayoutProps) => {
  const t = useI18n("widget.uptimeKuma");
  const ringSize = clamp(Math.min(size.height - 24, size.width * 0.3), 56, 150);
  const bodyWidth = size.width - ringSize - 48;
  const breakdown = useBreakdownLayout(summary, bodyWidth);
  const breakdownHeight = breakdown.rows * stripLineHeight;
  const showBreakdown = stripChromeHeight + breakdownHeight <= size.height;
  const usedHeight = stripChromeHeight + (showBreakdown ? breakdownHeight : 0);
  const chipMonitors = sortMonitors(getAllMonitors(pages).filter(needsAttention), options.sortBy);
  const chipRows = chipMonitors.length > 0 ? clamp(Math.floor((size.height - usedHeight) / chipRowHeight), 0, 3) : 0;
  const uptime = options.showUptime ? getAverageUptimeText(summary) : null;
  const uptimeLine = usedHeight + chipRows * chipRowHeight + stripLineHeight <= size.height ? uptime : null;
  const headlineWidth = bodyWidth - stripHeaderReservedWidth;
  const chipMaxWidth = clamp(bodyWidth - chipOverflowWidth, 72, 180);

  return (
    <div className={classes.strip}>
      {notices.length > 0 && (
        <div className={classes.tileNotice}>
          <NoticeIndicator notices={notices} />
        </div>
      )}
      <SummaryRing summary={summary} size={ringSize} />
      <div className={classes.stripBody}>
        <div className={classes.stripHeader}>
          <OverallStatus summary={summary} short={!fitsHeadline(getOverallStatusLabel(summary, t), headlineWidth)} />
        </div>
        {showBreakdown && <StatusBreakdown summary={summary} layout={breakdown.kind} />}
        {uptimeLine && <AverageUptime value={uptimeLine} />}
        {chipRows > 0 && (
          <OverflowList
            data={chipMonitors}
            maxRows={chipRows}
            gap={6}
            getItemKey={(monitor) => monitor.key}
            renderItem={(monitor) => <MonitorChip monitor={monitor} maxWidth={chipMaxWidth} />}
            renderOverflow={(hidden) => (
              <Badge variant="light" color="gray" size="lg" radius="sm" tt="none" fw={500}>
                +{hidden.length}
              </Badge>
            )}
          />
        )}
      </div>
    </div>
  );
};

const MonitorChip = ({ monitor, maxWidth }: { monitor: MonitorEntry; maxWidth: number }) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <Badge
      variant="light"
      color={monitorStatusColors[monitor.status]}
      size="lg"
      radius="sm"
      tt="none"
      fw={500}
      maw={maxWidth}
      title={`${monitor.name} · ${t(`status.${monitor.status}`)}`}
      leftSection={<span className={classes.dot} data-status={monitor.status} />}
    >
      {monitor.name}
    </Badge>
  );
};

interface ListLayoutProps {
  pages: LoadedStatusPage[];
  summary: UptimeKumaSummary;
  notices: Notice[];
  layout: Exclude<UptimeKumaLayout, "tile" | "strip">;
  size: Size;
  options: Options;
  isAdvanced: boolean;
  now: Date | null;
  errorIndicator: ReactNode;
}

const ListLayout = ({
  pages,
  summary,
  notices,
  layout,
  size,
  options,
  isAdvanced,
  now,
  errorIndicator,
}: ListLayoutProps) => {
  const t = useI18n("widget.uptimeKuma");
  const columnCount = layout === "board" ? getMonitorColumnCount(size.width) : 1;
  const variant = layout === "board" && usesInlineRows(size.width, columnCount) ? "inline" : "stacked";
  const isColumn = layout === "column";
  const isNarrow = size.width < 180;
  const visibility: MonitorRowVisibility = {
    heartbeatBar: isAdvanced || options.showHeartbeatBar,
    uptime: isAdvanced || options.showUptime,
    responseTime: (isAdvanced || options.showResponseTime) && !isNarrow,
    certificateExpiry: isAdvanced || options.showCertificateExpiry,
    statusDetail: !isColumn,
    tags: isAdvanced || (variant === "inline" && showsInlineTags(size.width, columnCount)),
  };
  const sections = getMonitorSections(pages, {
    groupByStatusPageGroup: options.groupByStatusPageGroup,
    showOnlyProblems: !isAdvanced && options.showOnlyProblems,
    sortBy: options.sortBy,
  });
  const showSummary = isAdvanced || options.showSummary;
  const headerWidth = size.width - (isColumn ? 16 : 32);
  const singlePage = pages.length === 1 ? pages[0]?.statusPage : undefined;
  const statusPageHref = getSafeApplicationUrl(singlePage?.url);
  const statusPageLink = singlePage && statusPageHref && size.width >= 340 ? singlePage : null;
  const statusPageLinkWidth = statusPageLink ? estimateSmallTextWidth(statusPageLink.title) + 28 : 0;
  const shortHeadline = isColumn || !fitsHeadline(getOverallStatusLabel(summary, t), headerWidth - statusPageLinkWidth);
  const showNoticeIndicator =
    showSummary &&
    isColumn &&
    notices.length > 0 &&
    fitsHeadline(getShortStatusLabel(summary, t), headerWidth - noticeIndicatorWidth);
  const gridStyle = {
    "--monitor-columns": columnCount,
    "--monitor-row-template": getMonitorRowTemplate(variant, visibility),
  } as CSSProperties;

  return (
    <div className={classes.list} data-layout={layout}>
      {!showSummary && <div className={classes.overlay}>{errorIndicator}</div>}
      {showSummary && (
        <header className={classes.header}>
          <div className={classes.headerTop}>
            <OverallStatus summary={summary} short={shortHeadline} size={isColumn ? "sm" : "md"} />
            {showNoticeIndicator && <NoticeIndicator notices={notices} />}
            {statusPageLink && statusPageHref && (
              <Anchor
                href={statusPageHref}
                target="_blank"
                rel={SAFE_NEW_TAB_REL}
                size="xs"
                c="dimmed"
                className={classes.statusPageLink}
              >
                <span className={classes.statusPageTitle}>{statusPageLink.title}</span>
                <IconExternalLink style={iconSizes.xs} aria-hidden />
              </Anchor>
            )}
            {errorIndicator}
          </div>
          <DistributionBar summary={summary} />
          <SummaryLine summary={summary} showUptime={visibility.uptime && !isColumn} width={headerWidth} />
        </header>
      )}
      <ScrollArea
        className={classes.scroll}
        classNames={{ viewport: classes.scrollViewport }}
        type="hover"
        scrollbarSize={6}
        offsetScrollbars={!isColumn && "y"}
      >
        <div className={classes.scrollContent}>
          {notices.length > 0 && !showNoticeIndicator && (
            <NoticeList notices={notices} compact={isColumn || size.height < 400} showAge={!isNarrow} now={now} />
          )}
          {sections.length === 0 && (
            <CenteredState
              icon={<IconCircleCheck className={classes.stateIcon} data-tone="success" aria-hidden />}
              title={t("allClear", { count: summary.total })}
            />
          )}
          {sections.map((section) => (
            <section key={section.key} className={classes.section}>
              {section.title && (
                <Text component="h3" className={classes.sectionTitle} truncate>
                  {section.title}
                </Text>
              )}
              <div className={classes.monitorGrid} style={gridStyle} data-columns={columnCount}>
                {section.monitors.map((monitor) => (
                  <MonitorRow
                    key={monitor.key}
                    monitor={monitor}
                    variant={variant}
                    visibility={visibility}
                    showDetails={isAdvanced}
                    now={now}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
