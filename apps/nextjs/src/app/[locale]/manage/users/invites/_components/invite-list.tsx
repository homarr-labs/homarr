"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Collapse, Group, Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";
import { InviteCreateButton } from "./invite-create-button";
import { InviteCreateForm } from "./invite-create-form";

dayjs.extend(relativeTime);

interface InviteListComponentProps {
  initialInvites: RouterOutputs["invite"]["getAll"];
}

export const InviteListComponent = ({ initialInvites }: InviteListComponentProps) => {
  const t = useI18n("management.page.user.invite");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get("create") === "true");
  const [formKey, setFormKey] = useState(0);
  const { data, isLoading } = clientApi.invite.getAll.useQuery(undefined, {
    initialData: initialInvites,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const columns = useMemo<MRT_ColumnDef<RouterOutputs["invite"]["getAll"][number]>[]>(
    () => [
      {
        accessorKey: "id",
        header: invariantTechnicalLabels.id,
        grow: 100,
        Cell: ({ renderedCellValue }) => renderedCellValue,
      },
      {
        accessorKey: "creator",
        header: t("field.creator.label"),
        Cell: ({ row }) => row.original.creator.name,
      },
      {
        accessorKey: "expirationDate",
        header: t("field.expirationDate.label"),
        Cell: ({ row }) => dayjs(row.original.expirationDate).fromNow(false),
      },
    ],
    [t],
  );

  const table = useTranslatedMantineReactTable({
    columns,
    data,
    positionActionsColumn: "last",
    renderRowActions: RenderRowActions,
    enableRowSelection: true,
    enableColumnOrdering: true,
    enableGlobalFilter: false,
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    layoutMode: "grid-no-grow",
    getRowId: (row) => row.id,
    state: {
      isLoading,
    },
    initialState: {
      sorting: [{ id: "expirationDate", desc: false }],
    },
  });

  useEffect(() => {
    if (searchParams.get("create") !== "true") return;

    setFormKey((value) => value + 1);
    setIsCreateOpen(true);
  }, [searchParams]);

  const closeCreate = () => {
    setIsCreateOpen(false);
    setFormKey((value) => value + 1);
    if (searchParams.has("create")) router.replace("/manage/users/invites", { scroll: false });
  };

  const toggleCreate = () => {
    if (isCreateOpen) {
      closeCreate();
      return;
    }

    setFormKey((value) => value + 1);
    setIsCreateOpen(true);
  };

  return (
    <Stack>
      <Group justify="end">
        <InviteCreateButton onClick={toggleCreate} />
      </Group>
      <Collapse expanded={isCreateOpen}>
        <Card withBorder>
          <InviteCreateForm key={formKey} onClose={closeCreate} />
        </Card>
      </Collapse>
      <MantineReactTable table={table} />
    </Stack>
  );
};

const RenderRowActions = ({ row }: { row: MRT_Row<RouterOutputs["invite"]["getAll"][number]> }) => {
  const t = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const { mutate, isPending } = clientApi.invite.deleteInvite.useMutation();
  const utils = clientApi.useUtils();
  const handleDelete = useCallback(() => {
    mutate({ id: row.original.id });
    void utils.invite.getAll.invalidate();
  }, [row.original.id, mutate, utils]);

  return (
    <InlineConfirmActionIcon
      variant="subtle"
      color="red"
      onConfirm={handleDelete}
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      loading={isPending}
      aria-label={t("action.delete.title")}
    >
      <IconTrash color="red" size={20} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
};
