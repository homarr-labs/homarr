import { Group, Text } from "@mantine/core";
import {
  IconBox,
  IconBrandDocker,
  IconHome,
  IconInfoSmall,
  IconLayoutDashboard,
  IconLogs,
  IconMailForward,
  IconPlug,
  IconReport,
  IconSettings,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../group";
import { interaction } from "../../interaction";

export const pagesSearchGroup = createGroup<{
  icon: TablerIcon;
  name: string;
  path: string;
}>({
  title: "Pages",
  component: ({ name, icon: Icon }) => (
    <Group px="md" py="sm">
      <Icon stroke={1.5} />
      <Text>{name}</Text>
    </Group>
  ),
  interaction: interaction.link(({ path }) => ({ href: path })),
  filter: (query, { name, path }) => {
    const normalizedQuery = query.trim().toLowerCase();
    return name.toLowerCase().includes(normalizedQuery) || path.toLowerCase().includes(normalizedQuery);
  },
  sort: (query, options) => {
    const normalizedQuery = query.trim().toLowerCase();

    const nameMatches = options.map((option) => option.name.toLowerCase().includes(normalizedQuery));
    const pathMatches = options.map((option) => option.path.toLowerCase().includes(normalizedQuery));

    if (nameMatches.every(Boolean) && pathMatches.every(Boolean)) {
      return 0;
    }

    if (nameMatches.every(Boolean) && !pathMatches.every(Boolean)) {
      return pathMatches[0] ? -1 : 1;
    }

    return nameMatches[0] ? -1 : 1;
  },
  useOptions() {
    const { data: session } = useSession();

    const managePages = [
      {
        icon: IconHome,
        path: "/manage",
        name: "Manage home page",
      },
      {
        icon: IconLayoutDashboard,
        path: "/manage/boards",
        name: "Manage boards",
      },
      {
        icon: IconBox,
        path: "/manage/apps",
        name: "Manage apps",
        hidden: !session,
      },
      {
        icon: IconPlug,
        path: "/manage/integrations",
        name: "Manage integrations",
        hidden: !session,
      },
      {
        icon: IconUsers,
        path: "/manage/users",
        name: "Manage users",
        hidden: !session,
      },
      {
        icon: IconMailForward,
        path: "/manage/users/invites",
        name: "Manage invites",
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        icon: IconUsersGroup,
        path: "/manage/users/groups",
        name: "Manage groups",
        hidden: !session,
      },
      {
        icon: IconBrandDocker,
        path: "/manage/tools/docker",
        name: "Manage Docker",
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        icon: IconPlug,
        path: "/manage/tools/api",
        name: "Manage API",
        hidden: !session,
      },
      {
        icon: IconLogs,
        path: "/manage/tools/logs",
        name: "Manage logs",
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        icon: IconReport,
        path: "/manage/tools/tasks",
        name: "Manage tasks",
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        icon: IconSettings,
        path: "/manage/settings",
        name: "Global settings",
        hidden: !session?.user.permissions.includes("admin"),
      },
      {
        icon: IconInfoSmall,
        path: "/manage/about",
        name: "About",
      },
    ];

    const otherPages = [
      {
        icon: IconHome,
        path: "/boards",
        name: "Home board",
      },
      {
        icon: IconSettings,
        path: `/manage/users/${session?.user.id}/general`,
        name: "Your preferences",
        hidden: !session,
      },
    ];

    return otherPages.concat(managePages).filter(({ hidden }) => !hidden);
  },
});
