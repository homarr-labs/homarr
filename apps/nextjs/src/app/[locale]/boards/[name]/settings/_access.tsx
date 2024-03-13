"use client";

import { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { boardPermissions } from "@homarr/definitions";
import { useForm } from "@homarr/form";
import {
  Checkbox,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Title,
} from "@homarr/ui";

import type { Board } from "../../_types";

type PermissionRow = {
  user: {
    id: string;
    name: string;
  };
  permissions: Record<string, boolean>;
};

interface Props {
  board: Board;
}

export const AccessSettingsContent = ({ board }: Props) => {
  const { data: permissions, isPending } = clientApi.board.permissions.useQuery(
    {
      id: board.id,
    },
  );

  if (isPending || !permissions) {
    return null;
  }

  return <AccessForm permissions={permissions} />;
};

interface FormProps {
  permissions: RouterOutputs["board"]["permissions"];
}

export const AccessForm = ({ permissions }: FormProps) => {
  const form = useForm({
    initialValues: {
      permissions: permissions?.reduce((acc, permission) => {
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
        });
        return acc;
      }, [] as PermissionRow[]),
    },
  });
  const { mutate } = clientApi.board.savePermissions.useMutation();

  return (
    <Stack>
      <Title order={2}>User Access</Title>
      <Table>
        <TableThead>
          <TableTr>
            <TableTh>User</TableTh>
            {boardPermissions.map((permission) => (
              <TableTh key={permission}>{permission}</TableTh>
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
    </Stack>
  );
};
