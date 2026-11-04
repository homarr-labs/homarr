"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { ActionIcon, Image, ScrollArea, Tabs, TextInput, VisuallyHidden } from "@mantine/core";
import { useElementSize, useLocalStorage } from "@mantine/hooks";
import { IconCheck, IconEye, IconEyeOff, IconLayoutGrid, IconSearch } from "@tabler/icons-react";

import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import {
  buildServerResourceCounts,
  getCoolifyAttentionItems,
  getCoolifyAttentionSummary,
  getCoolifyProjectSummaries,
  getCoolifyServerStatus,
  isCoolifyServerHealthy,
  parseStatus,
} from "./coolify-utils";
import type { CoolifyAttentionItem, CoolifyProjectSummary } from "./coolify-utils";
import classes from "./component.module.css";
import { ResourceRow } from "./resource-row";
import { ServerRow } from "./server-row";
import { getStatusTone, StatusDot, StatusPill } from "./status-pill";
import type { CoolifyTone } from "./status-pill";
import type { CoolifyOptions, InstanceData } from "./types";
import { COOLIFY_ICON_URL } from "./types";

interface InstanceViewProps {
  instance: InstanceData;
  options: CoolifyOptions;
  isAdvanced: boolean;
  isSingle: boolean;
  storageKey: string;
  width: number;
  height: number;
  uiScale: number;
}

interface CoolifyStat {
  key: string;
  label: string;
  /** Shown instead of the label where the advanced view has room for it. */
  longLabel?: string;
  value: number | string;
  total?: number;
}

// Row geometry in board UI pixels; it must match the rem() values in component.module.css.
const ROW_HEIGHT = 25;
const MORE_HEIGHT = 21;

const fitRows = (total: number, available: number, uiScale: number) => {
  for (let count = Math.min(total, 6); count > 0; count--) {
    const needed = (count * ROW_HEIGHT + (total > count ? MORE_HEIGHT : 0)) * uiScale;
    if (needed <= available + 0.5) return count;
  }
  return 0;
};

