"use client";

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
  const { data: groups, isPending } = clientApi.group.selectable.useQuery({ withPermissions });
  const availableGroups = (groups ?? []).filter((group) => !presentGroupIds.includes(group.id));
  const options: AccessPickerOption<SelectableGroup>[] = availableGroups.map((group) => ({
    value: group.id,
    label: group.name,
    keywords: getGroupPermissions(group) ?? [],
    item: group,
    content: <Text size="sm">{group.name}</Text>,
  }));

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
      isPending={isPending}
      onSelect={handleSelect}
    />
  );
};

const getGroupPermissions = (group: SelectableGroup) => {
  if ("permissions" in group) return group.permissions as GroupPermissionKey[];
  return undefined;
};
