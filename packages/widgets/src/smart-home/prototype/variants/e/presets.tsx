"use client";

import { useState } from "react";
import { useElementSize } from "@mantine/hooks";
import type { CSSProperties, ReactNode } from "react";
import {
  IconBolt,
  IconBulb,
  IconCheck,
  IconCloud,
  IconLock,
  IconLockOpen,
  IconLockPassword,
  IconShieldCheck,
  IconShieldLock,
  IconThermometer,
} from "@tabler/icons-react";

import {
  areaIcons,
  formatEntityState,
  formatNumber,
  getArea,
  getEntityIcon,
  getHomeSummary,
  getPresetEntities,
  getStateColor,
  isUnavailable,
  requiresConfirmation,
} from "../../semantics";
import type { HomeSummary } from "../../semantics";
import { usePrototypeAction, usePrototypeEntities } from "../../store";
import type { HaEntity } from "../../types";
import { gateNotice, isGateBlocked, runCodeGate } from "./capabilities";
import { HoldButton, PillSlider, Sparkline } from "./controls";
import { EntityControl } from "./entity-controls";
import { clamp, Measured, useCodeGate, useDeviceControlDisabled, useRunner } from "./hooks";
import classes from "./styles.module.css";
import { accentVars, Empty, getTheme } from "./theme";

interface PresetProps {
  width: number;
  height: number;
}

const colorVar = (name: string) => `var(--mantine-color-${name}-filled)`;

const MINI_LOCK_SIZE = 44;
const STAT_PADDING = 12;
const SECURITY_LOCKS_MIN_HEIGHT = 128;