export function InstanceView({
  instance,
  options,
  isAdvanced,
  isSingle,
  storageKey,
  width,
  height,
  uiScale,
}: InstanceViewProps) {
  const t = useI18n("widget.coolify");
  const tCommon = useI18n("common");
  const [search, setSearch] = useState("");
  const [showIp, setShowIp] = useLocalStorage({ key: storageKey, defaultValue: false });
  const { ref: compactBodyRef, height: compactBodyHeight } = useElementSize<HTMLDivElement>();
  const info = instance.instanceInfo;
  const visibleOptions = isAdvanced ? { showServers: true, showApplications: true, showServices: true } : options;
  const attention = getCoolifyAttentionItems(info, visibleOptions);
  const trackedCount =
    (visibleOptions.showServers ? info.servers.length : 0) +
    (visibleOptions.showApplications ? info.applications.length : 0) +
    (visibleOptions.showServices ? info.services.length : 0);
  const summary = getCoolifyAttentionSummary(attention, trackedCount);
  const healthyServers = info.servers.filter(isCoolifyServerHealthy).length;
  const runningApps = info.applications.filter((app) => parseStatus(app.status ?? "") === "running").length;
  const runningServices = info.services.filter((service) => parseStatus(service.status ?? "") === "running").length;
  const projects = getCoolifyProjectSummaries(info);
  const showResources = visibleOptions.showApplications || visibleOptions.showServices;
  const totalResources =
    (visibleOptions.showApplications ? info.applications.length : 0) +
    (visibleOptions.showServices ? info.services.length : 0);
  const runningResources =
    (visibleOptions.showApplications ? runningApps : 0) + (visibleOptions.showServices ? runningServices : 0);
  const baseUrl = getSafeApplicationUrl(instance.externalUrl ?? instance.integrationUrl)?.replace(/\/+$/, "") ?? "";
  const relativeTime = useTimeAgo(instance.updatedAt, 60_000);
  const updatedLabel = t("footer.updated", { when: relativeTime });

  const isMini = !isAdvanced && width < 110;
  const isTiny = !isAdvanced && height < 125;
  const isNarrow = !isAdvanced && width < 240;
  const showVersion = isAdvanced || width >= 320;

  const summaryLabel =
    summary.kind === "problem"
      ? t("summary.needsAttention", { count: summary.count })
      : summary.kind === "transition"
        ? t("summary.inProgress", { count: summary.count })
        : summary.kind === "unknown"
          ? t("summary.unknown", { count: summary.count })
          : t(`summary.${summary.kind}`);
  const summaryTone: CoolifyTone =
    summary.kind === "problem"
      ? "negative"
      : summary.kind === "transition"
        ? "warning"
        : summary.kind === "healthy"
          ? "positive"
          : "neutral";
  const shortSummary =
    summary.count > 0 ? summary.count : summary.kind === "empty" ? "—" : <IconCheck size={12} stroke={2.5} />;
  const pill = (
    <StatusPill tone={summaryTone} label={summaryLabel} size={isAdvanced ? "lg" : "md"}>
      {isNarrow || isMini ? shortSummary : undefined}
    </StatusPill>
  );

  const stats: CoolifyStat[] = [];
  if (showResources) {
    stats.push({ key: "projects", label: t("overview.projects"), value: info.projects ? projects.length : "—" });
    stats.push({
      key: "resources",
      label: t("overview.running"),
      longLabel: isAdvanced ? t("overview.resources") : undefined,
      value: runningResources,
      total: totalResources,
    });
  }
  if (visibleOptions.showServers) {
    stats.push({ key: "servers", label: tCommon("servers"), value: healthyServers, total: info.servers.length });
  }

  const statList = (
    <dl
      className={isMini ? classes.miniStats : classes.stats}
      data-narrow={(!isAdvanced && !isMini && width < 240) || undefined}
      style={{ "--cf-stat-count": stats.length } as CSSProperties}
    >
      {stats.map((stat) => (
        <div key={stat.key} className={classes.stat}>
          <dt className={classes.statLabel}>
            {stat.longLabel ? (
              <>
                <span className={classes.wideOnly}>{stat.longLabel}</span>
                <span className={classes.narrowOnly}>{stat.label}</span>
              </>
            ) : (
              stat.label
            )}
          </dt>
          <dd className={classes.statValue}>
            {stat.value}
            {stat.total !== undefined && <span className={classes.statTotal}>/{stat.total}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );

  const nameLink = (
    <a
      className={`${classes.name} ${actionTargetClasses.root}`}
      href={baseUrl || undefined}
      target={baseUrl ? "_blank" : undefined}
      rel={baseUrl ? SAFE_NEW_TAB_REL : undefined}
      style={{
        fontSize: isAdvanced
          ? "var(--mantine-font-size-md)"
          : isTiny
            ? "var(--mantine-font-size-xs)"
            : "var(--mantine-font-size-sm)",
      }}
    >
      {instance.integrationName}
    </a>
  );

  if (isMini) {
    const showStats = height >= 150 && stats.length > 0;
    return (
      <div
        className={`${classes.instance} ${classes.mini}`}
        data-single={isSingle || undefined}
        data-short={!showStats || undefined}
        title={`${instance.integrationName}: ${summaryLabel}`}
      >
        <a
          className={`${classes.logo} ${actionTargetClasses.root}`}
          href={baseUrl || undefined}
          target={baseUrl ? "_blank" : undefined}
          rel={baseUrl ? SAFE_NEW_TAB_REL : undefined}
          aria-label={instance.integrationName}
        >
          <Image src={COOLIFY_ICON_URL} alt="" w={20} h={20} />
        </a>
        {pill}
        {showStats && statList}
      </div>
    );
  }

  const header = (
    <div className={classes.header}>
      <span className={classes.logo}>
        <Image
          src={COOLIFY_ICON_URL}
          alt=""
          w={isAdvanced ? 28 : isTiny ? 16 : 18}
          h={isAdvanced ? 28 : isTiny ? 16 : 18}
        />
      </span>
      {isAdvanced ? (
        <div className={classes.headerText}>
          <div className={classes.headerTitle}>
            {nameLink}
            <span
              className={`${classes.version} ${classes.wideOnly}`}
              style={{ fontSize: "var(--mantine-font-size-xs)" }}
            >
              v{info.version}
            </span>
          </div>
          <span className={classes.subline}>
            <span className={classes.narrowOnly}>v{info.version} · </span>
            {updatedLabel}
          </span>
        </div>
      ) : (
        <div className={classes.headerTitle}>
          {nameLink}
          {showVersion && (
            <span className={classes.version} style={{ fontSize: "var(--mantine-font-size-xs)" }}>
              v{info.version}
            </span>
          )}
        </div>
      )}
      {pill}
    </div>
  );

  if (isAdvanced) {
    const serverResourceCounts = buildServerResourceCounts(info.servers, info.applications, info.services);
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const matchesSearch = (name: string, projectName?: string, environmentName?: string) =>
      [name, projectName, environmentName].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
    const applications = info.applications.filter((app) =>
      matchesSearch(app.name, app.projectName, app.environmentName),
    );
    const services = info.services.filter((service) =>
      matchesSearch(service.name, service.projectName, service.environmentName),
    );
    const servers = info.servers.filter((server) => matchesSearch(server.name));
    const hasAttention = attention.length > 0;

    const attentionSection = (
      <section className={classes.section} aria-labelledby={`${storageKey}-attention`}>
        <div className={classes.sectionHead}>
          <h3 id={`${storageKey}-attention`} className={classes.sectionTitle}>
            {t("overview.attention")}
          </h3>
        </div>
        <div className={classes.table}>
          {hasAttention ? (
            attention.map((item) => (
              <AttentionTableRow key={`${item.kind}-${item.uuid}`} item={item} baseUrl={baseUrl} />
            ))
          ) : (
            <div className={classes.emptyRow}>
              {trackedCount === 0 ? t("summary.empty") : t("summary.healthyDetail")}
            </div>
          )}
        </div>
      </section>
    );

    const serversSection = (
      <section className={classes.section} aria-labelledby={`${storageKey}-servers`}>
        <div className={classes.sectionHead}>
          <h3 id={`${storageKey}-servers`} className={classes.sectionTitle}>
            {tCommon("servers")}
          </h3>
          <span className={classes.sectionNote}>
            {healthyServers}/{info.servers.length}
          </span>
        </div>
        <div className={classes.table}>
          {info.servers.map((server) => {
            const status = getCoolifyServerStatus(server);
            const href = baseUrl ? getSafeApplicationUrl(`${baseUrl}/server/${server.uuid}`) : null;
            return (
              <div key={server.uuid} className={classes.tableRow}>
                <div className={classes.tableMain}>
                  <a
                    className={classes.tableName}
                    href={href ?? undefined}
                    target={href ? "_blank" : undefined}
                    rel={href ? SAFE_NEW_TAB_REL : undefined}
                  >
                    {server.name}
                  </a>
                  {server.description && <span className={classes.tableMeta}>{server.description}</span>}
                </div>
                <StatusPill
                  tone={getStatusTone(status)}
                  label={t(status === "online" ? "overview.ready" : `status.${status}`)}
                />
              </div>
            );
          })}
          {info.servers.length === 0 && <div className={classes.emptyRow}>{t("empty.servers")}</div>}
        </div>
      </section>
    );

    const projectsSection = (
      <section className={classes.section} aria-labelledby={`${storageKey}-projects`}>
        <div className={classes.sectionHead}>
          <h3 id={`${storageKey}-projects`} className={classes.sectionTitle}>
            {t("overview.projects")}
          </h3>
          {info.projects && <span className={classes.sectionNote}>{projects.length}</span>}
        </div>
        <ProjectCards projects={projects} available={info.projects != null} baseUrl={baseUrl} />
      </section>
    );

    return (
      <div className={`${classes.instance} ${classes.advanced}`} data-single={isSingle || undefined}>
        {header}
        {statList}
        <Tabs
          defaultValue="overview"
          className={classes.details}
          keepMounted={false}
          onChange={() => setSearch("")}
          variant="unstyled"
          classNames={{ list: classes.tabList, tab: classes.tab, panel: classes.panel }}
        >
          <Tabs.List aria-label={t("details.tabs")}>
            <Tabs.Tab value="overview">{t("details.overview")}</Tabs.Tab>
            <Tabs.Tab value="servers">
              {tCommon("servers")} <span className={classes.tabCount}>{info.servers.length}</span>
            </Tabs.Tab>
            <Tabs.Tab value="applications">
              {tCommon("applications")} <span className={classes.tabCount}>{info.applications.length}</span>
            </Tabs.Tab>
            <Tabs.Tab value="services">
              {tCommon("services")} <span className={classes.tabCount}>{info.services.length}</span>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <ScrollArea className={classes.listScroll}>
              <div className={classes.overviewGrid}>
                <div className={classes.overviewColumn}>
                  {attentionSection}
                  {serversSection}
                </div>
                <div className={classes.overviewColumn}>{projectsSection}</div>
              </div>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="servers">
            <div className={classes.toolbar}>
              <DetailSearch value={search} onChange={setSearch} />
              <ActionIcon
                aria-label={t(showIp ? "action.hideIp" : "action.showIp")}
                aria-pressed={showIp}
                variant="default"
                size="lg"
                onClick={() => setShowIp((previous) => !previous)}
              >
                {showIp ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </ActionIcon>
            </div>
            <ScrollArea className={classes.listScroll}>
              <div className={classes.panelBody}>
                <div className={classes.table}>
                  {servers.map((server) => (
                    <ServerRow
                      key={server.uuid}
                      server={server}
                      counts={
                        serverResourceCounts.get(server.settings?.server_id ?? server.id ?? -1) ?? {
                          apps: 0,
                          services: 0,
                        }
                      }
                      baseUrl={baseUrl}
                      showIp={showIp}
                    />
                  ))}
                  {servers.length === 0 && (
                    <div className={classes.emptyRow}>{search ? tCommon("noResults") : t("empty.servers")}</div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="applications">
            <div className={classes.toolbar}>
              <DetailSearch value={search} onChange={setSearch} />
            </div>
            <ScrollArea className={classes.listScroll}>
              <div className={classes.panelBody}>
                <div className={classes.table}>
                  {applications.map((app) => (
                    <ResourceRow key={app.uuid} item={app} baseUrl={baseUrl} resourceType="application" />
                  ))}
                  {applications.length === 0 && (
                    <div className={classes.emptyRow}>{search ? tCommon("noResults") : t("empty.applications")}</div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="services">
            <div className={classes.toolbar}>
              <DetailSearch value={search} onChange={setSearch} />
            </div>
            <ScrollArea className={classes.listScroll}>
              <div className={classes.panelBody}>
                <div className={classes.table}>
                  {services.map((service) => (
                    <ResourceRow
                      key={service.uuid}
                      item={service}
                      baseUrl={baseUrl}
                      resourceType="service"
                      nestedApplications={service.applications}
                    />
                  ))}
                  {services.length === 0 && (
                    <div className={classes.emptyRow}>{search ? tCommon("noResults") : t("empty.services")}</div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </div>
    );
  }

  // Compact tiles: header and counts, then what needs attention, or the projects when all is well.
  const showBody = !isTiny;
  const showFooter = showBody && height >= 175;
  const availableBodyHeight = Math.max(0, compactBodyHeight);
  const visibleAttentionCount = fitRows(attention.length, availableBodyHeight, uiScale);
  const visibleProjectCount = showResources ? fitRows(projects.length, availableBodyHeight, uiScale) : 0;

  return (
    <div className={`${classes.instance} ${isTiny ? classes.tiny : ""}`} data-single={isSingle || undefined}>
      {header}
      {stats.length > 0 && statList}
      {showBody && (
        <div ref={compactBodyRef} className={classes.compactBody}>
          {attention.length > 0 ? (
            <>
              {attention.slice(0, visibleAttentionCount).map((item) => (
                <CompactAttentionRow
                  key={`${item.kind}-${item.uuid}`}
                  item={item}
                  baseUrl={baseUrl}
                  showStatus={width >= 150}
                />
              ))}
              {attention.length > visibleAttentionCount && availableBodyHeight >= MORE_HEIGHT * uiScale && (
                <span className={classes.more}>
                  {t("summary.more", { count: attention.length - visibleAttentionCount })}
                </span>
              )}
            </>
          ) : visibleProjectCount > 0 ? (
            <>
              {projects.slice(0, visibleProjectCount).map((summaryItem) => (
                <CompactProjectRow
                  key={summaryItem.project.uuid}
                  summary={summaryItem}
                  baseUrl={baseUrl}
                  showUnit={width >= 280}
                />
              ))}
              {projects.length > visibleProjectCount && (
                <span className={classes.more}>
                  {t("overview.moreProjects", { count: projects.length - visibleProjectCount })}
                </span>
              )}
            </>
          ) : availableBodyHeight >= MORE_HEIGHT * uiScale ? (
            <div className={classes.calm}>
              <StatusDot tone={trackedCount === 0 ? "neutral" : "positive"} />
              {trackedCount === 0 ? t("summary.empty") : t("summary.healthyDetail")}
            </div>
          ) : null}
        </div>
      )}
      {showFooter && <div className={classes.footer}>{updatedLabel}</div>}
    </div>
  );
}

const getAttentionHref = (item: CoolifyAttentionItem, baseUrl: string) => {
  if (!baseUrl) return null;
  if (item.kind === "server") return getSafeApplicationUrl(`${baseUrl}/server/${item.uuid}`);
  if (!item.projectUuid || !item.environmentUuid) return null;
  return getSafeApplicationUrl(
    `${baseUrl}/project/${item.projectUuid}/environment/${item.environmentUuid}/${item.kind}/${item.uuid}`,
  );
};

function CompactAttentionRow({
  item,
  baseUrl,
  showStatus,
}: {
  item: CoolifyAttentionItem;
  baseUrl: string;
  showStatus: boolean;
}) {
  const t = useI18n("widget.coolify");
  const href = getAttentionHref(item, baseUrl);
  const statusLabel = t(`status.${item.status}`);
  return (
    <div className={classes.row} title={`${item.name}: ${statusLabel}`}>
      <StatusDot tone={getStatusTone(item.status)} />
      <a
        className={classes.rowName}
        href={href ?? undefined}
        target={href ? "_blank" : undefined}
        rel={href ? SAFE_NEW_TAB_REL : undefined}
      >
        {item.name}
      </a>
      {showStatus ? (
        <span className={classes.rowMeta}>{statusLabel}</span>
      ) : (
        <VisuallyHidden>{statusLabel}</VisuallyHidden>
      )}
    </div>
  );
}

function CompactProjectRow({
  summary,
  baseUrl,
  showUnit,
}: {
  summary: CoolifyProjectSummary;
  baseUrl: string;
  showUnit: boolean;
}) {
  const t = useI18n("widget.coolify");
  const { project, applications, services, contextAvailable } = summary;
  const href = baseUrl ? getSafeApplicationUrl(`${baseUrl}/project/${project.uuid}`) : null;
  const resourceCount = applications + services;
  const countLabel = t("overview.resourceCount", { count: resourceCount });
  return (
    <div className={classes.row}>
      <span className={classes.projectGlyph} aria-hidden="true">
        <IconLayoutGrid size={13} />
      </span>
      <a
        className={classes.rowName}
        href={href ?? undefined}
        target={href ? "_blank" : undefined}
        rel={href ? SAFE_NEW_TAB_REL : undefined}
        style={{ fontWeight: 600 }}
      >
        {project.name}
      </a>
      {contextAvailable ? (
        <span className={classes.rowMeta} title={countLabel} aria-label={countLabel}>
          {showUnit ? countLabel : resourceCount}
        </span>
      ) : (
        <span className={classes.rowMeta} title={t("overview.projectsUnavailable")}>
          —
        </span>
      )}
    </div>
  );
}

function AttentionTableRow({ item, baseUrl }: { item: CoolifyAttentionItem; baseUrl: string }) {
  const t = useI18n("widget.coolify");
  const href = getAttentionHref(item, baseUrl);
  const context = [item.projectName, item.environmentName].filter(Boolean).join(" / ");
  return (
    <div className={classes.tableRow}>
      <div className={classes.tableMain}>
        <a
          className={classes.tableName}
          href={href ?? undefined}
          target={href ? "_blank" : undefined}
          rel={href ? SAFE_NEW_TAB_REL : undefined}
        >
          {item.name}
        </a>
        <span className={classes.tableMeta}>
          {t(`kind.${item.kind}`)}
          {context && ` · ${context}`}
        </span>
      </div>
      <StatusPill tone={getStatusTone(item.status)} label={t(`status.${item.status}`)} />
    </div>
  );
}

function ProjectCards({
  projects,
  available,
  baseUrl,
}: {
  projects: CoolifyProjectSummary[];
  available: boolean;
  baseUrl: string;
}) {
  const t = useI18n("widget.coolify");
  if (!available || projects.length === 0) {
    return (
      <div className={classes.table}>
        <div className={classes.emptyRow}>{t(available ? "overview.noProjects" : "overview.projectsUnavailable")}</div>
      </div>
    );
  }

  return (
    <div className={classes.projectGrid}>
      {projects.map(({ project, applications, services, contextAvailable }) => {
        const href = baseUrl ? getSafeApplicationUrl(`${baseUrl}/project/${project.uuid}`) : null;
        const Card = href ? "a" : "div";
        return (
          <Card
            key={project.uuid}
            className={classes.projectCard}
            href={href ?? undefined}
            target={href ? "_blank" : undefined}
            rel={href ? SAFE_NEW_TAB_REL : undefined}
          >
            <div className={classes.projectTop}>
              <span className={classes.projectGlyphLg} aria-hidden="true">
                <IconLayoutGrid size={16} />
              </span>
              <div className={classes.tableMain}>
                <span className={classes.tableName}>{project.name}</span>
                {project.description && <span className={classes.tableMeta}>{project.description}</span>}
              </div>
            </div>
            <div className={classes.projectFoot}>
              {contextAvailable ? (
                <>
                  <span>{t("overview.environmentCount", { count: project.environments?.length ?? 0 })}</span>
                  <span>{t("overview.resourceCount", { count: applications + services })}</span>
                </>
              ) : (
                <span>{t("overview.projectsUnavailable")}</span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DetailSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useI18n("widget.coolify");
  return (
    <TextInput
      aria-label={t("details.search")}
      placeholder={t("details.search")}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      leftSection={<IconSearch size={14} />}
      size="sm"
      classNames={{ input: classes.searchInput }}
    />
  );
}
