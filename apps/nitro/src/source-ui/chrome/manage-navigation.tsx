import {
  IconAffiliateFilled,
  IconApi,
  IconBook2,
  IconBox,
  IconBrandDiscord,
  IconBrandDocker,
  IconBrandGithub,
  IconBrandTablerFilled,
  IconCertificate,
  IconClipboardListFilled,
  IconDatabaseExport,
  IconDirectionsFilled,
  IconGitFork,
  IconHelpSquareRoundedFilled,
  IconHomeFilled,
  IconLayoutDashboardFilled,
  IconMailForward,
  IconPhotoFilled,
  IconPointerFilled,
  IconRobot,
  IconSearch,
  IconSettingsFilled,
  IconUserFilled,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import type { NavigationLink } from "./contracts";

export interface ManagementNavigationAccess {
  readonly apps: boolean;
  readonly integrations: boolean;
  readonly admin: boolean;
  readonly searchEngineCreate: boolean;
  readonly mediaUpload: boolean;
  readonly viewLogs: boolean;
  readonly credentials: boolean;
  readonly docker: boolean;
  readonly kubernetes: boolean;
  readonly backup: boolean;
}

export interface ManagementNavigationOptions {
  readonly access: ManagementNavigationAccess;
  readonly navbarLabel: (key: string) => string;
  readonly entityLabel: (key: string) => string;
  readonly documentationHref: string;
  readonly homarrLogoPath: string;
}

export function createManagementNavigation({
  access,
  navbarLabel: t,
  entityLabel: tEntities,
  documentationHref,
  homarrLogoPath,
}: ManagementNavigationOptions): NavigationLink[] {
  return [
    {
      label: t("items.home"),
      icon: IconHomeFilled,
      href: "/manage",
      exact: true,
      "data-onboarding-tour-id": "manage-welcome",
    },
    {
      icon: IconLayoutDashboardFilled,
      href: "/manage/boards",
      label: tEntities("boards"),
      "data-onboarding-tour-id": "manage-boards",
    },
    {
      icon: IconBox,
      href: "/manage/apps",
      label: tEntities("apps"),
      hidden: !access.apps,
      iconProps: { strokeWidth: 2.5 },
      "data-onboarding-tour-id": "manage-apps",
    },
    {
      icon: IconAffiliateFilled,
      href: "/manage/integrations",
      label: tEntities("integrations"),
      hidden: !access.integrations,
      "data-onboarding-tour-id": "manage-integrations",
    },
    {
      icon: IconApi,
      href: "/manage/custom-widgets",
      label: tEntities("customWidgets"),
      hidden: !access.admin,
    },
    {
      icon: IconSearch,
      href: "/manage/search-engines",
      label: tEntities("searchEngines"),
      hidden: !access.searchEngineCreate,
      iconProps: { strokeWidth: 2.5 },
      "data-onboarding-tour-id": "manage-search-engines",
    },
    {
      icon: IconPhotoFilled,
      href: "/manage/medias",
      label: tEntities("media"),
      hidden: !access.mediaUpload,
      "data-onboarding-tour-id": "manage-medias",
    },
    {
      icon: IconUserFilled,
      label: tEntities("users"),
      hidden: !access.admin,
      "data-onboarding-tour-id": "manage-users",
      items: [
        { label: t("items.users.items.manage"), icon: IconUsers, href: "/manage/users" },
        {
          label: tEntities("invites"),
          icon: IconMailForward,
          href: "/manage/users/invites",
          hidden: !access.credentials,
        },
        { label: tEntities("groups"), icon: IconUsersGroup, href: "/manage/users/groups" },
      ],
    },
    {
      label: t("items.tools.label"),
      icon: IconPointerFilled,
      hidden: !access.viewLogs,
      items: [
        {
          label: t("items.tools.items.docker"),
          icon: IconBrandDocker,
          href: "/manage/tools/docker",
          hidden: !(access.admin && access.docker),
        },
        {
          label: t("items.tools.items.kubernetes"),
          icon: IconBox,
          href: "/manage/tools/kubernetes",
          hidden: !(access.admin && access.kubernetes),
        },
        {
          label: t("items.tools.items.api"),
          icon: IconDirectionsFilled,
          href: "/manage/tools/api",
          hidden: !access.admin,
        },
        { label: tEntities("logs"), icon: IconBrandTablerFilled, href: "/manage/tools/logs", hidden: !access.viewLogs },
        {
          label: tEntities("certificates"),
          icon: IconCertificate,
          href: "/manage/tools/certificates",
          hidden: !access.admin,
        },
        {
          label: tEntities("tasks"),
          icon: IconClipboardListFilled,
          href: "/manage/tools/tasks",
          hidden: !access.admin,
        },
        {
          label: t("items.tools.items.backup"),
          icon: IconDatabaseExport,
          href: "/manage/tools/backup",
          hidden: !access.admin || !access.backup,
        },
      ],
    },
    { label: t("items.assistant"), href: "/manage/assistant", icon: IconRobot, hidden: !access.admin },
    {
      label: t("items.settings"),
      href: "/manage/settings",
      icon: IconSettingsFilled,
      hidden: !access.admin,
      "data-onboarding-tour-id": "manage-settings",
    },
    {
      label: t("items.help.label"),
      icon: IconHelpSquareRoundedFilled,
      items: [
        { label: t("items.help.items.documentation"), icon: IconBook2, href: documentationHref, external: true },
        {
          label: t("items.help.items.submitIssue"),
          icon: IconBrandGithub,
          href: "https://github.com/homarr-labs/homarr/issues/new/choose",
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
          href: "https://github.com/homarr-labs/homarr",
          external: true,
        },
      ],
    },
    { label: t("items.about"), icon: homarrLogoPath, href: "/manage/about" },
  ];
}
