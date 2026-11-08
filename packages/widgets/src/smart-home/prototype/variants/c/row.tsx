"use client";

import {
  IconArrowUpCircle,
  IconLock,
  IconLockOpen,
  IconPlayerPlay,
  IconRobot,
  IconHome,
  IconPalette,
} from "@tabler/icons-react";
import { getLightCapabilities } from "@homarr/integrations/types";
import type { KeyboardEvent } from "react";

import { formatEntityState, getEntityIcon, getPrimaryAction, getStateColor, isUnavailable } from "../../semantics";
import type { HaEntity } from "../../types";
import { DetailTrigger } from "../e/detail-trigger";
import { useEntityDetailOpener } from "../e/details";
import { ActionStatus } from "./action-status";
import {
  ActionButton,
  AlarmControl,
  ConfirmInline,
  CoverButtons,
  EntityToggle,
  getCodeControlProps,
  HvacModes,
  IconButton,
  InlineSlider,
  MediaTransport,
  SelectControl,
  Stepper,
  UnavailablePill,
} from "./controls";
import type { Level } from "./layout";
import { getColorVars, getSecondary } from "./meta";
import { Spark } from "./spark";
import classes from "./styles.module.css";
import type { EntityRun } from "./use-run";
import { useEntityRun } from "./use-run";

interface ControlProps {
  entity: HaEntity;
  run: EntityRun;
  level: Level;
}

const sliderWidth = (level: Level) => (level === 2 ? 120 : 72);

export function ValueReadout({ entity, level }: { entity: HaEntity; level: Level }) {
  const color = getStateColor(entity);
  if (entity.domain === "sensor") {
    const history = entity.history;
    return (
      <div className={classes.cluster}>
        {history && level > 0 && <Spark data={history} width={level === 2 ? 84 : 56} height={22} />}
        <span className={classes.value}>{formatEntityState(entity)}</span>
      </div>
    );
  }
  if (entity.domain === "camera" && entity.attributes.snapshotUrl && level > 0) {
    return <img className={classes.thumb} src={entity.attributes.snapshotUrl} alt="" />;
  }
  if (entity.domain === "weather") return <span className={classes.value}>{formatEntityState(entity)}</span>;
  return (
    <span className={classes.pill} data-tone={color === "gray" ? "muted" : "color"}>
      {formatEntityState(entity)}
    </span>
  );
}

