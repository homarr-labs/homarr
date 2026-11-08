"use client";

import type { ReactNode } from "react";
import { IconAlertTriangle, IconPlayerPlay, IconPower } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { getClimateTemperatureMode } from "@homarr/integrations/types";

import {
  formatEntityState,
  formatNumber,
  formatRelativeTime,
  getPrimaryAction,
  requiresConfirmation,
} from "../../semantics";
import { usePrototypeAreas, usePrototypeEntities, usePrototypeEntityError } from "../../store";
import type { HaAction, HaEntity } from "../../types";
import { entityNeedsCode, formatTargetRange, getTargetRange, needsCode } from "./capabilities";
import { RoundButton, Sparkline } from "./controls";
import { LightColorControls } from "./color-controls";
import { useDeviceControlDisabled, useRunner } from "./hooks";
import classes from "./styles.module.css";
import { accentVars, getTheme } from "./theme";

type Fact = [label: string, value: string | undefined];

const RELATED_LIMIT = 8;

const format = <T,>(value: T | undefined, render: (value: T) => string) => {
  if (value === undefined) return undefined;
  return render(value);
};

const percent = (value: number) => `${Math.round(value)}%`;
const degrees = (value: number) => `${formatNumber(value)}°`;
const clock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
};

const domainFacts = (entity: HaEntity): Fact[] => {
  const attributes = entity.attributes;
  switch (entity.domain) {
    case "light":
      return [
        ["Brightness", format(attributes.brightness, percent)],
        ["Colour temperature", format(attributes.colorTempKelvin, (kelvin) => `${kelvin} K`)],
        ["Colour", format(attributes.rgbColor, (rgb) => `RGB ${rgb.join(", ")}`)],
      ];
    case "climate":
      return [
        ["Current", format(attributes.currentTemperature, degrees)],
        [
          "Target",
          getClimateTemperatureMode(entity) === "single" ? format(attributes.targetTemperature, degrees) : undefined,
        ],
        [
          "Target range",
          getClimateTemperatureMode(entity) === "range"
            ? format(getTargetRange(attributes) ?? undefined, formatTargetRange)
            : undefined,
        ],
        ["Running", attributes.hvacAction],
        ["Preset", attributes.presetMode],
        ["Humidity", format(attributes.currentHumidity, percent)],
        [
          "Limits",
          format(attributes.minTemperature, (min) => `${degrees(min)} – ${degrees(attributes.maxTemperature ?? min)}`),
        ],
        ["Step", format(attributes.temperatureStep, degrees)],
      ];
    case "humidifier":
      return [
        ["Target humidity", format(attributes.targetHumidity, percent)],
        ["Humidity", format(attributes.currentHumidity, percent)],
      ];
    case "cover":
    case "valve":
      return [["Position", format(attributes.position, percent)]];
    case "fan":
      return [
        ["Speed", format(attributes.percentage, percent)],
        ["Preset", attributes.presetMode],
      ];
    case "media_player":
      return [
        ["Title", attributes.mediaTitle],
        ["Artist", attributes.mediaArtist],
        ["Album", attributes.mediaAlbum],
        ["Source", attributes.mediaSource],
        ["Volume", format(attributes.volume, (volume) => percent(volume * 100))],
        ["Muted", attributes.isMuted ? "Yes" : undefined],
        ["Length", format(attributes.mediaDuration, clock)],
      ];
    case "update":
      return [
        ["Installed", attributes.installedVersion],
        ["Latest", attributes.latestVersion],
      ];
    case "automation":
    case "script":
      return [["Last triggered", format(attributes.lastTriggered, formatRelativeTime)]];
    case "person":
      return [["Zone", attributes.zone]];
    case "vacuum":
      return [["Status", attributes.status]];
    case "lock":
    case "alarm_control_panel":
      return [["Code", entityNeedsCode(entity) ? "Required for protected actions" : undefined]];
    case "weather":
      return [
        ["Humidity", format(attributes.humidity, percent)],
        ["Wind", format(attributes.windSpeed, (speed) => `${speed} ${attributes.windSpeedUnit ?? ""}`.trim())],
      ];
    default:
      return [];
  }
};

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={classes.detailSection}>
      <h3 className={classes.detailSectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function PresetChips({ entity }: { entity: HaEntity }) {
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(entity.readOnly);
  const presets = entity.attributes.presetModes ?? [];
  if (presets.length < 2) return null;
  const theme = getTheme(entity);

  return (
    <DetailSection title="Preset">
      <div
        className={classes.detailChips}
        role="group"
        aria-label={`${entity.name} preset`}
        aria-busy={pending}
        style={accentVars(theme.accent, theme.onAccent)}
      >
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={classes.chip}
            data-active={preset === entity.attributes.presetMode}
            aria-pressed={preset === entity.attributes.presetMode}
            disabled={theme.unavailable || disabled}
            onClick={() => void run({ type: "setPresetMode", value: preset })}
          >
            {preset.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </DetailSection>
  );
}

function HistorySummary({ entity }: { entity: HaEntity }) {
  const history = entity.history;
  if (!history || history.length < 2) return null;
  const theme = getTheme(entity);
  const unit = entity.unit ?? "";
  const value = (number: number) => `${formatNumber(number)}${unit === "%" ? "%" : ` ${unit}`}`.trim();
  const average = history.reduce((total, point) => total + point, 0) / history.length;

  return (
    <DetailSection title="History">
      <div className={classes.detailChart}>
        <Sparkline values={history} color={theme.accent} />
      </div>
      <FactList
        facts={[
          ["Low", value(Math.min(...history))],
          ["Average", value(average)],
          ["High", value(Math.max(...history))],
        ]}
      />
    </DetailSection>
  );
}

const actionIcons: Partial<Record<HaAction["type"], TablerIcon>> = {
  trigger: IconPlayerPlay,
  mediaPlayPause: IconPlayerPlay,
  vacuumStart: IconPlayerPlay,
};

const actionVerbs: Partial<Record<HaAction["type"], string>> = {
  trigger: "Run",
  mediaPlayPause: "Play or pause",
  vacuumStart: "Start",
};

function FactList({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((fact): fact is [string, string] => fact[1] !== undefined && fact[1] !== "");
  return (
    <dl className={classes.facts}>
      {shown.map(([label, value]) => (
        <div key={label} className={classes.fact}>
          <dt>{label}</dt>
          <dd data-mono={label === "Entity ID"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RelatedRow({ entity, onOpen }: { entity: HaEntity; onOpen: (entityId: string) => void }) {
  const theme = getTheme(entity);
  const { run, pending } = useRunner(entity);
  const action = getPrimaryAction(entity);
  const state = formatEntityState(entity);
  const Icon = theme.Icon;
  const direct =
    action !== null && !theme.unavailable && !needsCode(entity, action) && !requiresConfirmation(entity, action);

  return (
    <li
      className={classes.relatedRow}
      style={accentVars(theme.accent, theme.onAccent)}
      data-active={theme.active}
      data-unavailable={theme.unavailable}
    >
      <span className={classes.miniIconStatic} data-active={theme.active} data-pending={pending}>
        <Icon size={16} stroke={1.8} />
      </span>
      <button
        type="button"
        className={classes.relatedName}
        aria-label={`${entity.name}, ${state}, show details`}
        onClick={() => onOpen(entity.id)}
      >
        <span className={classes.name}>{entity.name}</span>
        <span className={classes.state}>{state}</span>
      </button>
      {action !== null && direct ? <RelatedAction entity={entity} action={action} run={run} pending={pending} /> : null}
    </li>
  );
}

interface RelatedActionProps {
  entity: HaEntity;
  action: HaAction;
  run: (action: HaAction) => Promise<void>;
  pending: boolean;
}

function RelatedAction({ entity, action, run, pending }: RelatedActionProps) {
  const theme = getTheme(entity);
  const ActionIcon = actionIcons[action.type] ?? IconPower;
  return (
    <RoundButton
      size="sm"
      label={`${actionVerbs[action.type] ?? "Toggle"} ${entity.name}`}
      active={theme.active}
      pending={pending}
      disabled={theme.unavailable || entity.readOnly}
      onClick={() => void run(action)}
    >
      <ActionIcon size={16} stroke={2} />
    </RoundButton>
  );
}

function RelatedEntities({ entity, onOpen }: { entity: HaEntity; onOpen: (entityId: string) => void }) {
  const entities = usePrototypeEntities();
  if (!entity.areaId) return null;
  const related = Object.values(entities)
    .filter((candidate) => candidate.areaId === entity.areaId && candidate.id !== entity.id)
    .toSorted((a, b) => Number(getPrimaryAction(b) !== null) - Number(getPrimaryAction(a) !== null))
    .slice(0, RELATED_LIMIT);
  if (related.length === 0) return null;

  return (
    <details className={classes.detailDisclosure}>
      <summary>Also in this room</summary>
      <ul className={classes.relatedList}>
        {related.map((candidate) => (
          <RelatedRow key={candidate.id} entity={candidate} onOpen={onOpen} />
        ))}
      </ul>
    </details>
  );
}

export function DetailMeta({ entity }: { entity: HaEntity }) {
  const areas = usePrototypeAreas();
  const area = areas.find((candidate) => candidate.id === entity.areaId);
  const domain = entity.domain.replace(/_/g, " ");
  const parts = [
    area?.name,
    `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`,
    `changed ${formatRelativeTime(entity.lastChanged)}`,
  ];
  return <p className={classes.detailMeta}>{parts.filter(Boolean).join(" · ")}</p>;
}

export function DetailPanel({ entity, onOpen }: { entity: HaEntity; onOpen: (entityId: string) => void }) {
  const t = useI18n("widget.smartHome-prototype.live");
  const error = usePrototypeEntityError(entity.id);
  const areas = usePrototypeAreas();
  const area = areas.find((candidate) => candidate.id === entity.areaId);
  const formatted = formatEntityState(entity);
  const facts: Fact[] = [
    ["State", formatted],
    ...domainFacts(entity),
    ["Battery", format(entity.attributes.batteryLevel, percent)],
  ];
  const technicalFacts: Fact[] = [
    ["Raw state", entity.state === formatted ? undefined : entity.state],
    ["Device class", entity.deviceClass ?? undefined],
    ["Unit", entity.unit ?? undefined],
    ["Area", area?.name],
    ["Last changed", new Date(entity.lastChanged).toLocaleString()],
    ["Entity ID", entity.id],
  ];
  return (
    <>
      {error ? (
        <p
          className={classes.detailError}
          data-kind={error.kind}
          role={error.kind === "unconfirmed" ? "status" : "alert"}
        >
          <IconAlertTriangle size={16} stroke={2} />
          {`${t(error.kind === "unconfirmed" ? "actionUnconfirmed" : "actionFailed", { name: entity.name })}: ${error.message}`}
        </p>
      ) : null}
      <PresetChips entity={entity} />
      <LightColorControls entity={entity} />
      <HistorySummary entity={entity} />
      {entity.attributes.releaseSummary ? (
        <details className={classes.detailDisclosure}>
          <summary>Release notes</summary>
          <p className={classes.detailText}>{entity.attributes.releaseSummary}</p>
        </details>
      ) : null}
      <DetailSection title="Details">
        <FactList facts={facts} />
      </DetailSection>
      <details className={classes.detailDisclosure}>
        <summary>Technical details</summary>
        <FactList facts={technicalFacts} />
      </details>
      <RelatedEntities entity={entity} onOpen={onOpen} />
    </>
  );
}
