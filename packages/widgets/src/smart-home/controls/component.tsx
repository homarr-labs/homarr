"use client";

import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Box, Button, Group, Loader, Pagination } from "@mantine/core";
import { IconAlertTriangle, IconBulb, IconGauge, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";

import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { createEntityBlockId, parseBlockId, parseSourceBlocks } from "./configuration";
import { CustomLayoutEditButton } from "./custom-layout/inline-button";
import { getLayoutEntityIds, getLayoutGraphEntityIds, parseSmartHomeLayout } from "./custom-layout/schema";
import classes from "./configuration.module.css";
import { getDeviceEntityLabel, getReadingRank, toPanelItems } from "./device-groups";
import type { DevicePanelItem, PanelItem } from "./device-groups";
import { SmartHomeInlineEditor } from "./inline-editor";
import { SmartHomeLiveProvider, useSmartHomeLiveStatus } from "./live";
import { formatEntityState, isUnavailable } from "./semantics";
import { SmartHomeEntitiesProvider, SmartHomeInteractionProvider, useSmartHomeEntities } from "./store";
import { haDomains } from "./types";
import type {
  HaEntity,
  SmartHomeConfiguration,
  SmartHomeControlPalette,
  SmartHomeControlSize,
  SmartHomeOptionsPatch,
} from "./types";
import { getColumnCount, getLevel, getOverviewTier } from "./technical/layout";
import type { Level } from "./technical/layout";
import { ChipButton } from "./technical/list";
import type { ChipDef } from "./technical/list";
import { getColorVars, isOn, isPassive, isSensorLike } from "./technical/meta";
import { ControlListRoot } from "./technical/root";
import { EntityRow } from "./technical/row";
import technicalClasses from "./technical/styles.module.css";
import { EntityTile, StatCells } from "./technical/tile";
import { DetailProvider, EntityControl, EntityDetail, PaletteProvider } from "./control-center/details";
import { Measured } from "./control-center/hooks";
import type { DetailApi } from "./control-center/hooks";
import { DeviceControl } from "./control-center/device-control";
import controlCenterClasses from "./control-center/styles.module.css";

const getSourceAreaId = (entity: HaEntity) => entity.sourceAreaId ?? entity.areaId;
const domainRank = (entity: HaEntity) => haDomains.indexOf(entity.domain);

const resolveEntities = (configuration: SmartHomeConfiguration, entities: Record<string, HaEntity>) => {
  const blocks = parseSourceBlocks(configuration.blockIds, configuration.integrationId);
  const claimed = new Set(blocks.flatMap((block) => (block.kind === "entity" ? [block.entityId] : [])));
  const excluded = new Set(configuration.excludedEntityIds);
  const placed = new Set<string>();
  const all = Object.values(entities);

  return blocks.flatMap((block): HaEntity[] => {
    if (block.kind === "entity") {
      const entity = entities[block.entityId];
      if (!entity || placed.has(entity.id)) return [];
      placed.add(entity.id);
      return [entity];
    }

    if (block.kind === "device") {
      const members = all
        .filter((entity) => entity.device?.id === block.deviceId)
        .filter((entity) => !claimed.has(entity.id) && !placed.has(entity.id) && !excluded.has(entity.id))
        .toSorted((a, b) => domainRank(a) - domainRank(b) || a.id.localeCompare(b.id, "en"));
      members.forEach((entity) => placed.add(entity.id));
      return members;
    }

    const areaRank = (entity: HaEntity) => block.areaIds.indexOf(getSourceAreaId(entity) ?? "");
    const members = all
      .filter((entity) => areaRank(entity) !== -1)
      .filter((entity) => configuration.roomDomains.length === 0 || configuration.roomDomains.includes(entity.domain))
      .filter((entity) => !claimed.has(entity.id) && !placed.has(entity.id) && !excluded.has(entity.id))
      .toSorted((a, b) => domainRank(a) - domainRank(b) || areaRank(a) - areaRank(b) || a.id.localeCompare(b.id, "en"));
    members.forEach((entity) => placed.add(entity.id));
    return members;
  });
};

const GAP = 8;
const PAGE_HEIGHT = 44;
const ROW_HEIGHT = 48;
const SUMMARY_HEIGHT = 40;
const TITLE_HEIGHT = 28;

interface ControlPanelLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
  capacity: number;
}

