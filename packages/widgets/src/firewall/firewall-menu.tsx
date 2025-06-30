import { Box, NativeSelect } from "@mantine/core";
import type { Firewall } from "./component";

interface FirewallMenuProps {
  opened: void;
  onSelect: void;
  dropdownItems: Firewall[];
  selectedFirewall: Firewall;
  isTiny: boolean;
}

export const FirewallMenu = ({ isTiny, dropdownItems, selectedFirewall}: FirewallMenuProps) => (
  <Box>
    <NativeSelect
      value={selectedFirewall}

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
