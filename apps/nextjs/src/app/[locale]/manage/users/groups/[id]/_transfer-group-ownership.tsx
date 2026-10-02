"use client";

import { useState } from "react";
import { Button, Group, Stack, Text, useMatches } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { UserSelect } from "~/components/access/user-select";

interface TransferGroupOwnershipProps {
  group: {
    id: string;
    name: string;
    ownerId: string | null;
  };
}

interface SelectedOwner {
  id: string;
  name: string;
}

export const TransferGroupOwnership = ({ group }: TransferGroupOwnershipProps) => {
  const tTransfer = useI18n("group.action.transfer");
  const tCommon = useI18n("common");
  const [innerOwnerId, setInnerOwnerId] = useState(group.ownerId);
  const [selectedOwner, setSelectedOwner] = useState<SelectedOwner>();
  const { mutateAsync, isPending } = clientApi.group.transferOwnership.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync(`/manage/users/groups/${group.id}`);
    },
  });

  const handleTransfer = async () => {
    if (!selectedOwner) return;

    await mutateAsync(
      {
        groupId: group.id,
        userId: selectedOwner.id,
      },
      {
        onSuccess() {
          setInnerOwnerId(selectedOwner.id);
          showSuccessNotification({
            title: tCommon("notification.transfer.success"),
            message: tTransfer("notification.success.message", {
              group: group.name,
              user: selectedOwner.name,
            }),
          });
          setSelectedOwner(undefined);
        },
        onError() {
          showErrorNotification({
            title: tCommon("notification.transfer.error"),
            message: tTransfer("notification.error.message"),
          });
        },
      },
    );
  };

  const fullWidth = useMatches({
    xs: true,
    sm: true,
    md: false,
  });
  const presentUserIds: string[] = [];
  if (innerOwnerId) presentUserIds.push(innerOwnerId);

  if (!selectedOwner) {
    return (
      <UserSelect
        presentUserIds={presentUserIds}
        onSelect={setSelectedOwner}
        triggerLabel={tTransfer("label")}
        triggerProps={{ variant: "subtle", color: "red", fullWidth }}
      />
    );
  }

  return (
    <Stack gap="xs" maw={420}>
      <Text size="sm">
        {tTransfer("confirm", {
          name: group.name,
          username: selectedOwner.name,
        })}
      </Text>
      <Group justify="end" wrap="wrap">
        <Button variant="default" onClick={() => setSelectedOwner(undefined)} disabled={isPending}>
          {tCommon("action.cancel")}
        </Button>
        <Button color="red" onClick={() => void handleTransfer()} loading={isPending}>
          {tCommon("action.confirm")}
        </Button>
      </Group>
    </Stack>
  );
};
