import { Chip } from "@homarr/ui";

import {
  selectNextAction,
  selectPreviousAction,
  spotlightStore,
  triggerSelectedAction,
} from "./spotlight-store";

const disableArrowUpAndDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "ArrowDown") {
    selectNextAction(spotlightStore);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    selectPreviousAction(spotlightStore);
    e.preventDefault();
  } else if (e.key === "Enter") {
    triggerSelectedAction(spotlightStore);
  }
};

const focusCurrentByDefault = (e: React.FocusEvent<HTMLInputElement>) => {
  const relatedTarget = e.relatedTarget;
  if (
    !relatedTarget ||
    !("type" in relatedTarget && relatedTarget.type === "radio")
  ) {
    const group = e.currentTarget.parentElement?.parentElement;
    if (!group) return;
    const checkedLabelInGroup = group.querySelector("label[data-checked]");
    if (!checkedLabelInGroup) return;
    if (!("focus" in checkedLabelInGroup)) return;
    const label = checkedLabelInGroup as HTMLLabelElement;
    label.focus();
  }
};

interface Props {
  group: string;
}

export const GroupChip = ({ group }: Props) => {
  return (
    <Chip
      key={group}
      value={group}
      onFocus={focusCurrentByDefault}
      onKeyDown={disableArrowUpAndDown}
    >
      {group}
    </Chip>
  );
};
