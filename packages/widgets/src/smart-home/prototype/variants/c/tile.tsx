"use client";

import { Popover } from "@mantine/core";
import { getClimateTemperatureMode } from "@homarr/integrations/types";

import type { TablerIcon } from "@homarr/ui";

import { formatEntityState, getEntityIcon, getStateColor, isUnavailable } from "../../semantics";
import type { HaEntity } from "../../types";
import { DetailTrigger } from "../e/detail-trigger";
import { useEntityDetailOpener } from "../e/details";
import { ActionStatus } from "./action-status";
import { AlarmControl, ConfirmInline, SelectControl, Stepper } from "./controls";
import type { ChipDef } from "./list";
import { getColorVars, getToneVars } from "./meta";
import { EntityRow, RowControl } from "./row";
import { Spark } from "./spark";
import classes from "./styles.module.css";
import { useEntityRun } from "./use-run";

const wideControlDomains = ["climate", "alarm_control_panel", "input_select"];

export function EntityTile({ entity }: { entity: HaEntity }) {
  const run = useEntityRun(entity);
  const openDetails = useEntityDetailOpener(entity.id);
  const Icon = getEntityIcon(entity);
  const unavailable = isUnavailable(entity);
  const wide = wideControlDomains.includes(entity.domain) && !unavailable;
  const isSensor = entity.domain === "sensor" || entity.domain === "weather";
  const active = getStateColor(entity) !== "gray" && !unavailable;
  const state = formatEntityState(entity);
  const detailLabel = `${entity.name}: ${state}. Show details`;

  const renderWide = () => {
    if (run.confirm) return <ConfirmInline run={run} level={0} />;
    if (entity.domain === "climate") return <Stepper entity={entity} run={run} />;
    if (entity.domain === "alarm_control_panel") return <AlarmControl entity={entity} run={run} level={0} />;
    return <SelectControl entity={entity} run={run} />;
  };

  return (
    <DetailTrigger entityId={entity.id} name={entity.name}>
      <div
        className={classes.tileFrame}
        style={getColorVars(entity)}
        data-range={getClimateTemperatureMode(entity) === "range" || undefined}
      >
        <div
          className={classes.tile}
          data-active={active || undefined}
          data-unavailable={unavailable || undefined}
          data-pending={run.pending || undefined}
        >
          <div className={classes.tileTop}>
            <span className={classes.chip}>
              <Icon size={16} stroke={1.9} aria-hidden />
              <ActionStatus entity={entity} />
            </span>
            {!wide && !isSensor && (
              <div className={classes.tileControl}>
                <RowControl entity={entity} run={run} level={0} />
              </div>
            )}
            {isSensor && entity.history && (
              <div className={classes.tileSpark}>
                <Spark data={entity.history} width={52} height={22} />
              </div>
            )}
          </div>
          <div className={classes.tileBottom}>
            <span className={classes.name} title={entity.name}>
              {entity.name}
            </span>
            {wide && <div className={classes.tileWide}>{renderWide()}</div>}
            {!wide && <span className={classes.tileState}>{state}</span>}
          </div>
        </div>
        <div className={classes.tileFallback} data-active={active || undefined}>
          <button
            type="button"
            className={classes.tileDetails}
            aria-label={detailLabel}
            title={detailLabel}
            disabled={!openDetails}
            onClick={openDetails ?? undefined}
          >
            <Icon className={classes.tileDetailsIcon} size={20} stroke={1.9} aria-hidden />
            <span className={classes.tileDetailsText}>
              <span className={classes.name}>{entity.name}</span>
              <span className={classes.secondary}>{state}</span>
            </span>
          </button>
          <ActionStatus entity={entity} />
        </div>
      </div>
    </DetailTrigger>
  );
}

interface StatCell {
  chip: ChipDef;
  entities: HaEntity[];
}

export function StatCells({ cells, layout }: { cells: StatCell[]; layout: "grid" | "row" }) {
  return (
    <div className={classes.cells} data-layout={layout}>
      {cells.map(({ chip, entities }) => {
        const Icon = chip.icon;
        return (
          <Popover key={chip.key} position="bottom" withArrow shadow="md" width={340} withinPortal>
            <Popover.Target>
              <button
                type="button"
                className={classes.cell}
                data-empty={chip.count === 0 || undefined}
                style={getToneVars(chip.color)}
                aria-label={`${chip.count} ${chip.label}`}
              >
                {Icon && <Icon size={16} stroke={1.9} />}
                <b>{chip.count}</b>
                <span>{chip.label}</span>
              </button>
            </Popover.Target>
            <Popover.Dropdown p={0} className={classes.popover}>
              <div className={classes.popoverList} data-list>
                {entities.length === 0 && <div className={classes.empty}>Nothing here</div>}
                {entities.map((entity) => (
                  <EntityRow key={entity.id} entity={entity} level={1} showArea />
                ))}
              </div>
            </Popover.Dropdown>
          </Popover>
        );
      })}
    </div>
  );
}

export type { StatCell, TablerIcon };
