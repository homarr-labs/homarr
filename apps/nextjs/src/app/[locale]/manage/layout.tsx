import type { PropsWithChildren } from "react";
import { AppShellMain } from "@mantine/core";
import {
  IconBook2,
  IconBox,
  IconBrandDiscord,
  IconBrandDocker,
  IconBrandGithub,
  IconCertificate,
  IconGitFork,
  IconHome,
  IconInfoSmall,
  IconLayoutDashboard,
  IconLogs,
  IconMailForward,
  IconPhoto,
  IconPlug,
  IconQuestionMark,
  IconReport,
  IconSearch,
  IconSettings,
  IconTool,
  IconUser,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { createDocumentationLink } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";

import { MainHeader } from "~/components/layout/header";
import type { NavigationLink } from "~/components/layout/navigation";
import { MainNavigation } from "~/components/layout/navigation";
import { ClientShell } from "~/components/layout/shell";

export default async function ManageLayout({ children }: PropsWithChildren) {
  const t = await getScopedI18n("management.navbar");
  const session = await auth();
  const navigationLinks: NavigationLink[] = [
    {
      label: t("items.home"),
      icon: IconHome,
      href: "/manage",
    },
    {
      icon: IconLayoutDashboard,
      href: "/manage/boards",
      label: t("items.boards"),
    },
    {
      icon: IconBox,
      href: "/manage/apps",
      label: t("items.apps"),
      hidden: !session,
    },
    {
      icon: IconPlug,
      href: "/manage/integrations",
      label: t("items.integrations"),
      hidden: !session,
    },
    {
      icon: IconSearch,
      href: "/manage/search-engines",
      label: t("items.searchEngies"),
      hidden: !session,
    },
    {
      icon: IconPhoto,
      href: "/manage/medias",
      label: t("items.medias"),
      hidden: !session,
    },
    {
      icon: IconUser,
      label: t("items.users.label"),
      hidden: !session?.user.permissions.includes("admin"),
      items: [
        {
          label: t("items.users.items.manage"),
          icon: IconUsers,
          href: "/manage/users",
        },
        {
          label: t("items.users.items.invites"),
          icon: IconMailForward,
          href: "/manage/users/invites",
          hidden: !isProviderEnabled("credentials"),
        },
        {
          label: t("items.users.items.groups"),
          icon: IconUsersGroup,
          href: "/manage/users/groups",
        },
      ],
    },
    {
      label: t("items.tools.label"),
      icon: IconTool,
      // As permissions always include there children permissions, we can check other-view-logs as admin includes it
      hidden: !session?.user.permissions.includes("other-view-logs"),
      items: [
        {
          label: t("items.tools.items.docker"),
          icon: IconBrandDocker,
          href: "/manage/tools/docker",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: t("items.tools.items.api"),
          icon: IconPlug,
          href: "/manage/tools/api",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: t("items.tools.items.logs"),
          icon: IconLogs,
          href: "/manage/tools/logs",
          hidden: !session?.user.permissions.includes("other-view-logs"),
        },
        {
          label: t("items.tools.items.certificates"),
          icon: IconCertificate,
          href: "/manage/tools/certificates",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: t("items.tools.items.tasks"),
          icon: IconReport,
          href: "/manage/tools/tasks",
          hidden: !session?.user.permissions.includes("admin"),
        },
      ],
    },
    {
      label: t("items.settings"),
      href: "/manage/settings",
      icon: IconSettings,
      hidden: !session?.user.permissions.includes("admin"),
    },
    {
      label: t("items.help.label"),
      icon: IconQuestionMark,
      items: [
        {
          label: t("items.help.items.documentation"),
          icon: IconBook2,
          href: createDocumentationLink("/docs/getting-started"),
          external: true,
        },
        {
          label: t("items.help.items.submitIssue"),
          icon: IconBrandGithub,
          href: "https://github.com/ajnart/homarr/issues/new/choose",
          external: true,
        },
        {
          label: t("items.help.items.discord"),
          icon: IconBrandDiscord,
          href: "https://discord.com/invite/aCsmEV5RgA",
          external: true,
        },
        {
          label: t("items.help.items.sourceCode"),
          icon: IconGitFork,
          href: "https://github.com/ajnart/homarr",
          external: true,
        },
      ],
    },
    {
      label: t("items.about"),
      icon: IconInfoSmall,
      href: "/manage/about",
    },
  ];

  return (
    <ClientShell hasNavigation>
      <MainHeader></MainHeader>
      <MainNavigation links={navigationLinks}></MainNavigation>
      <AppShellMain>{children}</AppShellMain>
    </ClientShell>
  );
}
