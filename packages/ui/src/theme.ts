import { createTheme } from "@mantine/core";

import { primaryColor } from "./theme/colors/primary";
import { secondaryColor } from "./theme/colors/secondary";

export const theme = createTheme({
  colors: {
    primaryColor,
    secondaryColor,
  },
  primaryColor: "primaryColor",
  components: {
    Modal: {
      vars: (_theme: unknown, props: { size?: string }) => {
        if (props.size === "xxl") {
          return { root: { "--modal-size": "75rem" } };
        }
        return { root: {} };
      },
    },
  },
});