export function RowControl({ entity, run, level }: ControlProps) {
  const attributes = entity.attributes;
  const color = getStateColor(entity);
  const openDetails = useEntityDetailOpener(entity.id);
  const light = getLightCapabilities(attributes);
  if (isUnavailable(entity)) return <UnavailablePill />;
  if (run.confirm) return <ConfirmInline run={run} level={level} />;

  switch (entity.domain) {
    case "light":
      return (
        <div className={classes.cluster}>
          {level > 0 && light.brightness && (
            <InlineSlider
              label={`${entity.name} brightness`}
              value={entity.state === "on" ? (attributes.brightness ?? 100) : 0}
              color={color === "gray" ? "yellow" : color}
              width={sliderWidth(level)}
              onCommit={(value) => run.request({ type: "setBrightness", value })}
            />
          )}
          {level > 0 && (light.color || light.colorTemperature) && openDetails && (
            <IconButton label={`Change ${entity.name} colour`} onClick={openDetails}>
              <IconPalette size={15} />
            </IconButton>
          )}
          <EntityToggle entity={entity} run={run} />
        </div>
      );
    case "fan":
      return (
        <div className={classes.cluster}>
          {level > 0 && (
            <InlineSlider
              label={`${entity.name} speed`}
              value={attributes.percentage ?? 0}
              color={color === "gray" ? "cyan" : color}
              width={sliderWidth(level)}
              onCommit={(value) => run.request({ type: "setFanPercentage", value })}
            />
          )}
          <EntityToggle entity={entity} run={run} />
        </div>
      );
    case "cover":
      return (
        <div className={classes.cluster}>
          {level > 0 && attributes.position !== undefined && (
            <InlineSlider
              label={`${entity.name} position`}
              value={attributes.position}
              color={color === "gray" ? "violet" : color}
              width={sliderWidth(level)}
              onCommit={(value) => run.request({ type: "setPosition", value })}
            />
          )}
          <CoverButtons entity={entity} run={run} />
        </div>
      );
    case "climate":
      return (
        <div className={classes.cluster}>
          {level === 2 && <HvacModes entity={entity} run={run} />}
          <Stepper entity={entity} run={run} />
        </div>
      );
    case "media_player":
      return (
        <div className={classes.cluster}>
          {level === 2 && attributes.volume !== undefined && (
            <InlineSlider
              label={`${entity.name} volume`}
              value={Math.round(attributes.volume * 100)}
              color="grape"
              width={84}
              onCommit={(value) => run.request({ type: "setVolume", value: value / 100 })}
            />
          )}
          <MediaTransport entity={entity} run={run} level={level} />
        </div>
      );
    case "lock": {
      const locked = entity.state === "locked";
      const action = locked ? ({ type: "unlock" } as const) : ({ type: "lock" } as const);
      return (
        <ActionButton
          label={locked ? "Unlock" : "Lock"}
          run={run}
          tone={locked ? "default" : "danger"}
          icon={locked ? <IconLockOpen size={13} /> : <IconLock size={13} />}
          onClick={() => run.request(action)}
          {...getCodeControlProps(entity, action, openDetails !== null)}
          allowWhilePending
        />
      );
    }
    case "alarm_control_panel":
      return <AlarmControl entity={entity} run={run} level={level} />;
    case "input_select":
      return <SelectControl entity={entity} run={run} />;
    case "scene":
    case "script":
    case "button":
      return (
        <ActionButton
          label="Run"
          run={run}
          icon={<IconPlayerPlay size={12} />}
          onClick={() => run.request({ type: "trigger" })}
        />
      );
    case "vacuum": {
      const cleaning = entity.state === "cleaning";
      return (
        <ActionButton
          label={cleaning ? "Dock" : "Start"}
          run={run}
          allowWhilePending
          icon={cleaning ? <IconHome size={13} /> : <IconRobot size={13} />}
          onClick={() => run.request(cleaning ? { type: "vacuumReturn" } : { type: "vacuumStart" })}
        />
      );
    }
    case "update":
      if (entity.state !== "on") return <ValueReadout entity={entity} level={level} />;
      return (
        <ActionButton
          label="Install"
          run={run}
          icon={<IconArrowUpCircle size={13} />}
          onClick={() => run.request({ type: "install" })}
        />
      );
    case "switch":
    case "input_boolean":
    case "automation":
    case "humidifier":
    case "valve":
      return <EntityToggle entity={entity} run={run} />;
    default:
      return <ValueReadout entity={entity} level={level} />;
  }
}

interface EntityRowProps {
  entity: HaEntity;
  level: Level;
  showArea?: boolean;
  large?: boolean;
}

export function EntityRow({ entity, level, showArea = false, large = false }: EntityRowProps) {
  const run = useEntityRun(entity);
  const Icon = getEntityIcon(entity);
  const unavailable = isUnavailable(entity);
  const active = getStateColor(entity) !== "gray" && !unavailable;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const rows = Array.from(
        event.currentTarget.closest("[data-list]")?.querySelectorAll<HTMLElement>("[data-row]") ?? [],
      );
      const next = rows[rows.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      next.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const action = getPrimaryAction(entity);
      if (!action) return;
      event.preventDefault();
      run.request(action);
    }
  };

  return (
    <DetailTrigger entityId={entity.id} name={entity.name}>
      <div
        data-row
        role="toolbar"
        aria-label={entity.name}
        className={classes.row}
        data-active={active || undefined}
        data-unavailable={unavailable || undefined}
        data-pending={run.pending || undefined}
        data-large={large || undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={getColorVars(entity)}
      >
        <span className={classes.chip}>
          <Icon size={large ? 18 : 16} stroke={1.9} aria-hidden />
          <ActionStatus entity={entity} />
        </span>
        <div className={classes.rowText}>
          <span className={classes.name} title={entity.name}>
            {entity.name}
          </span>
          <span className={classes.secondary}>{getSecondary(entity, showArea)}</span>
        </div>
        <div className={classes.rowControl}>
          <RowControl entity={entity} run={run} level={level} />
        </div>
      </div>
    </DetailTrigger>
  );
}
