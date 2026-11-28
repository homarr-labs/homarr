import { formatEntityState, formatNumber, isEntityActive, isUnavailable } from "../semantics";
import type { HaEntity } from "../types";
import type {
  SmartHomeAggregate,
  SmartHomeCompareOperator,
  SmartHomeLayoutColor,
  SmartHomeLayoutElement,
  SmartHomeLayoutRule,
} from "./schema";
import { isNamedLayoutColor } from "./schema";

/** A percentage (print progress, a washing program, a battery): its large control is a ring. */
export const isPercentReading = (entity: { unit?: string | null; domain: string }) =>
  entity.unit === "%" && (entity.domain === "sensor" || entity.domain === "number");

/** A color as a CSS value: palette colors follow the theme, custom ones are used as they are. */
export const layoutColor = (color: SmartHomeLayoutColor) => {
  // The board's own colors, as the other widgets use them.
  if (color === "primary") return "var(--mantine-color-primaryColor-filled)";
  if (color === "secondary") return "var(--mantine-color-secondaryColor-filled)";
  return isNamedLayoutColor(color) ? `var(--mantine-color-${color}-6)` : color;
};

const toNumber = (value: string) => {
  if (value.trim() === "") return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
};

/**
 * Compares an entity state with a rule value. Numbers compare as numbers; anything else only by (in)equality,
 * ignoring case, so "on", "open" or "heat" work as well as 25 or 1000.
 */
export const compareState = (state: string, op: SmartHomeCompareOperator, expected: string) => {
  const actual = toNumber(state);
  const target = toNumber(expected);
  if (actual !== null && target !== null) {
    if (op === "gt") return actual > target;
    if (op === "lt") return actual < target;
    if (op === "eq") return actual === target;
    return actual !== target;
  }
  const same = state.trim().toLowerCase() === expected.trim().toLowerCase();
  if (op === "eq") return same;
  if (op === "ne") return !same;
  return false;
};

/** The color of the first rule the state matches, if any. */
export const getRuleColor = (state: string | null, rules: readonly SmartHomeLayoutRule[] | undefined) => {
  if (state === null || !rules?.length) return undefined;
  const match = rules.find((rule) => compareState(state, rule.op, rule.value));
  return match ? layoutColor(match.color) : undefined;
};

type ValueFormat = Pick<SmartHomeLayoutElement, "decimals" | "unit" | "factor">;

const hasFormat = (format: ValueFormat) =>
  format.decimals !== undefined || format.unit !== undefined || format.factor !== undefined;

/** A number with the element's decimals, factor and unit; the entity's own unit unless the element sets one. */
export const formatLayoutNumber = (value: number | null, unit: string | null, format: ValueFormat) => {
  if (value === null) return "—";
  const scaled = value * (format.factor ?? 1);
  const shownUnit = format.unit ?? unit ?? "";
  const text =
    format.decimals === undefined
      ? formatNumber(scaled)
      : new Intl.NumberFormat(undefined, {
          // A hand-written layout cannot make the formatter throw.
          minimumFractionDigits: Math.min(3, Math.max(0, Math.trunc(format.decimals))),
          maximumFractionDigits: Math.min(3, Math.max(0, Math.trunc(format.decimals))),
        }).format(scaled);
  if (!shownUnit) return text;
  return shownUnit === "%" ? `${text}%` : `${text} ${shownUnit}`;
};

/** The numeric value of a sensor-like entity, or null when its state is not a number. */
export const getNumericState = (entity: HaEntity) => {
  if (isUnavailable(entity)) return null;
  return toNumber(entity.state);
};

/** The entity's state as the element shows it: formatted like everywhere else unless the element formats it. */
export const formatElementState = (entity: HaEntity, format: ValueFormat) => {
  const value = getNumericState(entity);
  if (value === null || !hasFormat(format)) return formatEntityState(entity);
  return formatLayoutNumber(value, entity.unit, format);
};

/**
 * One value over several entities: sum, average, minimum or maximum of their numbers, or how many are on. Entities
 * without a number (offline, unknown) are left out instead of turning the result into nothing.
 */
export const aggregateEntities = (entities: readonly HaEntity[], aggregate: SmartHomeAggregate) => {
  if (aggregate === "on") return entities.filter((entity) => !isUnavailable(entity) && isEntityActive(entity)).length;
  const values = entities.flatMap((entity) => {
    const value = getNumericState(entity);
    return value === null ? [] : [value];
  });
  if (values.length === 0) return null;
  if (aggregate === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (aggregate === "avg") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (aggregate === "min") return Math.min(...values);
  return Math.max(...values);
};
