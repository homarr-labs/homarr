import {
  Stack,
  Table,
  TableTbody,
  TableTh,
  TableThead,
  TableTr,
} from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { BoardPermission, GroupPermissionKey } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import { BoardAccessDisplayRow } from "./board-access-table-rows";
import { GroupItemContent } from "./group-access";

export interface InheritTableProps {
  initialPermissions: RouterOutputs["board"]["getBoardPermissions"];
}

const mapPermissions = {
  "board-full-access": "board-full",
  "board-modify-all": "board-change",
  "board-view-all": "board-view",
} satisfies Partial<Record<GroupPermissionKey, BoardPermission | "board-full">>;

export const InheritTable = ({ initialPermissions }: InheritTableProps) => {
  const tPermissions = useScopedI18n("board.setting.section.access.permission");
  return (
    <Stack pt="sm">
      <Table>
        <TableThead>
          <TableTr>
            <TableTh>{tPermissions("field.user.label")}</TableTh>
            <TableTh>{tPermissions("field.permission.label")}</TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {initialPermissions.inherited.map(({ group, permission }) => (
            <BoardAccessDisplayRow
              key={group.id}
              itemContent={<GroupItemContent group={group} />}
              permission={
                mapPermissions[permission as keyof typeof mapPermissions] ??
                "board-full" // Fallback to full-access as only higher permissions are queried
              }
            />
          ))}
        </TableTbody>
      </Table>
    </Stack>
  );
};
