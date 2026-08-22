"use client";

import { usePathname } from "next/navigation";
import { Anchor, Badge, Breadcrumbs, Text } from "@mantine/core";
import { IconHomeFilled } from "@tabler/icons-react";

import type { TranslationKeys } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

interface DynamicBreadcrumbProps {
  customHome?: string | null;
  customHomeLink?: string;
  dynamicMappings?: Map<string, string>;
  nonInteractable?: string[];
}

const categorySegments = new Set(["tools"]);
const commonActionLabels: Record<string, "create" | "edit"> = {
  "manage.integrations.edit": "edit",
  "manage.search-engines.edit": "edit",
  "manage.apps.edit": "edit",
  "manage.custom-widgets.edit": "edit",
  "manage.users.create": "create",
};
const commonLabelLabels: Record<string, "new"> = {
  "manage.integrations.new": "new",
  "manage.search-engines.new": "new",
  "manage.apps.new": "new",
  "manage.custom-widgets.new": "new",
};
const commonEntityLabels: Record<
  string,
  | "apps"
  | "boards"
  | "certificates"
  | "customWidgets"
  | "groups"
  | "integrations"
  | "invites"
  | "logs"
  | "media"
  | "searchEngines"
  | "tasks"
  | "users"
> = {
  "manage.boards": "boards",
  "manage.integrations": "integrations",
  "manage.apps": "apps",
  "manage.custom-widgets": "customWidgets",
  "manage.medias": "media",
  "manage.search-engines": "searchEngines",
  "manage.users": "users",
  "manage.users.groups": "groups",
  "manage.users.invites": "invites",
  "manage.tools.certificates": "certificates",
  "manage.tools.docker.logs": "logs",
  "manage.tools.logs": "logs",
  "manage.tools.tasks": "tasks",
};
const invariantLabels: Record<string, "Docker" | "Kubernetes"> = {
  "manage.tools.docker": "Docker",
  "manage.tools.kubernetes": "Kubernetes",
};

/**
 * Breadcrumb is client side rendered. Elements are automatically
 * calculated and translated using dynamic keys.
 * For dynamic routes (e.g. UIDs, names , ...),
 * you can pass dynamic mappings to define their values
 * in your parent component.
 * @constructor
 */
export const DynamicBreadcrumb = ({
  dynamicMappings,
  customHome = "manage",
  customHomeLink = "/manage",
  nonInteractable,
}: DynamicBreadcrumbProps) => {
  const pathname = usePathname();
  const pathnameParts = pathname.split("/").filter((part) => part.length > 0);
  const t = useI18n("navigationStructure");
  const tNavbar = useI18n("management.navbar.items");
  const tCommonAction = useI18n("common.action");
  const tCommonEntity = useI18n("common.entity");
  const tCommonLabel = useI18n("common.label");

  const length = pathnameParts.filter((part) => part !== customHome).length;

  if (length === 0) {
    return null;
  }

  return (
    <Breadcrumbs w="100%" mb="md">
      <Badge
        styles={{ root: { cursor: "pointer" } }}
        component={"a"}
        href={customHomeLink}
        leftSection={<IconHomeFilled size="1rem" />}
        variant="default"
        tt="initial"
        h="auto"
      >
        <Text fw="bold">{tNavbar("home")}</Text>
      </Badge>
      {pathnameParts.map((pathnamePart, index) => {
        if (pathnamePart === customHome) {
          return null;
        }
        const href = `/${pathnameParts.slice(0, index + 1).join("/")}`;
        const translationKey = `${pathnameParts.slice(0, index + 1).join(".")}`;
        const mappedValue = dynamicMappings?.get(pathnamePart);

        const isNonInteractable =
          nonInteractable?.includes(pathnamePart) === true || categorySegments.has(pathnamePart);

        // Dynamic segments (ids) have no translation and may not be mapped yet while
        // their page is still loading. Fall back to the raw segment instead of
        // raising MISSING_MESSAGE.
        const labelKey = `${translationKey}.label` as TranslationKeys;
        const commonActionKey = commonActionLabels[translationKey];
        const commonLabelKey = commonLabelLabels[translationKey];
        const commonEntityKey = commonEntityLabels[translationKey];
        const invariantLabel = invariantLabels[translationKey];
        let label = pathnamePart;
        if (mappedValue !== undefined) {
          label = mappedValue;
        } else if (commonActionKey) {
          label = tCommonAction(commonActionKey);
        } else if (commonLabelKey) {
          label = tCommonLabel(commonLabelKey);
        } else if (commonEntityKey) {
          label = tCommonEntity(commonEntityKey);
        } else if (invariantLabel) {
          label = invariantLabel;
        } else if (t.has(labelKey)) {
          label = t(labelKey);
        }

        if (isNonInteractable) {
          return <Text key={href}>{label}</Text>;
        }

        return (
          <Anchor key={href} href={href}>
            {label}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
};
