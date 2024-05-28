import { useCallback, useState } from "react";
import Link from "next/link";
import { Anchor, Button, Group, Stack, Table, TableTbody, TableTh, TableThead, TableTr } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import { BoardAccessSelectRow } from "./board-access-table-rows";
import type { BoardAccessFormType } from "./form";
import { FormProvider, useForm } from "./form";
import { GroupSelectModal } from "./group-select-modal";
import type { FormProps } from "./user-access";

export const GroupsForm = ({ board, initialPermissions, onCountChange }: FormProps) => {
  const { mutate, isPending } = clientApi.board.saveGroupBoardPermissions.useMutation();
  const utils = clientApi.useUtils();
  const [groups, setGroups] = useState<Map<string, Group>>(
    new Map(initialPermissions.groupPermissions.map(({ group }) => [group.id, group])),
  );
  const { openModal } = useModalAction(GroupSelectModal);
  const t = useI18n();
  const tPermissions = useScopedI18n("board.setting.section.access.permission");
  const form = useForm({
    initialValues: {
      items: initialPermissions.groupPermissions.map(({ group, permission }) => ({
        itemId: group.id,
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
    openModal({
      presentGroupIds: form.values.items.map(({ itemId: id }) => id),
      onSelect: (group) => {
        setGroups((prev) => new Map(prev).set(group.id, group));
        form.setFieldValue("items", [
          {
            itemId: group.id,
            permission: "board-view",
          },
          ...form.values.items,
        ]);
        onCountChange((prev) => prev + 1);
      },
    });
  }, [form, openModal, onCountChange]);

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <FormProvider form={form}>
        <Stack pt="sm">
          <Table>
            <TableThead>
              <TableTr>
                <TableTh style={{ whiteSpace: "nowrap" }}>{tPermissions("field.group.label")}</TableTh>
                <TableTh>{tPermissions("field.permission.label")}</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {form.values.items.map((row, index) => (
                <BoardAccessSelectRow
                  key={row.itemId}
                  itemContent={<GroupItemContent group={groups.get(row.itemId)!} />}
                  permission={row.permission}
                  index={index}
                  onCountChange={onCountChange}
                />
              ))}
            </TableTbody>
          </Table>

          <Group justify="space-between">
            <Button rightSection={<IconPlus size="1rem" />} variant="light" onClick={handleAddUser}>
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

export const GroupItemContent = ({ group }: { group: Group }) => {
  return (
    <Anchor component={Link} href={`/manage/users/groups/${group.id}`} size="sm" style={{ whiteSpace: "nowrap" }}>
      {group.name}
    </Anchor>
  );
};

type Group = RouterOutputs["board"]["getBoardPermissions"]["groupPermissions"][0]["group"];
