import { createId } from "@homarr/common";

export type EntityResolverDef<TBundle, TExisting extends { id: string }, TInsert> = {
  getRef: (bundle: TBundle) => string;
  match: (bundle: TBundle, existing: TExisting) => boolean;
  toInsertRow: (bundle: TBundle, newId: string) => TInsert;
  skipMessage?: (bundle: TBundle) => string;
};

export type ResolveResult<TInsert> = {
  refToId: Map<string, string>;
  rows: TInsert[];
  warnings: string[];
};

export const resolveEntities = <TBundle, TExisting extends { id: string }, TInsert>(
  bundleEntities: TBundle[],
  existingEntities: TExisting[],
  def: EntityResolverDef<TBundle, TExisting, TInsert>,
): ResolveResult<TInsert> => {
  const refToId = new Map<string, string>();
  const rows: TInsert[] = [];
  const warnings: string[] = [];

  for (const bundleEntity of bundleEntities) {
    const existing = existingEntities.find((e) => def.match(bundleEntity, e));

    if (existing) {
      refToId.set(def.getRef(bundleEntity), existing.id);
      if (def.skipMessage) warnings.push(def.skipMessage(bundleEntity));
      continue;
    }

    const newId = createId();
    refToId.set(def.getRef(bundleEntity), newId);
    rows.push(def.toInsertRow(bundleEntity, newId));
  }

  return { refToId, rows, warnings };
};

export const groupByKey = <T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K,
): Map<K, T[]> => {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
};
