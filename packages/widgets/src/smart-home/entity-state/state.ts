export interface LocalizedEntityStates {
  on: string;
  off: string;
  unavailable: string;
  unknown: string;
}

export const getEntityStateLabel = (state: string | undefined, labels: LocalizedEntityStates) => {
  if (!state) return "—";
  return Object.hasOwn(labels, state) ? labels[state as keyof LocalizedEntityStates] : state;
};
