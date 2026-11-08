"use client";

import {
  IconAlertTriangle,
  IconBolt,
  IconBulb,
  IconDeviceTv,
  IconDoorExit,
  IconDroplet,
  IconHome,
  IconTemperature,
  IconUsers,
  IconWand,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { TablerIcon } from "@homarr/ui";

import {
  areaIcons,
  formatEntityState,
  formatNumber,
  getArea,
  getEntityIcon,
  getHomeSummary,
  getPresetEntities,
  isUnavailable,
} from "../../semantics";
import { usePrototypeEntities } from "../../store";
import type { HaEntity, PrototypeVariantProps } from "../../types";
import { EntityDetail } from "./detail";
import { getEntityTier, getLevel, getOverviewTier } from "./layout";
import type { ChipDef } from "./list";
import { ListShell } from "./list";
import type { Section } from "./meta";
import { domainTitles, getColorVars, groupByDomain, isOn, isPassive, isSensorLike } from "./meta";
import { ControlListRoot } from "./root";
import { EntityRow } from "./row";
import classes from "./styles.module.css";
import { EntityTile, StatCells } from "./tile";

export const variantCName = "Control list";

interface PanelProps {
  entities: HaEntity[];
  width: number;
  height: number;
}

const unique = (entities: HaEntity[]) => Array.from(new Map(entities.map((entity) => [entity.id, entity])).values());

function Meta({ items }: { items: { icon: TablerIcon; label: string }[] }) {
  return (
    <>
      {items.map(({ icon: Icon, label }) => (
        <span key={label}>
          <Icon size={13} />
          {label}
        </span>
      ))}
    </>
  );
}

const useFilter = () => useState<string | null>(null);

function OverviewPanel({ entities, width, height }: PanelProps) {
  const [filter, setFilter] = useFilter();
  const byId = useMemo(() => Object.fromEntries(entities.map((entity) => [entity.id, entity])), [entities]);
  const summary = getHomeSummary(byId);
  const lights = entities.filter((entity) => entity.domain === "light");
  const media = entities.filter((entity) => entity.domain === "media_player");
  const open = [...summary.openings, ...summary.unlocked];
  const attention = unique([...summary.alerts, ...open]);

  const groups: Record<string, HaEntity[]> = {
    lights,
    people: summary.people,
    open,
    alerts: summary.alerts,
    media,
  };

  const chips: ChipDef[] = [
    { key: "lights", label: "lights on", count: summary.lightsOn, color: "yellow", icon: IconBulb },
    { key: "people", label: "home", count: summary.peopleHome.length, color: "green", icon: IconUsers },
    { key: "open", label: "open", count: open.length, color: "orange", icon: IconDoorExit },
    { key: "alerts", label: "alerts", count: summary.alerts.length, color: "red", icon: IconAlertTriangle },
    { key: "media", label: "playing", count: summary.playing.length, color: "grape", icon: IconDeviceTv },
  ];

  const tier = getOverviewTier(width, height);

  if (tier !== "list") {
    const cells = (tier === "tile" ? chips.filter((chip) => chip.key !== "media") : chips).map((chip) => ({
      chip,
      entities: groups[chip.key] ?? [],
    }));
    return (
      <div className={classes.stats} data-tier={tier}>
        {tier === "strip" && (
          <div className={classes.statsTitle}>
            <IconHome size={15} />
            <b>Home</b>
            <div className={classes.meta}>
              <Meta
                items={[
                  ...(summary.insideTemperature === null
                    ? []
                    : [{ icon: IconTemperature, label: `${formatNumber(summary.insideTemperature)}° in` }]),
                  ...(summary.outsideTemperature === null
                    ? []
                    : [{ icon: IconTemperature, label: `${formatNumber(summary.outsideTemperature)}° out` }]),
                ]}
              />
            </div>
          </div>
        )}
        <StatCells cells={cells} layout={tier === "tile" ? "grid" : "row"} />
      </div>
    );
  }

  const placed = new Set<string>();
  const section = (key: string, title: string, list: HaEntity[]): Section => {
    const fresh = list.filter((entity) => !placed.has(entity.id));
    fresh.forEach((entity) => placed.add(entity.id));
    return { key, title, entities: fresh };
  };

  let sections: Section[] = [];
  const active = filter ? groups[filter] : undefined;
  if (active) {
    const areaIds = unique(active).map((entity) => entity.areaId);
    sections = Array.from(new Set(areaIds)).map((areaId) => ({
      key: areaId ?? "home",
      title: getArea(areaId)?.name ?? "Home",
      entities: active.filter((entity) => entity.areaId === areaId),
    }));
  } else {
    sections = [
      section("attention", "Needs attention", attention),
      section("people", "People", summary.people),
      section("security", "Security", [
        ...entities.filter((entity) => entity.domain === "alarm_control_panel"),
        ...entities.filter((entity) => entity.domain === "lock"),
      ]),
      section(
        "lights",
        "Lights on",
        lights.filter((entity) => entity.state === "on"),
      ),
      section("media", "Playing", summary.playing),
      section(
        "climate",
        "Climate",
        entities.filter((entity) => entity.domain === "climate"),
      ),
      section(
        "now",
        "Now",
        [summary.weather, summary.energyToday].flatMap((entity) => (entity ? [entity] : [])),
      ),
    ];
  }

  const WeatherIcon = summary.weather ? getEntityIcon(summary.weather) : IconTemperature;
  const meta = [
    ...(summary.insideTemperature === null
      ? []
      : [{ icon: IconTemperature, label: `${formatNumber(summary.insideTemperature)}° in` }]),
    ...(summary.outsideTemperature === null
      ? []
      : [{ icon: WeatherIcon, label: `${formatNumber(summary.outsideTemperature)}° out` }]),
    ...(summary.energyToday ? [{ icon: IconBolt, label: formatEntityState(summary.energyToday) }] : []),
  ];

  return (
    <ListShell
      title="Home"
      icon={IconHome}
      meta={<Meta items={meta} />}
      chips={chips}
      filter={filter}
      onFilter={setFilter}
      height={height}
      sections={sections}
      width={width}
      showArea
      emptyLabel="Nothing active right now"
    />
  );
}

function AreaPanel({ entities, width, height }: PanelProps & { areaId: string }) {
  const [filter, setFilter] = useFilter();
  const all = usePrototypeEntities();
  const areaId = entities[0]?.areaId ?? "";
  const area = getArea(areaId);
  const temperature = area?.temperatureEntityId ? all[area.temperatureEntityId] : undefined;
  const humidity = area?.humidityEntityId ? all[area.humidityEntityId] : undefined;

  const groups: Record<string, HaEntity[]> = {
    on: entities.filter(isOn),
    off: entities.filter((entity) => !isPassive(entity) && !isOn(entity) && !isUnavailable(entity)),
    sensors: entities.filter(isSensorLike),
    offline: entities.filter(isUnavailable),
  };

  const chips: ChipDef[] = [
    { key: "on", label: "on", count: groups.on?.length ?? 0, color: "yellow" },
    { key: "off", label: "off", count: groups.off?.length ?? 0, color: "gray" },
    { key: "sensors", label: "sensors", count: groups.sensors?.length ?? 0, color: "blue" },
  ];
  if ((groups.offline?.length ?? 0) > 0) {
    chips.push({ key: "offline", label: "offline", count: groups.offline?.length ?? 0, color: "red" });
  }

  const visible = filter ? (groups[filter] ?? entities) : entities;
  const meta = [
    ...(temperature ? [{ icon: IconTemperature, label: formatEntityState(temperature) }] : []),
    ...(humidity ? [{ icon: IconDroplet, label: formatEntityState(humidity) }] : []),
  ];

  return (
    <ListShell
      title={area?.name ?? "Area"}
      icon={areaIcons[areaId] ?? IconHome}
      meta={<Meta items={meta} />}
      chips={chips}
      filter={filter}
      onFilter={setFilter}
      height={height}
      sections={groupByDomain(visible)}
      width={width}
    />
  );
}

function ActionsPanel({ entities, width, height }: PanelProps) {
  const [filter, setFilter] = useFilter();
  const domains = ["scene", "script", "automation", "button"] as const;
  const chips: ChipDef[] = domains.map((domain) => ({
    key: domain,
    label: domainTitles[domain].toLowerCase(),
    count: entities.filter((entity) => entity.domain === domain).length,
    color: domain === "automation" ? "yellow" : "violet",
  }));
  const visible = filter ? entities.filter((entity) => entity.domain === filter) : entities;

  return (
    <ListShell
      title="Quick actions"
      icon={IconWand}
      meta={<Meta items={[{ icon: IconWand, label: `${entities.length} total` }]} />}
      chips={chips}
      filter={filter}
      onFilter={setFilter}
      height={height}
      sections={groupByDomain(visible)}
      width={width}
    />
  );
}

const sensorGroups: Record<string, { label: string; match: (entity: HaEntity) => boolean; color: string }> = {
  climate: {
    label: "climate",
    color: "blue",
    match: (entity) => ["temperature", "humidity", "carbon_dioxide"].includes(entity.deviceClass ?? ""),
  },
  energy: {
    label: "energy",
    color: "yellow",
    match: (entity) => ["power", "energy"].includes(entity.deviceClass ?? ""),
  },
  battery: { label: "battery", color: "green", match: (entity) => entity.deviceClass === "battery" },
};

function SensorsPanel({ entities, width, height }: PanelProps) {
  const [filter, setFilter] = useFilter();
  const chips: ChipDef[] = Object.entries(sensorGroups).map(([key, group]) => ({
    key,
    label: group.label,
    count: entities.filter(group.match).length,
    color: group.color,
  }));
  const group = filter ? sensorGroups[filter] : undefined;
  const visible = group ? entities.filter(group.match) : entities;

  return (
    <ListShell
      title="Sensors"
      icon={IconTemperature}
      meta={<Meta items={[{ icon: IconTemperature, label: `${entities.length} readings` }]} />}
      chips={chips}
      filter={filter}
      onFilter={setFilter}
      height={height}
      sections={[{ key: "all", title: "24h", entities: visible }]}
      width={width}
    />
  );
}

function EntityPanel({ entity, width, height }: { entity: HaEntity | undefined; width: number; height: number }) {
  if (!entity) return <div className={classes.empty}>Entity not found</div>;
  const tier = getEntityTier(width, height);
  if (tier === "tile") return <EntityTile entity={entity} />;
  if (tier === "row") {
    return (
      <div className={classes.single} style={getColorVars(entity)}>
        <EntityRow entity={entity} level={getLevel(width)} large />
      </div>
    );
  }
  return <EntityDetail entity={entity} width={width} />;
}

export function VariantC({ preset, areaId, entityId, width, height, isEditMode }: PrototypeVariantProps) {
  const all = usePrototypeEntities();
  const entities = useMemo(() => getPresetEntities(all, preset, areaId, entityId), [all, preset, areaId, entityId]);

  const content = () => {
    switch (preset) {
      case "overview":
        return <OverviewPanel entities={entities} width={width} height={height} />;
      case "area":
        return <AreaPanel entities={entities} width={width} height={height} areaId={areaId} />;
      case "actions":
        return <ActionsPanel entities={entities} width={width} height={height} />;
      case "sensors":
        return <SensorsPanel entities={entities} width={width} height={height} />;
      case "entity":
        return <EntityPanel entity={entities[0]} width={width} height={height} />;
    }
  };

  return <ControlListRoot isEditMode={isEditMode}>{content()}</ControlListRoot>;
}
