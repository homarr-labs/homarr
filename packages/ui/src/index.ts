import type { MantineProviderProps } from "@mantine/core";

import { theme } from "./theme";

export { theme } from "./theme";
export { appShellHeaderZIndex, managedModalZIndex, modalZIndex } from "./theme/layers";
export { modalSizeForm, modalSizeSelect } from "./theme/modal";
export * from "./components";

export const uiConfiguration = {
  theme,
} satisfies MantineProviderProps;
