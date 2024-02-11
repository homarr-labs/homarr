import { useScopedI18n } from "@homarr/translation/client";
import { Chip } from "@homarr/ui";

import {
  selectNextAction,
  selectPreviousAction,
  spotlightStore,
  triggerSelectedAction,
} from "./spotlight-store";
import type { SpotlightActionData } from "./type";

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

const focusActiveByDefault = (e: React.FocusEvent<HTMLInputElement>) => {
  const relatedTarget = e.relatedTarget;

  const isPreviousTargetRadio =
    relatedTarget && "type" in relatedTarget && relatedTarget.type === "radio";
  if (isPreviousTargetRadio) return;

  const group = e.currentTarget.parentElement?.parentElement;
  if (!group) return;
  const label = group.querySelector<HTMLLabelElement>("label[data-checked]");
  if (!label) return;
  label.focus();
};

interface Props {
  group: SpotlightActionData["group"];
}

export const GroupChip = ({ group }: Props) => {
  const t = useScopedI18n("common.search.group");
  return (
    <Chip
      key={group}
      value={group}
      onFocus={focusActiveByDefault}
      onKeyDown={disableArrowUpAndDown}
    >
      {t(group)}
    </Chip>
  );
};
