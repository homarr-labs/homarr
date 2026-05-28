import type { PropsWithChildren } from "react";
import { Affix, Box } from "@mantine/core";

import { MANAGE_ACTION_BUTTON_MIN_WIDTH, MANAGE_AFFIX_POSITION } from "./manage-page.constants";

export const ManageMobilePrimaryAction = ({ children }: PropsWithChildren) => (
  <>
    <Box visibleFrom="md" miw={MANAGE_ACTION_BUTTON_MIN_WIDTH}>
      {children}
    </Box>
    <Affix hiddenFrom="md" position={MANAGE_AFFIX_POSITION}>
      {children}
    </Affix>
  </>
);
