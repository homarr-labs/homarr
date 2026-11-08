"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Box, Button, Group, Loader, Pagination } from "@mantine/core";
import { IconAlertTriangle, IconBulb, IconGauge, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";

import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { parseBlockId, parseSourceBlocks, PrototypeConfigurationProvider } from "./configuration";
import classes from "./configuration.module.css";
import { PrototypeInlineEditor } from "./inline-editor";
import { PrototypeLiveProvider, usePrototypeLiveStatus } from "./live";
import { isUnavailable } from "./semantics";
import { PrototypeEntitiesProvider, PrototypeInteractionProvider, usePrototypeEntities } from "./store";
import { haDomains } from "./types";
import type {
  HaEntity,
  PrototypeConfiguration,
  PrototypeControlPalette,
  PrototypeControlSize,
  PrototypeOptionsPatch,
} from "./types";
import { getColumnCount, getLevel, getOverviewTier } from "./variants/c/layout";
import { ChipButton } from "./variants/c/list";
import type { ChipDef } from "./variants/c/list";
import { getColorVars, isOn, isPassive, isSensorLike } from "./variants/c/meta";
import { ControlListRoot } from "./variants/c/root";
import { EntityRow } from "./variants/c/row";
import cClasses from "./variants/c/styles.module.css";
import { EntityTile, StatCells } from "./variants/c/tile";
import { DetailProvider, EntityControl, EntityDetail, PaletteProvider } from "./variants/e/details";
import eClasses from "./variants/e/styles.module.css";

const getSourceAreaId = (entity: HaEntity) => entity.sourceAreaId ?? entity.areaId;
const domainRank = (entity: HaEntity) => haDomains.indexOf(entity.domain);

const resolveEntities = (configuration: PrototypeConfiguration, entities: Record<string, HaEntity>) => {
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
const DEMO_HEIGHT = 18;
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

const targetSizes: Record<PrototypeControlSize, { width: number; height: number }> = {
  compact: { width: 144, height: 132 },
  auto: { width: 196, height: 176 },
  large: { width: 280, height: 256 },
};

export const getControlPanelLayout = (
  width: number,
  height: number,
  count: number,
  size: PrototypeControlSize,
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
        (2 * (width - columns * cellWidth - GAP * (columns - 1))) / width +
        (2 * (height - rows * cellHeight - GAP * (rows - 1))) / height;
      if (visible < bestVisible || (visible === bestVisible && score >= bestScore)) continue;
      bestVisible = visible;
      bestScore = score;
      best = { columns, rows, width: cellWidth, height: cellHeight, capacity };
    }
  }
  if (best.capacity === 0 && size === "large") return getControlPanelLayout(width, height, count, "auto");
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
  lights: entities.filter((entity) => entity.domain === "light"),
  on: entities.filter(isOn),
  off: entities.filter((entity) => !isPassive(entity) && !isOn(entity) && !isUnavailable(entity)),
  sensors: entities.filter(isSensorLike),
  offline: entities.filter(isUnavailable),
});

interface PresentationProps {
  entities: HaEntity[];
  configuration: PrototypeConfiguration;
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
    <div className={cClasses.single} style={getColorVars(entity)}>
      <EntityRow entity={entity} level={getLevel(width)} />
    </div>
  );
}

