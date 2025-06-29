import { Box, Text } from "@mantine/core";

import type { FirewallVersionSummary } from "@homarr/integrations";

import type { Firewall, FirewallIntegration } from "./component";

interface FirewallVersionProps {
  firewallsVersionData: {
    integration: FirewallIntegration;
    summary: FirewallVersionSummary;
  }[];
  selectedFirewall: Firewall;
  isTiny: boolean;
}

export const FirewallVersion = ({ firewallsVersionData, selectedFirewall, isTiny }: FirewallVersionProps) => (
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
    <Text size={isTiny ? "8px" : "xs"}>
      {firewallsVersionData
        .filter(({ integration }) => integration.id === selectedFirewall.integration.id)
        .map(({ summary }) => (
          <span key={summary.version}>{formatVersion(summary.version)}</span>
        ))}
    </Text>
  </Box>
);

function formatVersion(inputString: string): string {
  const regex = /(\d+\.\d+\.\d+_\d+)/;
  const match = regex.exec(inputString);
  if (match?.[1]) {
    return match[1];
  } else {
    return "Unknown Version";
  }
}
