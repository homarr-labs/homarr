import { Badge, Box } from "@mantine/core";

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
  <Box>
    <Badge autoContrast variant="outline" color="white" size={isTiny ? "8px" : "xs"}>
      {firewallsVersionData
        .filter(({ integration }) => integration.id === selectedFirewall.integration.id)
        .map(({ summary, integration }) => (
          <span key={integration.id}>{formatVersion(summary.version)}</span>
        ))}
    </Badge>
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
