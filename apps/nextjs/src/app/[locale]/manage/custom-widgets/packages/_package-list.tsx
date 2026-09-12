"use client";

import { extractErrorMessage, isRecord } from "@homarr/common";

import { useRef, useState } from "react";
import { Alert, Avatar, Badge, Button, Group, Stack, Text, ActionIcon, Menu } from "@mantine/core";
import {
  IconPackage,
  IconPencil,
  IconUpload,
  IconBuildingStore,
  IconCopy,
  IconDots,
  IconDownload,
  IconLayoutDashboard,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlugConnected,
} from "@tabler/icons-react";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { customWidgetArchiveSchema, WIDGET_COLLECTION_MAX_BYTES } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { ManageCollectionItem, ManageCollectionList } from "~/components/manage/manage-collection";
import { NoResults } from "~/components/no-results";
import { showErrorNotification } from "@homarr/notifications";
import { downloadPackage } from "@homarr/custom-widgets/workbench/package";

export function PackageList({ initialData }: { initialData: RouterOutputs["customWidget"]["package"]["list"] }) {
  const t = useI18n("customWidget.package");
  const tCommon = useI18n("common");
  const installations = clientApi.customWidget.package.list.useQuery(undefined, { initialData });
  const entries = installations.data ?? [];
  return (
    <Stack>
      <Text c="dimmed">{t("libraryDescription")}</Text>
      {entries.length === 0 && <NoResults icon={IconPackage} title={t("empty")} action={{ href: "/manage/custom-widgets/packages/new", label: t("create") }} />}
      <ManageCollectionList ariaLabel={t("title")}>
        {entries.map((entry) => {
          let status = t("draftOnly");
          let color = "gray";
          if (entry.activeArtifactId) {
            status = t("disabled");
            if (entry.enabled) {
              status = t("active");
              color = "green";
            }
          }
          return (
            <ManageCollectionItem
              key={entry.id}
              leading={<Avatar size={40} radius="sm" color="pink"><IconPackage size={20} stroke={1.5} /></Avatar>}
              title={<Text fw={600}>{entry.name}</Text>}
              badges={
                <Badge color={color} variant="light">
                  {status}
                </Badge>
              }
              description={
                <Text size="sm" c="dimmed">
                  {t("placements", { count: entry.placementCount })}
                </Text>
              }
              actions={
                <Group gap="xs" wrap="nowrap">
                <Button component={Link} href={`/manage/custom-widgets/packages/${entry.id}`} variant="default" size="sm" leftSection={<IconPencil size={16} stroke={1.5} />}>
                  {tCommon("action.edit")}
                </Button>
                <PackageRowActions entry={entry} />
                </Group>
              }
              actionsAlignment="center"
            />
          );
        })}
      </ManageCollectionList>
    </Stack>
  );
}

export function PackageImportButton() {
  const t = useI18n("customWidget.package");
  const input = useRef<HTMLInputElement>(null);
  const save = clientApi.customWidget.package.saveDraft.useMutation();
  const importArchive = clientApi.customWidget.package.import.useMutation();
  const importCollection = clientApi.customWidget.package.importCollection.useMutation();
  const importing = useRef(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const importFile = async (file: File) => {
    if (importing.current) return;
    importing.current = true;
    setReading(true);
    setError("");
    try {
      if (file.size > WIDGET_COLLECTION_MAX_BYTES) throw new Error(t("collections.importTooLarge"));
      const raw: unknown = JSON.parse(await file.text());
      if (!isRecord(raw)) throw new Error(t("invalidPackage"));
      if (raw.format === "homarr-widget-collection-v1") {
        const result = await importCollection.mutateAsync({ archive: raw });
        window.location.assign(`/manage/custom-widgets/packages/collections/${result.importId}`);
        return;
      }
      if (file.size > 25_000_000) throw new Error(t("importTooLarge"));
      if (raw.format === "homarr-widget-archive-v3") {
        const result = await importArchive.mutateAsync({ archive: customWidgetArchiveSchema.parse(raw) });
        window.location.assign(result.managementPath);
        return;
      }
      let source = raw;
      if (isRecord(raw.source)) source = raw.source;
      let name = file.name.replace(/\.json$/iu, "");
      if (isRecord(source.manifest) && typeof source.manifest.name === "string") name = source.manifest.name;
      const result = await save.mutateAsync({ name, source });
      window.location.assign(result.managementPath);
    } catch (cause) {
      setError(extractErrorMessage(cause));
    } finally {
      importing.current = false;
      setReading(false);
    }
  };
  return (
    <Stack gap="xs">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void importFile(file);
        }}
      />
      <Button
        variant="default"
        leftSection={<IconUpload size={16} />}
        loading={reading || save.isPending || importArchive.isPending || importCollection.isPending}
        onClick={() => input.current?.click()}
      >
        {t("import")}
      </Button>
      {error && (
        <Alert color="red" withCloseButton onClose={() => setError("")}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

function PackageRowActions({ entry }: { entry: RouterOutputs["customWidget"]["package"]["list"][number] }) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const fork = clientApi.customWidget.package.fork.useMutation();
  const enable = clientApi.customWidget.package.setEnabled.useMutation();
  const busy = fork.isPending || enable.isPending;
  const path = `/manage/custom-widgets/packages/${entry.id}`;
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await utils.customWidget.package.list.invalidate();
    } catch (error) {
      showErrorNotification({ title: t("title"), message: extractErrorMessage(error) });
    }
  };
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={t("actionsMenu")} loading={busy}>
          <IconDots size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} href={`${path}?tab=installation`} leftSection={<IconLayoutDashboard size={16} />}>
          {t("addToBoard")}
        </Menu.Item>
        <Menu.Item component={Link} href={`${path}?tab=connections`} leftSection={<IconPlugConnected size={16} />}>
          {t("connections")}
        </Menu.Item>
        <Menu.Item component={Link} href={`${path}?tab=workshop`} leftSection={<IconBuildingStore size={16} />}>
          {t("workshopTab")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item disabled={busy} leftSection={<IconCopy size={16} />} onClick={() => void run(async () => {
          await fork.mutateAsync({ id: entry.id, name: t("forkDefaultName", { name: entry.name }).slice(0, 128) });
        })}>
          {t("fork")}
        </Menu.Item>
        <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => void run(async () => {
          const draft = await utils.customWidget.package.get.fetch({ id: entry.id });
          downloadPackage(entry.name, draft.source);
        })}>
          {t("exportDraft")}
        </Menu.Item>
        {entry.activeArtifactId && <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => void run(async () => {
          downloadPackage(entry.name, await utils.customWidget.package.export.fetch({ id: entry.id }));
        })}>{t("exportActive")}</Menu.Item>}
        <Menu.Divider />
        <Menu.Item
          disabled={busy || !entry.activeArtifactId}
          leftSection={entry.enabled ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
          onClick={() => void run(() => enable.mutateAsync({ id: entry.id, enabled: !entry.enabled }))}
        >
          {entry.enabled ? t("disable") : t("enable")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