interface TileProfile {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

const tileProfiles: TileProfile[] = [
  { minWidth: 112, maxWidth: Infinity, minHeight: 112, maxHeight: 224 },
  { minWidth: 224, maxWidth: Infinity, minHeight: 116, maxHeight: 149 },
  { minWidth: 224, maxWidth: Infinity, minHeight: 224, maxHeight: 320 },
];

// Just under the width where tiles switch from their compact to their row layout.
const COMPACT_MAX_WIDTH = 160;
const COMPACT_MAX_HEIGHT = 152;

const targetSizes: Record<SmartHomeControlSize, { width: number; height: number }> = {
  compact: { width: 144, height: 132 },
  auto: { width: 196, height: 176 },
  large: { width: 280, height: 256 },
};

export const getControlPanelLayout = (
  width: number,
  height: number,
  count: number,
  size: SmartHomeControlSize,
  stretch = size !== "compact",
): ControlPanelLayout => {
  let best: ControlPanelLayout = { columns: 1, rows: 0, width: 0, height: 0, capacity: 0 };
  if (!Number.isFinite(width) || !Number.isFinite(height) || count <= 0) return best;
  const target = targetSizes[size];
  let bestVisible = 0;
  let bestScore = Infinity;
  let profiles = [...tileProfiles];
  if (size === "large") profiles = profiles.filter((profile) => profile.minHeight >= 224);
  if (height < 116 && size !== "large") {
    profiles.push({ minWidth: 224, maxWidth: Infinity, minHeight: 80, maxHeight: 115 });
  }
  // Compact tiles keep their size instead of stretching to fill the widget; the grid centers them.
  const compact = !stretch;
  if (compact) {
    profiles = profiles
      .filter((profile) => profile.minWidth <= COMPACT_MAX_WIDTH)
      .map((profile) => ({
        ...profile,
        maxWidth: Math.min(profile.maxWidth, COMPACT_MAX_WIDTH),
        maxHeight: Math.min(profile.maxHeight, COMPACT_MAX_HEIGHT),
      }));
  }
  const fillWeight = compact ? 0 : 2;

  for (const profile of profiles) {
    for (let columns = 1; columns <= Math.min(count, 8); columns++) {
      const cellWidth = Math.min(profile.maxWidth, Math.floor((width - GAP * (columns - 1)) / columns));
      if (cellWidth < profile.minWidth || cellWidth > profile.maxWidth) continue;
      const fittingRows = Math.floor((height + GAP) / (profile.minHeight + GAP));
      const rows = Math.min(fittingRows, Math.ceil(count / columns));
      if (rows < 1) continue;
      const cellHeight = Math.min(profile.maxHeight, Math.floor((height - GAP * (rows - 1)) / rows));
      const capacity = columns * rows;
      const visible = Math.min(count, capacity);
      const score =
        Math.abs(cellWidth - target.width) / target.width +
        Math.abs(cellHeight - target.height) / target.height +
        (capacity - visible) / capacity +
        (fillWeight * (width - columns * cellWidth - GAP * (columns - 1))) / width +
        (fillWeight * (height - rows * cellHeight - GAP * (rows - 1))) / height;
      if (visible < bestVisible || (visible === bestVisible && score >= bestScore)) continue;
      bestVisible = visible;
      bestScore = score;
      best = { columns, rows, width: cellWidth, height: cellHeight, capacity };
    }
  }
  if (best.capacity === 0 && size !== "auto") return getControlPanelLayout(width, height, count, "auto");
  return best;
};

const openWholePanel = (button: HTMLButtonElement) => {
  const source = button.closest("[data-item-id]");
  const trigger = source?.querySelector<HTMLButtonElement>("[data-advanced-focus-trigger]");
  if (!trigger) return false;
  trigger.click();
  return true;
};

interface PageControlsProps {
  count: number;
  page: number;
  pages: number;
  onChange: (page: number) => void;
  expanded: boolean;
  stacked?: boolean;
  availableHeight?: number;
}

function PageControls({
  count,
  page,
  pages,
  onChange,
  expanded,
  stacked = false,
  availableHeight = PAGE_HEIGHT,
}: PageControlsProps) {
  const t = useI18n();
  const more = t("integration.grid.more", { count });
  const next = () => onChange((page + 1) % pages);
  const controlHeight = Math.max(0, Math.min(PAGE_HEIGHT, availableHeight));
  const pageLabel = t("common.pagination.pageOf", { page: page + 1, totalPages: pages });
  const pageNumber = (
    <span className={classes.pageNumber} title={pageLabel}>
      {page + 1}/{pages}
    </span>
  );

  return (
    <div
      className={classes.pageControls}
      style={{ minHeight: controlHeight }}
      data-stacked={stacked || undefined}
      data-paginated={pages > 1 || undefined}
    >
      {!expanded && (
        <Button
          variant="subtle"
          color="gray"
          title={t("item.advancedFocus.open")}
          aria-label={`${more} · ${t("item.advancedFocus.open")}`}
          className={classes.moreButton}
          styles={{
            root: { height: controlHeight, minWidth: 0, fontSize: 12 },
            label: { whiteSpace: "normal", lineHeight: 1.2 },
          }}
          onClick={(event) => {
            if (!openWholePanel(event.currentTarget)) next();
          }}
        >
          {more}
        </Button>
      )}
      {expanded && stacked && pages > 1 && pageNumber}
      {pages > 1 && (expanded || !stacked) && (
        <fieldset className={classes.pagination} aria-label={pageLabel}>
          <Pagination.Root
            total={pages}
            value={page + 1}
            onChange={(value) => onChange(value - 1)}
            size={PAGE_HEIGHT}
            styles={{ control: { width: PAGE_HEIGHT, minWidth: PAGE_HEIGHT, height: PAGE_HEIGHT } }}
          >
            <Group gap={4} justify="center" wrap="nowrap">
              <Pagination.Previous aria-label={t("common.action.previous")} />
              {!stacked && pageNumber}
              <Pagination.Next aria-label={t("common.action.next")} />
            </Group>
          </Pagination.Root>
        </fieldset>
      )}
    </div>
  );
}

type SummaryKey = "lights" | "on" | "off" | "sensors" | "offline";
const summaryKeys: SummaryKey[] = ["lights", "on", "off", "sensors", "offline"];
const summaryStyles: Record<SummaryKey, { color: string; icon: TablerIcon }> = {
  lights: { color: "yellow", icon: IconBulb },
  on: { color: "yellow", icon: IconToggleRight },
  off: { color: "gray", icon: IconToggleLeft },
  sensors: { color: "blue", icon: IconGauge },
  offline: { color: "red", icon: IconAlertTriangle },
};

const getSummaryGroups = (entities: HaEntity[]): Record<SummaryKey, HaEntity[]> => ({
  lights: entities.filter((entity) => entity.domain === "light" && isOn(entity)),
  on: entities.filter(isOn),
  off: entities.filter((entity) => !isPassive(entity) && !isOn(entity) && !isUnavailable(entity)),
  sensors: entities.filter(isSensorLike),
  offline: entities.filter(isUnavailable),
});

interface PresentationProps {
  entities: HaEntity[];
  configuration: SmartHomeConfiguration;
  width: number;
  height: number;
}

export const getTechnicalPageLayout = (width: number, height: number, count: number, summary: boolean) => {
  const columns = getColumnCount(width);
  const available = height - Number(summary) * SUMMARY_HEIGHT;
  let rows = Math.max(0, Math.floor(available / ROW_HEIGHT));
  const overflowing = columns * rows < count;
  if (overflowing) rows = Math.max(0, Math.floor((available - PAGE_HEIGHT) / ROW_HEIGHT));
  return { columns, rows, capacity: columns * rows, overflowing };
};

function SingleEntityRow({ entity, width, height }: { entity: HaEntity; width: number; height: number }) {
  if (width < 230 || height < 52) return <EntityTile entity={entity} />;
  return (
    <div className={technicalClasses.single} style={getColorVars(entity)}>
      <EntityRow entity={entity} level={getLevel(width)} />
    </div>
  );
}

const DEVICE_ROW_READINGS = 3;

/** A device in the technical list: its main entity's row, with its top readings as the second line. */
function DeviceRow({ device, level }: { device: DevicePanelItem; level: Level }) {
  const entity = useMemo(() => ({ ...device.primary, name: device.name }), [device.primary, device.name]);
  const ranked = device.readings.toSorted(
    (left, right) => getReadingRank(device, left) - getReadingRank(device, right),
  );
  const parts = ranked
    .slice(0, DEVICE_ROW_READINGS)
    .map((reading) => `${getDeviceEntityLabel(reading)} ${formatEntityState(reading)}`);
  const more = ranked.length - parts.length;
  const secondary = [formatEntityState(device.primary), ...parts, more > 0 ? `+${more}` : null]
    .filter(Boolean)
    .join(" · ");
  return <EntityRow entity={entity} level={level} secondary={secondary} />;
}

/** Custom card names from device blocks, by device id. */
const useDeviceLabels = (configuration: SmartHomeConfiguration) =>
  useMemo(
    () =>
      new Map(
        parseSourceBlocks(configuration.blockIds, configuration.integrationId).flatMap((block) =>
          block.kind === "device" && block.label ? [[block.deviceId, block.label] as const] : [],
        ),
      ),
    [configuration.blockIds, configuration.integrationId],
  );

function EntitiesPresentation({ entities, configuration, width, height }: PresentationProps) {
  const t = useI18n("widget.smartHome-controls.preview");
  const deviceLabels = useDeviceLabels(configuration);
  const [filter, setFilter] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const groups = getSummaryGroups(entities);
  const summary = summaryKeys
    .filter(
      (key) =>
        key === "on" ||
        key === "off" ||
        (key === "lights" && entities.some((entity) => entity.domain === "light")) ||
        groups[key].length > 0,
    )
    .map((key) => ({
      chip: {
        key,
        label: t(`summary.${key}`),
        count: groups[key].length,
        ...summaryStyles[key],
      } satisfies ChipDef,
      entities: groups[key],
    }));
  const [single] = entities;
  if (entities.length === 1 && single) {
    return <SingleEntityRow entity={single} width={width} height={height} />;
  }
  if (width < 112 || height < 80) {
    return (
      <div className={classes.countOnly}>
        <PageControls
          count={entities.length}
          page={0}
          pages={1}
          onChange={setPageIndex}
          expanded={false}
          availableHeight={height}
          stacked
        />
      </div>
    );
  }
  let tier = getOverviewTier(width, height);
  if (width < 230) tier = "tile";
  if (configuration.showSummary && tier !== "list" && width >= 112 && height >= 80) {
    const cells = tier === "tile" ? summary.slice(0, 4) : summary;
    return (
      <div className={technicalClasses.stats} data-tier={tier}>
        <StatCells cells={cells} layout={tier === "tile" ? "grid" : "row"} />
      </div>
    );
  }

  const active = configuration.showSummary && summary.find(({ chip }) => chip.key === filter);
  const visible = active ? active.entities : entities;
  // A filter keeps whole devices: a plug that is on stays together with its power reading.
  const matching = active ? new Set(active.entities.map((entity) => entity.id)) : null;
  const rows = toPanelItems(
    entities,
    configuration.groupByDevice,
    configuration.readingOrder,
    false,
    deviceLabels,
  ).filter(
    (item) =>
      !matching ||
      (item.kind === "entity"
        ? matching.has(item.entity.id)
        : matching.has(item.primary.id) || item.readings.some((reading) => matching.has(reading.id))),
  );
  const chips = configuration.showSummary && summary.length > 0;
  const { columns, capacity, overflowing } = getTechnicalPageLayout(width, height, rows.length, chips);
  const pages = Math.max(1, Math.ceil(rows.length / Math.max(1, capacity)));
  const page = Math.min(pageIndex, pages - 1);
  const start = page * capacity;
  const shown = rows.slice(start, start + capacity);
  const showArea = new Set(visible.map((entity) => entity.areaId)).size > 1;

  return (
    <div className={classes.presentation}>
      {chips && capacity > 0 && (
        <header className={technicalClasses.header} style={{ height: SUMMARY_HEIGHT }}>
          <div className={technicalClasses.chips}>
            {summary.map(({ chip }) => (
              <ChipButton
                key={chip.key}
                chip={chip}
                active={filter === chip.key}
                onClick={() => {
                  setFilter(filter === chip.key ? null : chip.key);
                  setPageIndex(0);
                }}
              />
            ))}
          </div>
        </header>
      )}
      {shown.length > 0 && (
        <Box
          className={classes.technicalGrid}
          data-list
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: ROW_HEIGHT }}
        >
          {shown.map((row) => (
            <div key={row.id} className={classes.rowSlot}>
              {row.kind === "device" ? (
                <DeviceRow device={row} level={getLevel(width / columns)} />
              ) : (
                <EntityRow entity={row.entity} level={getLevel(width / columns)} showArea={showArea} />
              )}
            </div>
          ))}
        </Box>
      )}
      {overflowing && (
        <PageControls
          count={rows.length - shown.length}
          page={page}
          pages={capacity > 0 ? pages : 1}
          onChange={setPageIndex}
          expanded={configuration.advanced && capacity > 0}
        />
      )}
      {visible.length === 0 && <div className={classes.empty}>{t("noMatches")}</div>}
    </div>
  );
}

