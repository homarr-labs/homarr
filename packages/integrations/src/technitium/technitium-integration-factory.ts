import type { IntegrationInput } from "../base/integration";
import { TechnitiumDnsIntegration } from "./technitium-integration";

/**
 * Create a Technitium DNS integration. Version detection (v15 vs legacy) happens
 * automatically on the first authenticated request and is cached in the session store,
 * so no separate probe request runs on every poll cycle.
 */
// Promise.resolve is required: integrationCreators distinguishes class constructors from
// factory functions by checking Array.isArray — factories must be wrapped in an array and
// return a Promise<Integration>.
export const createTechnitiumDnsIntegrationAsync = (input: IntegrationInput): Promise<TechnitiumDnsIntegration> =>
  Promise.resolve(new TechnitiumDnsIntegration(input));
