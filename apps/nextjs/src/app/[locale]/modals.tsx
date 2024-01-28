"use client";

import { createModalManager } from "mantine-modal-manager";

import { WidgetEditModal } from "@homarr/widgets";

import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";

export const [ModalsManager, modalEvents] = createModalManager({
  categoryEditModal: CategoryEditModal,
  widgetEditModal: WidgetEditModal,
  itemSelectModal: ItemSelectModal,
});
