"use client";

import { extractErrorMessage, isRecord } from "@homarr/common";

import { useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  Menu,
  Modal,
  Checkbox,
  Anchor,
} from "@mantine/core";
import {
  IconRefresh,
  IconExternalLink,
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
import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";
import { downloadPackage } from "@homarr/custom-widgets/workbench/package";

export function PackageList({ initialData }: { initialData: RouterOutputs["customWidget"]["package"]["list"] }) {
  const t = useI18n("customWidget.package");
  const session = useWorkshopSession();
  const installations = clientApi.customWidget.package.list.useQuery(undefined, { initialData });
  const entries = installations.data ?? [];
  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Text c="dimmed" maw={700}>
          {t("libraryDescription")}
        </Text>
        <WorkshopAccountButton session={session} />
      </Group>
      {entries.length === 0 && (
        <NoResults
          icon={IconPackage}
          title={t("empty")}
          action={{ href: "/manage/custom-widgets/packages/new", label: t("create") }}
        />
      )}
      <ManageCollectionList ariaLabel={t("title")}>
        {entries.map((entry) => (
          <PackageRow key={entry.id} entry={entry} workshopUserId={session.user?.id} />
        ))}
      </ManageCollectionList>
    </Stack>
  );
}

type PackageEntry = RouterOutputs["customWidget"]["package"]["list"][number];

