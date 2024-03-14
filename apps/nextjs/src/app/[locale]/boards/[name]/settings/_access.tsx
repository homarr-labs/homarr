"use client";

import { useCallback } from "react";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { objectEntries } from "@homarr/common";
import type { BoardPermission } from "@homarr/definitions";
import { boardPermissions } from "@homarr/definitions";
import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import {
  Button,
  Checkbox,
  Group,
  IconPlus,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Title,
} from "@homarr/ui";

import { modalEvents } from "~/app/[locale]/modals";
import type { Board } from "../../_types";

interface PermissionRow {
  user: {
    id: string;
    name: string;
  };
  permissions: Record<BoardPermission, boolean>;
}

interface FormType {
  permissions: PermissionRow[];
}

export const AccessSettingsContent = ({ board, initialPermissions }: Props) => {
  const { data: permissions } = clientApi.board.permissions.useQuery(
    {
      id: board.id,
    },
    {
      initialData: initialPermissions,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const t = useI18n();
  const form = useForm<FormType>({
    initialValues: {
      permissions: permissions.reduce((acc, permission) => {
        const row = acc.find((p) => p.user.id === permission.userId);
        if (row) {
          row.permissions[permission.permission] = true;
          return acc;
        }
        acc.push({
          user: {
            id: permission.userId,
            name: permission.user.name!,
          },
          permissions: {
            [permission.permission]: true,
          },
        } as PermissionRow);
        return acc;
      }, [] as PermissionRow[]),
    },
  });
  const { mutate, isPending } = clientApi.board.savePermissions.useMutation();

  const handleSubmit = useCallback(
    (v: FormType) => {
      mutate({
        id: board.id,
        permissions: v.permissions.reduce(
          (acc, row) => {
            return [
              ...acc,
              ...objectEntries(row.permissions)
                .filter(([_, value]) => value)
                .map(([permission]) => {
                  return {
                    userId: row.user.id,
                    permission,
                  };
                }),
            ];
          },
          [] as RouterInputs["board"]["savePermissions"]["permissions"],
        ),
      });
    },
    [board.id, mutate],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Group justify="space-between" align="center">
          <Title order={2}>User Access</Title>
          <Button
            rightSection={<IconPlus size="1rem" />}
            variant="light"
            onClick={() => {
              modalEvents.openManagedModal({
                modal: "userSelectModal",
                innerProps: {
                  presentUserIds: form.values.permissions.map((p) => p.user.id),
                  onSelect: (user) => {
                    form.setFieldValue("permissions", [
                      ...form.values.permissions,
                      {
                        user: user,
                        permissions: boardPermissions.reduce(
                          (acc, permission) => {
                            acc[permission] = false;
                            return acc;
                          },
                          {} as Record<BoardPermission, boolean>,
                        ),
                      },
                    ]);
                  },
                },
              });
            }}
          >
            Add
          </Button>
        </Group>
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>User</TableTh>
              {boardPermissions.map((permission) => (
                <TableTh key={permission}>
                  {t(
                    `board.setting.section.access.permission.item.${permission}.label`,
                  )}
                </TableTh>
              ))}
            </TableTr>
          </TableThead>
          <TableTbody>
            {form.values.permissions.map((row, index) => (
              <TableTr key={row.user.id}>
                <TableTd>{row.user.name}</TableTd>
                {boardPermissions.map((permission) => (
                  <TableTd key={permission}>
                    <Checkbox
                      {...form.getInputProps(
                        `permissions.${index}.permissions.${permission}`,
                        {
                          type: "checkbox",
                        },
                      )}
                    />
                  </TableTd>
                ))}
              </TableTr>
            ))}
          </TableTbody>
        </Table>

        <Group justify="end">
          <Button type="submit" loading={isPending} color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface Props {
  board: Board;
  initialPermissions: RouterOutputs["board"]["permissions"];
}
