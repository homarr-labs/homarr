"use client";

import { useCallback, useState } from "react";
import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { UserSelectModal } from "~/app/[locale]/boards/[name]/settings/_access";

interface TransferGroupOwnershipProps {
  group: {
    id: string;
    name: string;
    ownerId: string | null;
  };
}

export const TransferGroupOwnership = ({
  group,
}: TransferGroupOwnershipProps) => {
  const tTransfer = useScopedI18n("group.action.transfer");
  const t = useI18n();
  const [innerOwnerId, setInnerOwnerId] = useState(group.ownerId);
  const { openModal } = useModalAction(UserSelectModal);
  const { openConfirmModal } = useConfirmModal();
  const { mutateAsync } = clientApi.group.transferOwnership.useMutation();

  const handleTransfer = useCallback(() => {
    openModal(
      {
        confirmLabel: t("common.action.continue"),
        presentUserIds: innerOwnerId ? [innerOwnerId] : [],
        onSelect: ({ id, name }) => {
          openConfirmModal({
            title: tTransfer("label"),
            children: tTransfer("confirm", {
              name: group.name,
              username: name,
            }),
            onConfirm: async () => {
              await mutateAsync(
                {
                  groupId: group.id,
                  userId: id,
                },
                {
                  onSuccess() {
                    setInnerOwnerId(id);
                    showSuccessNotification({
                      title: t("common.notification.transfer.success"),
                      message: tTransfer("notification.success.message", {
                        group: group.name,
                        user: name,
                      }),
                    });
                  },
                  onError() {
                    showErrorNotification({
                      title: t("common.notification.transfer.error"),
                      message: tTransfer("notification.error.message"),
                    });
                  },
                },
              );
            },
          });
        },
      },
      {
        title: tTransfer("label"),
      },
    );
  }, [
    group.id,
    group.name,
    innerOwnerId,
    mutateAsync,
    openConfirmModal,
    openModal,
    t,
    tTransfer,
  ]);

  return (
    <Button variant="subtle" color="red" onClick={handleTransfer}>
      {tTransfer("label")}
    </Button>
  );
};
