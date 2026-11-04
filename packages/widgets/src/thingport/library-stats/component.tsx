"use client";

import type { CSSProperties } from "react";
import { IconCategory, IconCube, IconFolders, IconUsers } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { WidgetEmptyState } from "../../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import { getRenderedSize } from "../common/rendered-size";
import { canShowThingportHeader, ThingportWidgetHeader } from "../common/widget-header";
import classes from "./component.module.css";

const stats = [
  { key: "models", option: "showModels", field: "modelCount", icon: IconCube },
  { key: "collections", option: "showCollections", field: "collectionCount", icon: IconFolders },
  { key: "categories", option: "showCategories", field: "categoryCount", icon: IconCategory },
  { key: "authors", option: "showAuthors", field: "authorCount", icon: IconUsers },
] as const;

// A widget shorter than this lays every total out in one row rather than stacking two rows of half-height tiles.
const SINGLE_ROW_MAX_HEIGHT = 120;

export default function ThingportLibraryStatsWidget({
  integrationIds,
  options,
  widgetRuntimeRef,
  ...sizeProps
}: WidgetComponentProps<"thingport-libraryStats">) {
  const { width, height } = getRenderedSize(sizeProps);
  const t = useI18n("widget.thingport-libraryStats");
  const locale = useCurrentIntlLocale();
  const input = { integrationId: integrationIds[0] ?? "" };
  const query = clientApi.widget.thingport.getLibraryStats.useQuery(input);
  const data = getUsableWidgetQueryData(query);
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.thingport.getLibraryStats, input, "query")]);

  if (isInitialWidgetQueryPending(query)) return <WidgetQueryLoadingState />;
  if (!data) return <WidgetEmptyState />;

  const visibleStats = stats.filter((stat) => options[stat.option]);
  if (visibleStats.length === 0) return <WidgetEmptyState />;

  const showHeader = options.showTitle && canShowThingportHeader(width, height);
  const singleRow = width >= 360 || (height < SINGLE_ROW_MAX_HEIGHT && width >= 200);
  const columns = visibleStats.length === 1 ? 1 : singleRow ? Math.min(visibleStats.length, 4) : 2;

  return (
    <div className={classes.wrapper}>
      {showHeader && <ThingportWidgetHeader title={t("title")} />}
      <div className={classes.root} style={{ "--stat-cols": columns } as CSSProperties}>
        {visibleStats.map(({ key, field, icon: Icon }) => (
          <a
            key={key}
            href={getSafeApplicationUrl(data.links[key])}
            target={options.openInNewTab ? "_blank" : undefined}
            rel={options.openInNewTab ? SAFE_NEW_TAB_REL : undefined}
            className={classes.tile}
          >
            <Icon className={classes.icon} stroke={1.5} />
            <span className={classes.value}>{data[field].toLocaleString(locale)}</span>
            <span className={classes.label}>{t(key)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
