"use client";

import { useCallback } from "react";
import { ActionIcon, Anchor, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { IconDownload, IconRefresh, IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { humanFileSize, useTimeAgo } from "@homarr/common";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Link, UserAvatar } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

type BackupData = RouterOutputs["backup"]["list"][number];

interface BackupsTableProps {
  initialBackups: RouterOutputs["backup"]["list"];
}

export const BackupsTable = ({ initialBackups }: BackupsTableProps) => {
  const t = useI18n();
  const tBackup = useScopedI18n("backup");

  const utils = clientApi.useUtils();

  const { data: backups } = clientApi.backup.list.useQuery(undefined, {
    initialData: initialBackups,
    refetchOnMount: false,
  });

  const deleteMutation = clientApi.backup.delete.useMutation({
    onSuccess: async () => {
      await utils.backup.list.invalidate();
      showSuccessNotification({
        title: tBackup("action.delete.success.title"),
        message: tBackup("action.delete.success.message"),
      });
    },
    onError: () => {
      showErrorNotification({
        title: tBackup("action.delete.error.title"),
        message: tBackup("action.delete.error.message"),
      });
    },
  });

  const { openConfirmModal } = useConfirmModal();

  const handleDelete = useCallback(
    (backup: BackupData) => {
      openConfirmModal({
        title: tBackup("action.delete.label"),
        children: tBackup("action.delete.confirm", { name: backup.name }),
        onConfirm: () => {
          deleteMutation.mutate({ id: backup.id });
        },
      });
    },
    [openConfirmModal, tBackup, deleteMutation],
  );

  const handleDownload = useCallback((backup: BackupData) => {
    // Trigger download via browser
    const link = document.createElement("a");
    link.href = `/api/backup/download/${backup.id}`;
    link.download = `${backup.name}.zip`;
    link.click();
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await utils.backup.list.invalidate();
      showSuccessNotification({
        title: t("common.success"),
        message: "List refreshed",
      });
    } catch {
      showErrorNotification({
        title: t("common.error"),
        message: "Failed to refresh",
      });
    }
  }, [utils, t]);

  const columns: MRT_ColumnDef<BackupData>[] = [
    {
      accessorKey: "name",
      header: tBackup("field.name"),
      Cell: ({ row }) => (
        <Text fw={500} lineClamp={1}>
          {row.original.name}
        </Text>
      ),
    },
    {
      accessorKey: "type",
      header: tBackup("field.type"),
      size: 100,
      Cell: ({ row }) => (
        <Badge variant="light" color={row.original.type === "auto" ? "blue" : "gray"}>
          {tBackup(`type.${row.original.type}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "fileSize",
      header: tBackup("field.size"),
      size: 100,
      Cell: ({ row }) => <Text size="sm">{humanFileSize(row.original.fileSize)}</Text>,
    },
    {
      accessorKey: "status",
      header: tBackup("field.status"),
      size: 100,
      Cell: ({ row }) => (
        <Badge color={row.original.status === "completed" ? "green" : "red"}>
          {tBackup(`status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: tBackup("field.createdAt"),
      size: 150,
      Cell: ({ row }) => <TimeAgo timestamp={row.original.createdAt} />,
    },
    {
      accessorKey: "creator",
      header: tBackup("field.creator"),
      size: 150,
      Cell: ({ row }) => {
        const creator = row.original.creator;
        if (!creator) {
          return (
            <Text size="sm" c="dimmed">
              —
            </Text>
          );
        }
        return (
          <Group>
            <UserAvatar size="sm" user={creator} />
            <Anchor component={Link} href={`/manage/users/${creator.id}/general`}>
              {creator.name}
            </Anchor>
          </Group>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      enableSorting: false,
      Cell: ({ row }) => (
        <Group gap="xs">
          <Tooltip label={tBackup("action.download.label")}>
            <ActionIcon variant="light" color="blue" onClick={() => handleDownload(row.original)}>
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={tBackup("action.delete.label")}>
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => handleDelete(row.original)}
              loading={deleteMutation.isPending}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];
  const searchPlaceholder = tBackup("field.search", { count: backups.length.toString() });
  const table = useTranslatedMantineReactTable({
    data: backups,
    columns,
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: backups.length > 10,
    enableRowSelection: false,
    enableTableFooter: false,
    enableBottomToolbar: backups.length > 10,
    enableRowActions: false,
    enableColumnOrdering: false,
    enableSorting: true,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: searchPlaceholder,
      style: { minWidth: 300 },
    },
    initialState: {
      density: "xs",
      showGlobalFilter: true,
      sorting: [{ id: "createdAt", desc: true }],
    },
    renderTopToolbarCustomActions: () => (
      <Button variant="default" rightSection={<IconRefresh size="1rem" />} onClick={handleRefresh}>
        {tBackup("action.refresh.label")}
      </Button>
    ),
    renderEmptyRowsFallback: () => (
      <Text ta="center" py="xl" c="dimmed">
        {tBackup("noBackups")}
      </Text>
    ),
  });

  return <MantineReactTable table={table} />;
};

const TimeAgo = ({ timestamp }: { timestamp: Date }) => {
  const timeAgo = useTimeAgo(timestamp);

  return (
    <Tooltip label={timestamp.toLocaleString()}>
      <Text size="sm" c="dimmed">
        {timeAgo}
      </Text>
    </Tooltip>
  );
};
