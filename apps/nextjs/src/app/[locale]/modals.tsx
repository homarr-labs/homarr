"use client";

import { createModalManager } from "mantine-modal-manager";

import { WidgetEditModal } from "@homarr/widgets";

export const [ModalsManager, modalEvents] = createModalManager({
  widgetEditModal: WidgetEditModal,
});
