import { Badge, Box } from "@mantine/core";

import type { FirewallVersionSummary } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

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

export const FirewallVersion = ({ firewallsVersionData, selectedFirewall, isTiny }: FirewallVersionProps) => {
  const t = useI18n();

  return (
    <Box>
      <Badge
        autoContrast
        variant="outline"
        color="lightgray"
        size={isTiny ? "8px" : "xs"}
        style={{ minHeight: "24px" }}
      >
        {firewallsVersionData
          .filter(({ integration }) => integration.id === selectedFirewall)
          .map(({ summary, integration }) => (
            <span key={integration.id}>{formatVersion(summary.version, t("widget.firewall.versionUnknown"))}</span>
          ))}
      </Badge>
    </Box>
  );
};

export function formatVersion(inputString: string, fallback: string): string {
  const regex = /([\d._]+)/;
  const match = regex.exec(inputString);
  if (match?.[1]) {
    return match[1];
  } else {
    return fallback;
  }
}
