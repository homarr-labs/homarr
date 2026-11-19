import type { BeszelMetricOptions } from "@homarr/definitions/beszel";
import { beszelMetricOptionKeys } from "@homarr/definitions/beszel";

export const beszelTableMetricOptionKeys = beszelMetricOptionKeys;

export const normalizeBeszelTableOptions = (options: Record<string, unknown>): Record<string, unknown> => {
  if (Array.isArray(options.columns)) return options;

  return {
    ...options,
    columns: beszelTableMetricOptionKeys.filter((key) => options[key] !== false),
  };
};

export const getBeszelTableVisibleMetricKeys = (
  options: Partial<BeszelMetricOptions> & { columns?: readonly string[] },
  width: number,
  isAdvanced: boolean,
) => {
  const enabled = beszelTableMetricOptionKeys.filter((key) => {
    if (isAdvanced) return true;
    if (options.columns) return options.columns.includes(key);
    return options[key] !== false;
  });
  let budget = enabled.length;
  if (!isAdvanced) {
    if (width < 360) budget = 1;
    else if (width < 560) budget = 2;
    else if (width < 760) budget = 4;
  }

  return new Set(enabled.slice(0, budget));
};
