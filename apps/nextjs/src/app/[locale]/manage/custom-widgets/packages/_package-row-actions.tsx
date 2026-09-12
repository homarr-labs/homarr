"use client";

import { ActionIcon, Menu } from "@mantine/core";
import { IconBuildingStore, IconCopy, IconDots, IconDownload, IconLayoutDashboard, IconPlayerPause, IconPlayerPlay, IconPlugConnected } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { downloadPackage } from "./_package-document";

export function PackageRowActions({ entry }: { entry: RouterOutputs["customWidget"]["package"]["list"][number] }) {
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
      showErrorNotification({ title: t("title"), message: error instanceof Error ? error.message : String(error) });
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
