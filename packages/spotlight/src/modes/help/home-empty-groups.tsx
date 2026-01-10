import { Group, Kbd, Stack, Text } from "@mantine/core";
import {
  IconBook2,
  IconBrandDiscord,
  IconBrandGithub,
  IconLayoutDashboard,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { createDocumentationLink } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";
import type { SearchMode } from "../../lib/mode";
import { appIntegrationBoardMode } from "../app-integration-board";
import { commandMode } from "../command";
import { externalMode } from "../external";
import { pageMode } from "../page";
import { userGroupMode } from "../user-group";

type QuickLinkOption = {
  icon: TablerIcon;
  name: string;
  path: string;
};

export const useHomeEmptyGroups = () => {
  const { data: session } = useSession();
  const tPages = useScopedI18n("search.mode.page.group.page.option");
  const visibleSearchModes: SearchMode[] = [appIntegrationBoardMode, externalMode, commandMode, pageMode];

  if (session?.user.permissions.includes("admin")) {
    visibleSearchModes.unshift(userGroupMode);
  }

  return [
    createGroup({
      keyPath: "path",
      title: () => "Quick links",
      options: (() => {
        const quickLinks: QuickLinkOption[] = [];
        if (session?.user) {
          quickLinks.push({
            icon: IconSettings,
            path: `/manage/users/${session.user.id}/general`,
            name: tPages("preferences.label"),
          });
        }

        quickLinks.push({
          icon: IconLayoutDashboard,
          path: "/manage/boards",
          name: tPages("manageBoard.label"),
        });

        if (session?.user?.permissions.includes("admin")) {
          quickLinks.push({
            icon: IconSettings,
            path: "/manage/settings",
            name: tPages("manageSettings.label"),
          });
        }

        if (session) {
          quickLinks.push({
            icon: IconSearch,
            path: "/manage/search-engines",
            name: tPages("manageSearchEngine.label"),
          });
        }

        return quickLinks;
      })(),
      Component: ({ name, icon: Icon }) => (
        <Group px="md" py="xs" w="100%" wrap="nowrap" align="center">
          <Icon stroke={1.5} />
          <Text>{name}</Text>
        </Group>
      ),
      filter: () => true,
      useInteraction: interaction.link(({ path }) => ({ href: path })),
    }),
    createGroup({
      keyPath: "character",
      title: (t) => t("search.mode.help.group.mode.title"),
      options: visibleSearchModes.map(({ character, modeKey }) => ({ character, modeKey })),
      Component: ({ modeKey, character }) => {
        const t = useScopedI18n(`search.mode.${modeKey}`);

        return (
          <Group px="md" py="xs" w="100%" wrap="nowrap" align="center" justify="space-between">
            <Text>{t("help")}</Text>
            <Kbd size="sm">{character}</Kbd>
          </Group>
        );
      },
      filter: () => true,
      useInteraction: interaction.mode(({ modeKey }) => ({ mode: modeKey })),
    }),
    createGroup({
      keyPath: "href",
      title: (t) => t("search.mode.help.group.help.title"),
      useOptions() {
        const t = useScopedI18n("search.mode.help.group.help.option");

        return [
          {
            href: createDocumentationLink("/docs/getting-started"),
            icon: IconBook2,
            label: t("documentation.label"),
          },
          {
            href: "https://github.com/homarr-labs/homarr/issues/new/choose",
            icon: IconBrandGithub,
            label: t("submitIssue.label"),
          },
          {
            href: "https://discord.com/invite/aCsmEV5RgA",
            icon: IconBrandDiscord,
            label: t("discord.label"),
          },
        ];
      },
      Component: (props) => (
        <Group px="md" py="xs" w="100%" wrap="nowrap" align="center">
          <props.icon stroke={1.5} />
          <Text>{props.label}</Text>
        </Group>
      ),
      filter: () => true,
      useInteraction: interaction.link(({ href }) => ({ href, newTab: true })),
    }),
  ] as const;
};


