"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";
import { Center, RingProgress, Text } from "@mantine/core";
import { IconFileDescription, IconFileText, IconInbox, IconTag, IconUsers } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { getCompactStatLayout } from "../common/compact-stat-layout";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

const statVisibilityByOption = {
  showDocumentsTotal: "documentsTotal",
  showDocumentsInbox: "documentsInbox",
  showCorrespondents: "correspondents",
  showTags: "tags",
  showDocumentTypes: "documentTypes",
} as const;

const statIcons = {
  documentsTotal: IconFileText,
  documentsInbox: IconInbox,
  correspondents: IconUsers,
  tags: IconTag,
  documentTypes: IconFileDescription,
} as const;

const gridHiddenWhenHeroShown = new Set(["documentsTotal", "documentsInbox"]);

const gridColsByWidth = [
  { minWidth: 300, cols: 3 },
  { minWidth: 220, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

const rootClassByLayout = {
  default: "",
  short: classes.rootShort,
  narrowShort: classes.rootShort,
} as const;

const gridClassByLayout = {
  default: "",
  short: classes.gridShort,
  narrowShort: classes.gridShort,
} as const;

const statTileClassByLayout = {
  default: "",
  short: classes.statTileShort,
  narrowShort: `${classes.statTileShort} ${classes.statTileNarrowShort}`,
} as const;

const statLabelClassByLayout = {
  default: "",
  short: classes.statLabelShort,
  narrowShort: classes.statLabelShort,
} as const;

const statValueClassByLayout = {
  default: "",
  short: "",
  narrowShort: classes.statValueNarrowShort,
} as const;

const ringSizeByWidth = [
  { minWidth: 400, size: 88 },
  { minWidth: 320, size: 72 },
  { minWidth: 220, size: 56 },
  { minWidth: 0, size: 44 },
] as const;

const iconSizeByWidth = [
  { minWidth: 320, size: 22 },
  { minWidth: 200, size: 18 },
  { minWidth: 0, size: 16 },
] as const;

const ringLabelSizeByRingSize = [
  { minSize: 72, size: "sm" },
  { minSize: 56, size: "xs" },
  { minSize: 0, size: "xs" },
] as const;

const heroLayoutBySecondaryStats = {
  false: classes.heroExpanded,
  true: "",
} as const;

const heroVariantByRing = {
  true: "",
  false: classes.heroTextOnly,
} as const;

const heroPartVisibility = {
  ratio: "showInboxRatio",
  ring: "showInboxRing",
} as const;

export default function PaperlessNgxWidget({
  integrationIds,
  options,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
}: WidgetComponentProps<"paperlessNgx">) {
  const t = useI18n("widget.paperlessNgx");
  const tCommon = useI18n("common");
  const {
    data: stats,
    error,
    isPending,
  } = clientApi.widget.paperlessNgx.getStats.useQuery({
    integrationId: integrationIds[0] ?? "",
  });

  if (isPending) {
    return (
      <Center h="100%">
        <Text c="dimmed" size="sm">
          {tCommon("action.loading")}
        </Text>
      </Center>
    );
  }
  if (error && stats === undefined) throw error;
  if (!stats) return <WidgetEmptyState />;

  const canShowInboxHero = options.showDocumentsInbox && options.showDocumentsTotal;
  const showHero = options.showInboxRatio && canShowInboxHero;
  const inboxProgress = computeInboxProgress(stats.documentsTotal, stats.documentsInbox);

  const statValues = {
    documentsTotal: stats.documentsTotal,
    documentsInbox: stats.documentsInbox,
    correspondents: stats.correspondentsCount,
    tags: stats.tagsCount,
    documentTypes: stats.documentTypesCount,
  } as const;

  const visibleStatKeys = Object.entries(statVisibilityByOption)
    .filter(([optionKey]) => options[optionKey as keyof typeof options])
    .map(([, statKey]) => statKey)
    .filter((statKey) => !(showHero && gridHiddenWhenHeroShown.has(statKey)));

  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode === "compact" && Number.isFinite(displayScale) && displayScale > 0) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  const advanced = displayMode === "advanced";
  const layout = getCompactStatLayout({
    width: responsiveWidth,
    height: responsiveHeight,
    visibleCount: visibleStatKeys.length,
    compactDisplay: !advanced,
    defaultColumns: getGridCols(responsiveWidth),
    defaultIconSize: getIconSize(responsiveWidth),
  });
  const ringSize = getRingSize(responsiveWidth);
  const ringLabelSize = getRingLabelSize(ringSize);
  const hasContent = showHero || visibleStatKeys.length > 0;

  const heroLayoutClass =
    heroLayoutBySecondaryStats[String(visibleStatKeys.length > 0) as keyof typeof heroLayoutBySecondaryStats];
  const heroRingClass = heroVariantByRing[String(options.showInboxRing) as keyof typeof heroVariantByRing];

  const visibleHeroParts = Object.entries(heroPartVisibility).filter(
    ([, optionKey]) => options[optionKey as keyof typeof options],
  );

  const heroPartRenderers = {
    ratio: (
      <div className={classes.heroText}>
        <span className={classes.heroLabel}>{t("inboxRatio")}</span>
        <div className={classes.heroCounts}>
          <span className={classes.heroInbox}>
            {stats.documentsInbox} {t("inbox")}
          </span>
          <span className={classes.heroTotal}>
            / {stats.documentsTotal} {t("total")}
          </span>
        </div>
      </div>
    ),
    ring: (
      <RingProgress
        className={classes.ring}
        size={ringSize}
        thickness={Math.max(4, Math.round(ringSize / 10))}
        roundCaps
        sections={[{ value: inboxProgress, color: "orange" }]}
        label={
          <Text ta="center" size={ringLabelSize} fw={700}>
            {inboxProgress}%
          </Text>
        }
      />
    ),
  } as const;

  return (
    <div className={`${classes.root} ${rootClassByLayout[layout.state]}`}>
      {showHero && (
        <div className={`${classes.hero} ${heroLayoutClass} ${heroRingClass}`}>
          {visibleHeroParts.map(([partKey]) => (
            <Fragment key={partKey}>{heroPartRenderers[partKey as keyof typeof heroPartRenderers]}</Fragment>
          ))}
        </div>
      )}

      {!hasContent && (
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      )}

      {visibleStatKeys.length > 0 && (
        <div
          className={`${classes.grid} ${gridClassByLayout[layout.state]}`}
          style={{ "--stat-cols": layout.columns } as CSSProperties}
        >
          {visibleStatKeys.map((statKey) => {
            const Icon = statIcons[statKey];
            return (
              <div key={statKey} className={`${classes.statTile} ${statTileClassByLayout[layout.state]}`}>
                <Icon className={classes.statIcon} style={zoomCompensatedSize(layout.iconSize)} stroke={1.5} />
                <span className={`${classes.statValue} ${statValueClassByLayout[layout.state]}`}>
                  {statValues[statKey]}
                </span>
                <span className={`${classes.statLabel} ${statLabelClassByLayout[layout.state]}`}>{t(statKey)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function computeInboxProgress(total: number, inbox: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((inbox / total) * 100);
}

function getGridCols(width: number): number {
  const match = gridColsByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.cols ?? 1;
}

function getRingSize(width: number): number {
  const match = ringSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 44;
}

function getIconSize(width: number): number {
  const match = iconSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 16;
}

function getRingLabelSize(ringSize: number): "xs" | "sm" {
  const match = ringLabelSizeByRingSize.find(({ minSize }) => ringSize >= minSize);
  return match?.size ?? "xs";
}
