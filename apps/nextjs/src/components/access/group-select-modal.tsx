import { useState } from "react";
import { Button, Group, Loader, Select, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { GroupPermissionKey } from "@homarr/definitions";
import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface InnerProps {
  withPermissions?: boolean;
  presentGroupIds: string[];
  onSelect: (props: { id: string; name: string; permissions?: GroupPermissionKey[] }) => void | Promise<void>;
  confirmLabel?: string;
}

interface GroupSelectFormType {
  groupId: string;
}

export const GroupSelectModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const tGroup = useI18n("group.action.select");
  const tCommon = useI18n("common");
  const { data: groups, isPending } = clientApi.group.selectable.useQuery({
    withPermissions: innerProps.withPermissions,
  });
  const [loading, setLoading] = useState(false);
  const form = useForm<GroupSelectFormType>();
  const handleSubmitAsync = async (values: GroupSelectFormType) => {
    const currentGroup = groups?.find((group) => group.id === values.groupId);
    if (!currentGroup) return;
    setLoading(true);
    await innerProps.onSelect({
      id: currentGroup.id,
      name: currentGroup.name,
      permissions: "permissions" in currentGroup ? (currentGroup.permissions as GroupPermissionKey[]) : undefined,
    });

    setLoading(false);
    actions.closeModal();
  };

  const confirmLabel = innerProps.confirmLabel ?? tCommon("action.add");

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack>
        <Select
          {...form.getInputProps("groupId")}
          label={tGroup("label")}
          clearable
          searchable
          leftSection={isPending ? <Loader size="xs" /> : undefined}
          nothingFoundMessage={tGroup("notFound")}
          limit={5}
          data={groups
            ?.filter((group) => !innerProps.presentGroupIds.includes(group.id))
            .map((group) => ({ value: group.id, label: group.name }))}
        />
        <Group justify="end">
          <Button variant="default" onClick={actions.closeModal}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("permission.groupSelect.title"),
});
