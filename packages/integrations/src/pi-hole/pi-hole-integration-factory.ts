import type { IntegrationInput } from "../base/integration";
import { PiHoleIntegrationV5 } from "./pi-hole-integration-v5";
import { PiHoleIntegrationV6 } from "./pi-hole-integration-v6";

export const createPiHoleIntegrationAsync = async (input: IntegrationInput) => {
  const piHoleV6 = new PiHoleIntegrationV6(input);
  const v6Successful = await piHoleV6
    .testConnectionAsync()
    .then(() => true)
    .catch(() => false);

  if (v6Successful) {
    return piHoleV6;
  }

  return new PiHoleIntegrationV5(input);
};
