import { IntegrationDefinition } from "@site/src/types";

export const codebergIntegration: IntegrationDefinition = {
  name: "Codeberg",
  description:
    "Codeberg is a non-profit, community-driven platform for hosting and collaborating on software projects.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/codeberg.svg",
  path: "../../integrations/codeberg",
  data: "Fetches latest releases and repository metadata from a Codeberg instance.",
};
