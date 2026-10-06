export const beszelTableMetricOptionKeys = [
  "showCpu",
  "showMemory",
  "showDisk",
  "showGpu",
  "showLoadAvg",
  "showNet",
  "showTemp",
  "showBattery",
  "showServices",
  "showUptime",
  "showAgent",
] as const;

type BeszelTableMetricOptions = Record<(typeof beszelTableMetricOptionKeys)[number], boolean>;

export const getBeszelTableVisibleMetricKeys = (
  options: BeszelTableMetricOptions,
  width: number,
  isAdvanced: boolean,
) => {
  const enabled = isAdvanced
    ? [...beszelTableMetricOptionKeys]
    : beszelTableMetricOptionKeys.filter((key) => options[key]);
  const budget = isAdvanced ? enabled.length : width < 360 ? 1 : width < 560 ? 2 : width < 760 ? 4 : enabled.length;

  return new Set(enabled.slice(0, budget));
};
