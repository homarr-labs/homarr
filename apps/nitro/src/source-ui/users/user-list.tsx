import { useMemo } from "react";
import { Anchor, Avatar, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { UserAvatarRenderer, UserRow, UserSummary, UserTableOptions } from "./contracts";
import { useUserTableLocalization } from "./contracts";
import { useI18n } from "@homarr/translation/client";

export function renderUserAvatar(user: UserSummary, size: "sm" | "lg" | "xl" | number) {
  return <Avatar src={user.image} name={user.name ?? undefined} alt={user.name ?? ""} color="initials" size={size} />;
}

export interface UserListViewProps extends UserTableOptions {
  users: UserRow[];
  onOpen?: (id: string) => void;
  renderAvatar?: UserAvatarRenderer;
  usernameLabel?: string;
  emailLabel?: string;
  verifiedLabel?: string;
}

function renderUsernameCell(user: UserRow, renderAvatar: UserAvatarRenderer, onOpen?: (id: string) => void) {
  return (
    <Group>
      {renderAvatar(user, "sm")}
      <Anchor
        href={`/manage/users/${encodeURIComponent(user.id)}/general`}
        onClick={(event) => {
          if (!onOpen || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onOpen(user.id);
        }}
      >
        {user.name ?? user.id}
      </Anchor>
    </Group>
  );
}

function renderEmailCell(user: UserRow, verifiedLabel: string) {
  return (
    <Group wrap="nowrap" gap="sm">
      <Text>{user.email || "-"}</Text>
      {user.emailVerified && (
        <Tooltip label={verifiedLabel} position="top">
          <IconCheck color="var(--mantine-color-green-4)" size="1rem" aria-label={verifiedLabel} />
        </Tooltip>
      )}
    </Group>
  );
}

export function UserListView({
  users,
  onOpen,
  renderAvatar = renderUserAvatar,
  loading = false,
  refreshing = false,
  localization,
  usernameLabel,
  emailLabel,
  verifiedLabel,
}: UserListViewProps) {
  const t = useI18n("user");
  const tCommon = useI18n("common");
  const tableLocalization = useUserTableLocalization(localization);
  const resolvedUsernameLabel = usernameLabel ?? t("field.username.label");
  const resolvedEmailLabel = emailLabel ?? t("field.email.label");
  const resolvedVerifiedLabel = verifiedLabel ?? t("field.email.verified");
  const columns = useMemo<MRT_ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: resolvedUsernameLabel,
        grow: 1,
        Cell: ({ row }) => renderUsernameCell(row.original, renderAvatar, onOpen),
      },
      {
        accessorKey: "email",
        header: resolvedEmailLabel,
        size: 300,
        Cell: ({ row }) => renderEmailCell(row.original, resolvedVerifiedLabel),
      },
    ],
    [onOpen, renderAvatar, resolvedUsernameLabel, resolvedEmailLabel, resolvedVerifiedLabel],
  );
  const table = useMantineReactTable({
    columns,
    data: users,
    localization: tableLocalization,
    enableRowSelection: true,
    enableColumnOrdering: true,
    enableGlobalFilter: false,
    enableRowActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    layoutMode: "grid-no-grow",
    getRowId: (row) => row.id,
    state: { isLoading: loading },
  });
  return (
    <Stack>
      {refreshing && (
        <Group component="output" aria-live="polite" gap="xs">
          <Loader size="xs" />
          <Text size="sm">{tCommon("action.refresh")}</Text>
        </Group>
      )}
      <MantineReactTable table={table} />
    </Stack>
  );
}
