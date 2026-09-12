"use client";

import { Alert, Badge, Button, Stack, Text } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { ManageCollectionItem, ManageCollectionList } from "~/components/manage/manage-collection";
import { PackageCollectionExport } from "./_collection-export";

export function PackageCollectionList({
  initialData,
  installations,
}: {
  initialData: RouterOutputs["customWidget"]["package"]["collections"];
  installations: RouterOutputs["customWidget"]["package"]["list"];
}) {
  const t = useI18n("customWidget.package.collections");
  const collections = clientApi.customWidget.package.collections.useQuery(undefined, { initialData });
  return (
    <Stack>
      <Text c="dimmed">{t("description")}</Text>
      <PackageCollectionExport installations={installations} />
      {collections.data?.length === 0 && <Alert>{t("empty")}</Alert>}
      <ManageCollectionList ariaLabel={t("title")}>
        {collections.data?.map((collection) => (
          <ManageCollectionItem
            key={collection.importId}
            leading={<IconLayoutGrid size={26} stroke={1.4} />}
            title={<Text fw={600}>{collection.manifest.name}</Text>}
            badges={<Badge variant="light">{collection.manifest.version}</Badge>}
            description={
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {collection.manifest.description}
                </Text>
                <Text size="sm" c="dimmed">
                  {t("members", { count: collection.installationIds.length, enabled: collection.enabledCount })}
                </Text>
              </Stack>
            }
            actions={
              <Button
                component={Link}
                href={"/manage/custom-widgets/packages/collections/" + collection.importId}
                variant="default"
              >
                {t("configure")}
              </Button>
            }
          />
        ))}
      </ManageCollectionList>
    </Stack>
  );
}
