import { getClimateTemperatureMode } from "@homarr/integrations/types";

import { formatNumber } from "../../semantics";
import type { HaAction, HaAttributes, HaEntity } from "../../types";

export interface TargetRange {
  low: number;
  high: number;
}

export const getTargetRange = ({ targetTemperatureLow, targetTemperatureHigh }: HaAttributes): TargetRange | null => {
  if (targetTemperatureLow === undefined || targetTemperatureHigh === undefined) return null;
  return { low: targetTemperatureLow, high: targetTemperatureHigh };
};

export const formatTargetRange = ({ low, high }: TargetRange) => `${formatNumber(low)}–${formatNumber(high)}°`;

export const getClimateReadout = (entity: HaEntity) => {
  const mode = getClimateTemperatureMode(entity);
  if (mode === "range") {
    const range = getTargetRange(entity.attributes);
    if (range) return formatTargetRange(range);
  }
  const target = entity.attributes.targetTemperature;
  if (mode === "single" && target !== undefined) return `${formatNumber(target)}°`;
  return "—";
};

const hasCodeFormat = (entity: HaEntity) => Boolean(entity.attributes.codeFormat);

export const needsCode = (entity: HaEntity, action: HaAction) => {
  switch (action.type) {
    case "lock":
    case "unlock":
      return entity.domain === "lock" && (hasCodeFormat(entity) || entity.attributes.codeRequired === true);
    case "alarmArm":
      return entity.domain === "alarm_control_panel" && entity.attributes.codeRequired === true;
    case "alarmDisarm":
      return (
        entity.domain === "alarm_control_panel" && (hasCodeFormat(entity) || entity.attributes.codeRequired === true)
      );
    default:
      return false;
  }
};

export const entityNeedsCode = (entity: HaEntity) =>
  needsCode(entity, { type: "unlock" }) ||
  needsCode(entity, { type: "alarmDisarm" }) ||
  needsCode(entity, { type: "alarmArm", mode: "away" });

export const withCode = (action: HaAction, code: string): HaAction => {
  switch (action.type) {
    case "lock":
    case "unlock":
    case "alarmArm":
    case "alarmDisarm":
      return { ...action, code };
    default:
      return action;
  }
};

export type CodeGate =
  | { kind: "run"; action: HaAction }
  | { kind: "details"; open: () => void }
  | { kind: "awaitingCode" }
  | { kind: "unsupported" };

export const isGateBlocked = (gate: CodeGate) => gate.kind === "awaitingCode" || gate.kind === "unsupported";

export const runCodeGate = (gate: CodeGate, run: (action: HaAction) => Promise<void>) => {
  if (gate.kind === "details") gate.open();
  if (gate.kind === "run") void run(gate.action);
};

export const gateNotice = (gate: CodeGate, verb: string) => {
  switch (gate.kind) {
    case "run":
      return null;
    case "details":
      return "Tap to enter code";
    case "awaitingCode":
      return `Enter code to ${verb}`;
    case "unsupported":
      return "Code required · use Home Assistant";
  }
};
