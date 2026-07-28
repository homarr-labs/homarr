export const formatDiskTemperature = (temperature: number | null | undefined, shouldShow: boolean) =>
  shouldShow && temperature != null ? `${temperature}°C` : undefined;
