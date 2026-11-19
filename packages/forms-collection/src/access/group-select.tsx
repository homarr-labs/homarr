"use client";

import { useState } from "react";
import { Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { GroupPermissionKey } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { AccessPickerOption, AccessPickerTriggerProps } from "./access-picker";
import { AccessPicker } from "./access-picker";

type SelectableGroup = RouterOutputs["group"]["selectable"][number];

interface GroupSelectProps {
  withPermissions?: boolean;
  presentGroupIds: string[];
  onSelect: (group: { id: string; name: string; permissions?: GroupPermissionKey[] }) => void | Promise<void>;
  triggerLabel?: string;
  triggerProps?: AccessPickerTriggerProps;
}

export const GroupSelect = ({
  withPermissions,
  presentGroupIds,
  onSelect,
  triggerLabel,
  triggerProps,
}: GroupSelectProps) => {
  const tGroup = useI18n("group.action.select");
  const tCommon = useI18n("common");
  const [opened, setOpened] = useState(false);
  const { data: groups, isPending } = clientApi.group.selectable.useQuery({ withPermissions }, { enabled: opened });
  const options: AccessPickerOption<SelectableGroup>[] = [];
  if (opened) {
    const presentGroupIdSet = new Set(presentGroupIds);
    for (const group of groups ?? []) {
      if (presentGroupIdSet.has(group.id)) continue;
      options.push({
        value: group.id,
        label: group.name,
        keywords: getGroupPermissions(group) ?? [],
        item: group,
      });
    }
  }

  const handleSelect = ({ item: group }: AccessPickerOption<SelectableGroup>) =>
    onSelect({
      id: group.id,
      name: group.name,
      permissions: getGroupPermissions(group),
    });

  return (
    <AccessPicker
      label={tGroup("label")}
      searchPlaceholder={tGroup("label")}
      emptyMessage={tGroup("notFound")}
      triggerLabel={triggerLabel ?? tCommon("action.add")}
      triggerProps={triggerProps}
      options={options}
      renderOption={renderGroupOption}
      isPending={isPending}
      onOpenedChange={setOpened}
      onSelect={handleSelect}
    />
  );
};

const renderGroupOption = ({ item: group }: AccessPickerOption<SelectableGroup>) => <Text size="sm">{group.name}</Text>;

const getGroupPermissions = (group: SelectableGroup) => {
  if ("permissions" in group) return group.permissions as GroupPermissionKey[];
  return undefined;
};
