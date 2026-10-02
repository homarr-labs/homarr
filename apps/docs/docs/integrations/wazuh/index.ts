import { IntegrationDefinition } from "@site/src/types";

export const wazuhIntegration: IntegrationDefinition = {
  name: "Wazuh",
  description:
    "Wazuh is an open source security platform (SIEM and XDR) that collects agent events, raises alerts and tracks vulnerabilities.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wazuh.svg",
  path: "../../integrations/wazuh",
};
