"use client";

import { memo, useMemo, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconBattery1,
  IconBattery3,
  IconCameraOff,
  IconCheck,
  IconLoader2,
  IconQuestionMark,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { supportsSmartHomeAction } from "@homarr/integrations/types";
import { SpriteIcon } from "@homarr/forms-collection/tabler-icon-picker";
import { useI18n } from "@homarr/translation/client";

import { getDeviceEntityLabel } from "../device-groups";
import type { DevicePanelItem } from "../device-groups";
import { formatEntityState } from "../semantics";
import {
  SmartHomeEntitiesProvider,
  SmartHomeInteractionProvider,
  useSmartHomeEntities,
  useSmartHomeEntity,
  useSmartHomeEntityError,
  useSmartHomeInteractionBlock,
} from "../store";
import type { HaEntity } from "../types";
import { getHistoryStats, HistoryGraph, HistoryLegend } from "../../../common/history-graph";
import type { HistoryGraphLine } from "../../../common/history-graph";
import { useCameraLive } from "../camera-live";
import { PillSlider } from "../control-center/controls";
import {
  densities,
  DeviceHeader,
  getHeaderAction,
  getSliderSpec,
  ReadingChip,
  ReadingRow,
  StepSlider,
} from "../control-center/device-control";
import type { SliderStyle } from "../control-center/device-control";
import { EntityControl } from "../control-center/entity-controls";
import { getHistoryTimes } from "../control-center/history-graph";
import {
  HiddenPartsProvider,
  useDeviceControlDisabled,
  useEntityDetailOpener,
  useLoadableImage,
  useRunner,
  useShowsPart,
} from "../control-center/hooks";
import controlClasses from "../control-center/styles.module.css";
import { accentVars, useEntityTheme } from "../control-center/theme";
import { getCardInnerRows, getElementPlacements, stackElementPlacements } from "./card-grid";
import classes from "./layout.module.css";
import { deriveLayout, getLayoutColumns, LAYOUT_GAP, LAYOUT_ROW_HEIGHT } from "./responsive";
import {
  aggregateEntities,
  compareState,
  formatElementState,
  formatLayoutNumber,
  getNumericState,
  getRuleColor,
  layoutColor,
} from "./rules";
import { hasOwnGraphHistory, SMART_HOME_LAYOUT_COLUMNS, SMART_HOME_LAYOUT_ROWS, staticElementViews } from "./schema";
import type { SmartHomeLayout, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";
import type { GridPlacement } from "@homarr/boards/grid";

interface ElementProps {
  entity: HaEntity;
  element: SmartHomeLayoutElement;
  /** The element's label, or the entity's name without its device. */
  label: string;
  source: string | null;
}

/** The chosen icon from the sprite, or the entity's own icon. */
function ElementIcon({
  name,
  fallback: Fallback,
  size,
  className,
}: {
  name: string | undefined;
  fallback: IconComponent;
  size: number | string;
  className?: string;
}) {
  if (name) return <SpriteIcon name={name} size={size} className={className} />;
  return <Fallback size={size} stroke={1.8} className={className} aria-hidden />;
}

type IconComponent = ComponentType<{ size?: number | string; stroke?: number; className?: string }>;

// Every label icon has the same size relative to the card's text.
const LABEL_ICON_SIZE = "1.15em";

/** The one label every element uses: its icon (chosen or the entity's own) and, unless hidden, its text. */
function ElementLabel({
  element,
  fallback,
  label,
}: {
  element: Pick<SmartHomeLayoutElement, "icon" | "hideLabel">;
  fallback: IconComponent;
  label: string;
}) {
  const showsIcon = useShowsPart("icon");
  return (
    <span className={classes.elementLabel}>
      {showsIcon ? (
        <ElementIcon name={element.icon} fallback={fallback} size={LABEL_ICON_SIZE} className={classes.labelIcon} />
      ) : null}
      {element.hideLabel ? null : (
        // The full text on hover, for when the element is too narrow for it.
        <span className={classes.labelText} title={label}>
          {label}
        </span>
      )}
    </span>
  );
}

/** Nothing inside can be controlled; a stronger block from outside (editing, no permission) stays in place. */
function ReadOnlyScope({ children }: { children: ReactNode }) {
  const blocked = useSmartHomeInteractionBlock();
  return <SmartHomeInteractionProvider blocked={blocked ?? "readOnly"}>{children}</SmartHomeInteractionProvider>;
}

/**
 * Fan steps have no position for "off", and these elements have no power button beside them: the step bar gets an
 * "off" segment that runs the same safe action as the device card's power button.
 */
const getTurnOff = (entity: HaEntity, run: ReturnType<typeof useRunner>["run"]) => {
  const action = getHeaderAction(entity);
  return action ? () => void run(action) : undefined;
};

// The large control picks its layout from the space it gets: the pill beside the name needs room on both axes.
const PILL_MIN_WIDTH = 220;
const PILL_MIN_HEIGHT = 140;

// Entities a header with one button cannot serve: they get their full control center tile (dial, player, ...).
const fullTileDomains = new Set([
  "climate",
  "water_heater",
  "humidifier",
  "media_player",
  "vacuum",
  "alarm_control_panel",
  "camera",
]);

/**
 * The large control. Thermostats, players and similar get their full control center tile, which fills the element.
 * Everything else gets the device card header, centered in the element: with its slider (compact, bar or fan steps,
 * or the pill beside the name when there is room) or, for switches, plugs and locks, just the button and name.
 */
function TileElement({ entity, label }: ElementProps) {
  const open = useEntityDetailOpener(entity.id);
  const { ref, width, height } = useElementSize();
  const item = useMemo(
    (): DevicePanelItem => ({
      kind: "device",
      id: entity.id,
      name: label,
      primary: entity,
      readings: [],
      readingOrder: "automatic",
      showGraph: false,
      showKeyValue: false,
    }),
    [entity, label],
  );
  const slider = getSliderSpec(entity);
  if (!slider && fullTileDomains.has(entity.domain)) {
    return (
      <div ref={ref} className={`${classes.tileElement} ${controlClasses.embeddedTile}`}>
        {width > 0 && height > 0 ? (
          <EntityControl entity={{ ...entity, name: label }} width={width} height={height} />
        ) : null}
      </div>
    );
  }
  const style: SliderStyle =
    slider && !slider.steps && width >= PILL_MIN_WIDTH && height >= PILL_MIN_HEIGHT ? "pill" : "bar";
  const comfortableHeight = densities.comfortable.header + (slider ? densities.comfortable.sliderRow : 0);
  // Before the first measurement the element is assumed to have room, so it does not flash the compact header.
  const compact = height > 0 && height < comfortableHeight;
  return (
    <div ref={ref} className={classes.tileElement} data-centered>
      <DeviceHeader
        device={item}
        slider={slider}
        sliderStyle={style}
        density={compact ? densities.compact : densities.comfortable}
        onOpen={open}
        bare
      />
    </div>
  );
}

function SliderElement({ entity, element, label }: ElementProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);
  const [preview, setPreview] = useState<number | null>(null);
  const slider = getSliderSpec(entity);
  if (!slider) return <ReadingRow entity={entity} label={label} />;
  const name = `${label} ${t(`slider.${slider.label}`)}`;
  const turnOff = getTurnOff(entity, run);
  return (
    <div className={classes.sliderElement} style={accentVars(theme.accent, theme.onAccent)}>
      <div className={classes.elementHead}>
        <ElementLabel element={element} fallback={theme.Icon} label={label} />
        <span className={classes.elementValue}>
          {slider.steps ? formatEntityState(entity) : `${preview ?? slider.value}%`}
        </span>
      </div>
      <div className={classes.sliderTrack}>
        {slider.steps ? (
          <StepSlider
            steps={slider.steps}
            value={slider.value}
            label={name}
            disabled={disabled}
            pending={pending}
            onSelect={(value) => void run(slider.toAction(value))}
            onTurnOff={turnOff}
          />
        ) : (
          <PillSlider
            axis="horizontal"
            value={slider.value}
            label={name}
            valueText={(value) => `${value}%`}
            pending={pending}
            disabled={disabled}
            onPreview={setPreview}
            onCommit={(value) => void run(slider.toAction(value))}
          />
        )}
      </div>
    </div>
  );
}

/** The device card's big bar on its own: no label, the bar (or fan steps) fills the element. */
function BarSliderElement({ entity, label }: ElementProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);
  const slider = getSliderSpec(entity);
  if (!slider) return <ReadingRow entity={entity} label={label} />;
  const name = `${label} ${t(`slider.${slider.label}`)}`;
  const turnOff = getTurnOff(entity, run);
  return (
    <div className={classes.barElement} style={accentVars(theme.accent, theme.onAccent)}>
      {slider.steps ? (
        <StepSlider
          steps={slider.steps}
          value={slider.value}
          label={name}
          disabled={disabled}
          pending={pending}
          onSelect={(value) => void run(slider.toAction(value))}
          onTurnOff={turnOff}
        />
      ) : (
        <PillSlider
          axis="horizontal"
          value={slider.value}
          label={name}
          valueText={(value) => `${value}%`}
          pending={pending}
          disabled={disabled}
          onCommit={(value) => void run(slider.toAction(value))}
        />
      )}
    </div>
  );
}