function PackageRow({ entry, workshopUserId }: { entry: PackageEntry; workshopUserId?: string }) {
  const t = useI18n("customWidget.package");
  const tCommon = useI18n("common");
  const update = clientApi.customWidget.package.checkUpdate.useQuery(
    { id: entry.id },
    { enabled: false, retry: false },
  );
  const stage = clientApi.customWidget.package.stageWorkshopUpdate.useMutation();
  const [opened, setOpened] = useState(false);
  const [replace, setReplace] = useState(false);
  let status = t("draftOnly");
  let color = "gray";
  if (entry.activeArtifactId) {
    status = t("disabled");
    if (entry.enabled) {
      status = t("active");
      color = "green";
    }
  }
  const version = entry.activeVersion ?? entry.draftVersion;
  const updateData = update.data;
  const latest = updateData?.latest;
  const ownsListing = Boolean(workshopUserId && entry.workshop?.author === workshopUserId);
  return (
    <>
      <ManageCollectionItem
        leading={
          <Avatar size={40} radius="sm" color="pink">
            <IconPackage size={20} stroke={1.5} />
          </Avatar>
        }
        title={<Text fw={600}>{entry.name}</Text>}
        badges={
          <Group gap="xs">
            <Badge color={color} variant="light">
              {status}
            </Badge>
            {version && (
              <Badge color="gray" variant="outline">
                v{version}
              </Badge>
            )}
            {entry.activeVersion && entry.draftVersion !== entry.activeVersion && (
              <Badge variant="light" color="blue">
                {t("draftVersion", { version: entry.draftVersion ?? "?" })}
              </Badge>
            )}
          </Group>
        }
        description={
          <Stack gap={4}>
            {entry.description && (
              <Text size="sm" c="dimmed" lineClamp={2}>
                {entry.description}
              </Text>
            )}
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                {t("placements", { count: entry.placementCount })}
              </Text>
              {entry.author && (
                <Text size="xs" c="dimmed">
                  {t("byAuthor", { name: entry.author })}
                </Text>
              )}
              {ownsListing && (
                <Text size="xs" c="dimmed">
                  {t("yourWorkshopListing")}
                </Text>
              )}
              {entry.workshopUrl && (
                <Anchor href={entry.workshopUrl} target="_blank" rel="noopener noreferrer" size="xs">
                  {t("openWorkshop")} <IconExternalLink size={12} />
                </Anchor>
              )}
            </Group>
            {entry.workshop && (
              <Button
                variant="subtle"
                size="xs"
                w="fit-content"
                maw="100%"
                leftSection={<IconRefresh size={14} />}
                loading={update.isFetching}
                onClick={() => {
                  if (updateData?.available) {
                    setOpened(true);
                    return;
                  }
                  void update.refetch().then((result) => {
                    if (result.data?.available) setOpened(true);
                  });
                }}
              >
                {updateData?.available && latest
                  ? t("updateAvailable", { version: latest.version })
                  : t("checkUpdates")}
              </Button>
            )}
            {update.error && (
              <Text size="xs" c="red">
                {update.error.message}
              </Text>
            )}
            {updateData && !updateData.available && !update.error && (
              <Text size="xs" c="dimmed">
                {t("upToDate")}
              </Text>
            )}
          </Stack>
        }
        actions={
          <Group gap="xs" wrap="wrap">
            <Button
              visibleFrom="sm"
              component={Link}
              href={`/manage/custom-widgets/packages/${entry.id}`}
              variant="default"
              size="sm"
              leftSection={<IconPencil size={16} stroke={1.5} />}
            >
              {tCommon("action.edit")}
            </Button>
            <ActionIcon
              hiddenFrom="sm"
              component={Link}
              href={`/manage/custom-widgets/packages/${entry.id}`}
              variant="default"
              aria-label={tCommon("action.edit")}
              size="lg"
            >
              <IconPencil size={16} />
            </ActionIcon>
            <PackageRowActions entry={entry} />
          </Group>
        }
        actionsAlignment="center"
      />
      <Modal opened={opened} onClose={() => setOpened(false)} title={t("reviewUpdate")} centered>
        <Stack>
          <Text fw={600}>
            {entry.name} · {entry.workshop?.version} → {latest?.version}
          </Text>
          <Text size="sm" c="dimmed">
            {t("updateReviewDescription")}
          </Text>
          {latest?.changelog && (
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {latest.changelog}
            </Text>
          )}
          {updateData?.hasLocalChanges && (
            <Checkbox
              checked={replace}
              onChange={(event) => setReplace(event.currentTarget.checked)}
              label={t("replaceModifiedDraft")}
            />
          )}
          {stage.error && <Alert color="red">{stage.error.message}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              {tCommon("action.cancel")}
            </Button>
            <Button
              disabled={!latest || (updateData?.hasLocalChanges && !replace)}
              loading={stage.isPending}
              onClick={() => {
                if (!latest || !updateData?.draftDigest) return;
                stage.mutate(
                  {
                    id: entry.id,
                    releaseId: latest.id,
                    replaceLocalDraft: true,
                    expectedDraftDigest: updateData.draftDigest,
                  },
                  { onSuccess: (result) => window.location.assign(result.managementPath) },
                );
              }}
            >
              {t("reviewUpdate")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
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
        <Menu.Item
          component={Link}
          href={`/manage/custom-widgets/publish/${entry.id}?kind=package`}
          leftSection={<IconBuildingStore size={16} />}
        >
          {t("publishWorkshop")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          disabled={busy}
          leftSection={<IconCopy size={16} />}
          onClick={() =>
            void run(async () => {
              await fork.mutateAsync({ id: entry.id, name: t("forkDefaultName", { name: entry.name }).slice(0, 128) });
            })
          }
        >
          {t("duplicate")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconDownload size={16} />}
          onClick={() =>
            void run(async () => {
              const draft = await utils.customWidget.package.get.fetch({ id: entry.id });
              downloadPackage(entry.name, draft.source);
            })
          }
        >
          {t("exportDraft")}
        </Menu.Item>
        {entry.activeArtifactId && (
          <Menu.Item
            leftSection={<IconDownload size={16} />}
            onClick={() =>
              void run(async () => {
                downloadPackage(entry.name, await utils.customWidget.package.export.fetch({ id: entry.id }));
              })
            }
          >
            {t("exportActive")}
          </Menu.Item>
        )}
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
