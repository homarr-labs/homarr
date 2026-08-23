import type { WidgetInputType, WidgetInputValue } from "../jsx/runtime-components";

export function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function sameTypeRecord(left: Record<string, WidgetInputType>, right: Record<string, WidgetInputType>) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length && leftEntries.every(([name, type]) => right[name] === type);
}

export function sameInputRecord(left: Record<string, WidgetInputValue>, right: Record<string, WidgetInputValue>) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    leftEntries.length === rightEntries.length && leftEntries.every(([name, value]) => Object.is(right[name], value))
  );
}
