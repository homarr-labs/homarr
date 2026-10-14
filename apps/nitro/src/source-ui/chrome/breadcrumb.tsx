import { Anchor, Badge, Breadcrumbs, Text } from "@mantine/core";
import { IconHomeFilled } from "@tabler/icons-react";

import { useNavigation } from "@homarr/ui/navigation";

import { ChromeLink } from "./navigation";

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
const commonEntityLabels: Record<string, string> = {
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

export interface DynamicBreadcrumbProps {
  readonly customHome?: string | null;
  readonly customHomeLink?: string;
  readonly dynamicMappings?: ReadonlyMap<string, string>;
  readonly nonInteractable?: readonly string[];
  readonly homeLabel: string;
  readonly actionLabel: (key: "create" | "edit") => string;
  readonly entityLabel: (key: string) => string;
  readonly newLabel: string;
  readonly navigationLabel: (key: string) => string | undefined;
}

export function DynamicBreadcrumb({
  dynamicMappings,
  customHome = "manage",
  customHomeLink = "/manage",
  nonInteractable,
  homeLabel,
  actionLabel,
  entityLabel,
  newLabel,
  navigationLabel,
}: DynamicBreadcrumbProps) {
  const { pathname } = useNavigation();
  const pathnameParts = pathname.split("/").filter((part) => part.length > 0);
  const length = pathnameParts.filter((part) => part !== customHome).length;
  if (length === 0) return null;

  return (
    <Breadcrumbs w="100%" mb="md">
      <Badge
        styles={{ root: { cursor: "pointer" } }}
        component={ChromeLink}
        href={customHomeLink}
        leftSection={<IconHomeFilled size="1rem" />}
        variant="default"
        tt="initial"
        h="auto"
      >
        <Text fw="bold">{homeLabel}</Text>
      </Badge>
      {pathnameParts.map((pathnamePart, index) => {
        if (pathnamePart === customHome) return null;
        const href = `/${pathnameParts.slice(0, index + 1).join("/")}`;
        const translationKey = pathnameParts.slice(0, index + 1).join(".");
        const mappedValue = dynamicMappings?.get(pathnamePart);
        const isNonInteractable =
          nonInteractable?.includes(pathnamePart) === true || categorySegments.has(pathnamePart);
        const commonActionKey = commonActionLabels[translationKey];
        const commonLabelKey = commonLabelLabels[translationKey];
        const commonEntityKey = commonEntityLabels[translationKey];
        const invariantLabel = invariantLabels[translationKey];
        let label = pathnamePart;
        if (mappedValue !== undefined) label = mappedValue;
        else if (commonActionKey) label = actionLabel(commonActionKey);
        else if (commonLabelKey) label = newLabel;
        else if (commonEntityKey) label = entityLabel(commonEntityKey);
        else if (invariantLabel) label = invariantLabel;
        else label = navigationLabel(`${translationKey}.label`) ?? pathnamePart;

        if (isNonInteractable) return <Text key={href}>{label}</Text>;
        return (
          <Anchor key={href} component={ChromeLink} href={href}>
            {label}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
}
