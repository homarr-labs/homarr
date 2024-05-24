import { Chip } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";

import { selectNextAction, selectPreviousAction, spotlightStore, triggerSelectedAction } from "./spotlight-store";
import type { SpotlightActionGroup } from "./type";

const disableArrowUpAndDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "ArrowDown") {
    selectNextAction(spotlightStore);
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    selectPreviousAction(spotlightStore);
    event.preventDefault();
  } else if (event.key === "Enter") {
    triggerSelectedAction(spotlightStore);
  }
};

const focusActiveByDefault = (event: React.FocusEvent<HTMLInputElement>) => {
  const relatedTarget = event.relatedTarget;

  const isPreviousTargetRadio = relatedTarget && "type" in relatedTarget && relatedTarget.type === "radio";
  if (isPreviousTargetRadio) return;

  const group = event.currentTarget.parentElement?.parentElement;
  if (!group) return;
  const label = group.querySelector<HTMLLabelElement>("label[data-checked]");
  if (!label) return;
  label.focus();
};

interface Props {
  group: SpotlightActionGroup;
}

export const GroupChip = ({ group }: Props) => {
  const t = useScopedI18n("common.search.group");
  return (
    <Chip key={group} value={group} onFocus={focusActiveByDefault} onKeyDown={disableArrowUpAndDown}>
      {t(group)}
    </Chip>
  );
};
