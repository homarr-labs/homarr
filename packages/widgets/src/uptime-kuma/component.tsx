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
import { getMonitorColumnCount, getUptimeKumaLayout, showsInlineTags, usesInlineRows } from "./layout";
import type { UptimeKumaLayout } from "./layout";
import { getMonitorRowTemplate, MonitorRow } from "./monitor-row";
import type { MonitorRowVisibility } from "./monitor-row";
import { filterProblems, getAllMonitors, getMonitorSections, sortMonitors } from "./monitors";
import type { LoadedStatusPage, MonitorEntry } from "./monitors";
import type { Notice } from "./notices";
import { getNotices, NoticeIndicator, NoticeList } from "./notices";
import { formatUptime, monitorStatusColors } from "./status";
import { DistributionBar, OverallStatus, StatusBreakdown, SummaryMetrics, SummaryRing } from "./summary";

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
          description={layout === "tile" ? undefined : t("empty.description")}
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

const CenteredState = ({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) => (
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

const chipRowHeight = 30;

const StripLayout = ({ pages, summary, notices, size, options }: StripLayoutProps) => {
  const ringSize = clamp(Math.min(size.height - 24, size.width * 0.32), 56, 150);
  const bodyWidth = size.width - ringSize - 40;
  const metricsInHeader = bodyWidth >= 420;
  const showMetricsLine = !metricsInHeader && size.height >= 150;
  const breakdownHeight = bodyWidth < 300 ? 40 : 20;
  const reservedHeight = 68 + breakdownHeight + (showMetricsLine ? 20 : 0);
  const chipRows = bodyWidth >= 200 ? clamp(Math.floor((size.height - reservedHeight) / chipRowHeight), 0, 3) : 0;
  const chipMonitors = sortMonitors(filterProblems(getAllMonitors(pages), options.showOnlyProblems), options.sortBy);

  return (
    <div className={classes.strip}>
      <SummaryRing summary={summary} size={ringSize} />
      <div className={classes.stripBody}>
        <div className={classes.stripHeader}>
          <OverallStatus summary={summary} short={bodyWidth < 220} />
          {notices.length > 0 && <NoticeIndicator notices={notices} />}
          {metricsInHeader && (
            <SummaryMetrics
              summary={summary}
              showUptime={options.showUptime}
              showResponseTime={options.showResponseTime}
            />
          )}
        </div>
        <StatusBreakdown summary={summary} />
        {showMetricsLine && (
          <SummaryMetrics
            summary={summary}
            showUptime={options.showUptime}
            showResponseTime={options.showResponseTime}
            compact
          />
        )}
        {chipRows > 0 && chipMonitors.length > 0 && (
          <OverflowList
            data={chipMonitors}
            maxRows={chipRows}
            gap={6}
            getItemKey={(monitor) => monitor.key}
            renderItem={(monitor) => <MonitorChip monitor={monitor} showUptime={options.showUptime} />}
            renderOverflow={(hidden) => (
              <Badge variant="light" color="gray" size="lg" radius="xl" tt="none" fw={500}>
                +{hidden.length}
              </Badge>
            )}
          />
        )}
      </div>
    </div>
  );
};

const chipColors = { ...monitorStatusColors, up: "gray" };

const MonitorChip = ({ monitor, showUptime }: { monitor: MonitorEntry; showUptime: boolean }) => {
  const t = useI18n("widget.uptimeKuma");
  const uptime = monitor.uptime24h === null ? null : formatUptime(monitor.uptime24h);

  return (
    <Badge
      variant="light"
      color={chipColors[monitor.status]}
      size="lg"
      radius="xl"
      tt="none"
      fw={500}
      maw={180}
      title={[monitor.name, t(`status.${monitor.status}`), uptime].filter(Boolean).join(" · ")}
      leftSection={<span className={classes.dot} data-status={monitor.status} />}
      rightSection={showUptime && uptime && <span className={classes.chipUptime}>{uptime}</span>}
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
  const singlePage = pages.length === 1 ? pages[0]?.statusPage : undefined;
  const statusPageHref = getSafeApplicationUrl(singlePage?.url);
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
            <OverallStatus summary={summary} short={isColumn} size={isColumn ? "sm" : "md"} />
            {isColumn && !isNarrow && notices.length > 0 && <NoticeIndicator notices={notices} />}
            {singlePage && statusPageHref && size.width >= 340 && (
              <Anchor
                href={statusPageHref}
                target="_blank"
                rel={SAFE_NEW_TAB_REL}
                size="xs"
                c="dimmed"
                className={classes.statusPageLink}
              >
                <span className={classes.statusPageTitle}>{singlePage.title}</span>
                <IconExternalLink style={iconSizes.xs} aria-hidden />
              </Anchor>
            )}
            {errorIndicator}
          </div>
          <DistributionBar summary={summary} />
          {isColumn ? (
            <Text size="xs" c="dimmed" truncate>
              {t("summary.upRatio", { up: summary.counts.up, total: summary.total })}
            </Text>
          ) : (
            <div className={classes.headerBottom}>
              <StatusBreakdown summary={summary} />
              <SummaryMetrics
                summary={summary}
                showUptime={visibility.uptime}
                showResponseTime={isAdvanced || options.showResponseTime}
                compact={size.width < 520}
              />
            </div>
          )}
        </header>
      )}
      <ScrollArea className={classes.scroll} type="hover" scrollbarSize={6} offsetScrollbars={!isColumn && "y"}>
        <div className={classes.scrollContent}>
          {notices.length > 0 && !(isColumn && showSummary) && (
            <NoticeList notices={notices} compact={isColumn || size.height < 400} now={now} />
          )}
          {sections.length === 0 && (
            <CenteredState
              icon={<IconCircleCheck className={classes.stateIcon} data-tone="success" aria-hidden />}
              title={t("overall.operational")}
              description={t("allClear", { count: summary.total })}
            />
          )}
          {sections.map((section) => (
            <section key={section.key} className={classes.section}>
              {section.title && (
                <Text component="h3" className={classes.sectionTitle} truncate>
                  {section.title}
                </Text>
              )}
              <div className={classes.monitorGrid} style={gridStyle}>
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