interface PanelItemControlProps {
  item: PanelItem;
  width: number;
  height: number;
  compact: boolean;
}

function PanelItemControl({ item, width, height, compact }: PanelItemControlProps) {
  if (item.kind === "device") return <DeviceControl device={item} width={width} height={height} compact={compact} />;
  return <EntityControl entity={item.entity} width={width} height={height} />;
}

function ControlPanelPresentation({ entities, configuration, width, height }: PresentationProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const deviceLabels = useDeviceLabels(configuration);
  const items = useMemo(
    () =>
      toPanelItems(
        entities,
        configuration.groupByDevice,
        configuration.readingOrder,
        configuration.showDeviceGraph,
        deviceLabels,
        configuration.showDeviceKeyValue,
      ),
    [
      entities,
      configuration.groupByDevice,
      configuration.readingOrder,
      configuration.showDeviceGraph,
      deviceLabels,
      configuration.showDeviceKeyValue,
    ],
  );
  const [single] = entities;
  if (entities.length === 1 && single && width >= 40 && height >= 36) {
    if (width < 96 || height < 64) return <EntityTile entity={single} />;
    return <EntityControl entity={single} width={width} height={height} />;
  }
  const [singleItem] = items;
  const compactDevices = configuration.controlSize === "compact" && !configuration.advanced;
  if (items.length === 1 && singleItem && width >= 96 && height >= 64) {
    return <PanelItemControl item={singleItem} width={width} height={height} compact={compactDevices} />;
  }
  const size = configuration.advanced ? "compact" : configuration.controlSize;
  // The focus view prefers small tiles but should still fill its large dialog.
  const layout = getControlPanelLayout(width, height, items.length, size, configuration.advanced);
  const overflowing = layout.capacity < items.length;
  const capacity = Math.max(0, layout.capacity - Number(overflowing));
  const pages = Math.max(1, Math.ceil(items.length / Math.max(1, capacity)));
  const page = Math.min(pageIndex, pages - 1);
  const start = page * capacity;
  const shown = items.slice(start, start + capacity);
  const navigation = (
    <PageControls
      count={items.length - shown.length}
      page={page}
      pages={capacity > 0 ? pages : 1}
      onChange={setPageIndex}
      expanded={configuration.advanced && capacity > 0}
      availableHeight={height}
      stacked
    />
  );

  if (capacity === 0) {
    return <EntitiesPresentation entities={entities} configuration={configuration} width={width} height={height} />;
  }

  // Cards always fill the panel, so the space they leave never ends up as a wider margin than a single card has.
  // Compact cards stay compact through their density and because more of them fit side by side.
  return (
    <Box
      className={classes.grid}
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      }}
    >
      {shown.map((item) => (
        <div key={item.id} className={classes.cell}>
          {/* Cells stretch to fill the panel; the control lays itself out for the size it really gets. */}
          <Measured>
            {(width, height) => <PanelItemControl item={item} width={width} height={height} compact={compactDevices} />}
          </Measured>
        </div>
      ))}
      {overflowing && <div className={classes.overflowCell}>{navigation}</div>}
    </Box>
  );
}

