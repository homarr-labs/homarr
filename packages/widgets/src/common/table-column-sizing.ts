export const getResponsiveTableColumnSizes = <TColumn extends string>(
  baseColumnSizes: Record<TColumn, number>,
  width: number,
  responsiveColumns: Partial<Record<TColumn, { maxSize?: number; widthDivisor?: number }>>,
): Record<TColumn, number> => {
  const columnSizes = { ...baseColumnSizes };

  for (const [column, options] of Object.entries(responsiveColumns) as [
    TColumn,
    { maxSize?: number; widthDivisor?: number },
  ][]) {
    const baseSize = baseColumnSizes[column];
    // maxSize limits growth only; it should never shrink a column below its base size.
    const maxSize = Math.max(baseSize, options.maxSize ?? Number.POSITIVE_INFINITY);
    const widthBasedSize = Math.round(width / (options.widthDivisor ?? 32));
    columnSizes[column] = Math.min(maxSize, Math.max(baseSize, widthBasedSize));
  }

  return columnSizes;
};
