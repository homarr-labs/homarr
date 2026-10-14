import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { Anchor, Button, Card, Collapse, CopyButton, Group, Loader, Mark, Stack, Text, Tooltip } from "@mantine/core";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { InviteRow, UserTableOptions } from "./contracts";
import { useUserTableLocalization } from "./contracts";
import { useFormatter, useI18n, useNow } from "@homarr/translation/client";
import { invariantTechnicalLabels } from "@homarr/definitions";

export interface InviteDateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  minDate: string;
  maxDate: string;
  disabled: boolean;
  popoverProps: { withinPortal: boolean };
  withAsterisk: boolean;
  valueFormat: string;
  label: string;
  variant: "filled";
}

export interface InviteExpirationViewProps {
  component: ComponentType<InviteDateTimePickerProps>;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  disabled: boolean;
}

export function InviteExpirationView({
  component: DateTimePicker,
  value,
  onChange,
  min,
  max,
  disabled,
}: InviteExpirationViewProps) {
  const tInvite = useI18n("management.page.user.invite");
  return (
    <DateTimePicker
      popoverProps={{ withinPortal: true }}
      minDate={min.replace("T", " ")}
      maxDate={max.replace("T", " ")}
      withAsterisk
      valueFormat="DD MMM YYYY HH:mm"
      label={tInvite("field.expirationDate.label")}
      variant="filled"
      disabled={disabled}
      value={value.replace("T", " ")}
      onChange={(next) => onChange(next?.replace(" ", "T") ?? "")}
    />
  );
}

export interface InviteListViewProps extends UserTableOptions {
  invites: InviteRow[];
  createOpen: boolean;
  createDisabled: boolean;
  onToggleCreate: () => void;
  createForm: ReactNode;
  renderActions?: (invite: InviteRow) => ReactNode;
  now?: Date;
}

function renderExpirationCell(label: string, title: string) {
  return (
    <Tooltip label={title}>
      <Text size="sm">{label}</Text>
    </Tooltip>
  );
}

export function InviteListView({
  invites,
  createOpen,
  createDisabled,
  onToggleCreate,
  createForm,
  renderActions,
  loading = false,
  refreshing = false,
  localization,
  now,
}: InviteListViewProps) {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const tUnavailable = useI18n("customWidget.secretEntry");
  const formatter = useFormatter();
  const contextNow = useNow();
  const timestamp = (now ?? contextNow).getTime();
  const tableLocalization = useUserTableLocalization(localization);
  const columns = useMemo<MRT_ColumnDef<InviteRow>[]>(
    () => [
      { accessorKey: "id", header: invariantTechnicalLabels.id, grow: 100 },
      {
        accessorKey: "creator",
        header: tInvite("field.creator.label"),
        Cell: ({ row }) => row.original.creator.name ?? row.original.creator.id,
      },
      {
        accessorKey: "expirationDate",
        header: tInvite("field.expirationDate.label"),
        Cell: ({ row }) =>
          renderExpirationCell(
            formatter.relativeTime(new Date(row.original.expirationDate), new Date(timestamp)),
            formatter.dateTime(new Date(row.original.expirationDate), { dateStyle: "medium", timeStyle: "short" }),
          ),
      },
    ],
    [timestamp, formatter, tInvite],
  );
  const table = useMantineReactTable({
    columns,
    data: invites,
    localization: tableLocalization,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => renderActions?.(row.original) ?? tUnavailable("unavailable"),
    enableRowSelection: true,
    enableColumnOrdering: true,
    enableGlobalFilter: false,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    layoutMode: "grid-no-grow",
    getRowId: (row) => row.id,
    state: { isLoading: loading },
    initialState: { sorting: [{ id: "expirationDate", desc: false }] },
  });
  return (
    <Stack>
      <Group justify="end">
        <Button miw={180} onClick={onToggleCreate} disabled={createDisabled} aria-expanded={createOpen}>
          {tInvite("action.new.title")}
        </Button>
      </Group>
      <Collapse expanded={createOpen}>
        <Card withBorder>{createForm}</Card>
      </Collapse>
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

function bold(children: ReactNode) {
  return <b>{children}</b>;
}

export function CreatedInviteView({
  id,
  token,
  url,
  onDismiss,
  disabled = false,
}: {
  id: string;
  token: string;
  url: string;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  return (
    <Stack component="output" aria-live="polite">
      <Text>{tInvite.rich("action.copy.description", { b: bold })}</Text>
      <Stack gap="xs">
        <Text fw="bold">{tInvite("action.copy.link")}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          <Anchor href={url} target="_blank" rel="noreferrer">
            {url}
          </Anchor>
        </Mark>
        <Text fw="bold">{invariantTechnicalLabels.id}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          {id}
        </Mark>
        <Text fw="bold">{tInvite("field.token.label")}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          {token}
        </Mark>
      </Stack>
      <Group justify="end" wrap="wrap">
        <Button variant="default" disabled={disabled} onClick={onDismiss}>
          {tCommon("action.close")}
        </Button>
        <CopyButton value={url}>
          {({ copy }) => (
            <Button
              disabled={disabled}
              onClick={() => {
                copy();
                onDismiss();
              }}
            >
              {tInvite("action.copy.button")}
            </Button>
          )}
        </CopyButton>
      </Group>
    </Stack>
  );
}
