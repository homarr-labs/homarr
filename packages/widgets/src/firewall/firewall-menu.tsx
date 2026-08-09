import { Box, Select } from "@mantine/core";

import type { Firewall } from "./component";

interface FirewallMenuProps {
  onChange: (value: string | null) => void;
  dropdownItems: Firewall[];
  selectedFirewall: string;
  isTiny: boolean;
}

export const FirewallMenu = ({ onChange, isTiny, dropdownItems, selectedFirewall }: FirewallMenuProps) => (
  <Box style={{ flex: 1, minWidth: 0 }}>
    <Select
      value={selectedFirewall}
      onChange={onChange}
      size="xs"
      w="100%"
      color="lightgray"
      data={dropdownItems}
      styles={{
        input: {
          minHeight: "24px",
          paddingInline: isTiny ? 6 : undefined,
        },
      }}
    />
  </Box>
);
