"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { UserSelect } from "~/components/access/user-select";

interface AddGroupMemberProps {
  groupId: string;
  presentUserIds: string[];
  allowedProviders: SupportedAuthProvider[];
}

export const AddGroupMember = ({ groupId, presentUserIds, allowedProviders }: AddGroupMemberProps) => {
  const tMembersAdd = useI18n("group.action.addMember");
  const { mutateAsync } = clientApi.group.addMember.useMutation();
  const handleAddMember = useCallback(
    async ({ id }: { id: string }) => {
      await mutateAsync({
        userId: id,
        groupId,
      });
      await revalidatePathActionAsync(`/manage/users/groups/${groupId}/members`);
    },
    [groupId, mutateAsync],
  );

  return (
    <UserSelect
      presentUserIds={presentUserIds}
      allowedProviders={allowedProviders}
      onSelect={handleAddMember}
      triggerLabel={tMembersAdd("label")}
    />
  );
};
