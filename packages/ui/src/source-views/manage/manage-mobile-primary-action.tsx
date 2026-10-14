import { Affix, Box } from "@mantine/core";

import type { ManageMobilePrimaryActionProps } from "./contracts";

export const ManageMobilePrimaryAction = ({
  children,
  actionButtonMinWidth,
  affixPosition,
}: ManageMobilePrimaryActionProps) => (
  <>
    <Box visibleFrom="md" miw={actionButtonMinWidth}>
      {children}
    </Box>
    <Affix hiddenFrom="md" position={affixPosition}>
      {children}
    </Affix>
  </>
);