function ControlPanelRoot({
  isEditMode,
  single,
  palette,
  children,
}: {
  isEditMode: boolean;
  single: boolean;
  /** Null when the content sets its own palette (custom layout cards). */
  palette: SmartHomeControlPalette | null;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState<{ id: string; readOnly: boolean } | null>(null);
  const detail = useMemo((): DetailApi | null => {
    if (isEditMode) return null;
    return { open: (id, options) => setOpened({ id, readOnly: options?.readOnly === true }) };
  }, [isEditMode]);
  const entityDetail = (
    <EntityDetail
      entityId={detail && (opened?.id ?? null)}
      onClose={() => setOpened(null)}
      // A related entity opened from the detail keeps its restrictions.
      onOpen={(id) => setOpened((current) => ({ id, readOnly: current?.readOnly ?? false }))}
    />
  );

  return (
    <PaletteProvider value={palette ?? "boring"}>
      <DetailProvider value={detail}>
        <div
          className={controlCenterClasses.root}
          data-edit={isEditMode}
          data-preset={single ? "entity" : undefined}
          data-palette={palette ?? undefined}
          inert={isEditMode}
        >
          {children}
        </div>
        {opened?.readOnly ? (
          <SmartHomeInteractionProvider blocked="readOnly">{entityDetail}</SmartHomeInteractionProvider>
        ) : (
          entityDetail
        )}
      </DetailProvider>
    </PaletteProvider>
  );
}

function LiveState({ children }: { children: ReactNode }) {
  const t = useI18n("widget.smartHome-controls.live");
  const status = useSmartHomeLiveStatus();
  if (status?.status === "loading") {
    return (
      <div className={classes.empty}>
        <Loader size="sm" />
        {t("loading")}
      </div>
    );
  }
  if (status?.status === "error") {
    return (
      <div className={classes.empty}>
        {status.message ?? t("error")}
        <Button size="compact-xs" variant="light" onClick={status.retry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  return children;
}

interface PreviewProps {
  configuration: SmartHomeConfiguration;
  width: number;
  height: number;
  isEditMode: boolean;
}

const getEmptyKey = (configuration: SmartHomeConfiguration) => {
  if (configuration.blockIds.some((id) => parseBlockId(id)?.source !== configuration.integrationId))
    return "otherSource";
  if (configuration.blockIds.length > 0) return "noMatches";
  return "empty";
};

function ConfiguredPreview({ configuration, width, height, isEditMode }: PreviewProps) {
  const t = useI18n("widget.smartHome-controls.preview");
  const all = useSmartHomeEntities();
  const entities = useMemo(() => resolveEntities(configuration, all), [configuration, all]);
  const entityIds = useMemo(() => entities.map((entity) => entity.id), [entities]);
  const title = configuration.title.trim();
  const single = entities.length === 1;
  const panel = configuration.presentation === "controlPanel";
  // One card or several, the panel keeps the same inset to the widget's edge: the root's padding, nothing more.
  const bodyHeight = height - Number(Boolean(title)) * TITLE_HEIGHT;
  const props = { entities, configuration, width, height: Math.max(0, bodyHeight) };
  const content = (
    <div className={classes.stack}>
      {title && (
        <h3 className={classes.title} title={title}>
          {title}
        </h3>
      )}
      <div className={classes.content}>
        {entities.length === 0 && <div className={classes.empty}>{t(getEmptyKey(configuration))}</div>}
        {entities.length > 0 && !panel && <EntitiesPresentation {...props} />}
        {entities.length > 0 && panel && <ControlPanelPresentation {...props} />}
      </div>
    </div>
  );

  return (
    <SmartHomeEntitiesProvider entityIds={entityIds}>
      {!panel && <ControlListRoot isEditMode={isEditMode}>{content}</ControlListRoot>}
      {panel && (
        <ControlPanelRoot isEditMode={isEditMode} single={single} palette={configuration.palette}>
          {content}
        </ControlPanelRoot>
      )}
    </SmartHomeEntitiesProvider>
  );
}

const useInteractionBlock = (configuration: SmartHomeConfiguration, isEditMode: boolean) => {
  const interactable = useIntegrationsWithInteractAccess();
  if (isEditMode) return "editing";
  if (configuration.readOnly) return "readOnly";
  if (configuration.integrationId && !interactable.some(({ id }) => id === configuration.integrationId))
    return "noPermission";
  return null;
};

// Only widgets in custom mode load the layout renderer.
const CustomLayoutView = lazy(() => import("./custom-layout/view"));
const noValues: string[] = [];
// The control center root insets its content (both sides together), and the widget title takes a fixed row
// (`.title` in configuration.module.css).
const CUSTOM_LAYOUT_INSET = 8;
const CUSTOM_LAYOUT_TITLE_HEIGHT = 28;

function CustomPreview({ configuration, width, height, isEditMode }: PreviewProps) {
  const title = configuration.title.trim();
  return (
    // Each card picks its own colors, so the widget sets none.
    <ControlPanelRoot isEditMode={isEditMode} single={false} palette={null}>
      <div className={classes.stack} style={{ height: Math.max(0, height - CUSTOM_LAYOUT_INSET) }}>
        {title && (
          <h3 className={classes.title} title={title}>
            {title}
          </h3>
        )}
        <div className={classes.content}>
          <Suspense fallback={null}>
            <CustomLayoutView
              layout={configuration.customLayout}
              source={configuration.integrationId}
              width={width - CUSTOM_LAYOUT_INSET}
            />
          </Suspense>
        </div>
      </div>
    </ControlPanelRoot>
  );
}

function ConfigurableContent({
  configuration,
  onChange,
  ...props
}: PreviewProps & { onChange: (patch: SmartHomeOptionsPatch) => void }) {
  const blocked = useInteractionBlock(configuration, props.isEditMode);
  const { integrationId, customLayout } = configuration;
  const custom = configuration.layoutMode === "custom";
  // A custom layout subscribes to exactly the entities it shows, each once, and to history only for its graphs.
  const layoutBlockIds = useMemo(
    () =>
      custom
        ? getLayoutEntityIds(customLayout, integrationId).map((entityId) =>
            createEntityBlockId(entityId, integrationId),
          )
        : null,
    [custom, customLayout, integrationId],
  );
  const graphEntityIds = useMemo(
    () => (custom ? getLayoutGraphEntityIds(customLayout, integrationId) : undefined),
    [custom, customLayout, integrationId],
  );
  const preview = custom ? (
    <CustomPreview {...props} configuration={configuration} />
  ) : (
    <ConfiguredPreview {...props} configuration={configuration} />
  );

  return (
    <SmartHomeInteractionProvider blocked={blocked}>
      <div className={classes.frame}>
        {integrationId && (
          <SmartHomeLiveProvider
            key={integrationId}
            integrationId={integrationId}
            blockIds={layoutBlockIds ?? configuration.blockIds}
            roomDomains={custom ? noValues : configuration.roomDomains}
            excludedEntityIds={custom ? noValues : configuration.excludedEntityIds}
            historyEntityIds={graphEntityIds}
          >
            <LiveState>{preview}</LiveState>
          </SmartHomeLiveProvider>
        )}
        {props.isEditMode && custom && (
          <CustomLayoutEditButton
            integrationId={integrationId}
            // Same size the custom view gets: inside the control center root, below the optional title.
            previewSize={{
              width: props.width - CUSTOM_LAYOUT_INSET,
              height:
                props.height - CUSTOM_LAYOUT_INSET - (configuration.title.trim() ? CUSTOM_LAYOUT_TITLE_HEIGHT : 0),
            }}
            layout={customLayout}
            onChange={(next) => onChange({ customLayout: next })}
          />
        )}
        {props.isEditMode && !custom && (
          <SmartHomeInlineEditor
            integrationId={integrationId}
            blocks={configuration.blockIds}
            presentation={configuration.presentation}
            filter={configuration}
            onChange={onChange}
          />
        )}
      </div>
    </SmartHomeInteractionProvider>
  );
}

export default function SmartHomeControlsWidget({
  options,
  integrationIds,
  width,
  height,
  isEditMode,
  setOptions,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"smartHome-controls">) {
  const advanced = displayMode === "advanced";
  const uiScale = advanced ? 1 : calculateBoardUiScale(displayScale);
  const integrationId = integrationIds[0] ?? null;
  // Parsed once per stored value, so live updates never re-validate the layout.
  const customLayout = useMemo(() => parseSmartHomeLayout(options.customLayout), [options.customLayout]);
  const configuration = useMemo<SmartHomeConfiguration>(
    () => ({
      advanced,
      integrationId,
      presentation: options.presentation,
      title: options.title,
      blockIds: options.blocks,
      roomDomains: options.roomDomains,
      excludedEntityIds: options.excludedEntityIds,
      showSummary: options.showSummary,
      controlSize: options.controlSize,
      palette: options.palette,
      groupByDevice: options.groupByDevice,
      readingOrder: options.readingOrder,
      showDeviceGraph: options.showDeviceGraph,
      showDeviceKeyValue: options.showDeviceKeyValue,
      layoutMode: options.layoutMode,
      customLayout,
      readOnly: options.readOnly,
    }),
    [
      advanced,
      integrationId,
      options.presentation,
      options.title,
      options.blocks,
      options.roomDomains,
      options.excludedEntityIds,
      options.showSummary,
      options.controlSize,
      options.palette,
      options.groupByDevice,
      options.readingOrder,
      options.showDeviceGraph,
      options.showDeviceKeyValue,
      options.layoutMode,
      customLayout,
      options.readOnly,
    ],
  );
  const onChange = useCallback((patch: SmartHomeOptionsPatch) => setOptions({ newOptions: patch }), [setOptions]);

  return (
    <ConfigurableContent
      configuration={configuration}
      onChange={onChange}
      width={width / uiScale}
      height={height / uiScale}
      isEditMode={isEditMode}
    />
  );
}
