import { IntegrationDefinition } from "@site/src/types";

export const llamacppIntegration: IntegrationDefinition = {
  name: "llama.cpp",
  description:
    "Connect to a local llama.cpp llama-server to show model, throughput and request status on your dashboard.",
  iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/llama-cpp.svg",
  path: "../../integrations/llama-cpp",
};
