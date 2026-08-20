"use client";

import { useMemo, useState } from "react";
import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useModalAction } from "@homarr/modals";
import { AddGroupModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { GroupsTable } from "./_groups-table";

interface GroupsListProps {
  groups: RouterOutputs["group"]["getAll"];
}

export const GroupsList = ({ groups }: GroupsListProps) => {
  const [search, setSearch] = useState("");
  const initialGroupIds = useMemo(
    () => groups.sort((groupA, groupB) => groupA.position - groupB.position).map((group) => group.id),
    [groups],
  );
  const filteredGroups = useMemo(
    () =>
      groups
        .filter((group) => group.name.toLowerCase().includes(search.toLowerCase()))
        .sort((groupA, groupB) => groupA.position - groupB.position),
    [groups, search],
  );
  const tGroup = useI18n("group");

  return (
    <>
      <TextInput
        leftSection={<IconSearch size={20} stroke={1.5} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder={`${tGroup("search")}...`}
      />
      <GroupsTable groups={filteredGroups} initialGroupIds={initialGroupIds} hasFilter={search.length !== 0} />
    </>
  );
};

export const AddGroupButton = () => {
  const tGroup = useI18n("group");
  const { openModal } = useModalAction(AddGroupModal);

  return <MobileAffixButton onClick={() => openModal()}>{tGroup("action.create.label")}</MobileAffixButton>;
};
