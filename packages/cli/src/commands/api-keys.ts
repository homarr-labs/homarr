import { command } from "@drizzle-team/brocli";

import { apiKeysCreate } from "./api-keys-create";
import { apiKeysDelete } from "./api-keys-delete";
import { apiKeysList } from "./api-keys-list";

export const apiKeysRoot = command({
  name: "api-keys",
  desc: "Group of commands to manage API keys",
  subcommands: [apiKeysList, apiKeysCreate, apiKeysDelete],
});
