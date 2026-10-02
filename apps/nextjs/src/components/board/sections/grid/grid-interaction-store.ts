interface GridScopedInteraction {
  sourceGridId: string;
  targetGridId: string | null;
}

export interface GridInteractionStore<TInteraction extends GridScopedInteraction> {
  getSnapshot: () => TInteraction | null;
  getGridSnapshot: (sectionId: string) => TInteraction | null;
  publish: (interaction: TInteraction | null) => void;
  subscribe: (listener: () => void) => () => void;
  subscribeGrid: (sectionId: string, listener: () => void) => () => void;
}

const getAffectedGridIds = (interaction: GridScopedInteraction | null) => {
  const ids = new Set<string>();
  if (interaction) {
    ids.add(interaction.sourceGridId);
    if (interaction.targetGridId) ids.add(interaction.targetGridId);
  }
  return ids;
};

export const createGridInteractionStore = <
  TInteraction extends GridScopedInteraction,
>(): GridInteractionStore<TInteraction> => {
  let snapshot: TInteraction | null = null;
  const listeners = new Set<() => void>();
  const gridListeners = new Map<string, Set<() => void>>();

  return {
    getSnapshot: () => snapshot,
    getGridSnapshot: (sectionId) =>
      snapshot && (snapshot.sourceGridId === sectionId || snapshot.targetGridId === sectionId) ? snapshot : null,
    publish: (interaction) => {
      if (Object.is(snapshot, interaction)) return;
      const affectedGridIds = getAffectedGridIds(snapshot);
      for (const sectionId of getAffectedGridIds(interaction)) affectedGridIds.add(sectionId);
      snapshot = interaction;
      for (const listener of listeners) listener();
      for (const sectionId of affectedGridIds) {
        for (const listener of gridListeners.get(sectionId) ?? []) listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeGrid: (sectionId, listener) => {
      const sectionListeners = gridListeners.get(sectionId) ?? new Set<() => void>();
      sectionListeners.add(listener);
      gridListeners.set(sectionId, sectionListeners);
      return () => {
        sectionListeners.delete(listener);
        if (sectionListeners.size === 0) gridListeners.delete(sectionId);
      };
    },
  };
};
