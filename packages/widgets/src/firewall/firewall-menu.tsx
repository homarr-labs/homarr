import { Box, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import type { Firewall } from "./component";

interface FirewallMenuProps {
  opened: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  selectedFirewall: Firewall;
  dropdownItems: React.ReactElement<typeof Menu.Item>[];
  isTiny: boolean;
}

export const FirewallMenu = ({
  opened,
  handleOpen,
  handleClose,
  selectedFirewall,
  dropdownItems,
  isTiny,
}: FirewallMenuProps) => (
  <Box
    style={{
      border: "1px solid #ccc",
      padding: "8px",
      borderRadius: "4px",
      minHeight: "40px",
      display: "flex",
      alignItems: "center",
    }}
  >
    <Menu onOpen={handleOpen} onClose={handleClose} radius="md" width="target" withinPortal>
      <Menu.Target>
        <UnstyledButton data-expanded={opened || undefined}>
          <Group gap="xs">
            <Text size={isTiny ? "8px" : "xs"}>{selectedFirewall.integration.name}</Text>
            <IconChevronDown size={isTiny ? 8 : 16} stroke={1.5} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{dropdownItems}</Menu.Dropdown>
    </Menu>
  </Box>
);
