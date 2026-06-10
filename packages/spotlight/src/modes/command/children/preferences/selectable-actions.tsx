import { createCheckmarkPreferenceAction } from "./action-row";

interface SelectablePreferenceItem {
  key: string;
  label: string;
  value: string;
}

export const createSelectablePreferenceActions = ({
  query,
  currentValue,
  noneLabel,
  unavailableLabel,
  items,
  onSelect,
  isPending,
}: {
  query: string;
  currentValue: string | null;
  noneLabel: string;
  unavailableLabel: string;
  items: SelectablePreferenceItem[];
  onSelect: (value: string | null) => void;
  isPending?: boolean;
}) => {
  const hasCurrentSelection = currentValue !== null && !items.some((item) => item.value === currentValue);
  const orphanedItem: SelectablePreferenceItem | null = hasCurrentSelection
    ? { key: `orphaned-${currentValue}`, label: unavailableLabel, value: currentValue }
    : null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  const visibleItems = orphanedItem ? [orphanedItem, ...filteredItems] : filteredItems;

  const noneAction = createCheckmarkPreferenceAction({
    key: "none",
    label: noneLabel,
    isSelected: currentValue === null,
    onSelect: () => onSelect(null),
    dimmed: true,
    isPending,
  });

  const itemActions = visibleItems.map((item) =>
    createCheckmarkPreferenceAction({
      key: item.key,
      label: item.label,
      isSelected: currentValue === item.value,
      onSelect: () => onSelect(item.value),
      dimmed: item.key.startsWith("orphaned-"),
      isPending,
    }),
  );

  return [noneAction, ...itemActions];
};
