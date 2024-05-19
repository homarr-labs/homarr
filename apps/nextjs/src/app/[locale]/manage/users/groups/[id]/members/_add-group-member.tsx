"use client";

import { useCallback } from "react";
import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { UserSelectModal } from "~/app/[locale]/boards/[name]/settings/_access/user-select-modal";
import { revalidatePathActionAsync } from "~/app/revalidatePathAction";

interface AddGroupMemberProps {
  groupId: string;
  presentUserIds: string[];
}

export const AddGroupMember = ({ groupId, presentUserIds }: AddGroupMemberProps) => {
  const tMembersAdd = useScopedI18n("group.action.addMember");
  const { mutateAsync } = clientApi.group.addMember.useMutation();
  const { openModal } = useModalAction(UserSelectModal);

  const handleAddMember = useCallback(() => {
    openModal(
      {
        // eslint-disable-next-line no-restricted-syntax
        async onSelect({ id }) {
          await mutateAsync({
            userId: id,
            groupId,
          });
          await revalidatePathActionAsync(`/manage/users/groups/${groupId}}/members`);
        },
        presentUserIds,
      },
      {
        title: tMembersAdd("label"),
      },
    );
  }, [openModal, presentUserIds, groupId, mutateAsync, tMembersAdd]);

  return (
    <Button color="teal" onClick={handleAddMember}>
      {tMembersAdd("label")}
    </Button>
  );
};
