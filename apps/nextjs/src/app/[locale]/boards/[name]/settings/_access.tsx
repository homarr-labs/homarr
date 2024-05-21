"use client";

import { useState } from "react";
import { Group, Stack, Tabs } from "@mantine/core";
import { IconUser, IconUserDown, IconUsersGroup } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
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
      <Tabs color="red" defaultValue="user">
        <Tabs.List grow>
          <TabItem value="user" count={counts.user} icon={IconUser} />
          <TabItem value="group" count={counts.group} icon={IconUsersGroup} />
          <TabItem value="inherited" count={initialPermissions.inherited.length} icon={IconUserDown} />
        </Tabs.List>

        <Tabs.Panel value="user">
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

        <Tabs.Panel value="group">
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

interface TabItemProps {
  value: "user" | "group" | "inherited";
  count: number;
  icon: TablerIcon;
}

const TabItem = ({ value, icon: Icon, count }: TabItemProps) => {
  const t = useScopedI18n("board.setting.section.access.permission");

  return (
    <Tabs.Tab value={value} leftSection={<Icon stroke={1.5} size={16} />}>
      <Group gap="sm">
        {t(`tab.${value}`)}
        <CountBadge count={count} />
      </Group>
    </Tabs.Tab>
  );
};