function PeopleTile({ summary, compact }: { summary: HomeSummary; compact: boolean }) {
  const home = summary.peopleHome.length;
  return (
    <div className={classes.stat} style={accentVars(colorVar("green"), "#fff")} data-compact={compact}>
      <div className={classes.avatarStack}>
        {summary.people.map((person) => (
          <span
            key={person.id}
            className={classes.avatar}
            style={{ width: 32, height: 32, fontSize: 13 }}
            data-home={person.state === "home"}
            title={`${person.name}: ${formatEntityState(person)}`}
          >
            {person.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      <div className={classes.headText}>
        <span className={classes.statValue}>
          {home}/{summary.people.length}
        </span>
        <span className={classes.state}>{home === 1 ? "person home" : "people home"}</span>
      </div>
    </div>
  );
}

function LightsTile({
  summary,
  entities,
  variant,
}: {
  summary: HomeSummary;
  entities: HaEntity[];
  variant: "tile" | "tall";
}) {
  const act = usePrototypeAction();
  const lights = entities.filter((entity) => entity.domain === "light" && !isUnavailable(entity));
  const on = lights.filter((entity) => entity.state === "on");
  const average = on.length
    ? Math.round(on.reduce((total, light) => total + (light.attributes.brightness ?? 100), 0) / on.length)
    : 0;
  const [busy, setBusy] = useState(false);

  const setAll = async (value: number) => {
    setBusy(true);
    await Promise.all(lights.map((light) => act(light.id, { type: "setBrightness", value })));
    setBusy(false);
  };

  const toggleAll = () => void setAll(on.length > 0 ? 0 : 80);

  return (
    <div className={classes.lightsTile} data-variant={variant} style={accentVars(colorVar("yellow"), "#17181c")}>
      <PillSlider
        axis="vertical"
        value={average}
        label="All lights brightness"
        valueText={(value) => `${summary.lightsOn} of ${summary.lightsTotal} lights on, ${value}%`}
        pending={busy}
        onCommit={(value) => void setAll(value)}
        onTap={toggleAll}
        className={classes.fillSlider}
        renderFooter={() => (
          <span className={classes.miniText}>
            <span className={classes.statValue}>
              {summary.lightsOn}/{summary.lightsTotal}
            </span>
            <span className={classes.state}>lights on</span>
          </span>
        )}
      >
        {() => (
          <div className={classes.miniOverlay}>
            <span className={classes.miniIcon} data-pending={busy}>
              <IconBulb size={18} stroke={1.8} />
            </span>
          </div>
        )}
      </PillSlider>
    </div>
  );
}

function SecurityTile({
  summary,
  entities,
  compact,
}: {
  summary: HomeSummary;
  entities: HaEntity[];
  compact: boolean;
}) {
  const { ref, width, height } = useElementSize();
  const locks = entities.filter((entity) => entity.domain === "lock");
  const lockRoom = height >= SECURITY_LOCKS_MIN_HEIGHT && !compact;
  const lockSlots = lockRoom ? Math.max(0, Math.floor((width - STAT_PADDING * 2 - 32) / (MINI_LOCK_SIZE + 8))) : 0;
  const attention = summary.unlocked.length + summary.openings.length;
  const alarm = summary.alarm;
  const color = attention > 0 ? "orange" : "green";
  const label = attention > 0 ? `${attention} need${attention === 1 ? "s" : ""} attention` : "All secure";
  const AlarmIcon = alarm && alarm.state !== "disarmed" ? IconShieldCheck : IconShieldLock;

  return (
    <div
      ref={ref}
      className={classes.stat}
      style={accentVars(colorVar(color), "#fff")}
      data-compact={compact}
      data-tinted
    >
      <div className={classes.securityRow}>
        <span className={classes.miniIconStatic} data-active>
          <AlarmIcon size={18} stroke={1.8} />
        </span>
        {locks.slice(0, lockSlots).map((lock) => (
          <MiniLock key={lock.id} lock={lock} />
        ))}
      </div>
      <div className={classes.headText}>
        <span className={classes.statValue}>{label}</span>
        <span className={classes.state}>{alarm ? formatEntityState(alarm) : "No alarm"}</span>
      </div>
    </div>
  );
}

const getLockIcon = (locked: boolean, coded: boolean) => {
  if (coded) return IconLockPassword;
  if (locked) return IconLock;
  return IconLockOpen;
};

function MiniLock({ lock }: { lock: HaEntity }) {
  const { run, pending } = useRunner(lock);
  const locked = lock.state === "locked";
  const action = locked ? ({ type: "unlock" } as const) : ({ type: "lock" } as const);
  const hold = requiresConfirmation(lock, action);
  const theme = getTheme(lock);
  const gate = useCodeGate(lock)(action);
  const coded = gate.kind !== "run";
  const Icon = getLockIcon(locked, coded);
  let verb = locked ? "Unlock" : "Lock";
  if (hold && !coded) verb = "Hold to unlock";
  const label = [`${verb} ${lock.name}`, gateNotice(gate, "control this lock")].filter(Boolean).join(": ");

  return (
    <span style={accentVars(theme.accent, theme.onAccent)}>
      <HoldButton
        label={label}
        hold={hold && !coded}
        size={MINI_LOCK_SIZE}
        active
        pending={pending}
        disabled={theme.unavailable || lock.readOnly || isGateBlocked(gate)}
        onConfirm={() => runCodeGate(gate, run)}
      >
        <Icon size={17} stroke={2} />
      </HoldButton>
    </span>
  );
}

function TemperatureTile({ summary, compact }: { summary: HomeSummary; compact: boolean }) {
  const inside = summary.insideTemperature;
  const outside = summary.outsideTemperature;
  return (
    <div className={classes.stat} style={accentVars(colorVar("orange"), "#17181c")} data-compact={compact}>
      <span className={classes.miniIconStatic} data-active>
        <IconThermometer size={18} stroke={1.8} />
      </span>
      <div className={classes.headText}>
        <span className={classes.statValue}>{inside === null ? "--" : `${formatNumber(inside)}°`}</span>
        <span className={classes.state}>{outside === null ? "Inside" : `Inside · ${formatNumber(outside)}° out`}</span>
      </div>
    </div>
  );
}

function EnergyTile({ summary, compact }: { summary: HomeSummary; compact: boolean }) {
  const energy = summary.energyToday;
  return (
    <div className={classes.stat} style={accentVars(colorVar("teal"), "#17181c")} data-compact={compact}>
      {energy?.history ? <Sparkline values={energy.history} color={colorVar("teal")} /> : null}
      <span className={classes.miniIconStatic} data-active>
        <IconBolt size={18} stroke={1.8} />
      </span>
      <div className={classes.headText}>
        <span className={classes.statValue}>{energy ? formatEntityState(energy) : "--"}</span>
        <span className={classes.state}>Energy today</span>
      </div>
    </div>
  );
}

function WeatherTile({ summary, compact }: { summary: HomeSummary; compact: boolean }) {
  const weather = summary.weather;
  const Icon = weather ? getEntityIcon(weather) : IconCloud;
  return (
    <div className={classes.stat} style={accentVars(colorVar("blue"), "#fff")} data-compact={compact}>
      <span className={classes.miniIconStatic} data-active>
        <Icon size={18} stroke={1.8} />
      </span>
      <div className={classes.headText}>
        <span className={classes.statValue}>
          {weather ? `${formatNumber(weather.attributes.currentTemperature ?? 0)}°` : "--"}
        </span>
        <span className={classes.state}>
          {weather
            ? weather.state.replace(/([a-z])([a-z]*)/, (_, a: string, b: string) => `${a.toUpperCase()}${b}`)
            : "Weather"}
        </span>
      </div>
    </div>
  );
}

const findClimate = (entities: HaEntity[]) => {
  const climates = entities.filter((entity) => entity.domain === "climate" && !isUnavailable(entity));
  return climates.find((entity) => entity.state !== "off") ?? climates[0];
};

const findNow = (summary: HomeSummary, entities: HaEntity[]) =>
  summary.playing[0] ?? summary.weather ?? entities.find((entity) => entity.domain === "media_player");

function ClimateModule({ entities }: { entities: HaEntity[] }) {
  const climate = findClimate(entities);
  if (!climate) return null;
  return <Measured>{(width, height) => <EntityControl entity={climate} width={width} height={height} />}</Measured>;
}

function NowModule({ summary, entities }: { summary: HomeSummary; entities: HaEntity[] }) {
  const entity = findNow(summary, entities);
  if (!entity) return null;
  return <Measured>{(width, height) => <EntityControl entity={entity} width={width} height={height} />}</Measured>;
}

export function OverviewPreset({ width, height }: PresetProps) {
  const entities = usePrototypeEntities();
  const summary = getHomeSummary(entities);
  const list = Object.values(entities);
  const locks = list.filter((entity) => entity.domain === "lock");
  const hasLights = list.some((entity) => entity.domain === "light" && !isUnavailable(entity));
  const hasSecurity = summary.alarm !== undefined || locks.length > 0 || summary.openings.length > 0;
  const hasPeople = summary.people.length > 0;
  const hasTemperature = summary.insideTemperature !== null;
  const rich =
    hasLights && hasPeople && hasSecurity && findClimate(list) !== undefined && findNow(summary, list) !== undefined;

  if (list.length === 0) {
    return <Empty title="No entities selected" hint="Choose rooms or entities in the widget options." />;
  }

  if (rich && hasTemperature && summary.energyToday && width >= 640 && height >= 200 && height < 340) {
    return (
      <div className={classes.bentoWide}>
        <div className={classes.cell} style={{ flex: "1.1 1 0" }}>
          <div className={classes.stackCell}>
            <PeopleTile summary={summary} compact={false} />
            <TemperatureTile summary={summary} compact={false} />
          </div>
        </div>
        <div className={classes.cell} style={{ flex: "0.8 1 0" }}>
          <LightsTile summary={summary} entities={list} variant="tall" />
        </div>
        <div className={classes.cell} style={{ flex: "1.25 1 0" }}>
          <ClimateModule entities={list} />
        </div>
        <div className={classes.cell} style={{ flex: "1.9 1 0" }}>
          <NowModule summary={summary} entities={list} />
        </div>
        <div className={classes.cell} style={{ flex: "1.15 1 0" }}>
          <div className={classes.stackCell}>
            <SecurityTile summary={summary} entities={list} compact={false} />
            <EnergyTile summary={summary} compact={false} />
          </div>
        </div>
      </div>
    );
  }

  if (rich && width >= 480 && height >= 300) {
    return (
      <div className={classes.bentoBig}>
        <div style={{ gridArea: "people" }} className={classes.cell}>
          <PeopleTile summary={summary} compact={false} />
        </div>
        <div style={{ gridArea: "lights" }} className={classes.cell}>
          <LightsTile summary={summary} entities={list} variant="tall" />
        </div>
        <div style={{ gridArea: "climate" }} className={classes.cell}>
          <ClimateModule entities={list} />
        </div>
        <div style={{ gridArea: "security" }} className={classes.cell}>
          <SecurityTile summary={summary} entities={list} compact={false} />
        </div>
        <div style={{ gridArea: "media" }} className={classes.cell}>
          <NowModule summary={summary} entities={list} />
        </div>
      </div>
    );
  }

  const columns = clamp(Math.floor((width + 8) / 100), 2, 6);
  const rows = clamp(Math.floor((height + 8) / 100), 1, 4);
  const tiles: { key: string; show: boolean; node: ReactNode }[] = [
    { key: "lights", show: hasLights, node: <LightsTile summary={summary} entities={list} variant="tile" /> },
    { key: "people", show: hasPeople, node: <PeopleTile summary={summary} compact /> },
    { key: "security", show: hasSecurity, node: <SecurityTile summary={summary} entities={list} compact /> },
    { key: "temp", show: hasTemperature, node: <TemperatureTile summary={summary} compact /> },
    { key: "energy", show: summary.energyToday !== undefined, node: <EnergyTile summary={summary} compact /> },
    { key: "weather", show: summary.weather !== undefined, node: <WeatherTile summary={summary} compact /> },
  ];
  const visible = tiles.filter((tile) => tile.show).slice(0, columns * rows);

  if (visible.length === 0) {
    return <Empty title="Nothing to summarise" hint="The selection has no lights, people, security or climate data." />;
  }
  const usedRows = Math.ceil(visible.length / columns);

  return (
    <div
      className={classes.statGrid}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${usedRows}, minmax(0, 1fr))`,
      }}
    >
      {visible.map((tile) => (
        <div key={tile.key} className={classes.cell}>
          {tile.node}
        </div>
      ))}
    </div>
  );
}

const domainPriority = [
  "climate",
  "media_player",
  "light",
  "cover",
  "lock",
  "alarm_control_panel",
  "camera",
  "fan",
  "humidifier",
  "vacuum",
  "switch",
  "valve",
  "input_boolean",
  "scene",
  "script",
  "automation",
  "button",
];

const bigDomains = new Set(["climate", "media_player"]);

const priorityOf = (entity: HaEntity) => {
  const index = domainPriority.indexOf(entity.domain);
  return index === -1 ? domainPriority.length : index;
};

export function AreaPreset({ width, height, areaId }: PresetProps & { areaId: string }) {
  const entities = usePrototypeEntities();
  const area = getArea(areaId);
  const all = getPresetEntities(entities, "area", areaId, "");
  const AreaIcon = areaIcons[areaId] ?? IconCloud;
  const temperature = area?.temperatureEntityId ? entities[area.temperatureEntityId] : undefined;
  const humidity = area?.humidityEntityId ? entities[area.humidityEntityId] : undefined;
  const controls = all
    .filter((entity) => !["sensor", "binary_sensor", "person", "sun", "update", "weather"].includes(entity.domain))
    .toSorted((a, b) => priorityOf(a) - priorityOf(b));
  const alerts = all.filter(
    (entity) => entity.domain === "binary_sensor" && getStateColor(entity) !== "gray" && entity.state === "on",
  );
  const info = all.filter(
    (entity) => entity.domain === "sensor" && entity.id !== temperature?.id && entity.id !== humidity?.id,
  );

  const chips = [temperature, humidity].filter((entity) => entity !== undefined).length + alerts.length;

  if (controls.length === 0 && chips === 0 && info.length === 0) {
    return (
      <Empty
        title={area ? `Nothing selected in ${area.name}` : "Area not available"}
        hint={area ? "Add entities from this area in the widget options." : "Pick an area in the widget options."}
      />
    );
  }

  const columns = clamp(Math.floor((width - 16 + 8) / 112), 2, 6);
  const available = height - 52 - 16;
  const rows = Math.max(1, Math.floor((available + 8) / 92));
  const rowHeight = clamp((available - 8 * (rows - 1)) / rows, 84, 200);
  const heroId = rows >= 3 && columns >= 3 ? controls.find((entity) => bigDomains.has(entity.domain))?.id : undefined;

  return (
    <div className={classes.areaRoot}>
      <div className={classes.areaHeader}>
        <span className={classes.areaIcon}>
          <AreaIcon size={18} stroke={1.8} />
        </span>
        <span className={classes.areaName}>{area?.name ?? areaId}</span>
        <div className={classes.areaChips}>
          {temperature ? <span className={classes.pillChip}>{formatEntityState(temperature)}</span> : null}
          {humidity ? <span className={classes.pillChip}>{formatEntityState(humidity)}</span> : null}
          {width >= 400
            ? info.slice(0, 2).map((entity) => (
                <span key={entity.id} className={classes.pillChip}>
                  {formatEntityState(entity)}
                </span>
              ))
            : null}
          {alerts.map((entity) => (
            <span key={entity.id} className={classes.pillChip} data-alert>
              {entity.name}
            </span>
          ))}
        </div>
      </div>
      {controls.length === 0 ? <Empty title="No controls" hint="Only sensors are selected for this area." /> : null}
      {controls.length > 0 ? (
        <div
          className={classes.areaGrid}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${rowHeight}px` }}
        >
          {controls.map((entity) => {
            const span: CSSProperties = bigDomains.has(entity.domain)
              ? { gridColumn: `span ${Math.min(2, columns)}`, gridRow: entity.id === heroId ? "span 2" : undefined }
              : {};
            return (
              <div key={entity.id} className={classes.cell} style={span}>
                <Measured>{(w, h) => <EntityControl entity={entity} width={w} height={h} />}</Measured>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LaunchButton({ entity }: { entity: HaEntity }) {
  const { run, pending, done } = useRunner(entity);
  const theme = getTheme(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly);
  const Icon = theme.Icon;
  const automation = entity.domain === "automation";
  const active = automation ? entity.state === "on" : false;
  const state = formatEntityState(entity);
  const action = automation ? ({ type: "toggle" } as const) : ({ type: "trigger" } as const);
  const accent = automation ? theme.accent : colorVar("violet");

  return (
    <button
      type="button"
      className={classes.launch}
      style={accentVars(done ? colorVar("green") : accent, "#fff")}
      data-done={done}
      data-pending={pending}
      data-active={active}
      disabled={disabled}
      aria-label={`${automation ? "Toggle" : "Run"} ${entity.name}`}
      onClick={() => void run(action)}
    >
      <span className={classes.launchCircle}>
        {done ? <IconCheck size={24} stroke={2.4} /> : <Icon size={24} stroke={1.7} />}
      </span>
      <span className={classes.launchName}>{entity.name}</span>
      <span className={classes.launchState}>{done ? "Done" : state}</span>
    </button>
  );
}

export function ActionsPreset({ width, height }: PresetProps) {
  const entities = usePrototypeEntities();
  const list = getPresetEntities(entities, "actions", "", "").toSorted((a, b) => {
    const order = ["scene", "script", "button", "automation"];
    return order.indexOf(a.domain) - order.indexOf(b.domain);
  });
  const strip = height < 150 || width / height > 2.2;

  if (list.length === 0) {
    return <Empty title="No actions selected" hint="Add scenes, scripts, buttons or automations." />;
  }

  return (
    <div className={classes.launchRoot} data-strip={strip}>
      {list.map((entity) => (
        <LaunchButton key={entity.id} entity={entity} />
      ))}
    </div>
  );
}

const isReadableSensor = (entity: HaEntity) => entity.domain === "sensor" && !Number.isNaN(Number(entity.state));

export function SensorsPreset({ width, height }: PresetProps) {
  const entities = usePrototypeEntities();
  const curated = getPresetEntities(entities, "sensors", "", "");
  const list = curated.length > 0 ? curated : Object.values(entities).filter(isReadableSensor);

  if (list.length === 0) {
    return <Empty title="No sensors selected" hint="Add numeric sensors in the widget options." />;
  }

  const columns = clamp(Math.floor((width + 8) / 170), 1, 4);
  const rows = Math.ceil(list.length / columns);
  const tileHeight = (height - 16 - 8 * (rows - 1)) / rows;

  return (
    <div
      className={classes.sensorGrid}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: `${Math.max(tileHeight, 72)}px`,
      }}
    >
      {list.map((entity) => (
        <div key={entity.id} className={classes.cell}>
          <Measured>{(w, h) => <EntityControl entity={entity} width={w} height={h} />}</Measured>
        </div>
      ))}
    </div>
  );
}
