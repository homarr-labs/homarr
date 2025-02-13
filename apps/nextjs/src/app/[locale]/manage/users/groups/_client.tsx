"use client";

import { useCallback, useState } from "react";
import { Group, TextInput } from "@mantine/core";
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
  const filteredGroups = groups.filter((group) => group.name.toLowerCase().includes(search.toLowerCase()));
  const t = useI18n();

  return (
    <>
      <Group justify="space-between">
        <TextInput
          leftSection={<IconSearch size={20} stroke={1.5} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={`${t("group.search")}...`}
          style={{ flex: 1 }}
        />
        <AddGroup />
      </Group>

      <GroupsTable groups={filteredGroups} hasFilter={search.length !== 0} />
    </>
  );
};

const AddGroup = () => {
  const t = useI18n();
  const { openModal } = useModalAction(AddGroupModal);

  const handleAddGroup = useCallback(() => {
    openModal();
  }, [openModal]);

  return (
    <MobileAffixButton onClick={handleAddGroup} color="teal">
      {t("group.action.create.label")}
    </MobileAffixButton>
  );
};
