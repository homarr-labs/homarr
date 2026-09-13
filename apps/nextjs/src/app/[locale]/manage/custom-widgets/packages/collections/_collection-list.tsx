"use client";

import { extractErrorMessage } from "@homarr/common";

import { Alert, Badge, Button, Stack, Text, Accordion, Group, MultiSelect, TextInput } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";
import type { RouterOutputs } from "@homarr/api";
import { clientApi, fetchApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { ManageCollectionItem, ManageCollectionList } from "~/components/manage/manage-collection";
import { useState } from "react";
import { downloadPackage } from "@homarr/custom-widgets/workbench/package";

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

export function PackageCollectionExport({
  installations,
}: {
  installations: RouterOutputs["customWidget"]["package"]["list"];
}) {
  const t = useI18n("customWidget.package.collections");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exportCollection = async () => {
    setBusy(true);
    setError("");
    try {
      const archive = await fetchApi.customWidget.package.exportCollection.query({
        manifest: { id, name, version },
        installationIds: selected,
      });
      downloadPackage(name, archive);
    } catch (cause) {
      setError(extractErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Accordion variant="contained">
      <Accordion.Item value="export">
        <Accordion.Control>{t("export")}</Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm" c="dimmed">
              {t("exportDescription")}
            </Text>
            <MultiSelect
              label={t("widgets")}
              searchable
              value={selected}
              onChange={setSelected}
              maxValues={32}
              data={installations
                .filter((entry) => entry.activeArtifactId)
                .map((entry) => ({ value: entry.id, label: entry.name }))}
            />
            <Group grow>
              <TextInput label={t("name")} value={name} onChange={(event) => setName(event.currentTarget.value)} />
              <TextInput
                label={t("identity")}
                description={t("identityDescription")}
                placeholder={t("identityPlaceholder")}
                value={id}
                onChange={(event) => setId(event.currentTarget.value)}
              />
              <TextInput
                label={t("version")}
                value={version}
                onChange={(event) => setVersion(event.currentTarget.value)}
              />
            </Group>
            {error && <Alert color="red">{error}</Alert>}
            <Button
              loading={busy}
              disabled={!selected.length || !name.trim() || !id.trim()}
              onClick={() => void exportCollection()}
            >
              {t("export")}
            </Button>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
