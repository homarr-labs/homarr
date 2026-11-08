"use client";

import { IconBattery2, IconDroplet, IconTemperature } from "@tabler/icons-react";
import { getLightCapabilities } from "@homarr/integrations/types";

import { formatNumber, getStateColor, isUnavailable } from "../../semantics";
import type { HaEntity } from "../../types";
import { LightColorControls } from "../e/color-controls";
import { AlarmControl, CoverButtons, HvacModes, InlineSlider, MediaTransport, Segmented, Stepper } from "./controls";
import { ActionButton } from "./controls";
import type { Level } from "./layout";
import { getAttributeRows, getColorVars } from "./meta";
import { EntityRow } from "./row";
import { Spark } from "./spark";
import classes from "./styles.module.css";
import type { EntityRun } from "./use-run";
import { useEntityRun } from "./use-run";

function Labeled({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className={classes.field}>
      <div className={classes.fieldHead}>
        <span>{label}</span>
        {value && <b>{value}</b>}
      </div>
      {children}
    </div>
  );
}

function Forecast({ entity }: { entity: HaEntity }) {
  const days = entity.attributes.forecast ?? [];
  return (
    <div className={classes.forecast}>
      {days.map((day) => (
        <div key={day.day} className={classes.forecastRow}>
          <span className={classes.forecastDay}>{day.day}</span>
          <span className={classes.forecastCondition}>{day.condition.replace(/_/g, " ")}</span>
          <span className={classes.forecastRain}>
            <IconDroplet size={11} />
            {day.precipitationProbability}%
          </span>
          <b>{formatNumber(day.high, 0)}°</b>
          <span className={classes.dim}>{formatNumber(day.low, 0)}°</span>
        </div>
      ))}
    </div>
  );
}

function DetailControls({ entity, run }: { entity: HaEntity; run: EntityRun }) {
  const a = entity.attributes;
  const color = getStateColor(entity);
  if (isUnavailable(entity)) return null;
  switch (entity.domain) {
    case "light":
      return (
        <>
          {getLightCapabilities(a).brightness && (
            <Labeled label="Brightness" value={`${a.brightness ?? 0}%`}>
              <InlineSlider
                label="Brightness"
                value={a.brightness ?? 0}
                width="100%"
                color={color === "gray" ? "yellow" : color}
                onCommit={(value) => run.request({ type: "setBrightness", value })}
              />
            </Labeled>
          )}
          <LightColorControls entity={entity} />
        </>
      );
    case "climate":
      return (
        <>
          <Labeled
            label="Target"
            value={a.currentTemperature !== undefined ? `Now ${formatNumber(a.currentTemperature)}°` : undefined}
          >
            <Stepper entity={entity} run={run} large />
          </Labeled>
          <Labeled label="Mode">
            <HvacModes entity={entity} run={run} fill />
          </Labeled>
        </>
      );
    case "media_player":
      return (
        <>
          {a.artworkUrl && (
            <div className={classes.media}>
              <img src={a.artworkUrl} alt="" />
              <div>
                <b>{a.mediaTitle}</b>
                <span>{a.mediaArtist}</span>
              </div>
            </div>
          )}
          <div className={classes.mediaControls}>
            <MediaTransport entity={entity} run={run} level={1} />
          </div>
          {a.volume !== undefined && (
            <Labeled label="Volume" value={`${Math.round(a.volume * 100)}%`}>
              <InlineSlider
                label="Volume"
                value={Math.round(a.volume * 100)}
                width="100%"
                color="grape"
                onCommit={(value) => run.request({ type: "setVolume", value: value / 100 })}
              />
            </Labeled>
          )}
        </>
      );
    case "cover":
      return (
        <Labeled label="Position" value={a.position !== undefined ? `${a.position}%` : undefined}>
          <div className={classes.field}>
            {a.position !== undefined && (
              <InlineSlider
                label="Position"
                value={a.position}
                width="100%"
                color={color === "gray" ? "violet" : color}
                onCommit={(value) => run.request({ type: "setPosition", value })}
              />
            )}
            <CoverButtons entity={entity} run={run} full />
          </div>
        </Labeled>
      );
    case "fan":
      return (
        <Labeled label="Speed" value={`${a.percentage ?? 0}%`}>
          <InlineSlider
            label="Speed"
            value={a.percentage ?? 0}
            width="100%"
            color="cyan"
            onCommit={(value) => run.request({ type: "setFanPercentage", value })}
          />
        </Labeled>
      );
    case "humidifier":
      return (
        <Labeled label="Target humidity" value={`${a.targetHumidity ?? 0}%`}>
          <InlineSlider
            label="Target humidity"
            value={a.targetHumidity ?? 0}
            width="100%"
            color="blue"
            onCommit={(value) => run.request({ type: "setHumidity", value })}
          />
        </Labeled>
      );
    case "alarm_control_panel":
      return (
        <Labeled label="Mode">
          <AlarmControl entity={entity} run={run} level={2} fill />
        </Labeled>
      );
    case "input_select":
      return (
        <Labeled label="Mode">
          <Segmented
            label="Mode"
            options={(a.options ?? []).map((option) => ({ value: option, label: option }))}
            value={entity.state}
            onChange={(value) => run.request({ type: "selectOption", value })}
            color="blue"
            fill
          />
        </Labeled>
      );
    case "camera":
      return a.snapshotUrl ? <img className={classes.snapshot} src={a.snapshotUrl} alt={entity.name} /> : null;
    case "weather":
      return <Forecast entity={entity} />;
    case "sensor":
      return entity.history ? (
        <div className={classes.bigSpark}>
          <Spark data={entity.history} width={300} height={48} strokeWidth={2} />
          <div className={classes.sparkRange}>
            <span>24h min {formatNumber(Math.min(...entity.history))}</span>
            <span>max {formatNumber(Math.max(...entity.history))}</span>
          </div>
        </div>
      ) : null;
    case "vacuum":
      return (
        <div className={classes.cluster}>
          <ActionButton
            label="Start"
            run={run}
            allowWhilePending
            onClick={() => run.request({ type: "vacuumStart" })}
          />
          <ActionButton
            label="Dock"
            run={run}
            allowWhilePending
            onClick={() => run.request({ type: "vacuumReturn" })}
          />
        </div>
      );
    default:
      return null;
  }
}

interface DetailProps {
  entity: HaEntity;
  width: number;
}

export function EntityDetail({ entity, width }: DetailProps) {
  const run = useEntityRun(entity);
  const wide = width >= 460;
  const level: Level = width >= 440 ? 2 : width >= 300 ? 1 : 0;
  const rows = getAttributeRows(entity);
  const a = entity.attributes;

  return (
    <div className={classes.detail} data-wide={wide || undefined} style={getColorVars(entity)}>
      <EntityRow entity={entity} level={level} large />
      <div className={classes.detailBody}>
        <div className={classes.detailControls}>
          <DetailControls entity={entity} run={run} />
          {(a.batteryLevel !== undefined || a.currentHumidity !== undefined) && (
            <div className={classes.badges}>
              {a.currentHumidity !== undefined && (
                <span>
                  <IconTemperature size={12} /> {a.currentHumidity}% humidity
                </span>
              )}
              {a.batteryLevel !== undefined && (
                <span>
                  <IconBattery2 size={12} /> {a.batteryLevel}%
                </span>
              )}
            </div>
          )}
        </div>
        <dl className={classes.kv}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