/** The device card's tall pill on its own; it fills the element, and a tap switches the device. */
function PillElement(props: ElementProps) {
  const { entity, element, label } = props;
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);
  const slider = getSliderSpec(entity);
  if (!slider) return <BarSliderElement {...props} />;
  // Fans with fixed speeds get their steps stacked into the pill, with "off" at the bottom.
  if (slider.steps) {
    return (
      <div className={classes.pillElement} style={accentVars(theme.accent, theme.onAccent)}>
        <StepSlider
          axis="vertical"
          steps={slider.steps}
          value={slider.value}
          label={`${label} ${t(`slider.${slider.label}`)}`}
          disabled={disabled}
          pending={pending}
          onSelect={(value) => void run(slider.toAction(value))}
          onTurnOff={getTurnOff(entity, run)}
        />
      </div>
    );
  }
  const toggle = getHeaderAction(entity);
  return (
    <div className={classes.pillElement} style={accentVars(theme.accent, theme.onAccent)}>
      <PillSlider
        axis="vertical"
        value={slider.value}
        label={`${label} ${t(`slider.${slider.label}`)}`}
        valueText={(value) => `${value}%`}
        pending={pending}
        disabled={disabled}
        onTap={toggle ? () => void run(toggle) : undefined}
        onCommit={(value) => void run(slider.toAction(value))}
      >
        {() => (
          <div className={controlClasses.bigPillIcon}>
            <ElementIcon name={element.icon} fallback={theme.Icon} size={22} />
          </div>
        )}
      </PillSlider>
    </div>
  );
}

