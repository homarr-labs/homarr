import type { BeszelMetricOptions } from "@homarr/definitions/beszel";
import { beszelMetricOptionKeys } from "@homarr/definitions/beszel";

export const beszelTableMetricOptionKeys = beszelMetricOptionKeys;

export const getBeszelTableVisibleMetricKeys = (options: BeszelMetricOptions, width: number, isAdvanced: boolean) => {
  const enabled = isAdvanced
    ? [...beszelTableMetricOptionKeys]
    : beszelTableMetricOptionKeys.filter((key) => options[key]);
  const budget = isAdvanced ? enabled.length : width < 360 ? 1 : width < 560 ? 2 : width < 760 ? 4 : enabled.length;

  return new Set(enabled.slice(0, budget));
};
