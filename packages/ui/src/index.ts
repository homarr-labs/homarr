import type { MantineProviderProps } from "@mantine/core";

import { theme } from "./theme";

export { cssVariablesResolver, scrollAreaDefaultProps, theme } from "./theme";
export { modalSizeForm, modalSizeSelect } from "./theme/modal";
export * from "./components";

export const uiConfiguration = {
  theme,
} satisfies MantineProviderProps;
