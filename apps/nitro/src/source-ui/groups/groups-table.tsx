import type { ReactNode } from "react";
import { Alert, Anchor, Box, Button, Card, Collapse, Group, Stack, Table, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

import type { GroupPresentation, GroupUserPresentation } from "./contracts";

export interface GroupsTableProps {
  groups: { id: string; name: string; members: GroupUserPresentation[] }[];
  presentation: GroupPresentation;
}

export interface GroupsListViewProps extends GroupsTableProps {
  search: string;
  onSearchChange: (value: string) => void;
  createOpen: boolean;
  onToggleCreate: () => void;
  createForm: ReactNode;
  writeHoldReason: string | null;
}

export function GroupsListView({
  groups,
  presentation,
  search,
  onSearchChange,
  createOpen,
  onToggleCreate,
  createForm,
  writeHoldReason,
}: GroupsListViewProps) {
  const tGroup = useI18n("group");
  return (
    <Stack>
      <Group justify="end">
        <Button onClick={onToggleCreate}>{tGroup("action.create.label")}</Button>
      </Group>
      <Collapse expanded={createOpen}>
        <Card withBorder>{createForm}</Card>
      </Collapse>
      <TextInput
        leftSection={<IconSearch size={20} stroke={1.5} />}
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder={`${tGroup("search")}...`}
      />
      {writeHoldReason && <Alert title="Group writes unavailable">{writeHoldReason}</Alert>}
      <Alert title="Group ordering unavailable">
        The original mouse, touch and keyboard sortable table is held until its existing DnD dependencies are declared
        and the accepted source join is frozen. Position writes remain unavailable.
      </Alert>
      <GroupsTable groups={groups} presentation={presentation} />
    </Stack>
  );
}

export function GroupsTable({ groups, presentation }: GroupsTableProps) {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  const Link = presentation.linkComponent;
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{tCommon("field.name")}</Table.Th>
          <Table.Th>{tGroup("field.members")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {groups.map((group) => (
          <Table.Tr key={group.id}>
            <Table.Td>
              <Group>
                <Box w={40} h="100%" />
                <Anchor component={Link} href={`/manage/users/groups/${group.id}`}>
                  {group.name}
                </Anchor>
              </Group>
            </Table.Td>
            <Table.Td>{presentation.renderAvatarGroup(group.members, "sm", 5)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
