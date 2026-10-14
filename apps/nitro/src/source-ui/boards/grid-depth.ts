export const getGridDepth = (gridId: string, parentGridById: ReadonlyMap<string, string | null>) => {
  const visited = new Set<string>();
  let depth = 0;
  let current: string | null | undefined = gridId;
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    current = parentGridById.get(current);
    if (current) depth += 1;
  }
  return depth;
};
