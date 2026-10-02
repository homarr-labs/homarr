"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmButton } from "@homarr/ui";

interface RemoveGroupMemberProps {
  groupId: string;
  user: { id: string; name: string | null };
}

export const RemoveGroupMember = ({ groupId, user }: RemoveGroupMemberProps) => {
  const tCommon = useI18n("common");
  const { mutateAsync } = clientApi.group.removeMember.useMutation();

  const handleRemove = useCallback(async () => {
    await mutateAsync({
      groupId,
      userId: user.id,
    });
    await revalidatePathActionAsync(`/manage/users/groups/${groupId}/members`);
  }, [mutateAsync, groupId, user.id]);

  return (
    <InlineConfirmButton
      variant="subtle"
      color="red.9"
      size="compact-sm"
      confirmLabel={tCommon("action.confirm")}
      onConfirm={handleRemove}
    >
      {tCommon("action.remove")}
    </InlineConfirmButton>
  );
};
