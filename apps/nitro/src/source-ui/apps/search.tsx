import { Avatar, Group, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconEye } from "@tabler/icons-react";

import { getSafeAppHref } from "@homarr/common/url";
import { useI18n } from "@homarr/translation/standalone/client";
import { Link } from "@homarr/ui";

import type { AppDisplay } from "./contracts";

export function SourceAppSearchOption({ app }: { app: AppDisplay }) {
  return (
    <Group px="md" py="sm">
      <Avatar size="sm" src={app.iconUrl} alt="" radius={0} styles={{ image: { objectFit: "contain" } }} />
      <Text>{app.name}</Text>
    </Group>
  );
}

export function SourceAppSearchDetails({ app }: { app: AppDisplay }) {
  const t = useI18n();
  return (
    <Stack mx="md" my="sm">
      <Text>{t("search.mode.appIntegrationBoard.group.app.children.detail.title")}</Text>
      <Group>
        <Avatar size="sm" src={app.iconUrl} alt="" radius={0} styles={{ image: { objectFit: "contain" } }} />
        <Text>{app.name}</Text>
      </Group>
    </Stack>
  );
}

export function SourceAppSearchActions({ app, canEdit }: { app: AppDisplay; canEdit: boolean }) {
  const t = useI18n();
  const href = getSafeAppHref(app.href);
  return (
    <>
      {href && (
        <Link href={href}>
          <Group mx="md" my="sm">
            <IconExternalLink stroke={1.5} />
            <Text>{t("search.mode.appIntegrationBoard.group.app.children.action.open.label")}</Text>
          </Group>
        </Link>
      )}
      {canEdit && (
        <Link href={`/manage/apps/edit/${app.id}`}>
          <Group mx="md" my="sm">
            <IconEye stroke={1.5} />
            <Text>{t("search.mode.appIntegrationBoard.group.app.children.action.edit.label")}</Text>
          </Group>
        </Link>
      )}
    </>
  );
}
