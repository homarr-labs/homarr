export interface GridCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridPlacement extends GridCoordinates {
  id: string;
}

const toFiniteNumber = (value: number, name: string) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);

  return value;
};

const toNonNegativeInteger = (value: number) => Math.max(0, Math.trunc(toFiniteNumber(value, "value")));

const toPositiveInteger = (value: number, name: string) => {
  const integer = Math.trunc(toFiniteNumber(value, name));
  if (integer < 1) throw new RangeError(`${name} must be at least 1`);

  return integer;
};

export const getLayoutRowCount = (placements: readonly GridCoordinates[]) =>
  placements.reduce((rowCount, placement) => Math.max(rowCount, placement.y + placement.h), 0);

export const normalizeGridPlacement = <TPlacement extends GridPlacement>(
  placement: TPlacement,
  columnCount: number,
): TPlacement => {
  const normalizedColumnCount = toPositiveInteger(columnCount, "columnCount");
  const width = Math.min(toPositiveInteger(placement.w, "placement.w"), normalizedColumnCount);
  const x = Math.min(Math.max(0, toNonNegativeInteger(placement.x)), normalizedColumnCount - width);

  return {
    ...placement,
    x,
    y: toNonNegativeInteger(placement.y),
    w: width,
    h: toPositiveInteger(placement.h, "placement.h"),
  };
};

export const doGridPlacementsOverlap = (first: GridPlacement, second: GridPlacement) =>
  first.x < second.x + second.w &&
  first.x + first.w > second.x &&
  first.y < second.y + second.h &&
  first.y + first.h > second.y;
