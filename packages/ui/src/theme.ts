import { createTheme, Modal } from "@mantine/core";

import { primaryColor } from "./theme/colors/primary";
import { secondaryColor } from "./theme/colors/secondary";

export const theme = createTheme({
  colors: {
    primaryColor,
    secondaryColor,
  },
  primaryColor: "primaryColor",
  components: {
    Modal: Modal.extend({
      vars: (_theme, props) => {
        if (props.size === "xxl") {
          return { root: { "--modal-size": "75rem" } };
        }
        return { root: {} };
      },
    }),
  },
});
