import { notFound } from "next/navigation";
import { Alert, Anchor, Center, Group, Stack, Table, TableTbody, TableTd, TableTr, Text, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import {
  getGroupMemberManagementType,
  getLocallyManageableProviders,
  isGroupMembershipManagedLocally,
} from "@homarr/auth/server";
import { everyoneGroup } from "@homarr/definitions";
import { getI18n, getScopedI18n } from "@homarr/translation/server";
import { Link, SearchInput, UserAvatar } from "@homarr/ui";

import { ReservedGroupAlert } from "../_reserved-group-alert";
import { AddGroupMember } from "./_add-group-member";
import { RemoveGroupMember } from "./_remove-group-member";

interface GroupsDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    search: string | undefined;
  }>;
}

export default async function GroupsDetailPage(props: GroupsDetailPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getI18n();
  const tMembers = await getScopedI18n("management.page.group.setting.members");
  const group = await api.group.getById({ id: params.id });
  const isReserved = group.name === everyoneGroup;

  const searchTerm = searchParams.search?.trim().toLowerCase();
  const filteredMembers = group.members.filter(
    (member) => !searchTerm || member.name?.toLowerCase().includes(searchTerm),
  );

  // "local" = every enabled provider managed locally, "external" = none, "mixed" = some.
  const managementType = getGroupMemberManagementType();
  const canManageMembers = managementType !== "external";
  const allowedProviders = getLocallyManageableProviders();

  return (
    <Stack>
      <Title>{tMembers("title")}</Title>

      {isReserved ? (
        <ReservedGroupAlert />
      ) : (
        managementType !== "local" && (
          <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
            {t(`group.memberNotice.${managementType}`)}
          </Alert>
        )
      )}

      <Group justify="space-between">
        <SearchInput placeholder={`${tMembers("search")}...`} defaultValue={searchParams.search} />
        {canManageMembers && !isReserved && (
          <AddGroupMember
            groupId={group.id}
            presentUserIds={group.members.map((member) => member.id)}
            allowedProviders={allowedProviders}
          />
        )}
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
            <Row key={group.id} member={member} groupId={group.id} disabled={isReserved} />
          ))}
        </TableTbody>
      </Table>
    </Stack>
  );
}

interface RowProps {
  member: RouterOutputs["group"]["getById"]["members"][number];
  groupId: string;
  disabled?: boolean;
}

const Row = ({ member, groupId, disabled }: RowProps) => {
  const canBeRemoved = isGroupMembershipManagedLocally(member.provider);

  return (
    <TableTr>
      <TableTd>
        <Group>
          <UserAvatar size="sm" user={member} />
          <Anchor component={Link} href={`/manage/users/${member.id}/general`}>
            {member.name}
          </Anchor>
        </Group>
      </TableTd>
      <TableTd w={100}>{canBeRemoved && !disabled && <RemoveGroupMember user={member} groupId={groupId} />}</TableTd>
    </TableTr>
  );
};
