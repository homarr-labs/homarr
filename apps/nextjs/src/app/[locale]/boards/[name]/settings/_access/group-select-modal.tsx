import { useState } from "react";
import { Button, Group, Loader, Select, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface InnerProps {
  presentGroupIds: string[];
  onSelect: (props: { id: string; name: string }) => void | Promise<void>;
  confirmLabel?: string;
}

interface GroupSelectFormType {
  groupId: string;
}

export const GroupSelectModal = createModal<InnerProps>(
  ({ actions, innerProps }) => {
    const t = useI18n();
    const { data: groups, isPending } = clientApi.group.selectable.useQuery();
    const [loading, setLoading] = useState(false);
    const form = useForm<GroupSelectFormType>();
    const handleSubmit = async (values: GroupSelectFormType) => {
      const currentGroup = groups?.find((group) => group.id === values.groupId);
      if (!currentGroup) return;
      setLoading(true);
      await innerProps.onSelect({
        id: currentGroup.id,
        name: currentGroup.name,
      });

      setLoading(false);
      actions.closeModal();
    };

    const confirmLabel = innerProps.confirmLabel ?? t("common.action.add");

    return (
      <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
        <Stack>
          <Select
            {...form.getInputProps("groupId")}
            label={t("group.action.select.label")}
            searchable
            leftSection={isPending ? <Loader size="xs" /> : undefined}
            nothingFoundMessage={t("group.action.select.notFound")}
            limit={5}
            data={groups
              ?.filter(
                (group) => !innerProps.presentGroupIds.includes(group.id),
              )
              .map((group) => ({ value: group.id, label: group.name }))}
          />
          <Group justify="end">
            <Button variant="default" onClick={actions.closeModal}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" loading={loading}>
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  },
).withOptions({
  defaultTitle: (t) =>
    t("board.setting.section.access.permission.groupSelect.title"),
});
