// Keep this module server-safe: Mantine's getDefaultZIndex helper is client-only.
const mantineModalZIndex = 200;

export const appShellHeaderZIndex = mantineModalZIndex + 1;
export const modalZIndex = appShellHeaderZIndex + 1;
export const managedModalZIndex = modalZIndex + 1;
