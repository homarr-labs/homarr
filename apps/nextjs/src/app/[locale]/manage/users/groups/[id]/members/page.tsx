import Link from "next/link";
import { Anchor, Center, Group, Stack, Table, TableTbody, TableTd, TableTr, Text, Title } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getI18n, getScopedI18n } from "@homarr/translation/server";
import { SearchInput, UserAvatar } from "@homarr/ui";

import { AddGroupMember } from "./_add-group-member";
import { RemoveGroupMember } from "./_remove-group-member";

interface GroupsDetailPageProps {
  params: {
    id: string;
  };
  searchParams: {
    search: string | undefined;
  };
}

export default async function GroupsDetailPage({ params, searchParams }: GroupsDetailPageProps) {
  const t = await getI18n();
  const tMembers = await getScopedI18n("management.page.group.setting.members");
  const group = await api.group.getById({ id: params.id });

  const filteredMembers = searchParams.search
    ? group.members.filter((member) => member.name?.toLowerCase().includes(searchParams.search!.trim().toLowerCase()))
    : group.members;

  return (
    <Stack>
      <Title>{tMembers("title")}</Title>
      <Group justify="space-between">
        <SearchInput
          placeholder={t("common.rtl", {
            value: tMembers("search"),
            symbol: "...",
          })}
          defaultValue={searchParams.search}
        />
        <AddGroupMember groupId={group.id} presentUserIds={group.members.map((member) => member.id)} />
      </Group>
      {filteredMembers.length === 0 && (
        <Center py="sm">
          <Text fw={500} c="gray.6">
            {tMembers("notFound")}
          </Text>
        </Center>
      )}
      <Table striped highlightOnHover>
        <TableTbody>
          {filteredMembers.map((member) => (
            <Row key={group.id} member={member} groupId={group.id} />
          ))}
        </TableTbody>
      </Table>
    </Stack>
  );
}

interface RowProps {
  member: RouterOutputs["group"]["getPaginated"]["items"][number]["members"][number];
  groupId: string;
}

const Row = ({ member, groupId }: RowProps) => {
  return (
    <TableTr>
      <TableTd>
        <Group>
          <UserAvatar size="sm" user={member} />
          <Anchor component={Link} href={`/manage/users/${member.id}`}>
            {member.name}
          </Anchor>
        </Group>
      </TableTd>
      <TableTd w={100}>
        <RemoveGroupMember user={member} groupId={groupId} />
      </TableTd>
    </TableTr>
  );
};
