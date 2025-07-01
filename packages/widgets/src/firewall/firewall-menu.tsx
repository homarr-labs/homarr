import type { ChangeEvent } from "react";
import { Box, NativeSelect } from "@mantine/core";

import type { Firewall } from "./component";

interface FirewallMenuProps {
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  dropdownItems: Firewall[];
  selectedFirewall: string;
  isTiny: boolean;
}

export const FirewallMenu = ({ onChange, isTiny, dropdownItems, selectedFirewall }: FirewallMenuProps) => (
  <Box>
    <NativeSelect
      value={selectedFirewall}
      onChange={onChange}
      size={isTiny ? "8px" : "xs"}
      color="white"
      data={dropdownItems}
      styles={{
        input: {
          border: "2px solid white",
          borderRadius: "10px",
        },
      }}
    />
  </Box>
);
