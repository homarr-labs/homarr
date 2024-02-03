"use client";

import { useAtom, useAtomValue } from "jotai";

import { clientApi } from "@homarr/api/client";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import {
  Group,
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconPackageImport,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconSettings,
  Menu,
} from "@homarr/ui";

import { modalEvents } from "~/app/[locale]/modals";
import { editModeAtom } from "~/components/board/editMode";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "../../_context";

export default function BoardViewHeaderActions() {
  const isEditMode = useAtomValue(editModeAtom);
  const board = useRequiredBoard();

  return (
    <>
      {isEditMode && <AddMenu />}

      <EditModeMenu />

      <HeaderButton href={`/boards/${board.name}/settings`}>
        <IconSettings stroke={1.5} />
      </HeaderButton>
    </>
  );
}

const AddMenu = () => {
  const { addCategoryToEnd } = useCategoryActions();
  const t = useI18n();

  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item
          leftSection={<IconBox size={20} />}
          onClick={() =>
            modalEvents.openManagedModal({
              title: t("item.create.title"),
              size: "xl",
              modal: "itemSelectModal",
              innerProps: {},
            })
          }
        >
          {t("item.action.create")}
        </Menu.Item>
        <Menu.Item leftSection={<IconPackageImport size={20} />}>
          {t("item.action.import")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconBoxAlignTop size={20} />}
          onClick={() =>
            modalEvents.openManagedModal({
              title: t("section.category.create.title"),
              modal: "categoryEditModal",
              innerProps: {
                submitLabel: t("section.category.create.submit"),
                category: {
                  id: "new",
                  name: "",
                },
                onSuccess({ name }) {
                  addCategoryToEnd({ name });
                },
              },
            })
          }
        >
          {t("section.category.action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const EditModeMenu = () => {
  const [isEditMode, setEditMode] = useAtom(editModeAtom);
  const board = useRequiredBoard();
  const t = useScopedI18n("board.action.edit");
  const { mutate, isPending } = clientApi.board.save.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("notification.success.title"),
        message: t("notification.success.message"),
      });
      setEditMode(false);
    },
    onError() {
      showErrorNotification({
        title: t("notification.error.title"),
        message: t("notification.error.message"),
      });
    },
  });

  const toggle = () => {
    if (isEditMode) return mutate(board);
    setEditMode(true);
  };

  return (
    <HeaderButton onClick={toggle} loading={isPending}>
      {isEditMode ? (
        <IconPencilOff stroke={1.5} />
      ) : (
        <IconPencil stroke={1.5} />
      )}
    </HeaderButton>
  );
};
