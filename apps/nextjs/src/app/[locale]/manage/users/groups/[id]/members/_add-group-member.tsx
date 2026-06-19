"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { UserSelectModal } from "~/components/access/user-select-modal";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

interface AddGroupMemberProps {
  groupId: string;
  presentUserIds: string[];
  allowedProviders: SupportedAuthProvider[];
}

export const AddGroupMember = ({ groupId, presentUserIds, allowedProviders }: AddGroupMemberProps) => {
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
        allowedProviders,
      },
      {
        title: tMembersAdd("label"),
      },
    );
  }, [openModal, presentUserIds, groupId, mutateAsync, tMembersAdd, allowedProviders]);

  return <MobileAffixButton onClick={handleAddMember}>{tMembersAdd("label")}</MobileAffixButton>;
};
