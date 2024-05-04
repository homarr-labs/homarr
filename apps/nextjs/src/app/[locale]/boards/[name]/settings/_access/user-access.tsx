import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Box,
  Button,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTh,
  TableThead,
  TableTr,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { UserAvatar } from "@homarr/ui";

import type { Board } from "../../../_types";
import {
  BoardAccessDisplayRow,
  BoardAccessSelectRow,
} from "./board-access-table-rows";
import type { BoardAccessFormType, OnCountChange } from "./form";
import { FormProvider, useForm } from "./form";
import { UserSelectModal } from "./user-select-modal";

export interface FormProps {
  board: Pick<Board, "id" | "creatorId" | "creator">;
  initialPermissions: RouterOutputs["board"]["getBoardPermissions"];
  onCountChange: OnCountChange;
}

export const UsersForm = ({
  board,
  initialPermissions,
  onCountChange,
}: FormProps) => {
  const { mutate, isPending } =
    clientApi.board.saveUserBoardPermissions.useMutation();
  const utils = clientApi.useUtils();
  const [users, setUsers] = useState<Map<string, User>>(
    new Map(
      initialPermissions.userPermissions.map(({ user }) => [user.id, user]),
    ),
  );
  const { openModal } = useModalAction(UserSelectModal);
  const t = useI18n();
  const tPermissions = useScopedI18n("board.setting.section.access.permission");
  const form = useForm({
    initialValues: {
      items: initialPermissions.userPermissions.map(({ user, permission }) => ({
        itemId: user.id,
        permission,
      })),
    },
  });

  const handleSubmit = useCallback(
    (values: BoardAccessFormType) => {
      mutate(
        {
          id: board.id,
          permissions: values.items,
        },
        {
          onSuccess: () => {
            void utils.board.getBoardPermissions.invalidate();
          },
        },
      );
    },
    [board.id, mutate, utils.board.getBoardPermissions],
  );

  const handleAddUser = useCallback(() => {
    const presentUserIds = form.values.items.map(({ itemId: id }) => id);

    openModal({
      presentUserIds: board.creatorId
        ? presentUserIds.concat(board.creatorId)
        : presentUserIds,
      onSelect: (user) => {
        setUsers((prev) => new Map(prev).set(user.id, user));
        form.setFieldValue("items", [
          {
            itemId: user.id,
            permission: "board-view",
          },
          ...form.values.items,
        ]);
        onCountChange((prev) => prev + 1);
      },
    });
  }, [form, openModal, board.creatorId, onCountChange]);

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <FormProvider form={form}>
        <Stack pt="sm">
          <Table>
            <TableThead>
              <TableTr>
                <TableTh>{tPermissions("field.user.label")}</TableTh>
                <TableTh>{tPermissions("field.permission.label")}</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {board.creator && (
                <BoardAccessDisplayRow
                  itemContent={<UserItemContent user={board.creator} />}
                  permission="board-full"
                />
              )}
              {form.values.items.map((row, index) => (
                <BoardAccessSelectRow
                  key={row.itemId}
                  itemContent={
                    <UserItemContent user={users.get(row.itemId)!} />
                  }
                  permission={row.permission}
                  index={index}
                  onCountChange={onCountChange}
                />
              ))}
            </TableTbody>
          </Table>

          <Group justify="space-between">
            <Button
              rightSection={<IconPlus size="1rem" />}
              variant="light"
              onClick={handleAddUser}
            >
              {t("common.action.add")}
            </Button>
            <Button type="submit" loading={isPending} color="teal">
              {t("common.action.saveChanges")}
            </Button>
          </Group>
        </Stack>
      </FormProvider>
    </form>
  );
};

const UserItemContent = ({ user }: { user: User }) => {
  return (
    <Group wrap="nowrap">
      <Box visibleFrom="xs">
        <UserAvatar user={user} size="sm" />
      </Box>
      <Anchor
        component={Link}
        href={`/manage/users/${user.id}`}
        size="sm"
        style={{ whiteSpace: "nowrap" }}
      >
        {user.name}
      </Anchor>
    </Group>
  );
};

interface User {
  id: string;
  name: string | null;
  image: string | null;
}
