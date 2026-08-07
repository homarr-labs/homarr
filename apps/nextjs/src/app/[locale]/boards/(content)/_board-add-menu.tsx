"use client";

import { useCallback } from "react";
import { Group, Menu } from "@mantine/core";
import { IconBox, IconBoxAlignTop, IconChevronDown, IconPlug, IconPlus, IconResize } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";

import { useItemActions } from "~/components/board/items/item-actions";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useCategoryActions } from "~/components/board/sections/category/category-actions";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { useDynamicSectionActions } from "~/components/board/sections/dynamic/dynamic-actions";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { HeaderButton } from "~/components/layout/header/button";

export const BoardAddMenu = () => {
  const { data: session } = useSession();
  const { openModal: openCategoryEditModal } = useModalAction(CategoryEditModal);
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { openModal: openAppSelectModal } = useModalAction(AppSelectModal);
  const { openModal: openIntegrationSelectModal } = useModalAction(IntegrationSelectModal);
  const { addCategoryToEnd } = useCategoryActions();
  const { addDynamicSection } = useDynamicSectionActions();
  const { createItem } = useItemActions();
  const t = useI18n();

  const handleAddCategory = useCallback(
    () =>
      openCategoryEditModal(
        {
          category: { id: "new", name: "" },
          onSuccess({ name }) {
            addCategoryToEnd({ name });
          },
          submitLabel: t("section.category.create.submit"),
        },
        { title: (translate) => translate("section.category.create.title") },
      ),
    [addCategoryToEnd, openCategoryEditModal, t],
  );

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <HeaderButton w="auto" px={4}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item leftSection={<IconResize size={20} />} onClick={() => openItemSelectModal()}>
          {t("item.action.create")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBox size={20} />}
          onClick={() =>
            openAppSelectModal({
              onSelect: (app) => createItem({ kind: "app", options: { appId: app.id } }),
              withCreate: session?.user.permissions.includes("app-create") ?? false,
            })
          }
        >
          {t("app.action.add")}
        </Menu.Item>
        <Menu.Item leftSection={<IconPlug size={20} />} onClick={() => openIntegrationSelectModal({})}>
          {t("integration.action.create")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconBoxAlignTop size={20} />} onClick={handleAddCategory}>
          {t("section.category.action.create")}
        </Menu.Item>
        <Menu.Item leftSection={<IconResize size={20} />} onClick={addDynamicSection}>
          {t("section.dynamic.action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