/**
 * One big button for the entity's main action: run a scene, script or flow, switch a light, start a vacuum. Actions
 * that need a code or a confirmation open the entity's details instead of running from a single tap.
 */
// Pressing a button runs these: a flow or automation is triggered, never switched off.
const triggerDomains = new Set(["automation", "scene", "script", "button"]);
const triggerAction = { type: "trigger" } as const;

/** What a button press does: run a runnable entity, otherwise the safe main action a device card offers. */
const getButtonAction = (entity: HaEntity) => {
  if (!triggerDomains.has(entity.domain)) return getHeaderAction(entity);
  return supportsSmartHomeAction(entity, triggerAction) ? triggerAction : null;
};

function ButtonElement({ entity, element, label }: ElementProps) {
  const theme = useEntityTheme(entity);
  const { run, pending, done } = useRunner(entity);
  const error = useSmartHomeEntityError(entity.id);
  const failed = error?.kind === "failed";
  const open = useEntityDetailOpener(entity.id);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);
  const action = getButtonAction(entity);
  const onClick = action ? () => void run(action) : (open ?? undefined);
  return (
    <UnstyledButton
      className={classes.buttonElement}
      style={accentVars(theme.accent, theme.onAccent)}
      // A runnable entity has no lasting "on": an enabled flow is not lit up.
      data-active={theme.active && !triggerDomains.has(entity.domain)}
      data-pending={pending}
      data-done={done}
      data-failed={failed}
      disabled={disabled || !onClick}
      onClick={onClick}
      aria-label={label}
      title={failed ? error.message : undefined}
    >
      {/* What the tap did, in place of the icon: running, done for a moment, or failed (reason on hover). */}
      {pending ? (
        <IconLoader2 size="1.6em" stroke={1.8} className={`${classes.buttonIcon} ${classes.spinning}`} aria-hidden />
      ) : done ? (
        <IconCheck size="1.6em" stroke={2} className={classes.buttonIcon} aria-hidden />
      ) : failed ? (
        <IconAlertTriangle size="1.6em" stroke={1.8} className={classes.buttonIcon} aria-hidden />
      ) : (
        <ElementIcon name={element.icon} fallback={theme.Icon} size="1.6em" className={classes.buttonIcon} />
      )}
      {element.hideLabel ? null : <span className={classes.buttonLabel}>{label}</span>}
    </UnstyledButton>
  );
}

