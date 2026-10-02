"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Collapse, Group, Stack, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

import { GroupCreateForm } from "./_components/group-create-form";
import { GroupsTable } from "./_groups-table";

interface GroupsListProps {
  groups: RouterOutputs["group"]["getAll"];
}

export const GroupsList = ({ groups }: GroupsListProps) => {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get("create") === "true");
  const [formKey, setFormKey] = useState(0);
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

  useEffect(() => {
    if (searchParams.get("create") !== "true") return;

    setFormKey((value) => value + 1);
    setIsCreateOpen(true);
  }, [searchParams]);

  const closeCreate = () => {
    setIsCreateOpen(false);
    setFormKey((value) => value + 1);
    if (searchParams.has("create")) router.replace("/manage/users/groups", { scroll: false });
  };

  const toggleCreate = () => {
    if (isCreateOpen) {
      closeCreate();
      return;
    }

    setFormKey((value) => value + 1);
    setIsCreateOpen(true);
  };

  return (
    <Stack>
      <Group justify="end">
        <Button onClick={toggleCreate}>{tGroup("action.create.label")}</Button>
      </Group>
      <Collapse expanded={isCreateOpen}>
        <Card withBorder>
          <GroupCreateForm
            key={formKey}
            onCancel={closeCreate}
            onCreated={() => {
              closeCreate();
              router.refresh();
            }}
          />
        </Card>
      </Collapse>
      <TextInput
        leftSection={<IconSearch size={20} stroke={1.5} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder={`${tGroup("search")}...`}
      />
      <GroupsTable groups={filteredGroups} initialGroupIds={initialGroupIds} hasFilter={search.length !== 0} />
    </Stack>
  );
};
