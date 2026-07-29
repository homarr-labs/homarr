import { getDefaultZIndex } from "@mantine/core";

export const appShellHeaderZIndex = getDefaultZIndex("modal") + 1;
export const modalZIndex = appShellHeaderZIndex + 1;
export const managedModalZIndex = modalZIndex + 1;