function EntitiesPresentation({ entities, configuration, width, height }: PresentationProps) {
  const t = useI18n("widget.smartHome-prototype.preview");
  const [filter, setFilter] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const groups = getSummaryGroups(entities);
  const summary = summaryKeys
    .filter((key) => key === "on" || key === "off" || groups[key].length > 0)
    .map((key) => ({
      chip: {
        key,
        label: t(`summary.${key}`),
        count: key === "lights" ? groups.lights.filter(isOn).length : groups[key].length,
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
      <div className={cClasses.stats} data-tier={tier}>
        <StatCells cells={cells} layout={tier === "tile" ? "grid" : "row"} />
      </div>
    );
  }

  const active = configuration.showSummary && summary.find(({ chip }) => chip.key === filter);
  const visible = active ? active.entities : entities;
  const chips = configuration.showSummary && summary.length > 0;
  const { columns, capacity, overflowing } = getTechnicalPageLayout(width, height, visible.length, chips);
  const pages = Math.max(1, Math.ceil(visible.length / Math.max(1, capacity)));
  const page = Math.min(pageIndex, pages - 1);
  const start = page * capacity;
  const shown = visible.slice(start, start + capacity);
  const showArea = new Set(visible.map((entity) => entity.areaId)).size > 1;

  return (
    <div className={classes.presentation}>
      {chips && capacity > 0 && (
        <header className={cClasses.header} style={{ height: SUMMARY_HEIGHT }}>
          <div className={cClasses.chips}>
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
          {shown.map((entity) => (
            <div key={entity.id} className={classes.rowSlot}>
              <EntityRow entity={entity} level={getLevel(width / columns)} showArea={showArea} />
            </div>
          ))}
        </Box>
      )}
      {overflowing && (
        <PageControls
          count={visible.length - shown.length}
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

function ControlPanelPresentation({ entities, configuration, width, height }: PresentationProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [single] = entities;
  if (entities.length === 1 && single && width >= 40 && height >= 36) {
    if (width < 96 || height < 64) return <EntityTile entity={single} />;
    return <EntityControl entity={single} width={width} height={height} />;
  }
  const size = configuration.advanced ? "compact" : configuration.controlSize;
  const layout = getControlPanelLayout(width, height, entities.length, size);
  const overflowing = layout.capacity < entities.length;
  const capacity = Math.max(0, layout.capacity - Number(overflowing));
  const pages = Math.max(1, Math.ceil(entities.length / Math.max(1, capacity)));
  const page = Math.min(pageIndex, pages - 1);
  const start = page * capacity;
  const shown = entities.slice(start, start + capacity);
  const navigation = (
    <PageControls
      count={entities.length - shown.length}
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

  return (
    <Box
      className={classes.grid}
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`,
        gridTemplateRows: `repeat(${layout.rows}, ${layout.height}px)`,
      }}
    >
      {shown.map((entity) => (
        <div key={entity.id} className={classes.cell}>
          <EntityControl entity={entity} width={layout.width} height={layout.height} />
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
  palette: PrototypeControlPalette;
  children: ReactNode;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = useMemo(() => {
    if (isEditMode) return null;
    return { open: setDetailId };
  }, [isEditMode]);

  return (
    <PaletteProvider value={palette}>
      <DetailProvider value={detail}>
        <div
          className={eClasses.root}
          data-edit={isEditMode}
          data-preset={single ? "entity" : undefined}
          data-palette={palette}
          inert={isEditMode}
        >
          {children}
        </div>
        <EntityDetail entityId={detail && detailId} onClose={() => setDetailId(null)} onOpen={setDetailId} />
      </DetailProvider>
    </PaletteProvider>
  );
}

function LiveState({ children }: { children: ReactNode }) {
  const t = useI18n("widget.smartHome-prototype.live");
  const status = usePrototypeLiveStatus();
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
  configuration: PrototypeConfiguration;
  width: number;
  height: number;
  isEditMode: boolean;
}

const getEmptyKey = (configuration: PrototypeConfiguration) => {
  if (configuration.blockIds.some((id) => parseBlockId(id)?.source !== configuration.integrationId))
    return "otherSource";
  if (configuration.blockIds.length > 0) return "noMatches";
  return "empty";
};

function ConfiguredPreview({ configuration, width, height, isEditMode }: PreviewProps) {
  const t = useI18n("widget.smartHome-prototype.preview");
  const all = usePrototypeEntities();
  const entities = useMemo(() => resolveEntities(configuration, all), [configuration, all]);
  const entityIds = useMemo(() => entities.map((entity) => entity.id), [entities]);
  const title = configuration.title.trim();
  const demo = configuration.integrationId === null;
  const single = entities.length === 1;
  const panel = configuration.presentation === "controlPanel";
  const inset = panel && !single ? 8 : 0;
  const bodyHeight = height - inset - Number(demo) * DEMO_HEIGHT - Number(Boolean(title)) * TITLE_HEIGHT;
  const props = { entities, configuration, width: width - inset, height: Math.max(0, bodyHeight) };
  const content = (
    <div className={classes.stack}>
      {demo && (
        <div className={classes.strip}>
          <span className={classes.flag}>{t("demo")}</span>
        </div>
      )}
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
    <PrototypeEntitiesProvider entityIds={entityIds}>
      {!panel && <ControlListRoot isEditMode={isEditMode}>{content}</ControlListRoot>}
      {panel && (
        <ControlPanelRoot isEditMode={isEditMode} single={single} palette={configuration.palette}>
          {content}
        </ControlPanelRoot>
      )}
    </PrototypeEntitiesProvider>
  );
}

const useInteractionBlock = (configuration: PrototypeConfiguration, isEditMode: boolean) => {
  const interactable = useIntegrationsWithInteractAccess();
  if (isEditMode) return "editing";
  if (configuration.readOnly) return "readOnly";
  if (configuration.integrationId && !interactable.some(({ id }) => id === configuration.integrationId))
    return "noPermission";
  return null;
};

function ConfigurableContent({
  configuration,
  onChange,
  ...props
}: PreviewProps & { onChange: (patch: PrototypeOptionsPatch) => void }) {
  const blocked = useInteractionBlock(configuration, props.isEditMode);
  const { integrationId } = configuration;
  const preview = <ConfiguredPreview {...props} configuration={configuration} />;

  return (
    <PrototypeInteractionProvider blocked={blocked}>
      <div className={classes.frame}>
        {integrationId && (
          <PrototypeLiveProvider
            key={integrationId}
            integrationId={integrationId}
            blockIds={configuration.blockIds}
            roomDomains={configuration.roomDomains}
            excludedEntityIds={configuration.excludedEntityIds}
          >
            <LiveState>{preview}</LiveState>
          </PrototypeLiveProvider>
        )}
        {!integrationId && preview}
        {props.isEditMode && (
          <PrototypeInlineEditor
            integrationId={integrationId}
            blocks={configuration.blockIds}
            presentation={configuration.presentation}
            filter={configuration}
            onChange={onChange}
          />
        )}
      </div>
    </PrototypeInteractionProvider>
  );
}

export default function SmartHomePrototypeWidget({
  options,
  integrationIds,
  width,
  height,
  isEditMode,
  setOptions,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"smartHome-prototype">) {
  const advanced = displayMode === "advanced";
  const uiScale = advanced ? 1 : calculateBoardUiScale(displayScale);
  const integrationId = integrationIds[0] ?? null;
  const configuration = useMemo<PrototypeConfiguration>(
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
      options.readOnly,
    ],
  );
  const onChange = useCallback((patch: PrototypeOptionsPatch) => setOptions({ newOptions: patch }), [setOptions]);

  return (
    <PrototypeConfigurationProvider value={configuration} onChange={onChange}>
      <ConfigurableContent
        configuration={configuration}
        onChange={onChange}
        width={width / uiScale}
        height={height / uiScale}
        isEditMode={isEditMode}
      />
    </PrototypeConfigurationProvider>
  );
}
