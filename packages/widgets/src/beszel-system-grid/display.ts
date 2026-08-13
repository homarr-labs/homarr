export const isBeszelGridMetricVisible = (configured: boolean, isAdvanced: boolean, applicable = true) =>
  applicable && (isAdvanced || configured);
