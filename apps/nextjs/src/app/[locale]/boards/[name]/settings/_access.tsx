"use client";

import { useState } from "react";
import { Group, Stack, Tabs } from "@mantine/core";
import { IconUser, IconUserDown, IconUsersGroup } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { CountBadge } from "@homarr/ui";

import type { Board } from "../../_types";
import { GroupsForm } from "./_access/group-access";
import { InheritTable } from "./_access/inherit-access";
import { UsersForm } from "./_access/user-access";

interface Props {
  board: Board;
  initialPermissions: RouterOutputs["board"]["getBoardPermissions"];
}

export const AccessSettingsContent = ({ board, initialPermissions }: Props) => {
  const { data: permissions } = clientApi.board.getBoardPermissions.useQuery(
    {
      id: board.id,
    },
    {
      initialData: initialPermissions,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const [counts, setCounts] = useState({
    user: initialPermissions.userPermissions.length + (board.creator ? 1 : 0),
    group: initialPermissions.groupPermissions.length,
  });

  return (
    <Stack>
      <Tabs color="red" defaultValue="users">
        <Tabs.List grow>
          <Tabs.Tab
            value="users"
            leftSection={<IconUser stroke={1.5} size={16} />}
          >
            <Group gap="sm">
              Users
              <CountBadge count={counts.user} />
            </Group>
          </Tabs.Tab>
          <Tabs.Tab
            value="groups"
            leftSection={<IconUsersGroup stroke={1.5} size={16} />}
          >
            <Group gap="sm">
              Groups
              <CountBadge count={counts.group} />
            </Group>
          </Tabs.Tab>
          <Tabs.Tab
            value="inherited"
            leftSection={<IconUserDown stroke={1.5} size={16} />}
          >
            <Group gap="sm">
              Inherited groups
              <CountBadge count={initialPermissions.inherited.length} />
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users">
          <UsersForm
            board={board}
            initialPermissions={permissions}
            onCountChange={(callback) =>
              setCounts(({ user, ...others }) => ({
                user: callback(user),
                ...others,
              }))
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="groups">
          <GroupsForm
            board={board}
            initialPermissions={permissions}
            onCountChange={(callback) =>
              setCounts(({ group, ...others }) => ({
                group: callback(group),
                ...others,
              }))
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="inherited">
          <InheritTable initialPermissions={permissions} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
