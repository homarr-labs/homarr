import { Badge, Box } from "@mantine/core";

import type { FirewallVersionSummary } from "@homarr/integrations";

interface FirewallVersionProps {
  firewallsVersionData: {
    integration: FirewallIntegration;
    summary: FirewallVersionSummary;
  }[];
  selectedFirewall: string;
  isTiny: boolean;
}

export interface FirewallIntegration {
  id: string;
  name: string;
  kind: string;
  updatedAt: Date;
}

export const FirewallVersion = ({ firewallsVersionData, selectedFirewall, isTiny }: FirewallVersionProps) => (
  <Box>
    <Badge autoContrast variant="outline" color="white" size={isTiny ? "8px" : "xs"}>
      {firewallsVersionData
        .filter(({ integration }) => integration.id === selectedFirewall)
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
