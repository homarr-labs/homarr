"use client";

import { useCallback } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { BoardPermission } from "@homarr/definitions";
import { boardPermissions } from "@homarr/definitions";
import { useForm } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import type { SelectProps, TablerIcon } from "@homarr/ui";
import {
  Button,
  Flex,
  Group,
  IconCheck,
  IconEye,
  IconPencil,
  IconPlus,
  IconSettings,
  Select,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@homarr/ui";

import type { Board } from "../../_types";

interface Props {
  board: Board;
  initialPermissions: RouterOutputs["board"]["permissions"];
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
      permissions: permissions.sort((a, b) => {
        if (a.user.id === board.creatorId) return -1;
        if (b.user.id === board.creatorId) return 1;
        return a.user.name.localeCompare(b.user.name);
      }),
    },
  });
  const { mutate, isPending } = clientApi.board.savePermissions.useMutation();
  const utils = clientApi.useUtils();
  const { openModal } = useModalAction(UserSelectModal);

  const handleSubmit = useCallback(
    (v: FormType) => {
      mutate(
        {
          id: board.id,
          permissions: v.permissions,
        },
        {
          onSuccess: () => {
            void utils.board.permissions.invalidate();
          },
        },
      );
    },
    [board.id, mutate, utils.board.permissions],
  );

  const handleAddUser = useCallback(() => {
    openModal({
      presentUserIds: [
        ...form.values.permissions.map((p) => p.user.id),
        board.creatorId!,
      ],
      onSelect: (user) => {
        form.setFieldValue("permissions", [
          ...form.values.permissions,
          {
            user: user,
            permission: "board-view",
          },
        ]);
      },
    });
  }, [form, openModal, board.creatorId]);

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>
                {t("board.setting.section.access.permission.field.user.label")}
              </TableTh>
              <TableTh>
                {t(
                  "board.setting.section.access.permission.field.permission.label",
                )}
              </TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {board.creator && <CreatorRow user={board.creator} />}
            {form.values.permissions.map((row, index) => {
              const Icon = icons[row.permission];
              return (
                <TableTr key={row.user.id}>
                  <TableTd>{row.user.name}</TableTd>
                  <TableTd>
                    <Group wrap="nowrap">
                      <Select
                        flex="1"
                        leftSection={<Icon size="1rem" />}
                        renderOption={RenderOption}
                        variant="unstyled"
                        data={boardPermissions.map((permission) => ({
                          value: permission,
                          label: t(
                            `board.setting.section.access.permission.item.${permission}.label`,
                          ),
                        }))}
                        {...form.getInputProps(
                          `permissions.${index}.permission`,
                        )}
                      />
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => {
                          form.setFieldValue(
                            "permissions",
                            form.values.permissions.filter(
                              (_, i) => i !== index,
                            ),
                          );
                        }}
                      >
                        {t("common.action.remove")}
                      </Button>
                    </Group>
                  </TableTd>
                </TableTr>
              );
            })}
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
    </form>
  );
};

interface CreatorRowProps {
  user: Exclude<Board["creator"], null>;
}

const CreatorRow = ({ user }: CreatorRowProps) => {
  const t = useI18n();
  return (
    <TableTr>
      <TableTd>{user.name}</TableTd>
      <TableTd>
        <Group gap={0}>
          <Flex w={34} h={34} align="center" justify="center">
            <IconSettings
              size="1rem"
              color="var(--input-section-color, var(--mantine-color-dimmed))"
            />
          </Flex>
          <Text size="sm">
            {t("board.setting.section.access.permission.item.board-full.label")}
          </Text>
        </Group>
      </TableTd>
    </TableTr>
  );
};

const icons = {
  "board-change": IconPencil,
  "board-view": IconEye,
} satisfies Record<BoardPermission, TablerIcon>;

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: "1rem",
};

const RenderOption: SelectProps["renderOption"] = ({ option, checked }) => {
  const Icon = icons[option.value as BoardPermission];
  return (
    <Group flex="1" gap="xs">
      <Icon {...iconProps} />
      {option.label}
      {checked && (
        <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />
      )}
    </Group>
  );
};

interface FormType {
  permissions: RouterOutputs["board"]["permissions"];
}

interface InnerProps {
  presentUserIds: string[];
  onSelect: (props: { id: string; name: string }) => void;
}

interface UserSelectFormType {
  userId: string;
}

export const UserSelectModal = createModal<InnerProps>(
  ({ actions, innerProps }) => {
    const t = useI18n();
    const { data: users } = clientApi.user.selectable.useQuery();
    const form = useForm<UserSelectFormType>();
    const handleSubmit = (v: UserSelectFormType) => {
      const currentUser = users?.find((user) => user.id === v.userId);
      if (!currentUser) return;
      innerProps.onSelect({
        id: currentUser.id,
        name: currentUser.name ?? "",
      });
      actions.closeModal();
    };

    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            {...form.getInputProps("userId")}
            label={t(
              "board.setting.section.access.permission.userSelect.label",
            )}
            searchable
            nothingFoundMessage={t(
              "board.setting.section.access.permission.userSelect.notFound",
            )}
            limit={5}
            data={users
              ?.filter((user) => !innerProps.presentUserIds.includes(user.id))
              .map((u) => ({ value: u.id, label: u.name ?? "" }))}
          />
          <Group justify="end">
            <Button onClick={actions.closeModal}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit">{t("common.action.add")}</Button>
          </Group>
        </Stack>
      </form>
    );
  },
).withOptions({
  defaultTitle: (t) =>
    t("board.setting.section.access.permission.userSelect.title"),
});
