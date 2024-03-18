"use client";

import { createModalManager } from "mantine-modal-manager";

import { WidgetEditModal } from "@homarr/widgets";

import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { BoardRenameModal } from "~/components/board/modals/board-rename-modal";
import { CategoryEditModal } from "~/components/board/sections/category/category-edit-modal";
import { AddBoardModal } from "~/components/manage/boards/add-board-modal";

export const [ModalsManager, modalEvents] = createModalManager({
  categoryEditModal: CategoryEditModal,
  widgetEditModal: WidgetEditModal,
  itemSelectModal: ItemSelectModal,
  addBoardModal: AddBoardModal,
  boardRenameModal: BoardRenameModal,
});