/**
 * A camera: its snapshot fills the element, and while the element is on screen a live view plays over it (see
 * `useCameraLive`). In the editor, and whenever the stream fails, the snapshot stays. A tap opens the details.
 */
function CameraElement({ entity, element, label, source }: ElementProps) {
  const t = useI18n("widget.smartHome-controls.camera");
  const editing = useSmartHomeInteractionBlock() === "editing";
  const open = useEntityDetailOpener(entity.id);
  const camera = useCameraLive({ integrationId: source, entity, enabled: element.live !== false && !editing });
  const snapshotImage = useLoadableImage(entity.attributes.snapshotUrl);
  const showsStatus = useShowsPart("status");
  const snapshot = snapshotImage.src;
  const connecting = camera.status === "connecting" || camera.status === "reconnecting";
  return (
    <UnstyledButton
      ref={camera.ref}
      className={classes.cameraElement}
      onClick={open ?? undefined}
      disabled={!open}
      aria-label={label}
    >
      {camera.frame ? (
        <img src={camera.frame} alt="" className={classes.cameraImage} draggable={false} />
      ) : snapshot ? (
        <img src={snapshot} alt="" className={classes.cameraImage} draggable={false} onError={snapshotImage.onError} />
      ) : connecting ? null : (
        <IconCameraOff size="2em" stroke={1.5} className={classes.cameraEmpty} aria-hidden />
      )}
      {camera.player}
      {connecting ? (
        <span className={classes.cameraLoading} aria-hidden>
          <IconLoader2 size="2em" stroke={1.8} className={classes.spinning} />
        </span>
      ) : null}
      <span className={classes.cameraBar}>
        {element.hideLabel ? null : <span className={classes.labelText}>{label}</span>}
        {!showsStatus || !camera.status ? null : (
          <span className={camera.status === "live" ? classes.cameraLive : classes.cameraRestarting}>
            {t(camera.status)}
          </span>
        )}
      </span>
    </UnstyledButton>
  );
}

function ChipElement({ entity }: ElementProps) {
  return (
    <div className={classes.chipElement}>
      <ReadingChip entity={entity} />
    </div>
  );
}

function RowElement({ entity, label }: ElementProps) {
  return <ReadingRow entity={entity} label={label} />;
}

// A typical reading such as "306,3 W" or "-65 RSSI".
const VALUE_REFERENCE_CHARS = 8;

interface ValueDisplayProps {
  label: ReactNode;
  value: string;
  color: string | undefined;
}

/** A label above a large number, or beside it when the element is flat. */
function ValueDisplay({ label, value, color }: ValueDisplayProps) {
  return (
    <div className={classes.valueElement}>
      {label}
      {/* The character count lets CSS fit the number to the element's width. Short values count as a typical
          reading, so elements of the same size show numbers of the same size; only longer values get smaller. */}
      <span
        className={classes.bigValue}
        style={{ "--value-chars": Math.max(VALUE_REFERENCE_CHARS, value.length), color } as CSSProperties}
      >
        {value}
      </span>
    </div>
  );
}

function ValueElement({ entity, element, label }: ElementProps) {
  const theme = useEntityTheme(entity);
  return (
    <ValueDisplay
      label={<ElementLabel element={element} fallback={theme.Icon} label={label} />}
      value={formatElementState(entity, element)}
      color={getRuleColor(entity.state, element.rules)}
    />
  );
}

/** One value over several entities; it subscribes to exactly those entities. */
function GroupElement(props: ElementProps) {
  // Each entity once, even when the list repeats the element's own entity.
  const ids = useMemo(
    () => [...new Set([props.entity.id, ...(props.element.entityIds ?? [])])],
    [props.entity.id, props.element.entityIds],
  );
  return (
    <SmartHomeEntitiesProvider entityIds={ids}>
      <GroupValue {...props} ids={ids} />
    </SmartHomeEntitiesProvider>
  );
}

function GroupValue({ entity, element, label, ids }: ElementProps & { ids: readonly string[] }) {
  const theme = useEntityTheme(entity);
  const map = useSmartHomeEntities();
  const entities = ids.flatMap((id) => map[id] ?? []);
  const aggregate = element.aggregate ?? "sum";
  const result = aggregateEntities(entities, aggregate);
  const value =
    aggregate === "on"
      ? `${result ?? 0} / ${entities.length}`
      : formatLayoutNumber(result, entity.unit, {
          ...element,
          decimals: element.decimals ?? (aggregate === "avg" ? 1 : undefined),
        });
  return (
    <ValueDisplay
      label={<ElementLabel element={element} fallback={theme.Icon} label={label} />}
      value={value}
      color={getRuleColor(result === null ? null : String(result), element.rules)}
    />
  );
}

