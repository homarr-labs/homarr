import type { IntegrationInput } from "../base/integration";
import { TechnitiumDnsIntegration } from "./technitium-integration";

/**
 * Create a Technitium DNS integration.
 *
 * Auth version detection (Bearer vs ?token=) is lazy: it happens on the first authenticated
 * request and the result is cached in the session store, so no probe runs on every poll.
 */
export const createTechnitiumDnsIntegrationAsync = async (input: IntegrationInput) =>
  new TechnitiumDnsIntegration(input);
