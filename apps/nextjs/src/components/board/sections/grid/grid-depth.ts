export const getGridDepth = (gridId: string, parentGridById: ReadonlyMap<string, string | null>) => {
  let depth = 0;
  let currentGridId = gridId;
  const visited = new Set([gridId]);

  while (true) {
    const parentGridId = parentGridById.get(currentGridId);
    if (!parentGridId || visited.has(parentGridId)) return depth;

    depth += 1;
    visited.add(parentGridId);
    currentGridId = parentGridId;
  }
};