// Several lines in one graph: the first follows the entity's color (often blue), the others these, which stand
// apart from it and from each other.
const SERIES_COLORS = ["orange", "teal", "pink", "violet", "yellow", "green"] as const;
const GRAPH_SAMPLES = 48;

function GraphElement(props: ElementProps) {
  const ids = useMemo(
    () => [...new Set([props.entity.id, ...(props.element.entityIds ?? [])])],
    [props.entity.id, props.element.entityIds],
  );
  return (
    <SmartHomeEntitiesProvider entityIds={ids}>
      <GraphView {...props} ids={ids} />
    </SmartHomeEntitiesProvider>
  );
}

const graphTimeFormat = (hours: number) =>
  new Intl.DateTimeFormat(
    undefined,
    hours > 24 ? { weekday: "short", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" },
  );

// The history an entity brings along covers the last day, evenly spaced.
const SHARED_HISTORY_HOURS = 24;

/** A line's current value from its entity, for the legend. */
const getCurrentValue = (entity: HaEntity | undefined) => {
  const value = entity ? Number.parseFloat(entity.state) : Number.NaN;
  return Number.isFinite(value) ? value : null;
};

/**
 * A history graph: the entity's line and any compared lines (see `HistoryGraph`), with a legend for several lines
 * and, if chosen, the lowest, average and highest value.
 */
function GraphView({ entity, element, label, source, ids }: ElementProps & { ids: readonly string[] }) {
  const theme = useEntityTheme(entity);
  const map = useSmartHomeEntities();
  const own = hasOwnGraphHistory(element);
  const hours = own ? (element.range ?? 24) : SHARED_HISTORY_HOURS;
  // A graph with its own window or several lines loads its history itself; the others use the shared day.
  const history = clientApi.widget.smartHome.history.useQuery(
    { integrationId: source ?? "", entityIds: [...ids], hours, samples: GRAPH_SAMPLES },
    { enabled: own && source !== null, staleTime: 300_000, refetchInterval: 300_000, refetchOnWindowFocus: false },
  );
  const color = getRuleColor(entity.state, element.rules);

  const lines = useMemo(
    () =>
      ids.map((id, index): HistoryGraphLine & { entity: HaEntity | undefined } => {
        const points = own ? (history.data?.find((entry) => entry.entityId === id)?.points ?? []) : null;
        const values = points ? points.map((point) => point.value) : index === 0 ? (entity.history ?? []) : [];
        const lineEntity = index === 0 ? entity : map[id];
        return {
          id,
          entity: lineEntity,
          values,
          times: points ? points.map((point) => point.time) : getHistoryTimes(values.length),
          unit: lineEntity?.unit ?? null,
          color:
            index === 0
              ? (color ?? theme.accent)
              : layoutColor(SERIES_COLORS[(index - 1) % SERIES_COLORS.length] ?? "orange"),
        };
      }),
    [ids, own, history.data, entity, map, color, theme.accent],
  );

  const primary = lines[0];
  const stats = getHistoryStats(primary?.values ?? []);
  const format = (line: HistoryGraphLine, value: number | null) =>
    formatLayoutNumber(value, line.unit ?? null, line.id === primary?.id ? element : {});
  const timeFormat = graphTimeFormat(hours);

  return (
    <div className={classes.graphElement}>
      <div className={classes.elementHead}>
        <ElementLabel element={element} fallback={theme.Icon} label={label} />
        <span className={classes.elementValue} style={{ color }}>
          {formatElementState(entity, element)}
        </span>
      </div>
      {lines.length > 1 ? (
        <HistoryLegend
          items={lines.map((line) => ({
            id: line.id,
            color: line.color,
            label: line === primary ? label : (line.entity?.device?.name ?? line.entity?.name ?? line.id),
            value: format(line, getCurrentValue(line.entity)),
          }))}
        />
      ) : null}
      <div className={classes.graphArea}>
        <HistoryGraph lines={lines} formatValue={format} formatTime={(time) => timeFormat.format(time)} />
      </div>
      {element.showMinMax && stats && primary ? (
        <div className={classes.graphRange}>
          <span>↓ {format(primary, stats.min)}</span>
          <span>Ø {format(primary, stats.average)}</span>
          <span>↑ {format(primary, stats.max)}</span>
        </div>
      ) : null}
    </div>
  );
}

function StatusElement({ entity, element, label }: ElementProps) {
  const theme = useEntityTheme(entity);
  return (
    <div
      className={classes.statusElement}
      style={accentVars(theme.accent, theme.onAccent)}
      data-active={theme.active}
      data-unavailable={theme.unavailable}
    >
      <ElementLabel element={element} fallback={theme.Icon} label={label} />
      <span className={classes.elementValue} style={{ color: getRuleColor(entity.state, element.rules) }}>
        {formatElementState(entity, element)}
      </span>
    </div>
  );
}

const LOW_BATTERY = 20;

function BatteryElement({ entity, element, label }: ElementProps) {
  const reported = entity.domain === "sensor" ? getNumericState(entity) : entity.attributes.batteryLevel;
  const level = reported !== undefined && reported !== null && Number.isFinite(reported) ? Math.round(reported) : null;
  const low = level !== null && level <= LOW_BATTERY;
  return (
    <div className={classes.statusElement} data-low={low}>
      <ElementLabel element={element} fallback={low ? IconBattery1 : IconBattery3} label={label} />
      <span className={classes.elementValue}>{level === null ? "—" : `${level}%`}</span>
    </div>
  );
}

function MissingElement({ element }: { element: SmartHomeLayoutElement }) {
  const t = useI18n("widget.smartHome-controls.layout");
  return (
    <div className={classes.statusElement} data-missing>
      <ElementLabel element={{}} fallback={IconQuestionMark} label={element.label ?? element.entityId} />
      <span className={classes.elementValue}>{t("missing")}</span>
    </div>
  );
}

/** Headings, dividers and spacers: they structure a card and need no entity. */
function StaticElement({ element }: { element: SmartHomeLayoutElement }) {
  if (element.view === "heading") {
    return (
      <div className={classes.headingElement} data-align={element.align ?? "start"}>
        {element.icon ? <SpriteIcon name={element.icon} size="1em" className={classes.labelIcon} /> : null}
        <span className={classes.labelText}>{element.label}</span>
      </div>
    );
  }
  if (element.view === "divider") return <hr className={classes.dividerElement} />;
  return null;
}

type EntityView = Exclude<SmartHomeLayoutElement["view"], "heading" | "divider" | "spacer">;

const views = {
  control: SliderElement,
  tile: TileElement,
  slider: BarSliderElement,
  pill: PillElement,
  button: ButtonElement,
  camera: CameraElement,
  value: ValueElement,
  group: GroupElement,
  chip: ChipElement,
  row: RowElement,
  graph: GraphElement,
  status: StatusElement,
  battery: BatteryElement,
} satisfies Record<EntityView, (props: ElementProps) => ReactNode>;

function EntityElement({ element, source }: { element: SmartHomeLayoutElement; source: string | null }) {
  const editing = useSmartHomeInteractionBlock() === "editing";
  const own = element.source === source;
  const entity = useSmartHomeEntity(own ? element.entityId : "");
  const conditionEntity = useSmartHomeEntity(own && element.condition?.entityId ? element.condition.entityId : "");
  if (!entity) return <MissingElement element={element} />;

  const condition = element.condition;
  const subject = condition?.entityId ? conditionEntity : entity;
  const shown = !condition || (subject !== undefined && compareState(subject.state, condition.op, condition.value));
  // Hidden elements stay visible (faded) in the editor so they can still be arranged.
  if (!shown && !editing) return null;

  const View = views[element.view as EntityView];
  const view = (
    <View entity={entity} element={element} label={element.label ?? getDeviceEntityLabel(entity)} source={source} />
  );
  const content = element.hide?.length ? (
    <HiddenPartsProvider value={new Set(element.hide)}>{view}</HiddenPartsProvider>
  ) : (
    view
  );
  const scoped = element.readOnly ? <ReadOnlyScope>{content}</ReadOnlyScope> : content;
  return shown ? scoped : <div className={classes.conditionHidden}>{scoped}</div>;
}

/** One element; it subscribes to its own entities, so a sensor update re-renders only this element. */
export function LayoutElement({ element, source }: { element: SmartHomeLayoutElement; source: string | null }) {
  if (staticElementViews.has(element.view)) return <StaticElement element={element} />;
  return <EntityElement element={element} source={source} />;
}

export const placementStyle = (placement: { x: number; y: number; w: number; h: number }): CSSProperties => ({
  gridColumn: `${placement.x + 1} / span ${placement.w}`,
  gridRow: `${placement.y + 1} / span ${placement.h}`,
});

// Stacked elements (card shown narrower than laid out) keep a readable row height instead of sharing the card.
const STACKED_ROW_HEIGHT = 30;

/** The card's own grid: one column per card column, one row per card row below the title. */
export const cardBodyStyle = (columns: number, rows: number | null): CSSProperties => ({
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  ...(rows === null ? { gridAutoRows: STACKED_ROW_HEIGHT } : { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }),
});

/** The card's accent as CSS: a thin colored line along its top edge. */
export const cardAccentStyle = (card: Pick<SmartHomeLayoutCard, "accent">): CSSProperties | undefined =>
  card.accent ? ({ "--card-accent": layoutColor(card.accent) } as CSSProperties) : undefined;

/** While the card's first entity is on, the card takes on its color. Only this layer re-renders for it. */
export function CardTint({ card, source }: { card: SmartHomeLayoutCard; source: string | null }) {
  const first = card.elements.find((element) => element.entityId && element.source === source);
  const entity = useSmartHomeEntity(first?.entityId ?? "");
  return entity ? <CardTintLayer entity={entity} /> : null;
}

function CardTintLayer({ entity }: { entity: HaEntity }) {
  const theme = useEntityTheme(entity);
  if (!theme.active) return null;
  return <div className={classes.cardTint} style={{ background: theme.accent }} aria-hidden />;
}

interface LayoutCardProps {
  card: SmartHomeLayoutCard;
  source: string | null;
  // Primitive coordinates rather than a style object keep `memo` effective.
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Cards only re-render when their stored configuration or position changes, never for live values. */
interface CardBodyProps {
  card: SmartHomeLayoutCard;
  source: string | null;
  placements: readonly GridPlacement[];
  columns: number;
  stacked: boolean;
  /** Rows (from 0) that shrink away because they hold only hidden elements. */
  collapsedRows?: ReadonlySet<number>;
}

function CardBody({ card, source, placements, columns, stacked, collapsedRows }: CardBodyProps) {
  const t = useI18n("widget.smartHome-controls.layout");
  const elements = useMemo(() => new Map(card.elements.map((element) => [element.id, element])), [card.elements]);
  const rows = stacked ? null : getCardInnerRows(card);
  const style = cardBodyStyle(columns, rows);
  if (rows !== null && collapsedRows?.size) {
    style.gridTemplateRows = Array.from({ length: rows }, (_, row) =>
      collapsedRows.has(row) ? "minmax(0, 0fr)" : "minmax(0, 1fr)",
    ).join(" ");
  }
  return (
    <div className={classes.cardBody} style={style} data-stacked={stacked}>
      {placements.map((placement) => {
        const element = elements.get(placement.id);
        // An element stored below the card's last row (an old or hand-written layout) is shown in the last rows.
        const top = rows === null ? placement.y : Math.min(placement.y, rows - 1);
        const shown = rows === null ? placement : { ...placement, y: top, h: Math.min(placement.h, rows - top) };
        return element ? (
          <div key={element.id} className={classes.elementCell} style={placementStyle(shown)}>
            <LayoutElement element={element} source={source} />
          </div>
        ) : null;
      })}
      {card.elements.length === 0 && <span className={classes.emptyCard}>{t("emptyCard")}</span>}
    </div>
  );
}

/**
 * The body of a card with elements that free their space while hidden. Only this part watches the entities those
 * conditions read, so the rest of the card still never re-renders for live values.
 */
function CollapsingCardBody(props: CardBodyProps & { collapsible: readonly SmartHomeLayoutElement[] }) {
  const { collapsible, placements, ...rest } = props;
  const entities = useSmartHomeEntities();
  const editing = useSmartHomeInteractionBlock() === "editing";
  const collapsedRows = useMemo(() => {
    // In the editor nothing collapses, so hidden elements can still be arranged.
    if (editing) return new Set<number>();
    const hidden = new Set(
      collapsible
        .filter((element) => {
          const condition = element.condition;
          if (!condition) return false;
          const subject = entities[condition.entityId ?? element.entityId];
          return !subject || !compareState(subject.state, condition.op, condition.value);
        })
        .map((element) => element.id),
    );
    const rows = new Set<number>();
    for (let row = 0; row < getCardInnerRows(props.card); row++) {
      const inRow = placements.filter((placement) => placement.y <= row && row < placement.y + placement.h);
      if (inRow.length > 0 && inRow.every((placement) => hidden.has(placement.id))) rows.add(row);
    }
    return rows;
  }, [collapsible, entities, editing, placements, props.card]);
  return <CardBody {...rest} placements={placements} collapsedRows={collapsedRows} />;
}

const LayoutCard = memo(function LayoutCard({ card, source, x, y, w, h }: LayoutCardProps) {
  // A card laid out wider than it is shown (narrow widget) stacks its elements instead of squeezing them.
  const stacked = w !== card.w;
  const placements = useMemo(
    () => (stacked ? stackElementPlacements(card, w) : getElementPlacements(card)),
    [card, stacked, w],
  );
  const collapsible = useMemo(
    () => card.elements.filter((element) => element.condition?.collapse && element.source === source),
    [card.elements, source],
  );
  const watched = useMemo(
    () => [...new Set(collapsible.map((element) => element.condition?.entityId ?? element.entityId))],
    [collapsible],
  );
  const bodyProps = { card, source, placements, columns: w, stacked };
  const body =
    collapsible.length > 0 && !stacked ? (
      <SmartHomeEntitiesProvider entityIds={watched}>
        <CollapsingCardBody {...bodyProps} collapsible={collapsible} />
      </SmartHomeEntitiesProvider>
    ) : (
      <CardBody {...bodyProps} />
    );
  return (
    <section
      className={`${controlClasses.device} ${classes.card}`}
      style={{ ...placementStyle({ x, y, w, h }), ...cardAccentStyle(card) }}
      data-accent={card.accent !== undefined}
      aria-label={card.title}
    >
      {card.tint ? <CardTint card={card} source={source} /> : null}
      {card.title ? <h4 className={classes.cardTitle}>{card.title}</h4> : null}
      {card.readOnly ? <ReadOnlyScope>{body}</ReadOnlyScope> : body}
    </section>
  );
});

/** Below this width a layout with its own narrow arrangement uses that one. */
export const NARROW_WIDGET_WIDTH = 400;

/** The cards a widget of this width shows: the narrow arrangement when there is one and the widget is narrow. */
export const getShownCards = (layout: SmartHomeLayout, width: number) =>
  width < NARROW_WIDGET_WIDTH && layout.narrowCards?.length ? layout.narrowCards : layout.cards;

interface CustomLayoutViewProps {
  layout: SmartHomeLayout;
  source: string | null;
  width: number;
}

/** The dashboard view of a custom layout: plain CSS grid, no drag handlers, no editor code. */
export function CustomLayoutView({ layout, source, width }: CustomLayoutViewProps) {
  const t = useI18n("widget.smartHome-controls.layout");
  const editing = useSmartHomeInteractionBlock() === "editing";
  const shownCards = getShownCards(layout, width);
  // A narrow arrangement is made for this width, so it keeps all 12 columns instead of stacking.
  const columns = shownCards === layout.cards ? getLayoutColumns(width) : SMART_HOME_LAYOUT_COLUMNS;
  // Depends only on the stored layout and the column count, so live updates never recompute placements.
  const placements = useMemo(() => deriveLayout(shownCards, columns, width), [shownCards, columns, width]);
  const cards = useMemo(() => new Map(shownCards.map((card) => [card.id, card])), [shownCards]);
  const stacked = columns < SMART_HOME_LAYOUT_COLUMNS;

  if (shownCards.length === 0) {
    return <div className={classes.emptyLayout}>{t(editing ? "emptyEditing" : "empty")}</div>;
  }

  return (
    <div
      className={classes.grid}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        // The layout always fills the widget: its rows share the widget's height. Only a narrow widget, where cards
        // stack and the row count grows, keeps fixed rows and scrolls instead of squeezing them.
        ...(stacked
          ? { gridAutoRows: LAYOUT_ROW_HEIGHT }
          : { gridTemplateRows: `repeat(${SMART_HOME_LAYOUT_ROWS}, minmax(0, 1fr))` }),
        gap: LAYOUT_GAP,
      }}
    >
      {placements.map((placement) => {
        const card = cards.get(placement.id);
        return card ? (
          <LayoutCard
            key={card.id}
            card={card}
            source={source}
            x={placement.x}
            y={placement.y}
            w={placement.w}
            h={placement.h}
          />
        ) : null;
      })}
    </div>
  );
}

export default CustomLayoutView;
