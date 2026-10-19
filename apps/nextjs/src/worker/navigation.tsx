"use client";

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
  IconPlugConnected,
  IconPointerFilled,
  IconRobot,
  IconSearch,
  IconSettingsFilled,
  IconUserFilled,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { getAppManagementAccess, getIntegrationManagementAccess, createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { homarrLogoPath } from "~/components/layout/logo/constants";
import type { NavigationLink } from "~/components/layout/navigation";
import { useWorkerBootstrap } from "./context";

/** Keep worker management in the same order and groups as the normal Homarr menu. */
export function useWorkerManagementLinks(): NavigationLink[] {
  const { session, runtime, integrationPermissions } = useWorkerBootstrap();
  const t = useI18n("management.navbar");
  const tEntities = useI18n("common.entity");
  const appsAccess = getAppManagementAccess(session.user.permissions);
  const integrationsAccess = getIntegrationManagementAccess(
    session.user.permissions,
    integrationPermissions.some((entry) => entry.permissions.hasFullAccess),
  );
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
      hidden: !appsAccess.canAccess,
      iconProps: {
        strokeWidth: 2.5,
      },
      "data-onboarding-tour-id": "manage-apps",
    },
    {
      icon: IconAffiliateFilled,
      href: "/manage/integrations",
      label: tEntities("integrations"),
      hidden: !integrationsAccess.canAccess,
      "data-onboarding-tour-id": "manage-integrations",
    },
    {
      icon: IconApi,
      href: "/manage/custom-widgets",
      label: tEntities("customWidgets"),
      hidden: !session?.user.permissions.includes("admin"),
    },
    {
      icon: IconSearch,
      href: "/manage/search-engines",
      label: tEntities("searchEngines"),
      hidden: !session?.user.permissions.includes("search-engine-create"),
      iconProps: {
        strokeWidth: 2.5,
      },
      "data-onboarding-tour-id": "manage-search-engines",
    },
    {
      icon: IconPhotoFilled,
      href: "/manage/medias",
      label: tEntities("media"),
      hidden: !session?.user.permissions.includes("media-upload"),
      "data-onboarding-tour-id": "manage-medias",
    },
    {
      icon: IconUserFilled,
      label: tEntities("users"),
      hidden: !session?.user.permissions.includes("admin"),
      "data-onboarding-tour-id": "manage-users",
      items: [
        {
          label: t("items.users.items.manage"),
          icon: IconUsers,
          href: "/manage/users",
        },
        {
          label: tEntities("invites"),
          icon: IconMailForward,
          href: "/manage/users/invites",
          hidden: !runtime.credentialsEnabled,
        },
        {
          label: tEntities("groups"),
          icon: IconUsersGroup,
          href: "/manage/users/groups",
        },
      ],
    },
    {
      label: t("items.tools.label"),
      icon: IconPointerFilled,
      // As permissions always include there children permissions, we can check other-view-logs as admin includes it
      hidden: !session?.user.permissions.includes("other-view-logs"),
      items: [
        {
          label: t("items.tools.items.docker"),
          icon: IconBrandDocker,
          href: "/manage/tools/docker",
          hidden: !(session?.user.permissions.includes("admin") && runtime.dockerEnabled),
        },
        {
          label: t("items.tools.items.kubernetes"),
          icon: IconBox,
          href: "/manage/tools/kubernetes",
          hidden: !(session?.user.permissions.includes("admin") && runtime.kubernetesEnabled),
        },
        {
          label: t("items.tools.items.api"),
          icon: IconDirectionsFilled,
          href: "/manage/tools/api",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: tEntities("logs"),
          icon: IconBrandTablerFilled,
          href: "/manage/tools/logs",
          hidden: !session?.user.permissions.includes("other-view-logs"),
        },
        {
          label: tEntities("certificates"),
          icon: IconCertificate,
          href: "/manage/tools/certificates",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: tEntities("tasks"),
          icon: IconClipboardListFilled,
          href: "/manage/tools/tasks",
          hidden: !session?.user.permissions.includes("admin"),
        },
        {
          label: t("items.tools.items.backup"),
          icon: IconDatabaseExport,
          href: "/manage/tools/backup",
          hidden: !session?.user.permissions.includes("admin") || runtime.databaseDriver !== "better-sqlite3",
        },
      ],
    },
    {
      label: t("items.assistant"),
      href: "/manage/assistant",
      icon: IconRobot,
      hidden: !session?.user.permissions.includes("admin"),
    },
    {
      label: t("items.settings"),
      href: "/manage/settings",
      icon: IconSettingsFilled,
      hidden: !session?.user.permissions.includes("admin"),
      "data-onboarding-tour-id": "manage-settings",
    },
    { label: "Worker", icon: IconPlugConnected, href: "/manage/workers" },
    {
      label: t("items.help.label"),
      icon: IconHelpSquareRoundedFilled,
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
    {
      label: t("items.about"),
      icon: homarrLogoPath,
      href: "/manage/about",
    },
  ];
}
