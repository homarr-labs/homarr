"use client";

import { usePathname } from "next/navigation";
import { Anchor, Badge, Breadcrumbs, Text } from "@mantine/core";
import { IconHomeFilled } from "@tabler/icons-react";
import { TranslationKeys } from "node_modules/@homarr/translation/src/lang";

import { useScopedI18n } from "@homarr/translation/client";

interface DynamicBreadcrumbProps {
  customHome?: string | null;
  customHomeLink?: string;
  dynamicMappings?: Map<string, string>;
  nonInteractable?: string[];
}

/**
 * Breadcrumb is server side rendered. Elements are automatically
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
  const t = useScopedI18n("navigationStructure");

  const length = pathnameParts.filter((part) => part !== customHome).length;

  if (length == 0) {
    return null;
  }

  return (
    <Breadcrumbs w="100%" mb="md">
      <Badge
        styles={{ root: { cursor: "pointer" } }}
        component={"a"}
        href={customHomeLink ?? "/"}
        leftSection={<IconHomeFilled size="1rem" />}
        variant="default"
        tt="initial"
        h="auto"
      >
        <Text fw="bold">Home</Text>
      </Badge>
      {pathnameParts.map((pathnamePart, index) => {
        if (pathnamePart === customHome) {
          return null;
        }
        const href = `/${pathnameParts.slice(0, index + 1).join("/")}`;
        const translationKey = `${pathnameParts.slice(0, index + 1).join(".")}`;

        if (nonInteractable?.includes(pathnamePart)) {
          return <Text>{t(`${translationKey}.label` as TranslationKeys)}</Text>;
        }

        if (dynamicMappings?.has(pathnamePart)) {
          return <Anchor href={href}>{dynamicMappings.get(pathnamePart)}</Anchor>;
        }

        return <Anchor href={href}>{t(`${translationKey}.label` as TranslationKeys)}</Anchor>;
      })}
    </Breadcrumbs>
  );
};
